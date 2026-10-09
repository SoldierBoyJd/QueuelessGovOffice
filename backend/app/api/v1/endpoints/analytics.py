"""Aggregates computed from stored tokens. Metrics with no underlying data are returned as null,
never as a misleading zero, and forecasts are labelled with the (simple) method that produced them."""
import statistics
import uuid
from collections import defaultdict
from datetime import date, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DbSession, require_roles
from app.core.errors import bad_request, forbidden, not_found
from app.db.models import Counter, Office, Token, User
from app.domain.token_states import Role, TokenStatus
from app.services import eta_service, views
from app.services.timeutil import office_local_date, office_local_now, office_tz, utcnow

router = APIRouter(prefix="/analytics", tags=["analytics"])
Central = Annotated[User, Depends(require_roles(Role.CENTRAL_ADMIN.value, Role.SUPER_ADMIN.value))]


def _resolve_office(db, user: User, office_id: uuid.UUID | None, *, allow_officer: bool = False) -> Office:
    if user.role == Role.CITIZEN.value or (user.role == Role.OFFICER.value and not allow_officer):
        raise forbidden()
    if user.role in (Role.OFFICER.value, Role.OFFICE_ADMIN.value):
        if office_id is not None and office_id != user.office_id:
            raise forbidden()  # staff cannot widen their scope with a query parameter
        office_id = user.office_id
    elif office_id is None:
        raise bad_request("OFFICE_ID_REQUIRED", "office_id is required.",
                          [{"field": "office_id", "issue": "Required for central and super admins."}])
    office = db.get(Office, office_id)
    if office is None:
        raise not_found("OFFICE_NOT_FOUND", "The requested office was not found.")
    return office


def _mins(seconds) -> float | None:
    return round(float(seconds) / 60.0, 1) if seconds is not None else None


@router.get("/office", response_model=dict)
def office_summary(db: DbSession, user: CurrentUser, office_id: uuid.UUID | None = None,
                   date_from: Annotated[date | None, Query(alias="from")] = None,
                   date_to: Annotated[date | None, Query(alias="to")] = None):
    office = _resolve_office(db, user, office_id, allow_officer=True)
    today = office_local_date(office)
    start, end = date_from or today, date_to or today
    if end < start or (end - start).days > 92:
        raise bad_request("VALIDATION_ERROR", "Invalid date range (max 93 days).")
    in_range = (Token.office_id == office.id, Token.queue_date >= start, Token.queue_date <= end)
    counts = dict(db.execute(select(Token.status, func.count()).where(*in_range).group_by(Token.status)).all())
    wait_s, service_s = db.execute(
        select(func.avg(func.extract("epoch", Token.service_started_at - Token.created_at)),
               func.avg(func.extract("epoch", Token.completed_at - Token.service_started_at)))
        .where(*in_range, Token.service_started_at.is_not(None))).one()
    full = user.role != Role.OFFICER.value  # officers get a restricted view
    total = sum(counts.values())
    no_show = counts.get(TokenStatus.NO_SHOW.value, 0)
    return {
        "office_id": str(office.id), "period": {"from": start.isoformat(), "to": end.isoformat()},
        "total_tokens": total, "completed_tokens": counts.get(TokenStatus.COMPLETED.value, 0),
        "waiting_tokens": counts.get(TokenStatus.WAITING.value, 0),
        "serving_tokens": counts.get(TokenStatus.SERVING.value, 0),
        "no_show_tokens": no_show, "cancelled_tokens": counts.get(TokenStatus.CANCELLED.value, 0),
        "no_show_rate": round(no_show / total, 3) if total else None,
        "average_wait_minutes": _mins(wait_s) if full else None,
        "average_service_minutes": _mins(service_s) if full else None,
        "generated_at": utcnow().isoformat(),
    }


@router.get("/office/queue-movement", response_model=dict)
def queue_movement(db: DbSession, user: CurrentUser, office_id: uuid.UUID | None = None,
                   day: Annotated[date | None, Query(alias="date")] = None):
    """Tokens created and tokens whose service started, per local hour of the day."""
    office = _resolve_office(db, user, office_id, allow_officer=True)
    day = day or office_local_date(office)
    created = defaultdict(int)
    served = defaultdict(int)
    tz = office_tz(office)  # bucket in Python so we never depend on the database's tz data
    for created_at, started_at in db.execute(select(Token.created_at, Token.service_started_at).where(
            Token.office_id == office.id, Token.queue_date == day)):
        created[created_at.astimezone(tz).hour] += 1
        if started_at is not None:
            served[started_at.astimezone(tz).hour] += 1
    now_hour = office_local_now(office).hour if day == office_local_date(office) else None
    points = [{"time": f"{h:02d}:00", "tokens_created": created[h], "tokens_served": served[h],
               "is_now": h == now_hour} for h in range(24)]
    return {"office_id": str(office.id), "date": day.isoformat(), "points": points}


