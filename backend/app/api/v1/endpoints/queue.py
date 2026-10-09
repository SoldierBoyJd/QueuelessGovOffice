import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DbSession, require_roles
from app.core.errors import bad_request, not_found
from app.db.models import Counter, Office, Service, Token, User
from app.domain.token_states import COUNTER_HOLDING_STATES, CounterStatus, Role, TokenStatus
from app.schemas.common import Limit, Offset
from app.schemas.tokens import CallNextOut, CallNextRequest, OfficerCurrentOut, QueueOut, ReasonRequest, TokenOut
from app.services import access, eta_service, queue_service, views
from app.services.timeutil import office_local_date, utcnow

router = APIRouter(tags=["queue"])
OfficerOrAdmin = Annotated[
    User, Depends(require_roles(Role.OFFICER.value, Role.OFFICE_ADMIN.value, Role.SUPER_ADMIN.value))]
HOLDING = [s.value for s in COUNTER_HOLDING_STATES]


def queue_summary(db, office: Office) -> dict:
    today = office_local_date(office)
    counts = dict(db.execute(select(Token.status, func.count()).where(
        Token.office_id == office.id, Token.queue_date == today).group_by(Token.status)).all())
    cstat = dict(db.execute(select(Counter.status, func.count()).where(
        Counter.office_id == office.id).group_by(Counter.status)).all())
    return {
        "waiting_count": counts.get(TokenStatus.WAITING.value, 0),
        "called_count": counts.get(TokenStatus.CALLED.value, 0),
        "serving_count": counts.get(TokenStatus.SERVING.value, 0),
        "on_hold_count": counts.get(TokenStatus.ON_HOLD.value, 0),
        "completed_today": counts.get(TokenStatus.COMPLETED.value, 0),
        "no_show_today": counts.get(TokenStatus.NO_SHOW.value, 0),
        "cancelled_today": counts.get(TokenStatus.CANCELLED.value, 0),
        "active_counters": cstat.get(CounterStatus.ACTIVE.value, 0),
        "paused_counters": cstat.get(CounterStatus.PAUSED.value, 0),
        "total_counters": sum(cstat.values()),
    }


@router.get("/offices/{office_id}/queue", response_model=QueueOut)
def office_queue(
    office_id: uuid.UUID, db: DbSession, user: CurrentUser,
    service_id: uuid.UUID | None = None, counter_id: uuid.UUID | None = None,
    status: Annotated[list[TokenStatus] | None, Query()] = None,
    limit: Limit = 50, offset: Offset = 0,
):
    """Privacy-safe live queue for an office (display numbers only). Staff of the office also see names."""
    office = db.get(Office, office_id)
    if office is None or not office.is_active:
        raise not_found("OFFICE_NOT_FOUND", "The requested office was not found.")
    staff = access.is_staff_of(user, office.id)
    today = office_local_date(office)
    wanted = [s.value for s in status] if status else [TokenStatus.WAITING.value, TokenStatus.CALLED.value,
                                                       TokenStatus.SERVING.value, TokenStatus.ON_HOLD.value]
    stmt = select(Token).where(Token.office_id == office.id, Token.queue_date == today, Token.status.in_(wanted))
    if service_id:
        stmt = stmt.where(Token.service_id == service_id)
    if counter_id:
        stmt = stmt.where(Token.counter_id == counter_id)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    tokens = list(db.scalars(stmt.order_by(Token.created_at, Token.id).limit(limit).offset(offset)).all())

    sim = eta_service.simulate_office(db, office)
    services = {s.id: s.name for s in db.scalars(select(Service).where(Service.office_id == office.id))}
    counters = {c.id: c.name for c in db.scalars(select(Counter).where(Counter.office_id == office.id))}
    names = {}
    if staff and tokens:
        names = {u.id: u.full_name for u in db.scalars(select(User).where(
            User.id.in_({t.citizen_id for t in tokens if t.citizen_id})))}
    items = []
    for t in tokens:
        eta = sim.etas.get(t.id)
        items.append({
            "token_id": t.id, "display_number": t.display_number, "service_id": t.service_id,
            "service_name": services.get(t.service_id, ""), "status": t.status,
            "queue_position": eta.queue_position if eta else None,
            "counter_id": t.counter_id, "counter_name": counters.get(t.counter_id) if t.counter_id else None,
            "estimated_wait_minutes": eta.estimated_wait_minutes if eta else None,
            "estimated_service_at": eta.estimated_service_at if eta else None,
            "created_at": t.created_at, "called_at": t.called_at,
            "is_mine": t.citizen_id == user.id,
            "citizen_name": names.get(t.citizen_id) if staff else None,
        })
    return {"office_id": office.id, "generated_at": utcnow(), "summary": queue_summary(db, office), "items": items,
            "pagination": {"limit": limit, "offset": offset, "total": total}}


