"""Staff onboarding review ("verification copilot").

Findings here are plain rule checks on submitted metadata (labelled SYSTEM). There is no OCR or AI
analysis of documents: `ai_assessment` is always null until such a pipeline exists. A human makes
every decision, and every step is written to the audit trail.
"""
import uuid
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import CurrentUser, DbSession, require_roles
from app.core.errors import bad_request, conflict, forbidden, not_found
from app.db.models import AuditLog, Office, StaffApplication, User
from app.domain.token_states import Role
from app.realtime import publisher
from app.schemas.common import Limit, Offset, StrictRequest, page
from app.services import access, audit_service, notification_service
from app.services.timeutil import utcnow

router = APIRouter(prefix="/verification", tags=["verification"])
OPEN = ("PENDING", "UNDER_REVIEW", "MORE_INFO_REQUIRED")
Reviewer = Annotated[User, Depends(require_roles(Role.OFFICE_ADMIN.value, Role.SUPER_ADMIN.value))]


class DocumentIn(StrictRequest):
    name: str = Field(min_length=1, max_length=200)
    doc_type: str = Field(min_length=1, max_length=64)


class ApplicationCreate(StrictRequest):
    requested_role: Literal["OFFICER", "OFFICE_ADMIN"] = "OFFICER"
    requested_office_id: uuid.UUID
    documents: list[DocumentIn] = Field(default_factory=list, max_length=10)


class Resubmit(StrictRequest):
    documents: list[DocumentIn] = Field(min_length=1, max_length=10)


class Decision(StrictRequest):
    decision: Literal["APPROVE", "REJECT", "MORE_INFO"]
    note: str | None = Field(default=None, max_length=1000)


class ApplicationOut(BaseModel):
    id: uuid.UUID
    applicant: dict
    requested_role: str
    requested_office: dict
    status: str
    documents: list
    findings: list
    ai_assessment: str | None = None
    reviewer_note: str | None = None
    reviewed_by: str | None = None
    reviewed_at: str | None = None
    submitted_at: str
    audit_log: list


def _findings(applicant: User, office: Office | None, documents: list[dict]) -> list[dict]:
    out = []

    def add(type_: str, label: str, detail: str | None = None) -> None:
        out.append({"id": f"f{len(out) + 1}", "type": type_, "label": label, "detail": detail, "source": "SYSTEM"})

    domain = applicant.email.rsplit("@", 1)[-1].lower()
    if domain.endswith(".gov.in") or domain.endswith(".nic.in") or domain in ("gov.in", "nic.in"):
        add("SUCCESS", "Official government email domain", domain)
    else:
        add("WARNING", "Email is not on a recognised government domain", domain)
    add("SUCCESS" if applicant.phone else "WARNING", "Phone number on file" if applicant.phone
        else "No phone number on file")
    if office is not None and office.is_active:
        add("SUCCESS", "Requested office exists and is active", office.name)
    else:
        add("ERROR", "Requested office is missing or inactive")
    if documents:
        add("INFO", f"{len(documents)} document(s) submitted",
            "Document contents are not analysed automatically; a reviewer must inspect them.")
    else:
        add("ERROR", "No supporting documents were submitted")
    return out


def _serialize(db, app: StaffApplication) -> dict:
    applicant = db.get(User, app.applicant_id)
    office = db.get(Office, app.requested_office_id)
    reviewer = db.get(User, app.reviewed_by) if app.reviewed_by else None
    logs = db.scalars(select(AuditLog).where(AuditLog.entity_type == "STAFF_APPLICATION",
                                             AuditLog.entity_id == str(app.id)).order_by(AuditLog.created_at)).all()
    names = {u.id: u.full_name for u in db.scalars(select(User).where(
        User.id.in_({r.actor_user_id for r in logs if r.actor_user_id})))} if logs else {}
    return {
        "id": app.id,
        "applicant": {"id": str(applicant.id), "name": applicant.full_name, "email": applicant.email,
                      "phone": applicant.phone},
        "requested_role": app.requested_role,
        "requested_office": {"id": str(office.id), "name": office.name} if office else {},
        "status": app.status, "documents": app.documents, "findings": app.findings, "ai_assessment": None,
        "reviewer_note": app.reviewer_note, "reviewed_by": reviewer.full_name if reviewer else None,
        "reviewed_at": app.reviewed_at.isoformat() if app.reviewed_at else None,
        "submitted_at": app.submitted_at.isoformat(),
        "audit_log": [{"id": str(r.id), "timestamp": r.created_at.isoformat(),
                       "actor": names.get(r.actor_user_id, "System"), "action": r.action, "detail": r.detail,
                       "type": "SYSTEM" if r.source == "SYSTEM" else "HUMAN"} for r in logs],
    }


