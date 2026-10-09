import re
import uuid
from datetime import datetime

from pydantic import EmailStr, Field, field_validator

from app.schemas.common import ORMModel, StrictRequest

_PHONE_RE = re.compile(r"^\+?[0-9]{8,15}$")


def _clean_phone(v: str | None) -> str | None:
    if v is None or v == "":
        return None
    cleaned = re.sub(r"[\s\-()]", "", v)
    if not _PHONE_RE.match(cleaned):
        raise ValueError("Enter a valid phone number (8-15 digits, optional leading +).")
    return cleaned


class RegisterRequest(StrictRequest):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone: str | None = Field(default=None, max_length=32)

    _phone = field_validator("phone")(_clean_phone)


class LoginRequest(StrictRequest):
    # Plain string on purpose: login only looks up an existing account, and strict address validation
    # would lock out accounts on reserved domains (e.g. the seeded *.test demo users).
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def _normalize(cls, v: str) -> str:
        return v.strip().lower()


class UserOut(ORMModel):
    id: uuid.UUID
    full_name: str
    email: str
    phone: str | None = None
    role: str
    verification_status: str
    office_id: uuid.UUID | None = None
    counter_id: uuid.UUID | None = None
    is_active: bool = True
    avatar_initials: str
    created_at: datetime


class RegisterResponse(ORMModel):
    user: UserOut


class LoginResponse(ORMModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


class ProfileUpdate(StrictRequest):
    """Only these fields are user-editable; role, office, verification and active status are not."""
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=32)

    _phone = field_validator("phone")(_clean_phone)
