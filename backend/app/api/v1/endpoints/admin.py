"""Administration: offices, services, counters, staff accounts, audit trail. Every change is audited."""
import uuid
from datetime import time
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import EmailStr, Field, model_validator
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import DbSession, require_roles
from app.core.errors import bad_request, conflict, forbidden, not_found
from app.core.security import hash_password
from app.db.models import AuditLog, Counter, Office, Service, Token, User
from app.domain.token_states import COUNTER_HOLDING_STATES, Role
from app.schemas.auth import UserOut, _clean_phone
from app.schemas.catalog import (CounterCreate, CounterOut, CounterUpdate, OfficeCreate, OfficeOut, OfficeUpdate,
                                 ServiceCreate, ServiceOut, ServiceUpdate)
from app.schemas.common import Limit, Offset, Page, StrictRequest, page
from app.services import access, audit_service, views
from app.services.timeutil import utcnow

router = APIRouter(prefix="/admin", tags=["admin"])
AdminUser = Annotated[User, Depends(require_roles(Role.OFFICE_ADMIN.value, Role.SUPER_ADMIN.value))]
SuperUser = Annotated[User, Depends(require_roles(Role.SUPER_ADMIN.value))]


def _t(value: str | None) -> time | None:
    return time.fromisoformat(value) if value else None


def _commit_unique(db, message: str, code: str) -> None:
    """Commit; a unique-constraint violation becomes a 409 instead of a 500."""
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise conflict(code, message) from None


def _flush_unique(db, message: str, code: str) -> None:
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise conflict(code, message) from None


def _office(db, office_id: uuid.UUID) -> Office:
    office = db.get(Office, office_id)
    if office is None:
        raise not_found("OFFICE_NOT_FOUND", "The requested office was not found.")
    return office


# ------------------------------------------------------------------ offices
@router.post("/offices", response_model=OfficeOut, status_code=201)
def create_office(body: OfficeCreate, db: DbSession, user: SuperUser):
    from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
    try:
        ZoneInfo(body.timezone)
    except (ZoneInfoNotFoundError, ValueError):
        raise bad_request("VALIDATION_ERROR", "Unknown timezone.", [{"field": "timezone", "issue": "Unknown timezone"}]
                          ) from None
    data = body.model_dump()
    data["opening_time"], data["closing_time"] = _t(body.opening_time), _t(body.closing_time)
    data["code"] = body.code.upper()
    office = Office(**data)
    db.add(office)
    _flush_unique(db, "An office with this code already exists.", "OFFICE_CODE_EXISTS")
    audit_service.record(db, actor=user, action="OFFICE_CREATED", entity_type="OFFICE", entity_id=office.id,
                         office_id=office.id, detail={"code": office.code, "name": office.name})
    _commit_unique(db, "An office with this code already exists.", "OFFICE_CODE_EXISTS")
    return views.office_out(db, [office])[0]


@router.patch("/offices/{office_id}", response_model=OfficeOut)
def update_office(office_id: uuid.UUID, body: OfficeUpdate, db: DbSession, user: AdminUser):
    office = _office(db, office_id)
    access.ensure_office_admin(user, office.id)
    changes = body.model_dump(exclude_unset=True)
    if not access.is_super(user) and ({"timezone", "is_active"} & changes.keys()):
        raise forbidden("Only a super admin can change an office's timezone or active status.")
    if "timezone" in changes:
        from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
        try:
            ZoneInfo(changes["timezone"])
        except (ZoneInfoNotFoundError, ValueError, TypeError):
            raise bad_request("VALIDATION_ERROR", "Unknown timezone.") from None
    for key in ("opening_time", "closing_time"):
        if key in changes:
            changes[key] = _t(changes[key])
    before = {k: str(getattr(office, k)) for k in changes}
    for k, v in changes.items():
        setattr(office, k, v)
    audit_service.record(db, actor=user, action="OFFICE_UPDATED", entity_type="OFFICE", entity_id=office.id,
                         office_id=office.id, detail={"changed": sorted(changes), "before": before})
    db.commit()
    return views.office_out(db, [office])[0]


