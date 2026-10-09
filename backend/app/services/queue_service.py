"""Queue engine: every token mutation goes through here.

Each public function runs in ONE database transaction that changes the token, appends the
queue event, creates notifications and (after commit) publishes realtime messages. Authorization
is checked against rows loaded from the database, never against ids supplied by the client.
"""
import functools
import logging
import uuid
from datetime import timedelta
from typing import Any, Callable

from sqlalchemy import func, select, text
from sqlalchemy import update as sa_update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import bad_request, conflict, not_found
from app.db.models import (Counter, Notification, Office, PredictionSnapshot, QueueCounter, QueueEvent, Service,
                           Token, User)
from app.domain.token_states import (COUNTER_HOLDING_STATES, EVENT_FOR_COMMAND, LIVE_STATES, Command, CounterStatus,
                                     InvalidTransition, Role, TokenStatus, next_state)
from app.realtime import publisher
from app.services import audit_service, eta_service, notification_service
from app.services.access import ensure_counter_operator, ensure_office_admin, ensure_queue_operator, is_super
from app.services.timeutil import is_within_hours, office_local_date, utcnow

HOLDING = [s.value for s in COUNTER_HOLDING_STATES]
LIVE = [s.value for s in LIVE_STATES]
log = logging.getLogger("app.queue")
_TRANSIENT_SQLSTATES = {"40P01", "40001"}  # deadlock_detected, serialization_failure


def retry_transient(fn: Callable) -> Callable:
    """Re-run a whole queue transaction a couple of times if PostgreSQL aborts it as a deadlock victim."""
    @functools.wraps(fn)
    def wrapper(session: Session, *args, **kwargs):
        for attempt in range(3):
            try:
                return fn(session, *args, **kwargs)
            except OperationalError as exc:
                session.rollback()
                publisher.discard(session)
                if getattr(exc.orig, "sqlstate", None) in _TRANSIENT_SQLSTATES and attempt < 2:
                    log.warning("transient database conflict in %s; retrying (%d)", fn.__name__, attempt + 1)
                    continue
                raise
    return wrapper



# --------------------------------------------------------------------------- helpers
def add_event(session: Session, token: Token, event_type: str, *, actor: User | None, from_status: str | None,
              to_status: str | None, counter_id: uuid.UUID | None = None, reason: str | None = None,
              metadata: dict[str, Any] | None = None) -> QueueEvent:
    ev = QueueEvent(token_id=token.id, office_id=token.office_id, actor_user_id=actor.id if actor else None,
                    counter_id=counter_id, event_type=event_type, from_status=from_status, to_status=to_status,
                    reason=reason, event_metadata=metadata or {})
    session.add(ev)
    return ev


def _load_office(session: Session, office_id: uuid.UUID) -> Office:
    office = session.get(Office, office_id)
    if office is None:
        raise not_found("OFFICE_NOT_FOUND", "The requested office was not found.")
    return office


def _locked_token(session: Session, token_id: uuid.UUID) -> Token:
    token = session.scalars(select(Token).where(Token.id == token_id).with_for_update(key_share=True)).one_or_none()
    if token is None:
        raise not_found("TOKEN_NOT_FOUND", "The requested token was not found.")
    return token


def _transition(token: Token, command: Command) -> TokenStatus:
    try:
        return next_state(token.status, command)
    except InvalidTransition as exc:
        raise conflict("INVALID_TOKEN_TRANSITION", str(exc),
                       {"current_status": exc.current.value, "command": exc.command.value}) from None


def _audit_override(session: Session, actor: User, action: str, token: Token) -> None:
    if is_super(actor):
        audit_service.record(session, actor=actor, action=f"OVERRIDE_{action}", entity_type="TOKEN",
                             entity_id=token.id, office_id=token.office_id,
                             detail={"display_number": token.display_number})


def _publish_token_change(session: Session, token: Token, counter: Counter | None) -> None:
    status = token.status
    publisher.emit_office(session, token.office_id, "token.status_changed", {
        "display_number": token.display_number, "status": status,
        "counter_id": str(token.counter_id) if token.counter_id else None})
    if token.citizen_id:
        publisher.emit_user(session, token.citizen_id, token.office_id, "token.status_changed", {
            "token_id": str(token.id), "display_number": token.display_number, "status": status,
            "counter_id": str(token.counter_id) if token.counter_id else None,
            "counter_name": counter.name if counter else None})
    publisher.emit_queue_refresh(session, token.office_id)