# ---------------------------------------------------------------- officer actions
def _resolve_counter(db, user: User, counter_id: uuid.UUID | None) -> Counter:
    cid = counter_id or user.counter_id
    if cid is None:
        raise bad_request("COUNTER_REQUIRED", "counter_id is required.",
                          [{"field": "counter_id", "issue": "Specify which counter to operate."}])
    counter = db.get(Counter, cid)
    if counter is None:
        raise not_found("COUNTER_NOT_FOUND", "The requested counter was not found.")
    access.ensure_counter_operator(user, counter)
    return counter


@router.get("/officer/queue/current", response_model=OfficerCurrentOut)
def officer_current(db: DbSession, user: OfficerOrAdmin, counter_id: uuid.UUID | None = None):
    """The token at the counter plus the next eligible one. Scoped to the caller's office/counter."""
    counter = _resolve_counter(db, user, counter_id)
    office = db.get(Office, counter.office_id)
    current = db.scalars(select(Token).where(Token.counter_id == counter.id, Token.status.in_(HOLDING))).first()
    q = select(Token).where(Token.office_id == office.id, Token.status == TokenStatus.WAITING.value,
                            Token.queue_date == office_local_date(office))
    if counter.service_id is not None:
        q = q.where(Token.service_id == counter.service_id)
    nxt = db.scalars(q.order_by(Token.created_at, Token.id).limit(1)).first()
    cur_out = views.token_outs(db, [current], include_citizen=True)[0] if current else None
    nxt_out = views.token_outs(db, [nxt], include_citizen=True)[0] if nxt else None
    return {"counter_id": counter.id, "counter_name": counter.name, "counter_status": counter.status,
            "current_token": cur_out, "next_token": nxt_out, "summary": queue_summary(db, office)}


@router.post("/officer/queue/call-next", response_model=CallNextOut)
def call_next(db: DbSession, user: OfficerOrAdmin, body: CallNextRequest | None = None):
    """Atomically claim the earliest eligible waiting token. Safe under concurrent callers."""
    counter = _resolve_counter(db, user, body.counter_id if body else None)
    result, token, counter = queue_service.call_next(db, user, counter.id)
    if token is None:
        return {"result": result, "token": None, "next_action": None}
    return {"result": result, "token": views.token_outs(db, [token], include_citizen=True)[0],
            "next_action": "START_SERVICE"}


@router.post("/officer/tokens/{token_id}/start", response_model=TokenOut)
def start(token_id: uuid.UUID, db: DbSession, user: OfficerOrAdmin):
    token = queue_service.start_service(db, user, token_id)
    return views.token_outs(db, [token], include_citizen=True)[0]


@router.post("/officer/tokens/{token_id}/complete", response_model=TokenOut)
def complete(token_id: uuid.UUID, db: DbSession, user: OfficerOrAdmin):
    """No request body: the service duration is computed from the server's own timestamps."""
    token = queue_service.complete_service(db, user, token_id)
    return views.token_outs(db, [token], include_citizen=True)[0]


@router.post("/officer/tokens/{token_id}/hold", response_model=TokenOut)
def hold(token_id: uuid.UUID, db: DbSession, user: OfficerOrAdmin, body: ReasonRequest | None = None):
    token = queue_service.hold_token(db, user, token_id, body.reason if body else None)
    return views.token_outs(db, [token], include_citizen=True)[0]


@router.post("/officer/tokens/{token_id}/resume", response_model=TokenOut)
def resume(token_id: uuid.UUID, db: DbSession, user: OfficerOrAdmin):
    token = queue_service.resume_token(db, user, token_id)
    return views.token_outs(db, [token], include_citizen=True)[0]


@router.post("/officer/tokens/{token_id}/no-show", response_model=TokenOut)
def no_show(token_id: uuid.UUID, db: DbSession, user: OfficerOrAdmin, body: ReasonRequest | None = None):
    token = queue_service.mark_no_show(db, user, token_id, body.reason if body else None)
    return views.token_outs(db, [token], include_citizen=True)[0]