def _can_review(reviewer: User, app: StaffApplication) -> None:
    if app.applicant_id == reviewer.id:
        raise forbidden("You cannot review your own application.")
    if access.is_super(reviewer):
        return
    if app.requested_role != Role.OFFICER.value or app.requested_office_id != reviewer.office_id:
        raise not_found("APPLICATION_NOT_FOUND", "The requested application was not found.")


def _get_app(db, app_id: uuid.UUID, for_update: bool = False) -> StaffApplication:
    stmt = select(StaffApplication).where(StaffApplication.id == app_id)
    if for_update:
        stmt = stmt.with_for_update(key_share=True)
    app = db.scalars(stmt).one_or_none()
    if app is None:
        raise not_found("APPLICATION_NOT_FOUND", "The requested application was not found.")
    return app


@router.post("/applications", response_model=ApplicationOut, status_code=201)
def submit_application(body: ApplicationCreate, db: DbSession,
                       user: Annotated[User, Depends(require_roles(Role.CITIZEN.value))]):
    """A citizen asks to be onboarded as staff. Only document metadata is stored (no files)."""
    office = db.get(Office, body.requested_office_id)
    if office is None or not office.is_active:
        raise not_found("OFFICE_NOT_FOUND", "The requested office was not found.")
    docs = [{**d.model_dump(), "uploaded_at": utcnow().isoformat()} for d in body.documents]
    app = StaffApplication(applicant_id=user.id, requested_role=body.requested_role,
                           requested_office_id=office.id, documents=docs, findings=_findings(user, office, docs))
    db.add(app)
    user.verification_status = "PENDING"
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise conflict("APPLICATION_ALREADY_OPEN", "You already have an application in progress.") from None
    audit_service.record(db, actor=user, action="APPLICATION_SUBMITTED", entity_type="STAFF_APPLICATION",
                         entity_id=app.id, office_id=office.id,
                         detail={"requested_role": app.requested_role, "documents": len(docs)})
    db.commit()
    return _serialize(db, app)


@router.get("/applications/mine", response_model=dict)
def my_applications(db: DbSession, user: CurrentUser):
    rows = db.scalars(select(StaffApplication).where(StaffApplication.applicant_id == user.id)
                      .order_by(StaffApplication.submitted_at.desc())).all()
    return {"items": [_serialize(db, a) for a in rows]}


@router.get("/applications", response_model=dict)
def list_applications(db: DbSession, user: Reviewer, status: Annotated[str | None, Query(max_length=32)] = None,
                      limit: Limit = 20, offset: Offset = 0):
    stmt = select(StaffApplication)
    if not access.is_super(user):
        stmt = stmt.where(StaffApplication.requested_office_id == user.office_id,
                          StaffApplication.requested_role == Role.OFFICER.value)
    if status:
        stmt = stmt.where(StaffApplication.status == status)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(StaffApplication.submitted_at.desc()).limit(limit).offset(offset)).all()
    return page([_serialize(db, a) for a in rows], total, limit, offset)


@router.get("/applications/{application_id}", response_model=ApplicationOut)
def get_application(application_id: uuid.UUID, db: DbSession, user: CurrentUser):
    app = _get_app(db, application_id)
    if app.applicant_id != user.id:
        if user.role not in (Role.OFFICE_ADMIN.value, Role.SUPER_ADMIN.value):
            raise not_found("APPLICATION_NOT_FOUND", "The requested application was not found.")
        _can_review(user, app)
    return _serialize(db, app)