def notify_turn_approaching(session: Session, office: Office) -> None:
    """Tell citizens near the head of their service queue that their turn is close (once per token)."""
    threshold = settings.turn_approaching_threshold
    if threshold <= 0:
        return
    today = office_local_date(office)
    rows = session.execute(
        select(Token.id, Token.service_id, Token.citizen_id, Token.display_number)
        .where(Token.office_id == office.id, Token.status == TokenStatus.WAITING.value, Token.queue_date == today)
        .order_by(Token.created_at, Token.id)
    ).all()
    position: dict[uuid.UUID, int] = {}
    near = []
    for tid, sid, cid, disp in rows:
        position[sid] = position.get(sid, 0) + 1
        if position[sid] <= threshold and cid is not None:
            near.append((tid, cid, disp, position[sid]))
    for tid, cid, disp, pos in near:
        ahead = pos - 1
        msg = (f"Your turn is approaching — {ahead} {'person' if ahead == 1 else 'people'} ahead of {disp}. "
               "Please make your way to the office now.")
        stmt = (pg_insert(Notification.__table__)
                .values(id=uuid.uuid4(), user_id=cid, token_id=tid, type="TURN_APPROACHING", severity="WARNING",
                        title="Your turn is approaching", message=msg, delivery_status="IN_APP")
                .on_conflict_do_nothing(index_elements=["token_id"],
                                        index_where=text("type = 'TURN_APPROACHING'"))
                .returning(Notification.__table__.c.id))
        if session.execute(stmt).first() is not None:
            publisher.emit_user(session, cid, office.id, "notification.created", {
                "type": "TURN_APPROACHING", "severity": "WARNING", "title": "Your turn is approaching",
                "message": msg, "token_id": str(tid)})


def expire_stale_tokens(session: Session, office: Office, *, limit: int = 200) -> int:
    """Close out tokens left over from a previous business day (they must not clog today's queue)."""
    today = office_local_date(office)
    stale = session.scalars(
        select(Token).where(Token.office_id == office.id, Token.queue_date < today, Token.status.in_(LIVE))
        .order_by(Token.created_at).limit(limit).with_for_update(skip_locked=True, key_share=True)
    ).all()
    for tok in stale:
        old = tok.status
        counter_id = tok.counter_id
        tok.status = TokenStatus.CANCELLED.value
        add_event(session, tok, "TOKEN_EXPIRED", actor=None, from_status=old, to_status=tok.status,
                  counter_id=counter_id, reason="Expired at the end of its business day")
        if tok.citizen_id:
            notification_service.notify(
                session, user_id=tok.citizen_id, type_="TOKEN_CANCELLED", severity="WARNING",
                title="Token expired", message=f"Token {tok.display_number} expired at the end of its day.",
                token_id=tok.id, office_id=office.id)
    if stale:
        session.flush()
    return len(stale)


# --------------------------------------------------------------------------- create
def _existing_by_key(session: Session, citizen_id: uuid.UUID, key: str) -> Token | None:
    return session.scalars(select(Token).where(Token.citizen_id == citizen_id, Token.idempotency_key == key)
                           ).one_or_none()


def _replay(existing: Token, office_id: uuid.UUID, service_id: uuid.UUID) -> tuple[Token, bool]:
    if existing.office_id != office_id or existing.service_id != service_id:
        raise conflict("IDEMPOTENCY_CONFLICT", "This idempotency key was already used for a different request.")
    return existing, False


