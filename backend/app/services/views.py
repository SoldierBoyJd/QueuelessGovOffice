"""Builds API response dicts from ORM rows with a handful of bulk queries (no per-row queries)."""
import uuid
from collections import defaultdict
from datetime import timedelta
from typing import Any, Iterable

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import Counter, Office, Service, Token, User
from app.domain.token_states import COUNTER_HOLDING_STATES, CounterStatus, Role, TokenStatus
from app.services import eta_service
from app.services.timeutil import is_within_hours, office_local_date, utcnow

HOLDING = [s.value for s in COUNTER_HOLDING_STATES]


def initials(name: str) -> str:
    parts = [p for p in name.split() if p]
    return "".join(p[0] for p in parts[:2]).upper() or "?"


def user_out(user: User) -> dict[str, Any]:
    return {
        "id": user.id, "full_name": user.full_name, "email": user.email, "phone": user.phone,
        "role": user.role, "verification_status": user.verification_status,
        "office_id": user.office_id, "counter_id": user.counter_id, "is_active": user.is_active,
        "avatar_initials": initials(user.full_name), "created_at": user.created_at,
    }


def congestion_level(waiting: int, active_counters: int) -> str:
    if waiting == 0:
        return "NORMAL"
    if active_counters == 0:
        return "HIGH"
    per = waiting / active_counters
    if per >= settings.congestion_high_per_counter:
        return "HIGH"
    if per >= settings.congestion_busy_per_counter:
        return "BUSY"
    return "NORMAL"


# ------------------------------------------------------------------ offices / services
def office_stats(session: Session, offices: Iterable[Office]) -> dict[uuid.UUID, dict[str, Any]]:
    offices = list(offices)
    if not offices:
        return {}
    ids = [o.id for o in offices]
    dates = {o.id: office_local_date(o) for o in offices}

    waiting: dict[uuid.UUID, int] = defaultdict(int)
    for oid, n in session.execute(
            select(Token.office_id, func.count()).where(
                Token.office_id.in_(ids), Token.status == TokenStatus.WAITING.value,
                Token.queue_date.in_(set(dates.values()))).group_by(Token.office_id)):
        waiting[oid] = n

    counters: dict[uuid.UUID, dict[str, int]] = defaultdict(lambda: {"total": 0, "active": 0, "paused": 0})
    for oid, status, n in session.execute(
            select(Counter.office_id, Counter.status, func.count()).where(Counter.office_id.in_(ids))
            .group_by(Counter.office_id, Counter.status)):
        counters[oid]["total"] += n
        if status == CounterStatus.ACTIVE.value:
            counters[oid]["active"] += n
        elif status == CounterStatus.PAUSED.value:
            counters[oid]["paused"] += n

    # Observed average wait (creation -> service start) for tokens served in the last 24h.
    since = utcnow() - timedelta(hours=24)
    avg_wait: dict[uuid.UUID, float] = {}
    for oid, secs in session.execute(
            select(Token.office_id, func.avg(func.extract("epoch", Token.service_started_at - Token.created_at)))
            .where(Token.office_id.in_(ids), Token.service_started_at.is_not(None),
                   Token.service_started_at >= since).group_by(Token.office_id)):
        if secs is not None:
            avg_wait[oid] = round(float(secs) / 60.0, 1)

    out = {}
    for o in offices:
        c = counters[o.id]
        out[o.id] = {
            "total_waiting": waiting[o.id], "active_counters": c["active"], "paused_counters": c["paused"],
            "total_counters": c["total"], "congestion": congestion_level(waiting[o.id], c["active"]),
            "avg_wait_minutes": avg_wait.get(o.id),
        }
    return out


