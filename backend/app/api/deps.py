from datetime import timezone
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.errors import forbidden, unauthenticated
from app.core.security import decode_access_token
from app.db.models import User
from app.db.session import get_db

DbSession = Annotated[Session, Depends(get_db)]
_bearer = HTTPBearer(auto_error=False, description="JWT access token from POST /auth/login")


def user_from_token(db: Session, token: str | None) -> User:
    """Validate signature/expiry/issuer, then re-check the account in the database on every call."""
    if not token:
        raise unauthenticated()
    claims = decode_access_token(token)
    if claims is None:
        raise unauthenticated("Invalid or expired access token.")
    user = db.get(User, claims.user_id)
    if user is None or not user.is_active:
        raise unauthenticated("Invalid or expired access token.")
    if user.token_valid_after is not None:
        revoked_before_ms = int(user.token_valid_after.astimezone(timezone.utc).timestamp() * 1000)
        if claims.issued_at_ms <= revoked_before_ms:
            raise unauthenticated("This session has been signed out.")
    return user


def get_current_user(
    request: Request,
    db: DbSession,
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    user = user_from_token(db, creds.credentials if creds else None)
    request.state.user_id = str(user.id)
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: str):
    """Coarse role gate. Handlers must still check office/counter scope against database rows."""
    allowed = set(roles)

    def dependency(user: CurrentUser) -> User:
        if user.role not in allowed:
            raise forbidden()
        return user

    return dependency
