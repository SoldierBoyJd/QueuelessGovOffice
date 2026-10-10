"""Baseline ETA: a small scheduling simulation (no ML).

Walk the waiting tokens in FIFO order and give each one to the eligible counter that frees up
first. The target token's assigned start time is its estimated service time. The result is an
estimate, always labelled method="baseline"; `confidence` is always None because nothing here is
a calibrated probability.
"""
import math
import statistics
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.ml import eta_model
from app.ml.features import feature_row
from app.db.models import Counter, Office, Service, Token
from app.domain.token_states import COUNTER_HOLDING_STATES, CounterStatus, TokenStatus
from app.services.timeutil import closes_at, is_within_hours, office_local_date, office_tz, utcnow

METHOD = "baseline"
RANGE_POLICY = "configured_factor"
MAX_OBSERVED_PER_SERVICE = 30


@dataclass
class EtaResult:
    token_id: uuid.UUID | None
    service_id: uuid.UUID
    queue_position: int | None
    status: str  # OK | OFFICE_CLOSED | NO_ACTIVE_COUNTER
    estimated_wait_minutes: int | None = None
    estimated_service_at: datetime | None = None
    arrive_by: datetime | None = None
    lower_minutes: int | None = None
    upper_minutes: int | None = None
    basis: str = "configured"  # configured | observed (service-duration source)
    generated_at: datetime = field(default_factory=utcnow)
    warnings: list[str] = field(default_factory=list)
    method: str = METHOD
    model_version: str | None = None
    confidence: float | None = None
    range_policy: str = RANGE_POLICY


@dataclass
class OfficeSimulation:
    etas: dict[uuid.UUID, EtaResult]
    virtual: EtaResult | None
    waiting_count: int
    active_counters: int
    total_counters: int
    avg_minutes: dict[uuid.UUID, float]
    generated_at: datetime


def service_durations(session: Session, office_id: uuid.UUID, now: datetime) -> tuple[dict, dict]:
    """Per-service expected service minutes and where the number came from."""
    services = session.scalars(select(Service).where(Service.office_id == office_id)).all()
    avg = {s.id: float(s.estimated_service_minutes) for s in services}
    basis = {s.id: "configured" for s in services}

    since = now - timedelta(days=settings.eta_history_days)
    rows = session.execute(
        select(Token.service_id, Token.completed_at - Token.service_started_at)
        .where(Token.office_id == office_id, Token.status == TokenStatus.COMPLETED.value,
               Token.service_started_at.is_not(None), Token.completed_at >= since)
        .order_by(Token.completed_at.desc())
        .limit(MAX_OBSERVED_PER_SERVICE * max(len(services), 1))
    ).all()
    samples: dict[uuid.UUID, list[float]] = {}
    for service_id, delta in rows:
        lst = samples.setdefault(service_id, [])
        if len(lst) < MAX_OBSERVED_PER_SERVICE and delta is not None:
            lst.append(delta.total_seconds() / 60.0)
    for service_id, lst in samples.items():
        if len(lst) >= settings.eta_min_samples and service_id in avg:
            avg[service_id] = min(max(statistics.median(lst), 1.0), 240.0)
            basis[service_id] = "observed"
    return avg, basis


def _range(wait: int) -> tuple[int, int]:
    lower = max(0, math.floor(wait * settings.eta_lower_factor))
    upper = max(math.ceil(wait * settings.eta_upper_factor), wait + settings.eta_min_spread_minutes)
    return lower, upper


def _remaining(tok: Token, avg_minutes: float, now: datetime) -> timedelta:
    expected = timedelta(minutes=avg_minutes)
    if tok.status == TokenStatus.SERVING.value and tok.service_started_at:
        return max(expected - (now - tok.service_started_at), timedelta(minutes=1))
    return expected  # CALLED (citizen still arriving) or ON_HOLD (unknown): assume a full service


