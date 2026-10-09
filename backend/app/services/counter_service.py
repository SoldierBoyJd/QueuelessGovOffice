"""Counter lifecycle: pause / resume / close / open. Never deletes or silently completes a token."""
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import conflict, not_found
from app.db.models import Counter, Office, Service, Token, User
from app.domain.token_states import COUNTER_HOLDING_STATES, CounterStatus
from app.realtime import publisher
from app.services import audit_service, queue_service
from app.services.access import ensure_office_admin
from app.services.timeutil import utcnow

HOLDING = [s.value for s in COUNTER_HOLDING_STATES]


def _locked_counter(session: Session, counter_id: uuid.UUID) -> Counter:
    counter = session.scalars(select(Counter).where(Counter.id == counter_id).with_for_update(key_share=True)).one_or_none()
    if counter is None:
        raise not_found("COUNTER_NOT_FOUND", "The requested counter was not found.")
    return counter


def change_status(session: Session, actor: User, counter_id: uuid.UUID, action: str, *,
                  reason: str | None = None, release_active_token: bool = False) -> Counter:
    """action: pause | resume | close | open."""
    try:
        counter = _locked_counter(session, counter_id)
        ensure_office_admin(actor, counter.office_id)
        old = counter.status
        released: Token | None = None

        if action == "pause":
            if old != CounterStatus.ACTIVE.value:
                raise conflict("COUNTER_NOT_AVAILABLE", f"Only an active counter can be paused (it is {old}).")
            new = CounterStatus.PAUSED
            # An assigned token stays assigned; the counter simply stops drawing new tokens.
        elif action == "resume":
            if old != CounterStatus.PAUSED.value:
                raise conflict("COUNTER_NOT_AVAILABLE", f"Only a paused counter can be resumed (it is {old}).")
            new = CounterStatus.ACTIVE
        elif action == "close":
            if old == CounterStatus.CLOSED.value:
                raise conflict("COUNTER_NOT_AVAILABLE", "This counter is already closed.")
            holding = session.scalars(select(Token).where(Token.counter_id == counter.id,
                                                          Token.status.in_(HOLDING))).first()
            if holding is not None:
                if not release_active_token:
                    raise conflict(
                        "COUNTER_HAS_ACTIVE_TOKEN",
                        "This counter has an active token. Finish it first, or close with "
                        "release_active_token=true to return it to the queue.",
                        {"token_id": str(holding.id), "display_number": holding.display_number,
                         "status": holding.status})
                released = queue_service.requeue_active_token(
                    session, actor, counter, reason or "Counter closed")
            new = CounterStatus.CLOSED
        elif action == "open":
            if old != CounterStatus.CLOSED.value:
                raise conflict("COUNTER_NOT_AVAILABLE", f"Only a closed counter can be opened (it is {old}).")
            office = session.get(Office, counter.office_id)
            if office is None or not office.is_active:
                raise conflict("COUNTER_NOT_AVAILABLE", "The office is not active.")
            if counter.service_id is not None:
                svc = session.get(Service, counter.service_id)
                if svc is None or not svc.is_active:
                    raise conflict("COUNTER_NOT_AVAILABLE", "The counter's service is not active.")
            new = CounterStatus.ACTIVE
        else:  # pragma: no cover - guarded by the router
            raise ValueError(action)

        counter.status = new.value
        counter.status_reason = reason if new is not CounterStatus.ACTIVE else None
        counter.status_changed_at = utcnow()
        audit_service.record(
            session, actor=actor, action=f"COUNTER_{action.upper()}", entity_type="COUNTER", entity_id=counter.id,
            office_id=counter.office_id,
            detail={"name": counter.name, "from": old, "to": new.value, "reason": reason,
                    "released_token": released.display_number if released else None})
        session.flush()
        publisher.emit_office(session, counter.office_id, "counter.status_changed", {
            "counter_id": str(counter.id), "name": counter.name, "status": new.value})
        publisher.emit_queue_refresh(session, counter.office_id)
        if new is CounterStatus.ACTIVE or released is not None:
            office = session.get(Office, counter.office_id)
            if office is not None:
                queue_service.notify_turn_approaching(session, office)
        publisher.commit_and_publish(session)
        return counter
    except BaseException:
        session.rollback()
        publisher.discard(session)
        raise
