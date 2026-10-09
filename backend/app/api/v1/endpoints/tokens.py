import uuid
from datetime import date, datetime, time, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import func, select

from app.api.deps import CurrentUser, DbSession, require_roles
from app.core.errors import forbidden, not_found
from app.core.ratelimit import rate_limit
from app.db.models import QueueEvent, Token, User
from app.domain.token_states import LIVE_STATES, Role, TokenStatus
from app.schemas.common import Limit, Offset, Page, page
from app.schemas.tokens import ReasonRequest, TokenCreate, TokenHistoryOut, TokenListItem, TokenOut
from app.services import access, queue_service, views

router = APIRouter(tags=["tokens"])


def _load_visible_token(db, user: User, token_id: uuid.UUID) -> Token:
    """Owner citizen, or staff of the token's office. Anyone else gets 404 (existence is not revealed)."""
    token = db.get(Token, token_id)
    if token is None:
        raise not_found("TOKEN_NOT_FOUND", "The requested token was not found.")
    if user.role == Role.CITIZEN.value:
        if token.citizen_id != user.id:
            raise not_found("TOKEN_NOT_FOUND", "The requested token was not found.")
    elif not access.is_staff_of(user, token.office_id):
        raise not_found("TOKEN_NOT_FOUND", "The requested token was not found.")
    return token


@router.post("/tokens", response_model=TokenOut, status_code=201,
             dependencies=[Depends(rate_limit("token_create", 20, 60))])
def create_token(body: TokenCreate, response: Response, db: DbSession,
                 user: Annotated[User, Depends(require_roles(Role.CITIZEN.value))]):
    """Take a virtual token. Number, position and ETA are all server-calculated."""
    token, eta, created = queue_service.create_token(
        db, user, office_id=body.office_id, service_id=body.service_id,
        idempotency_key=body.idempotency_key, preferred_language=body.preferred_language)
    if not created:
        response.status_code = 200  # idempotent replay of an earlier successful request
    return views.token_outs(db, [token], etas={token.id: eta})[0]


@router.get("/tokens", response_model=Page[TokenListItem])
def list_my_tokens(
    db: DbSession, user: Annotated[User, Depends(require_roles(Role.CITIZEN.value))],
    status: Annotated[list[TokenStatus] | None, Query(description="Repeat to filter by several statuses")] = None,
    active_only: bool = False,
    date_from: Annotated[date | None, Query(alias="from")] = None,
    date_to: Annotated[date | None, Query(alias="to")] = None,
    limit: Limit = 20, offset: Offset = 0,
):
    """The authenticated citizen's own tokens, newest first (a client-supplied user id is never accepted)."""
    stmt = select(Token).where(Token.citizen_id == user.id)
    if status:
        stmt = stmt.where(Token.status.in_([s.value for s in status]))
    if active_only:
        stmt = stmt.where(Token.status.in_([s.value for s in LIVE_STATES]))
    if date_from:
        stmt = stmt.where(Token.created_at >= datetime.combine(date_from, time.min, tzinfo=timezone.utc))
    if date_to:
        stmt = stmt.where(Token.created_at <= datetime.combine(date_to, time.max, tzinfo=timezone.utc))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(Token.created_at.desc(), Token.id).limit(limit).offset(offset)).all()
    items = [{k: v for k, v in t.items() if k in TokenListItem.model_fields}
             for t in views.token_outs(db, list(rows))]
    return page(items, total, limit, offset)


@router.get("/tokens/{token_id}", response_model=TokenOut)
def get_token(token_id: uuid.UUID, db: DbSession, user: CurrentUser):
    token = _load_visible_token(db, user, token_id)
    return views.token_outs(db, [token], include_citizen=user.role != Role.CITIZEN.value)[0]


@router.get("/tokens/{token_id}/history", response_model=TokenHistoryOut)
def get_token_history(token_id: uuid.UUID, db: DbSession, user: CurrentUser):
    token = _load_visible_token(db, user, token_id)
    events = db.scalars(select(QueueEvent).where(QueueEvent.token_id == token.id)
                        .order_by(QueueEvent.occurred_at, QueueEvent.id)).all()
    actors = {u.id: u for u in db.scalars(select(User).where(
        User.id.in_({e.actor_user_id for e in events if e.actor_user_id})))} if events else {}
    return {"token_id": token.id, "display_number": token.display_number,
            "events": views.event_outs(list(events), actors)}


@router.post("/tokens/{token_id}/cancel", response_model=TokenOut)
def cancel_token(token_id: uuid.UUID, db: DbSession, user: CurrentUser, body: ReasonRequest | None = None):
    """Owner citizen cancels before service starts; office admin / super admin may cancel with a reason."""
    if user.role not in (Role.CITIZEN.value, Role.OFFICE_ADMIN.value, Role.SUPER_ADMIN.value):
        raise forbidden()
    token = queue_service.cancel_token(db, user, token_id, body.reason if body else None)
    return views.token_outs(db, [token], include_citizen=user.role != Role.CITIZEN.value)[0]