@retry_transient
def create_token(session: Session, citizen: User, *, office_id: uuid.UUID, service_id: uuid.UUID,
                 idempotency_key: str | None = None, preferred_language: str | None = None
                 ) -> tuple[Token, eta_service.EtaResult, bool]:
    """Returns (token, eta, created). created=False means an idempotent replay of an earlier request."""
    office = _load_office(session, office_id)

    if idempotency_key:
        prior = _existing_by_key(session, citizen.id, idempotency_key)
        if prior is not None:
            token, _ = _replay(prior, office_id, service_id)
            return token, _eta_or_placeholder(session, office, token), False

    service = session.get(Service, service_id)
    if service is None or service.office_id != office.id or not service.is_active:
        raise bad_request("SERVICE_NOT_AVAILABLE", "This service is not available at the selected office.",
                          [{"field": "service_id", "issue": "This service is not available at the selected office."}])
    if not office.is_active:
        raise conflict("OFFICE_NOT_ACCEPTING_TOKENS", "This office is not accepting tokens.")
    now = utcnow()
    if settings.enforce_office_hours and not is_within_hours(office, now):
        raise conflict("OFFICE_NOT_ACCEPTING_TOKENS", "This office is closed right now.",
                       {"opening_time": str(office.opening_time), "closing_time": str(office.closing_time)})

    expire_stale_tokens(session, office)  # yesterday's leftovers must neither block nor clog today's queue
    live = session.scalars(select(Token).where(
        Token.citizen_id == citizen.id, Token.service_id == service_id, Token.status.in_(LIVE))).first()
    if live is not None:
        if idempotency_key and live.idempotency_key == idempotency_key:
            # A concurrent request with the same key committed between our first lookup and now: replay it.
            token, _ = _replay(live, office_id, service_id)
            return token, _eta_or_placeholder(session, office, token), False
        raise conflict("ACTIVE_TOKEN_EXISTS", "You already have an active token for this service.",
                       {"token_id": str(live.id), "display_number": live.display_number})

    today = office_local_date(office, now)

    # Atomic per-(office, service, day) number allocation: the UPDATE row-locks until commit.
    session.execute(pg_insert(QueueCounter).values(office_id=office.id, service_id=service.id, queue_date=today,
                                                   last_number=0).on_conflict_do_nothing())
    number = session.execute(
        sa_update(QueueCounter)
        .where(QueueCounter.office_id == office.id, QueueCounter.service_id == service.id,
               QueueCounter.queue_date == today)
        .values(last_number=QueueCounter.last_number + 1).returning(QueueCounter.last_number)
    ).scalar_one()

    token = Token(display_number=f"{service.code}-{number:03d}", citizen_id=citizen.id, office_id=office.id,
                  service_id=service.id, queue_date=today, queue_number=number, status=TokenStatus.WAITING.value,
                  idempotency_key=idempotency_key, preferred_language=preferred_language)
    try:
        session.add(token)
        session.flush()
    except IntegrityError as exc:
        session.rollback()
        publisher.discard(session)
        constraint = getattr(getattr(exc.orig, "diag", None), "constraint_name", None) or ""
        if constraint in ("uq_tokens_idempotency", "uq_tokens_one_live_per_citizen_service"):
            if idempotency_key:
                prior = _existing_by_key(session, citizen.id, idempotency_key)
                if prior is not None:
                    token, _ = _replay(prior, office_id, service_id)
                    return token, _eta_or_placeholder(session, office, token), False
            raise conflict("ACTIVE_TOKEN_EXISTS", "You already have an active token for this service.") from None
        raise

    add_event(session, token, "TOKEN_CREATED", actor=citizen, from_status=None, to_status=token.status)
    eta = eta_service.simulate_office(session, office).etas[token.id]
    if eta.estimated_wait_minutes is not None:  # kept so ETA error can be measured against the actual wait
        session.add(PredictionSnapshot(
            office_id=office.id, service_id=service.id, token_id=token.id,
            predicted_wait_minutes=eta.estimated_wait_minutes, lower_minutes=eta.lower_minutes,
            upper_minutes=eta.upper_minutes, queue_position=eta.queue_position, method="BASELINE"))
    notification_service.notify(
        session, user_id=citizen.id, type_="TOKEN_CREATED", severity="SUCCESS", title="Token booked",
        message=f"Your token {token.display_number} for {service.name} is confirmed. Position {eta.queue_position}.",
        token_id=token.id, office_id=office.id)
    _publish_token_change(session, token, None)
    publisher.commit_and_publish(session)
    return token, eta, True


def _eta_or_placeholder(session: Session, office: Office, token: Token) -> eta_service.EtaResult:
    eta = eta_service.eta_for_waiting_token(session, office, token)
    if eta is None:
        eta = eta_service.EtaResult(token_id=token.id, service_id=token.service_id, queue_position=None, status="OK")
    return eta


