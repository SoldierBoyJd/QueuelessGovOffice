from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.api.deps import CurrentUser, DbSession
from app.core.errors import AppError, conflict, forbidden
from app.core.ratelimit import rate_limit
from app.core.security import create_access_token, hash_password, verify_password
from app.db.models import User
from app.domain.token_states import Role, VerificationStatus
from app.schemas.auth import (LoginRequest, LoginResponse, ProfileUpdate, RegisterRequest, RegisterResponse,
                              UserOut)
from app.services import views
from app.services.timeutil import utcnow

router = APIRouter(tags=["auth"])


@router.post("/auth/register", response_model=RegisterResponse, status_code=201,
             dependencies=[Depends(rate_limit("register", 10, 3600))])
def register(body: RegisterRequest, db: DbSession):
    """Public registration creates CITIZEN accounts only; staff are provisioned by administrators."""
    email = body.email.lower()
    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise conflict("EMAIL_ALREADY_EXISTS", "An account with this email already exists.")
    user = User(full_name=body.full_name, email=email, phone=body.phone, password_hash=hash_password(body.password),
                role=Role.CITIZEN.value, verification_status=VerificationStatus.NOT_REQUIRED.value)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise conflict("EMAIL_ALREADY_EXISTS", "An account with this email already exists.") from None
    return {"user": views.user_out(user)}


@router.post("/auth/login", response_model=LoginResponse,
             dependencies=[Depends(rate_limit("login", 10, 60))])
def login(body: LoginRequest, db: DbSession):
    user = db.scalars(select(User).where(User.email == body.email.lower())).one_or_none()
    # Same generic failure for unknown email and wrong password.
    if not verify_password(body.password, user.password_hash if user else None):
        raise AppError(401, "INVALID_CREDENTIALS", "Incorrect email or password.")
    assert user is not None
    if not user.is_active:
        raise forbidden("This account has been disabled.", code="ACCOUNT_DISABLED")
    token, expires_in = create_access_token(user.id)
    return {"access_token": token, "token_type": "bearer", "expires_in": expires_in, "user": views.user_out(user)}


@router.post("/auth/logout", status_code=204)
def logout(user: CurrentUser, db: DbSession):
    """Revokes every access token issued to this user up to now (server-side)."""
    user.token_valid_after = utcnow()
    db.commit()
    return Response(status_code=204)


@router.get("/auth/me", response_model=UserOut, include_in_schema=False)
@router.get("/users/me", response_model=UserOut, tags=["users"])
def me(user: CurrentUser):
    return views.user_out(user)


@router.patch("/users/me", response_model=UserOut, tags=["users"])
def update_me(body: ProfileUpdate, user: CurrentUser, db: DbSession):
    data = body.model_dump(exclude_unset=True)
    if "full_name" in data and data["full_name"] is not None:
        user.full_name = data["full_name"]
    if "phone" in data:
        user.phone = data["phone"]
    db.commit()
    return views.user_out(user)
