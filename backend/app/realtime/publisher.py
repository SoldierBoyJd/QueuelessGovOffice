"""Post-commit event publishing via a per-session outbox.

Services register messages with `emit_*` while they mutate state; `commit_and_publish` commits the
transaction and only then fans messages out, so clients never hear about a change that rolled back.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import Office, Token
from app.domain.token_states import TokenStatus
from app.realtime.manager import manager
from app.services import eta_service

log = logging.getLogger("app.realtime")
_KEY = "outbox"


def _envelope(type_: str, office_id: uuid.UUID | None, data: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": type_,
        "office_id": str(office_id) if office_id else None,
        "event_id": uuid.uuid4().hex,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "data": data,
    }


def _outbox(session: Session) -> list[tuple]:
    return session.info.setdefault(_KEY, [])


def emit_office(session: Session, office_id: uuid.UUID, type_: str, data: dict[str, Any]) -> None:
    _outbox(session).append(("office", office_id, _envelope(type_, office_id, data)))


def emit_user(session: Session, user_id: uuid.UUID, office_id: uuid.UUID | None, type_: str,
              data: dict[str, Any]) -> None:
    _outbox(session).append(("user", user_id, _envelope(type_, office_id, data)))


def emit_queue_refresh(session: Session, office_id: uuid.UUID) -> None:
    """Ask for a queue.updated broadcast + per-citizen ETA pushes once the transaction commits."""
    box = _outbox(session)
    if ("refresh", office_id) not in box:
        box.append(("refresh", office_id))


def discard(session: Session) -> None:
    session.info.pop(_KEY, None)


def commit_and_publish(session: Session) -> None:
    session.commit()
    box = session.info.pop(_KEY, [])
    for item in box:
        try:
            if item[0] == "office":
                manager.publish_office(item[1], item[2])
            elif item[0] == "user":
                manager.publish_user(item[1], item[2])
            elif item[0] == "refresh":
                _publish_refresh(session, item[1])
        except Exception:  # publishing must never fail a request that already committed
            log.exception("Failed to publish realtime event")


def _publish_refresh(session: Session, office_id: uuid.UUID) -> None:
    if not manager.has_office_listeners(office_id):
        return
    office = session.get(Office, office_id)
    if office is None:
        return
    sim = eta_service.simulate_office(session, office)
    serving = session.scalar(
        select(func.count()).select_from(Token).where(
            Token.office_id == office_id, Token.status == TokenStatus.SERVING.value)) or 0
    manager.publish_office(office_id, _envelope("queue.updated", office_id, {
        "waiting_count": sim.waiting_count, "serving_count": serving,
        "active_counters": sim.active_counters, "total_counters": sim.total_counters,
    }))
    owners = dict(session.execute(
        select(Token.id, Token.citizen_id).where(Token.id.in_(list(sim.etas.keys())))).all()) if sim.etas else {}
    for token_id, eta in sim.etas.items():
        owner = owners.get(token_id)
        if owner is None:
            continue
        manager.publish_user(owner, _envelope("token.eta_updated", office_id, {
            "token_id": str(token_id),
            "queue_position": eta.queue_position,
            "estimated_wait_minutes": eta.estimated_wait_minutes,
            "estimated_service_at": eta.estimated_service_at.isoformat() if eta.estimated_service_at else None,
            "arrive_by": eta.arrive_by.isoformat() if eta.arrive_by else None,
            "status": eta.status,
            "method": eta.method,
            "generated_at": eta.generated_at.isoformat(),
        }))