# --------------------------------------------------------------------------- call next
@retry_transient
def call_next(session: Session, actor: User, counter_id: uuid.UUID) -> tuple[str, Token | None, Counter]:
    """Atomically claim the earliest eligible WAITING token for a counter."""
    try:
        counter = session.scalars(select(Counter).where(Counter.id == counter_id).with_for_update(key_share=True)).one_or_none()
        if counter is None:
            raise not_found("COUNTER_NOT_FOUND", "The requested counter was not found.")
        ensure_counter_operator(actor, counter)
        if counter.status != CounterStatus.ACTIVE.value:
            raise conflict("COUNTER_NOT_AVAILABLE", f"This counter is {counter.status.lower()} and cannot call tokens.")
        office = _load_office(session, counter.office_id)
        busy = session.scalar(select(Token.id).where(Token.counter_id == counter.id, Token.status.in_(HOLDING)
                                                     ).limit(1))
        if busy is not None:
            raise conflict("COUNTER_NOT_AVAILABLE",
                           "This counter already has an active token. Finish, hold or release it first.")
        expire_stale_tokens(session, office)

        q = select(Token).where(Token.office_id == office.id, Token.status == TokenStatus.WAITING.value,
                                Token.queue_date == office_local_date(office))
        if counter.service_id is not None:
            q = q.where(Token.service_id == counter.service_id)
        token = session.scalars(q.order_by(Token.created_at, Token.id).limit(1).with_for_update(skip_locked=True, key_share=True)
                                ).first()
        if token is None:
            publisher.commit_and_publish(session)  # commits any stale-token expiry and releases the counter lock
            return "QUEUE_EMPTY", None, counter

        old = token.status
        token.status = _transition(token, Command.CALL).value
        token.counter_id = counter.id
        token.called_at = utcnow()
        add_event(session, token, EVENT_FOR_COMMAND[Command.CALL], actor=actor, from_status=old,
                  to_status=token.status, counter_id=counter.id)
        _audit_override(session, actor, "CALL_NEXT", token)
        if token.citizen_id:
            notification_service.notify(
                session, user_id=token.citizen_id, type_="TOKEN_CALLED", severity="SUCCESS",
                title="Your token is being called",
                message=f"Token {token.display_number}: please proceed to {counter.name}.",
                token_id=token.id, office_id=office.id)
        session.flush()
        notify_turn_approaching(session, office)
        _publish_token_change(session, token, counter)
        publisher.commit_and_publish(session)
        return "TOKEN_CALLED", token, counter
    except BaseException:
        session.rollback()
        publisher.discard(session)
        raise


# --------------------------------------------------------------------------- staff token commands
@retry_transient
def _staff_command(session: Session, actor: User, token_id: uuid.UUID, command: Command, *,
                   reason: str | None = None, notify: tuple[str, str, str, str] | None = None) -> Token:
    try:
        token = _locked_token(session, token_id)
        ensure_queue_operator(actor, token.office_id)
        counter = session.get(Counter, token.counter_id) if token.counter_id else None
        if counter is not None:
            ensure_counter_operator(actor, counter)
        office = _load_office(session, token.office_id)

        if command is Command.NO_SHOW and token.status == TokenStatus.CALLED.value and token.called_at:
            ready_at = token.called_at + timedelta(minutes=office.call_grace_minutes)
            remaining = (ready_at - utcnow()).total_seconds()
            if remaining > 0:
                raise conflict("GRACE_PERIOD_ACTIVE",
                               "The citizen is still within the call grace period.",
                               {"seconds_remaining": int(remaining) + 1,
                                "call_grace_minutes": office.call_grace_minutes})

        old = token.status
        new = _transition(token, command)
        token.status = new.value
        now = utcnow()
        meta: dict[str, Any] = {}
        if command is Command.START:
            token.service_started_at = now
            if token.called_at:
                meta["wait_seconds_since_call"] = int((now - token.called_at).total_seconds())
        elif command is Command.COMPLETE:
            token.completed_at = now
            if token.service_started_at:
                # Duration is always computed by the server, never taken from the client.
                meta["service_seconds"] = int((now - token.service_started_at).total_seconds())
        add_event(session, token, EVENT_FOR_COMMAND[command], actor=actor, from_status=old, to_status=new.value,
                  counter_id=token.counter_id, reason=reason, metadata=meta)
        _audit_override(session, actor, command.value, token)
        if notify and token.citizen_id:
            type_, severity, title, message = notify
            notification_service.notify(session, user_id=token.citizen_id, type_=type_, severity=severity,
                                        title=title, message=message.format(n=token.display_number),
                                        token_id=token.id, office_id=token.office_id)
        session.flush()
        notify_turn_approaching(session, office)
        _publish_token_change(session, token, counter)
        publisher.commit_and_publish(session)
        return token
    except BaseException:
        session.rollback()
        publisher.discard(session)
        raise


def start_service(session: Session, actor: User, token_id: uuid.UUID) -> Token:
    return _staff_command(session, actor, token_id, Command.START, notify=(
        "SERVICE_STARTED", "INFO", "Service started", "Token {n}: your service has started."))


def complete_service(session: Session, actor: User, token_id: uuid.UUID) -> Token:
    return _staff_command(session, actor, token_id, Command.COMPLETE, notify=(
        "TOKEN_COMPLETED", "SUCCESS", "Service completed", "Token {n}: your service is complete. Thank you."))