def office_out(session: Session, offices: list[Office], *, detail_services: bool = False) -> list[dict[str, Any]]:
    stats = office_stats(session, offices)
    counts = dict(session.execute(
        select(Service.office_id, func.count()).where(Service.office_id.in_([o.id for o in offices]),
                                                      Service.is_active.is_(True)).group_by(Service.office_id)).all()
    ) if offices else {}
    result = []
    for o in offices:
        row = {
            "id": o.id, "name": o.name, "code": o.code, "address": o.address, "city": o.city,
            "district": o.district, "state": o.state, "phone": o.phone, "lat": o.lat, "lng": o.lng,
            "timezone": o.timezone,
            "opening_time": o.opening_time.strftime("%H:%M") if o.opening_time else None,
            "closing_time": o.closing_time.strftime("%H:%M") if o.closing_time else None,
            "call_grace_minutes": o.call_grace_minutes,
            "is_active": o.is_active,
            "is_open": bool(o.is_active and is_within_hours(o)),
            "services_count": counts.get(o.id, 0),
            **stats[o.id],
        }
        result.append(row)
    return result


def service_outs(session: Session, office: Office, services: list[Service], *, with_wait: bool = True
                 ) -> list[dict[str, Any]]:
    avg, basis = eta_service.service_durations(session, office.id, utcnow())
    out = []
    for s in services:
        row = {
            "id": s.id, "office_id": s.office_id, "name": s.name, "code": s.code, "department": s.department,
            "description": s.description, "icon_name": s.icon_name,
            "average_service_minutes": round(avg.get(s.id, s.estimated_service_minutes), 1),
            "average_service_minutes_basis": basis.get(s.id, "configured"),
            "configured_service_minutes": s.estimated_service_minutes,
            "is_active": s.is_active, "document_requirements": [],
            "current_wait_minutes": None, "current_queue_length": None,
        }
        if with_wait and s.is_active:
            eta = eta_service.estimate_for_new_token(session, office, s.id)
            row["current_wait_minutes"] = eta.estimated_wait_minutes
            row["current_wait_status"] = eta.status
            row["current_queue_length"] = (eta.queue_position or 1) - 1
        out.append(row)
    return out


# ------------------------------------------------------------------ counters
def counter_outs(session: Session, counters: list[Counter]) -> list[dict[str, Any]]:
    if not counters:
        return []
    ids = [c.id for c in counters]
    service_names = dict(session.execute(
        select(Service.id, Service.name).where(Service.id.in_([c.service_id for c in counters if c.service_id]))
    ).all()) if any(c.service_id for c in counters) else {}
    officers: dict[uuid.UUID, User] = {}
    for u in session.scalars(select(User).where(User.counter_id.in_(ids), User.role == Role.OFFICER.value,
                                                User.is_active.is_(True))):
        officers.setdefault(u.counter_id, u)
    held: dict[uuid.UUID, Token] = {}
    for t in session.scalars(select(Token).where(Token.counter_id.in_(ids), Token.status.in_(HOLDING))):
        held[t.counter_id] = t
    office_by_id = {o.id: o for o in session.scalars(select(Office).where(Office.id.in_({c.office_id for c in counters})))}
    served: dict[uuid.UUID, tuple[int, float | None]] = {}
    dates = {office_local_date(o) for o in office_by_id.values()}
    for cid, n, secs in session.execute(
            select(Token.counter_id, func.count(),
                   func.avg(func.extract("epoch", Token.completed_at - Token.service_started_at)))
            .where(Token.counter_id.in_(ids), Token.status == TokenStatus.COMPLETED.value,
                   Token.queue_date.in_(dates)).group_by(Token.counter_id)):
        served[cid] = (n, float(secs) if secs is not None else None)
    out = []
    for c in counters:
        h = held.get(c.id)
        o = officers.get(c.id)
        n, secs = served.get(c.id, (0, None))
        out.append({
            "id": c.id, "office_id": c.office_id, "name": c.name, "service_id": c.service_id,
            "service_name": service_names.get(c.service_id) if c.service_id else None,
            "status": c.status, "status_reason": c.status_reason, "status_changed_at": c.status_changed_at,
            "officer_id": o.id if o else None, "officer_name": o.full_name if o else None,
            "current_token_id": h.id if h else None,
            "current_token_display": h.display_number if h else None,
            "current_token_status": h.status if h else None,
            "tokens_served_today": n,
            "avg_service_seconds": round(secs) if secs is not None else None,
        })
    return out


