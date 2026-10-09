"""Server-side authorization helpers. Route-level role checks are not enough on their own: every
office/counter/token the caller names must be loaded and compared to the caller's scope."""
from app.core.errors import forbidden
from app.db.models import Counter, User
from app.domain.token_states import Role

QUEUE_OPERATORS = {Role.OFFICER.value, Role.OFFICE_ADMIN.value}


def is_super(user: User) -> bool:
    return user.role == Role.SUPER_ADMIN.value


def ensure_queue_operator(user: User, office_id) -> None:
    """May call/start/complete/hold/no-show in this office (SUPER_ADMIN = audited override)."""
    if is_super(user):
        return
    if user.role in QUEUE_OPERATORS and user.office_id == office_id:
        return
    raise forbidden()


def ensure_counter_operator(user: User, counter: Counter) -> None:
    ensure_queue_operator(user, counter.office_id)
    # An officer pinned to a counter may only operate that counter.
    if user.role == Role.OFFICER.value and user.counter_id is not None and user.counter_id != counter.id:
        raise forbidden("You are assigned to a different counter.")


def ensure_office_admin(user: User, office_id) -> None:
    if is_super(user):
        return
    if user.role == Role.OFFICE_ADMIN.value and user.office_id == office_id:
        return
    raise forbidden()


def ensure_office_staff(user: User, office_id) -> None:
    """Read access to office operational data."""
    if user.role in (Role.CENTRAL_ADMIN.value, Role.SUPER_ADMIN.value):
        return
    if user.role in QUEUE_OPERATORS and user.office_id == office_id:
        return
    raise forbidden()


def is_staff_of(user: User, office_id) -> bool:
    try:
        ensure_office_staff(user, office_id)
        return True
    except Exception:
        return False