# ------------------------------------------------------------------ services
@router.post("/offices/{office_id}/services", response_model=ServiceOut, status_code=201)
def create_service(office_id: uuid.UUID, body: ServiceCreate, db: DbSession, user: AdminUser):
    office = _office(db, office_id)
    access.ensure_office_admin(user, office.id)
    svc = Service(office_id=office.id, **{**body.model_dump(), "code": body.code.upper()})
    db.add(svc)
    _flush_unique(db, "A service with this code already exists in the office.", "SERVICE_CODE_EXISTS")
    audit_service.record(db, actor=user, action="SERVICE_CREATED", entity_type="SERVICE", entity_id=svc.id,
                         office_id=office.id, detail={"code": svc.code, "name": svc.name})
    _commit_unique(db, "A service with this code already exists in the office.", "SERVICE_CODE_EXISTS")
    return views.service_outs(db, office, [svc], with_wait=False)[0]


@router.patch("/services/{service_id}", response_model=ServiceOut)
def update_service(service_id: uuid.UUID, body: ServiceUpdate, db: DbSession, user: AdminUser):
    svc = db.get(Service, service_id)
    if svc is None:
        raise not_found("SERVICE_NOT_FOUND", "The requested service was not found.")
    access.ensure_office_admin(user, svc.office_id)
    changes = body.model_dump(exclude_unset=True)
    for k, v in changes.items():
        setattr(svc, k, v)
    audit_service.record(db, actor=user, action="SERVICE_UPDATED", entity_type="SERVICE", entity_id=svc.id,
                         office_id=svc.office_id, detail={"changed": sorted(changes)})
    db.commit()
    return views.service_outs(db, db.get(Office, svc.office_id), [svc], with_wait=False)[0]


# ------------------------------------------------------------------ counters
def _validate_counter_service(db, office_id: uuid.UUID, service_id: uuid.UUID | None) -> None:
    if service_id is None:
        return
    svc = db.get(Service, service_id)
    if svc is None or svc.office_id != office_id:
        raise bad_request("VALIDATION_ERROR", "That service does not belong to this office.",
                          [{"field": "service_id", "issue": "Service is not offered by this office."}])


@router.post("/offices/{office_id}/counters", response_model=CounterOut, status_code=201)
def create_counter(office_id: uuid.UUID, body: CounterCreate, db: DbSession, user: AdminUser):
    office = _office(db, office_id)
    access.ensure_office_admin(user, office.id)
    _validate_counter_service(db, office.id, body.service_id)
    counter = Counter(office_id=office.id, name=body.name, service_id=body.service_id)
    db.add(counter)
    _flush_unique(db, "A counter with this name already exists in the office.", "COUNTER_NAME_EXISTS")
    audit_service.record(db, actor=user, action="COUNTER_CREATED", entity_type="COUNTER", entity_id=counter.id,
                         office_id=office.id, detail={"name": counter.name})
    _commit_unique(db, "A counter with this name already exists in the office.", "COUNTER_NAME_EXISTS")
    return views.counter_outs(db, [counter])[0]


@router.patch("/counters/{counter_id}", response_model=CounterOut)
def update_counter(counter_id: uuid.UUID, body: CounterUpdate, db: DbSession, user: AdminUser):
    counter = db.scalars(select(Counter).where(Counter.id == counter_id).with_for_update(key_share=True)).one_or_none()
    if counter is None:
        raise not_found("COUNTER_NOT_FOUND", "The requested counter was not found.")
    access.ensure_office_admin(user, counter.office_id)
    changes = body.model_dump(exclude_unset=True)
    if "service_id" in changes or body.clear_service:
        new_service = None if body.clear_service else body.service_id
        _validate_counter_service(db, counter.office_id, new_service)
        holding = db.scalar(select(Token.id).where(
            Token.counter_id == counter.id, Token.status.in_([s.value for s in COUNTER_HOLDING_STATES])).limit(1))
        if holding is not None:
            raise conflict("COUNTER_HAS_ACTIVE_TOKEN", "Release the counter's active token before changing its service.")
        counter.service_id = new_service
    if body.name:
        counter.name = body.name
    audit_service.record(db, actor=user, action="COUNTER_UPDATED", entity_type="COUNTER", entity_id=counter.id,
                         office_id=counter.office_id, detail={"changed": sorted(changes)})
    _commit_unique(db, "A counter with this name already exists in the office.", "COUNTER_NAME_EXISTS")
    return views.counter_outs(db, [counter])[0]