# ------------------------------------------------------------------ tokens
def eta_out(eta: eta_service.EtaResult | None) -> dict[str, Any] | None:
    if eta is None:
        return None
    return {
        "method": eta.method, "model_version": eta.model_version, "confidence": eta.confidence,
        "status": eta.status, "estimated_wait_minutes": eta.estimated_wait_minutes,
        "estimated_service_at": eta.estimated_service_at, "arrive_by": eta.arrive_by,
        "lower_minutes": eta.lower_minutes, "upper_minutes": eta.upper_minutes,
        "range_policy": eta.range_policy, "basis": eta.basis, "warnings": eta.warnings,
        "queue_position": eta.queue_position, "generated_at": eta.generated_at,
    }


def token_outs(session: Session, tokens: list[Token], *, include_citizen: bool = False,
               etas: dict[uuid.UUID, eta_service.EtaResult] | None = None) -> list[dict[str, Any]]:
    """Full token representation. `etas` may carry a precomputed ETA (e.g. from token creation)."""
    if not tokens:
        return []
    offices = {o.id: o for o in session.scalars(select(Office).where(Office.id.in_({t.office_id for t in tokens})))}
    services = {s.id: s for s in session.scalars(select(Service).where(Service.id.in_({t.service_id for t in tokens})))}
    counters = {c.id: c for c in session.scalars(
        select(Counter).where(Counter.id.in_({t.counter_id for t in tokens if t.counter_id})))} \
        if any(t.counter_id for t in tokens) else {}
    users = {}
    if include_citizen:
        users = {u.id: u for u in session.scalars(
            select(User).where(User.id.in_({t.citizen_id for t in tokens if t.citizen_id})))}
    sims: dict[uuid.UUID, eta_service.OfficeSimulation] = {}
    for t in tokens:
        if t.status == TokenStatus.WAITING.value and t.office_id not in sims and not (etas and t.id in etas):
            sims[t.office_id] = eta_service.simulate_office(session, offices[t.office_id])
    out = []
    for t in tokens:
        eta = None
        if t.status == TokenStatus.WAITING.value:
            eta = (etas or {}).get(t.id) or sims[t.office_id].etas.get(t.id)
        c = counters.get(t.counter_id) if t.counter_id else None
        s = services[t.service_id]
        pos = eta.queue_position if eta else None
        row = {
            "id": t.id, "display_number": t.display_number, "office_id": t.office_id,
            "office_name": offices[t.office_id].name, "service_id": t.service_id, "service_name": s.name,
            "department": s.department, "status": t.status, "queue_position": pos,
            "people_ahead": (pos - 1) if pos else None,
            "counter_id": t.counter_id, "counter_name": c.name if c else None,
            "estimated_wait_minutes": eta.estimated_wait_minutes if eta else None,
            "estimated_service_at": eta.estimated_service_at if eta else None,
            "arrive_by": eta.arrive_by if eta else None,
            "eta": eta_out(eta),
            "created_at": t.created_at, "called_at": t.called_at, "service_started_at": t.service_started_at,
            "completed_at": t.completed_at,
        }
        if include_citizen:
            u = users.get(t.citizen_id) if t.citizen_id else None
            row["citizen_name"] = u.full_name if u else None
        out.append(row)
    return out


def event_outs(events: list, actors: dict[uuid.UUID, User]) -> list[dict[str, Any]]:
    out = []
    for e in events:
        actor = actors.get(e.actor_user_id) if e.actor_user_id else None
        # Citizens never see staff identities: only the kind of actor.
        actor_type = "SYSTEM" if actor is None else ("CITIZEN" if actor.role == Role.CITIZEN.value else "STAFF")
        out.append({
            "id": e.id, "event_type": e.event_type, "from_status": e.from_status, "to_status": e.to_status,
            "counter_id": e.counter_id, "reason": e.reason, "actor_type": actor_type, "occurred_at": e.occurred_at,
        })
    return out
