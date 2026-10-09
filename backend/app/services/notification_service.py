import uuid

from sqlalchemy.orm import Session

from app.db.models import Notification
from app.realtime import publisher


def notify(session: Session, *, user_id: uuid.UUID, type_: str, title: str, message: str,
           severity: str = "INFO", token_id: uuid.UUID | None = None,
           office_id: uuid.UUID | None = None) -> Notification:
    """Persist an in-app notification in the caller's transaction and queue a realtime push."""
    n = Notification(user_id=user_id, token_id=token_id, type=type_, severity=severity,
                     title=title, message=message)
    session.add(n)
    session.flush()
    publisher.emit_user(session, user_id, office_id, "notification.created", {
        "id": str(n.id), "type": n.type, "severity": n.severity, "title": n.title, "message": n.message,
        "token_id": str(token_id) if token_id else None, "created_at": n.created_at.isoformat(),
    })
    return n