@router.get("/office/forecast", response_model=dict)
def forecast(db: DbSession, user: CurrentUser, office_id: uuid.UUID | None = None, weeks: int = Query(8, ge=2, le=26)):
    """Historical-average demand forecast: tokens created per hour, averaged over the same weekday in
    previous weeks. A transparent baseline, not a trained model; unavailable until enough days exist."""
    if user.role == Role.OFFICER.value:
        raise forbidden()
    office = _resolve_office(db, user, office_id)
    today = office_local_date(office)
    since = today - timedelta(weeks=weeks)
    tz = office_tz(office)
    per_day_hour: dict[date, dict[int, int]] = defaultdict(lambda: defaultdict(int))
    for qd, created_at in db.execute(select(Token.queue_date, Token.created_at).where(
            Token.office_id == office.id, Token.queue_date >= since, Token.queue_date < today)):
        per_day_hour[qd][created_at.astimezone(tz).hour] += 1
    same_weekday = [d for d in per_day_hour if d.weekday() == today.weekday()]
    base = {"office_id": str(office.id), "date": today.isoformat(), "method": "historical_average",
            "weeks_considered": weeks, "sample_days": len(same_weekday), "generated_at": utcnow().isoformat()}
    if len(same_weekday) < 2:
        return {**base, "available": False,
                "reason": "At least 2 past days with the same weekday are needed to forecast demand.",
                "hourly_forecast": []}

    avg_minutes = statistics.fmean(
        eta_service.service_durations(db, office.id, utcnow())[0].values() or [10.0])
    total_counters = db.scalar(select(func.count()).select_from(Counter).where(
        Counter.office_id == office.id, Counter.status != "CLOSED")) or 0
    capacity_per_hour = total_counters * 60.0 / avg_minutes if total_counters else 0.0
    hourly = []
    for h in range(24):
        vals = [per_day_hour[d][h] for d in same_weekday]
        if not any(vals):
            continue
        expected = statistics.fmean(vals)
        hourly.append({"hour": f"{h:02d}:00", "expected": round(expected, 1), "lower": min(vals), "upper": max(vals),
                       "is_congested": capacity_per_hour > 0 and expected > capacity_per_hour})
    peak = max(hourly, key=lambda p: p["expected"]) if hourly else None
    congested = [p["hour"] for p in hourly if p["is_congested"]]
    return {
        **base, "available": True, "hourly_forecast": hourly,
        "peak_hour": peak["hour"] if peak else None, "peak_expected": peak["expected"] if peak else None,
        "capacity_per_hour": round(capacity_per_hour, 1),
        "congestion_window": f"{congested[0]}–{congested[-1]}" if congested else None,
        "expected_range": f"{peak['lower']}–{peak['upper']} tokens/hour at peak" if peak else None,
        "recommendation": (
            f"Expected demand exceeds counter capacity around {congested[0]}; consider opening more counters."
            if congested else "Expected demand stays within current counter capacity."),
    }


# ------------------------------------------------------------------ central / regional
def _all_office_rows(db) -> list[dict]:
    offices = db.scalars(select(Office).where(Office.is_active.is_(True)).order_by(Office.name)).all()
    stats = views.office_stats(db, offices)
    rows = []
    for o in offices:
        s = stats[o.id]
        rows.append({"id": str(o.id), "name": o.name, "city": o.city, "state": o.state, "district": o.district,
                     "lat": o.lat, "lng": o.lng, "waiting": s["total_waiting"], "avg_wait_minutes": s["avg_wait_minutes"],
                     "congestion": s["congestion"], "active_counters": s["active_counters"],
                     "total_counters": s["total_counters"]})
    return rows


@router.get("/central/overview", response_model=dict)
def central_overview(db: DbSession, user: Central):
    rows = _all_office_rows(db)
    today = utcnow().date()
    completed_today = db.scalar(select(func.count()).select_from(Token).where(
        Token.status == TokenStatus.COMPLETED.value, Token.queue_date >= today - timedelta(days=1),
        Token.completed_at >= utcnow() - timedelta(hours=24))) or 0
    waits = [r["avg_wait_minutes"] for r in rows if r["avg_wait_minutes"] is not None]
    breakdown = {"NORMAL": 0, "BUSY": 0, "HIGH": 0}
    for r in rows:
        breakdown[r["congestion"]] += 1
    worst = sorted(rows, key=lambda r: (-r["waiting"], r["name"]))[:5]
    return {
        "office_count": len(rows), "total_waiting": sum(r["waiting"] for r in rows),
        "active_counters": sum(r["active_counters"] for r in rows),
        "total_counters": sum(r["total_counters"] for r in rows),
        "tokens_completed_last_24h": completed_today,
        "average_wait_minutes_last_24h": round(statistics.fmean(waits), 1) if waits else None,
        "congestion_breakdown": breakdown, "busiest_offices": worst, "generated_at": utcnow().isoformat(),
    }


@router.get("/central/regions", response_model=dict)
def central_regions(db: DbSession, user: Central, level: Annotated[str, Query(pattern="^(state|district)$")] = "state"):
    rows = _all_office_rows(db)
    groups: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        key = r[level] or "Unassigned"
        groups[key].append(r)
    items = []
    for name, rs in sorted(groups.items()):
        waiting = sum(r["waiting"] for r in rs)
        active = sum(r["active_counters"] for r in rs)
        waits = [r["avg_wait_minutes"] for r in rs if r["avg_wait_minutes"] is not None]
        items.append({
            "id": name.lower().replace(" ", "-"), "name": name, "type": level, "office_count": len(rs),
            "total_waiting": waiting, "avg_wait_minutes": round(statistics.fmean(waits), 1) if waits else None,
            "congestion_level": views.congestion_level(waiting, active),
            "high_congestion_count": sum(r["congestion"] == "HIGH" for r in rs),
        })
    return {"level": level, "items": items, "generated_at": utcnow().isoformat()}


@router.get("/central/offices", response_model=dict)
def central_offices(db: DbSession, user: Central, state: Annotated[str | None, Query(max_length=120)] = None,
                    congestion: Annotated[str | None, Query(pattern="^(NORMAL|BUSY|HIGH)$")] = None):
    rows = _all_office_rows(db)
    if state:
        rows = [r for r in rows if (r["state"] or "").lower() == state.lower()]
    if congestion:
        rows = [r for r in rows if r["congestion"] == congestion]
    return {"items": rows, "generated_at": utcnow().isoformat()}