def simulate_office(session: Session, office: Office, *, virtual_service_id: uuid.UUID | None = None,
                    now: datetime | None = None) -> OfficeSimulation:
    now = now or utcnow()
    today = office_local_date(office, now)

    waiting = session.scalars(
        select(Token)
        .where(Token.office_id == office.id, Token.status == TokenStatus.WAITING.value, Token.queue_date == today)
        .order_by(Token.created_at, Token.id)
    ).all()
    counters = session.scalars(select(Counter).where(Counter.office_id == office.id)).all()
    active_tokens = session.scalars(
        select(Token).where(Token.office_id == office.id,
                            Token.status.in_([s.value for s in COUNTER_HOLDING_STATES]))
    ).all()
    avg, basis = service_durations(session, office.id, now)
    default_minutes = 10.0

    by_counter = {t.counter_id: t for t in active_tokens if t.counter_id}
    free_at: dict[uuid.UUID, datetime] = {}
    eligible_counters = [c for c in counters if c.status == CounterStatus.ACTIVE.value]
    for c in eligible_counters:
        held = by_counter.get(c.id)
        if held is None:
            free_at[c.id] = now
        else:
            free_at[c.id] = now + _remaining(held, avg.get(held.service_id, default_minutes), now)

    closed = settings.enforce_office_hours and not is_within_hours(office, now)
    close_instant = closes_at(office, now)

    queue: list[tuple[uuid.UUID | None, uuid.UUID]] = [(t.id, t.service_id) for t in waiting]
    if virtual_service_id is not None:
        queue.append((None, virtual_service_id))

    seen_per_service: dict[uuid.UUID, int] = {}
    etas: dict[uuid.UUID, EtaResult] = {}
    virtual: EtaResult | None = None
    ml_inputs: list[tuple[EtaResult, list[float]]] = []
    ml_inputs_seen: list[uuid.UUID] = []
    local = now.astimezone(office_tz(office))
    in_service = len(active_tokens)
    paused = sum(1 for c in counters if c.status == CounterStatus.PAUSED.value)

    for token_id, service_id in queue:
        ahead_total = len(ml_inputs_seen)
        position = seen_per_service.get(service_id, 0) + 1
        seen_per_service[service_id] = position
        ml_inputs_seen.append(service_id)
        res = EtaResult(token_id=token_id, service_id=service_id, queue_position=position, status="OK",
                        basis=basis.get(service_id, "configured"), generated_at=now)

        usable = [c for c in eligible_counters if c.service_id is None or c.service_id == service_id]
        if closed:
            res.status = "OFFICE_CLOSED"
        elif not usable:
            res.status = "NO_ACTIVE_COUNTER"
        else:
            chosen = min(usable, key=lambda c: (free_at[c.id], str(c.id)))
            start = max(free_at[chosen.id], now)
            free_at[chosen.id] = start + timedelta(minutes=avg.get(service_id, default_minutes))
            wait = max(0, math.ceil((start - now).total_seconds() / 60.0))
            res.estimated_wait_minutes = wait
            res.estimated_service_at = start
            res.arrive_by = max(now, start - timedelta(minutes=settings.arrival_buffer_minutes))
            res.lower_minutes, res.upper_minutes = _range(wait)
            if close_instant is not None and start > close_instant:
                res.warnings.append("ESTIMATE_AFTER_CLOSING_TIME")
            ml_inputs.append((res, feature_row(
                ahead_same=position - 1, ahead_total=ahead_total, in_service=in_service, eligible=len(usable),
                active=len(eligible_counters), total=len(counters), paused=paused,
                avg_min=avg.get(service_id, default_minutes), baseline_wait=wait,
                hour=local.hour + local.minute / 60.0, weekday=local.weekday())))
        if token_id is None:
            virtual = res
        else:
            etas[token_id] = res

    _apply_ml(ml_inputs, now)

    return OfficeSimulation(
        etas=etas, virtual=virtual, waiting_count=len(waiting),
        active_counters=len(eligible_counters), total_counters=len(counters),
        avg_minutes=avg, generated_at=now,
    )


def _apply_ml(items: list[tuple[EtaResult, list[float]]], now: datetime) -> None:
    """Replace the baseline wait with the trained model's estimate (and interval) when a model is available."""
    if not items:
        return
    preds = eta_model.predict([row for _, row in items])
    if preds is None:
        return
    for (res, _), (mean, lo, hi) in zip(items, preds):
        wait = max(0, math.ceil(mean - 1e-9))
        res.estimated_wait_minutes = wait
        res.estimated_service_at = now + timedelta(minutes=wait)
        res.arrive_by = max(now, res.estimated_service_at - timedelta(minutes=settings.arrival_buffer_minutes))
        res.lower_minutes, res.upper_minutes = int(math.floor(lo)), max(int(math.ceil(hi)), wait)
        res.method = "ml"
        res.model_version = eta_model.version()
        res.confidence = eta_model.coverage()
        res.range_policy = "model_quantiles_10_90"


def eta_for_waiting_token(session: Session, office: Office, token: Token) -> EtaResult | None:
    """ETA for a WAITING token; None for any other state (no meaningful wait)."""
    if token.status != TokenStatus.WAITING.value:
        return None
    sim = simulate_office(session, office)
    return sim.etas.get(token.id)


def estimate_for_new_token(session: Session, office: Office, service_id: uuid.UUID) -> EtaResult:
    sim = simulate_office(session, office, virtual_service_id=service_id)
    assert sim.virtual is not None
    return sim.virtual