# ------------------------------------------------------------------ users
STAFF_ASSIGNABLE = {Role.OFFICER.value, Role.OFFICE_ADMIN.value}


class StaffCreate(StrictRequest):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128, description="Initial password set by the administrator")
    phone: str | None = Field(default=None, max_length=32)
    role: Role
    office_id: uuid.UUID | None = None
    counter_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def _check(self):
        if self.role == Role.CITIZEN:
            raise ValueError("Citizens register themselves; use public registration.")
        if self.phone:
            self.phone = _clean_phone(self.phone)
        return self


class UserPatch(StrictRequest):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=32)
    is_active: bool | None = None
    counter_id: uuid.UUID | None = None
    clear_counter: bool = False


class RoleChange(StrictRequest):
    role: Role
    office_id: uuid.UUID | None = None


def _validate_staff_scope(db, role: str, office_id: uuid.UUID | None, counter_id: uuid.UUID | None) -> None:
    if role in STAFF_ASSIGNABLE:
        if office_id is None:
            raise bad_request("VALIDATION_ERROR", "Staff accounts need an office.",
                              [{"field": "office_id", "issue": "Required for OFFICER and OFFICE_ADMIN."}])
        _office(db, office_id)
    elif office_id is not None or counter_id is not None:
        raise bad_request("VALIDATION_ERROR", f"{role} accounts are not tied to an office or counter.")
    if counter_id is not None:
        counter = db.get(Counter, counter_id)
        if counter is None or counter.office_id != office_id:
            raise bad_request("VALIDATION_ERROR", "That counter does not belong to the office.",
                              [{"field": "counter_id", "issue": "Counter is not in this office."}])
        if role != Role.OFFICER.value:
            raise bad_request("VALIDATION_ERROR", "Only officers can be pinned to a counter.")


def _manageable_user(db, actor: User, user_id: uuid.UUID) -> User:
    target = db.get(User, user_id)
    if target is None:
        raise not_found("USER_NOT_FOUND", "The requested user was not found.")
    if access.is_super(actor):
        return target
    # Office admins manage only the officers of their own office.
    if target.role != Role.OFFICER.value or target.office_id != actor.office_id:
        raise not_found("USER_NOT_FOUND", "The requested user was not found.")
    return target


@router.get("/users", response_model=Page[UserOut])
def list_users(db: DbSession, user: AdminUser, role: Role | None = None, office_id: uuid.UUID | None = None,
               is_active: bool | None = None, q: Annotated[str | None, Query(max_length=100)] = None,
               limit: Limit = 20, offset: Offset = 0):
    stmt = select(User)
    if not access.is_super(user):
        stmt = stmt.where(User.office_id == user.office_id, User.role == Role.OFFICER.value)
    else:
        if office_id:
            stmt = stmt.where(User.office_id == office_id)
    if role and access.is_super(user):
        stmt = stmt.where(User.role == role.value)
    if is_active is not None:
        stmt = stmt.where(User.is_active.is_(is_active))
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(User.full_name.ilike(like), User.email.ilike(like)))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(User.created_at.desc(), User.id).limit(limit).offset(offset)).all()
    return page([views.user_out(u) for u in rows], total, limit, offset)


