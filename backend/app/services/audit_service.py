import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.db.models import AuditLog, User


def record(session: Session, *, actor: User | None, action: str, entity_type: str, entity_id: Any = None,
           office_id: uuid.UUID | None = None, detail: dict | None = None, source: str = "HUMAN") -> AuditLog:
    """Append an audit row in the caller's transaction. Never put secrets or documents in `detail`."""
    row = AuditLog(
        actor_user_id=actor.id if actor else None,
        source=source if actor else "SYSTEM",
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        office_id=office_id,
        detail=detail or {},
    )
    session.add(row)
    return row