@router.post("/applications/{application_id}/start-review", response_model=ApplicationOut)
def start_review(application_id: uuid.UUID, db: DbSession, user: Reviewer):
    app = _get_app(db, application_id, for_update=True)
    _can_review(user, app)
    if app.status != "PENDING":
        raise conflict("INVALID_APPLICATION_STATE", f"Only pending applications can be put under review ({app.status}).")
    app.status = "UNDER_REVIEW"
    applicant = db.get(User, app.applicant_id)
    applicant.verification_status = "UNDER_REVIEW"
    audit_service.record(db, actor=user, action="APPLICATION_REVIEW_STARTED", entity_type="STAFF_APPLICATION",
                         entity_id=app.id, office_id=app.requested_office_id)
    db.commit()
    return _serialize(db, app)


@router.post("/applications/{application_id}/resubmit", response_model=ApplicationOut)
def resubmit(application_id: uuid.UUID, body: Resubmit, db: DbSession, user: CurrentUser):
    app = _get_app(db, application_id, for_update=True)
    if app.applicant_id != user.id:
        raise not_found("APPLICATION_NOT_FOUND", "The requested application was not found.")
    if app.status != "MORE_INFO_REQUIRED":
        raise conflict("INVALID_APPLICATION_STATE", "More information was not requested for this application.")
    docs = [{**d.model_dump(), "uploaded_at": utcnow().isoformat()} for d in body.documents]
    app.documents = [*app.documents, *docs]
    app.findings = _findings(user, db.get(Office, app.requested_office_id), app.documents)
    app.status = "PENDING"
    user.verification_status = "PENDING"
    audit_service.record(db, actor=user, action="APPLICATION_RESUBMITTED", entity_type="STAFF_APPLICATION",
                         entity_id=app.id, office_id=app.requested_office_id, detail={"documents_added": len(docs)})
    db.commit()
    return _serialize(db, app)


@router.post("/applications/{application_id}/decision", response_model=ApplicationOut)
def decide(application_id: uuid.UUID, body: Decision, db: DbSession, user: Reviewer):
    """Human decision. APPROVE promotes the applicant to the requested staff role for the requested office."""
    app = _get_app(db, application_id, for_update=True)
    _can_review(user, app)
    if app.status not in ("PENDING", "UNDER_REVIEW"):
        raise conflict("INVALID_APPLICATION_STATE", f"This application is already {app.status}.")
    if body.decision != "APPROVE" and not body.note:
        raise bad_request("VALIDATION_ERROR", "A note is required to reject or request more information.",
                          [{"field": "note", "issue": "Required"}])
    applicant = db.get(User, app.applicant_id)
    new_status = {"APPROVE": "APPROVED", "REJECT": "REJECTED", "MORE_INFO": "MORE_INFO_REQUIRED"}[body.decision]
    if body.decision == "APPROVE":
        office = db.get(Office, app.requested_office_id)
        if office is None or not office.is_active:
            raise conflict("OFFICE_NOT_ACTIVE", "The requested office is no longer active.")
        applicant.role = app.requested_role
        applicant.office_id = app.requested_office_id
        applicant.counter_id = None
    app.status = new_status
    app.reviewer_note = body.note
    app.reviewed_by = user.id
    app.reviewed_at = utcnow()
    applicant.verification_status = new_status
    audit_service.record(db, actor=user, action=f"APPLICATION_{new_status}", entity_type="STAFF_APPLICATION",
                         entity_id=app.id, office_id=app.requested_office_id,
                         detail={"decision": body.decision, "note": body.note})
    messages = {
        "APPROVED": ("SUCCESS", "Staff application approved", "You can now sign in again as office staff."),
        "REJECTED": ("ERROR", "Staff application rejected", body.note or ""),
        "MORE_INFO_REQUIRED": ("WARNING", "More information needed", body.note or ""),
    }
    sev, title, msg = messages[new_status]
    notification_service.notify(db, user_id=applicant.id, type_="VERIFICATION_UPDATE", severity=sev, title=title,
                                message=msg, office_id=app.requested_office_id)
    publisher.commit_and_publish(db)
    return _serialize(db, app)
