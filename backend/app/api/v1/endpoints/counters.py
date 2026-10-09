import uuid
from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import DbSession, require_roles
from app.db.models import Counter, User
from app.domain.token_states import Role
from app.schemas.catalog import CounterActionRequest, CounterOut
from app.services import counter_service, views

router = APIRouter(tags=["counters"])
Admin = Annotated[User, Depends(require_roles(Role.OFFICE_ADMIN.value, Role.SUPER_ADMIN.value))]


def _act(action: str, counter_id: uuid.UUID, db, user: User, body: CounterActionRequest | None) -> Counter:
    body = body or CounterActionRequest()
    counter = counter_service.change_status(db, user, counter_id, action, reason=body.reason,
                                            release_active_token=body.release_active_token)
    return views.counter_outs(db, [counter])[0]


@router.post("/counters/{counter_id}/pause", response_model=CounterOut)
def pause(counter_id: uuid.UUID, db: DbSession, user: Admin, body: CounterActionRequest | None = None):
    """Counter stops drawing new tokens; any assigned token stays assigned."""
    return _act("pause", counter_id, db, user, body)


@router.post("/counters/{counter_id}/resume", response_model=CounterOut)
def resume(counter_id: uuid.UUID, db: DbSession, user: Admin, body: CounterActionRequest | None = None):
    return _act("resume", counter_id, db, user, body)


@router.post("/counters/{counter_id}/close", response_model=CounterOut)
def close(counter_id: uuid.UUID, db: DbSession, user: Admin, body: CounterActionRequest | None = None):
    """Rejected with 409 COUNTER_HAS_ACTIVE_TOKEN unless `release_active_token` is true (then the token is
    returned to the queue, keeping its place, and the citizen is notified)."""
    return _act("close", counter_id, db, user, body)


@router.post("/counters/{counter_id}/open", response_model=CounterOut)
def open_counter(counter_id: uuid.UUID, db: DbSession, user: Admin, body: CounterActionRequest | None = None):
    return _act("open", counter_id, db, user, body)
