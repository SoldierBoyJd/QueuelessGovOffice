import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

from app.core.config import settings

_hasher = PasswordHash((Argon2Hasher(),))
# Used to equalize timing when the account does not exist.
_DUMMY_HASH = _hasher.hash("not-a-real-password")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        _hasher.verify(password, _DUMMY_HASH)
        return False
    try:
        return _hasher.verify(password, password_hash)
    except Exception:
        return False


@dataclass
class TokenClaims:
    user_id: uuid.UUID
    issued_at_ms: int


def create_access_token(user_id: uuid.UUID) -> tuple[str, int]:
    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": str(user_id),
        "iss": settings.jwt_issuer,
        "iat": int(now.timestamp()),
        "exp": int(expires.timestamp()),
        # Millisecond issue time lets logout revoke every token issued before it.
        "ims": int(time.time() * 1000),
        "jti": uuid.uuid4().hex,
    }
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, settings.access_token_expire_minutes * 60


def decode_access_token(token: str) -> TokenClaims | None:
    """Return claims for a valid token, or None (never raises)."""
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            issuer=settings.jwt_issuer,
            options={"require": ["exp", "sub", "iss", "ims"]},
        )
        return TokenClaims(user_id=uuid.UUID(payload["sub"]), issued_at_ms=int(payload["ims"]))
    except (jwt.PyJWTError, ValueError, KeyError, TypeError):
        return None