@router.post("/users", response_model=UserOut, status_code=201)
def create_staff(body: StaffCreate, db: DbSession, user: AdminUser):
    """Staff provisioning (public registration can never create these roles)."""
    if not access.is_super(user):
        if body.role != Role.OFFICER or body.office_id != user.office_id:
            raise forbidden("Office admins can only create officers in their own office.")
    _validate_staff_scope(db, body.role.value, body.office_id, body.counter_id)
    email = body.email.lower()
    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise conflict("EMAIL_ALREADY_EXISTS", "An account with this email already exists.")
    staff = User(full_name=body.full_name, email=email, phone=body.phone, role=body.role.value,
                 office_id=body.office_id, counter_id=body.counter_id, password_hash=hash_password(body.password),
                 verification_status="APPROVED" if body.role in (Role.OFFICER, Role.OFFICE_ADMIN) else "NOT_REQUIRED")
    db.add(staff)
    _flush_unique(db, "An account with this email already exists.", "EMAIL_ALREADY_EXISTS")
    audit_service.record(db, actor=user, action="USER_CREATED", entity_type="USER", entity_id=staff.id,
                         office_id=staff.office_id, detail={"role": staff.role, "email": staff.email})
    _commit_unique(db, "An account with this email already exists.", "EMAIL_ALREADY_EXISTS")
    return views.user_out(staff)


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(user_id: uuid.UUID, body: UserPatch, db: DbSession, actor: AdminUser):
    target = _manageable_user(db, actor, user_id)
    changes = body.model_dump(exclude_unset=True)
    if "is_active" in changes and body.is_active is False and target.id == actor.id:
        raise bad_request("CANNOT_DEACTIVATE_SELF", "You cannot deactivate your own account.")
    if body.full_name:
        target.full_name = body.full_name
    if "phone" in changes:
        target.phone = _clean_phone(body.phone)
    if body.is_active is not None:
        target.is_active = body.is_active
        if not body.is_active:
            target.token_valid_after = utcnow()  # cut existing sessions immediately
    if body.clear_counter:
        target.counter_id = None
    elif body.counter_id is not None:
        _validate_staff_scope(db, target.role, target.office_id, body.counter_id)
        target.counter_id = body.counter_id
    audit_service.record(db, actor=actor, action="USER_UPDATED", entity_type="USER", entity_id=target.id,
                         office_id=target.office_id, detail={"changed": sorted(changes)})
    db.commit()
    return views.user_out(target)


@router.patch("/users/{user_id}/role", response_model=UserOut)
def change_role(user_id: uuid.UUID, body: RoleChange, db: DbSession, actor: SuperUser):
    """SUPER_ADMIN only, always audited. (`PATCH /users/me` can never change a role.)"""
    target = db.get(User, user_id)
    if target is None:
        raise not_found("USER_NOT_FOUND", "The requested user was not found.")
    if target.id == actor.id:
        raise bad_request("CANNOT_CHANGE_OWN_ROLE", "You cannot change your own role.")
    office_id = body.office_id if body.role.value in STAFF_ASSIGNABLE else None
    _validate_staff_scope(db, body.role.value, office_id, None)
    old = (target.role, target.office_id)
    target.role, target.office_id, target.counter_id = body.role.value, office_id, None
    if body.role.value in STAFF_ASSIGNABLE:
        target.verification_status = "APPROVED"
    audit_service.record(db, actor=actor, action="ROLE_CHANGED", entity_type="USER", entity_id=target.id,
                         office_id=office_id, detail={"from": old[0], "to": body.role.value,
                                                      "from_office": str(old[1]) if old[1] else None,
                                                      "to_office": str(office_id) if office_id else None})
    db.commit()
    return views.user_out(target)


# ------------------------------------------------------------------ audit trail
@router.get("/audit-logs", response_model=dict)
def audit_logs(db: DbSession, user: AdminUser, entity_type: Annotated[str | None, Query(max_length=32)] = None,
               action: Annotated[str | None, Query(max_length=64)] = None, office_id: uuid.UUID | None = None,
               limit: Limit = 50, offset: Offset = 0):
    stmt = select(AuditLog)
    if not access.is_super(user):
        stmt = stmt.where(AuditLog.office_id == user.office_id)
    elif office_id:
        stmt = stmt.where(AuditLog.office_id == office_id)
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(AuditLog.created_at.desc(), AuditLog.id).limit(limit).offset(offset)).all()
    actors = {u.id: u.full_name for u in db.scalars(select(User).where(
        User.id.in_({r.actor_user_id for r in rows if r.actor_user_id})))} if rows else {}
    items = [{"id": str(r.id), "timestamp": r.created_at.isoformat(), "actor": actors.get(r.actor_user_id, "System"),
              "actor_user_id": str(r.actor_user_id) if r.actor_user_id else None, "action": r.action,
              "entity_type": r.entity_type, "entity_id": r.entity_id,
              "office_id": str(r.office_id) if r.office_id else None, "detail": r.detail, "type": (
                  "SYSTEM" if r.source == "SYSTEM" else "HUMAN")} for r in rows]
    return page(items, total, limit, offset)