def hold_token(session: Session, actor: User, token_id: uuid.UUID, reason: str | None) -> Token:
    return _staff_command(session, actor, token_id, Command.HOLD, reason=reason, notify=(
        "SERVICE_UPDATE", "INFO", "Service paused", "Token {n}: your service has been put on hold."))


def resume_token(session: Session, actor: User, token_id: uuid.UUID) -> Token:
    return _staff_command(session, actor, token_id, Command.RESUME, notify=(
        "SERVICE_UPDATE", "INFO", "Service resumed", "Token {n}: your service has resumed."))


def mark_no_show(session: Session, actor: User, token_id: uuid.UUID, reason: str | None) -> Token:
    return _staff_command(session, actor, token_id, Command.NO_SHOW, reason=reason, notify=(
        "TOKEN_NO_SHOW", "WARNING", "Marked as no-show",
        "Token {n} was not claimed within the call window and was closed."))


# --------------------------------------------------------------------------- cancel
@retry_transient
def cancel_token(session: Session, actor: User, token_id: uuid.UUID, reason: str | None) -> Token:
    """Owner citizen cancels their own token; office admins/super admin may cancel with a reason."""
    try:
        token = _locked_token(session, token_id)
        by_owner = actor.role == Role.CITIZEN.value
        if by_owner:
            if token.citizen_id != actor.id:
                raise not_found("TOKEN_NOT_FOUND", "The requested token was not found.")
        else:
            ensure_office_admin(actor, token.office_id)
            if not reason:
                raise bad_request("REASON_REQUIRED", "A reason is required when staff cancel a token.")
        counter = session.get(Counter, token.counter_id) if token.counter_id else None
        office = _load_office(session, token.office_id)
        old = token.status
        try:
            new = next_state(token.status, Command.CANCEL)
        except InvalidTransition as exc:
            raise conflict("TOKEN_CANNOT_BE_CANCELLED", "This token can no longer be cancelled.",
                           {"current_status": exc.current.value}) from None
        token.status = new.value
        add_event(session, token, EVENT_FOR_COMMAND[Command.CANCEL], actor=actor, from_status=old,
                  to_status=new.value, counter_id=token.counter_id, reason=reason,
                  metadata={"by": "OWNER" if by_owner else "STAFF"})
        _audit_override(session, actor, "CANCEL", token)
        if not by_owner and token.citizen_id:
            notification_service.notify(
                session, user_id=token.citizen_id, type_="TOKEN_CANCELLED", severity="WARNING",
                title="Token cancelled", message=f"Token {token.display_number} was cancelled by office staff.",
                token_id=token.id, office_id=token.office_id)
        session.flush()
        notify_turn_approaching(session, office)
        _publish_token_change(session, token, counter)
        publisher.commit_and_publish(session)
        return token
    except BaseException:
        session.rollback()
        publisher.discard(session)
        raise


# --------------------------------------------------------------------------- requeue (counter closed)
def requeue_active_token(session: Session, actor: User, counter: Counter, reason: str | None) -> Token | None:
    """Return the token held by `counter` to the queue (keeps its number, so it stays near the front).

    Runs inside the caller's transaction (counter_service) and does not commit.
    """
    token = session.scalars(select(Token).where(Token.counter_id == counter.id, Token.status.in_(HOLDING))
                            .with_for_update(key_share=True)).first()
    if token is None:
        return None
    old = token.status
    new = _transition(token, Command.REQUEUE)
    token.status = new.value
    token.counter_id = None
    token.called_at = None
    token.service_started_at = None
    add_event(session, token, EVENT_FOR_COMMAND[Command.REQUEUE], actor=actor, from_status=old,
              to_status=new.value, counter_id=counter.id, reason=reason)
    if token.citizen_id:
        notification_service.notify(
            session, user_id=token.citizen_id, type_="TOKEN_REQUEUED", severity="WARNING",
            title="Returned to the queue",
            message=f"Token {token.display_number} was returned to the queue because {counter.name} closed. "
                    "You keep your place.", token_id=token.id, office_id=token.office_id)
    _publish_token_change(session, token, None)
    return token


# --------------------------------------------------------------------------- queries
def position_of(session: Session, office: Office, token: Token) -> int | None:
    if token.status != TokenStatus.WAITING.value:
        return None
    ahead = session.scalar(
        select(func.count()).select_from(Token).where(
            Token.office_id == office.id, Token.service_id == token.service_id,
            Token.status == TokenStatus.WAITING.value, Token.queue_date == token.queue_date,
            (Token.created_at < token.created_at) | ((Token.created_at == token.created_at) & (Token.id < token.id))))
    return int(ahead or 0) + 1
