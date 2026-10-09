import uuid

from fastapi import APIRouter, Response
from sqlalchemy import func, select, update

from app.api.deps import CurrentUser, DbSession
from app.core.errors import not_found
from app.db.models import Notification
from app.schemas.common import Limit, Offset, page
from app.schemas.tokens import NotificationOut
from app.services.timeutil import utcnow

router = APIRouter(tags=["notifications"])


@router.get("/notifications", response_model=dict)
def list_notifications(db: DbSession, user: CurrentUser, unread_only: bool = False, limit: Limit = 20,
                       offset: Offset = 0):
    """The caller's own notifications only."""
    stmt = select(Notification).where(Notification.user_id == user.id)
    if unread_only:
        stmt = stmt.where(Notification.read_at.is_(None))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    unread = db.scalar(select(func.count()).select_from(Notification).where(
        Notification.user_id == user.id, Notification.read_at.is_(None))) or 0
    rows = db.scalars(stmt.order_by(Notification.created_at.desc(), Notification.id).limit(limit).offset(offset)).all()
    items = [NotificationOut.model_validate(r, from_attributes=True).model_dump(mode="json") for r in rows]
    body = page(items, total, limit, offset)
    body["unread_count"] = unread
    return body


@router.post("/notifications/read-all", status_code=204)
def read_all(db: DbSession, user: CurrentUser):
    db.execute(update(Notification).where(Notification.user_id == user.id, Notification.read_at.is_(None))
               .values(read_at=utcnow()))
    db.commit()
    return Response(status_code=204)


@router.post("/notifications/{notification_id}/read", response_model=NotificationOut)
def mark_read(notification_id: uuid.UUID, db: DbSession, user: CurrentUser):
    # Someone else's notification looks exactly like a missing one.
    n = db.scalars(select(Notification).where(Notification.id == notification_id,
                                              Notification.user_id == user.id)).one_or_none()
    if n is None:
        raise not_found("NOTIFICATION_NOT_FOUND", "The requested notification was not found.")
    if n.read_at is None:
        n.read_at = utcnow()
        db.commit()
    return n
