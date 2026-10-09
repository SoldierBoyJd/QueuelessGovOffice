import uuid
from datetime import datetime

from sqlalchemy import (CheckConstraint, DateTime, ForeignKey, ForeignKeyConstraint, Index, Numeric, String, Text,
                        Uuid, func, text)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.token import JsonType


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    token_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("tokens.id", ondelete="RESTRICT"))
    type: Mapped[str] = mapped_column(String(32), nullable=False)
    severity: Mapped[str] = mapped_column(String(16), nullable=False, default="INFO")
    title: Mapped[str] = mapped_column(Text, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.clock_timestamp())
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivery_status: Mapped[str] = mapped_column(String(16), nullable=False, default="IN_APP")

    __table_args__ = (
        CheckConstraint(
            "type IN ('TOKEN_CREATED','TURN_APPROACHING','TOKEN_CALLED','SERVICE_STARTED','TOKEN_COMPLETED',"
            "'TOKEN_NO_SHOW','TOKEN_CANCELLED','TOKEN_REQUEUED','SERVICE_UPDATE','VERIFICATION_UPDATE')",
            name="type_valid"),
        CheckConstraint("severity IN ('INFO','SUCCESS','WARNING','ERROR')", name="severity_valid"),
        CheckConstraint("delivery_status IN ('IN_APP','PENDING','SENT','FAILED')", name="delivery_status_valid"),
        Index("ix_notifications_user_created", "user_id", text("created_at DESC")),
        Index("ix_notifications_user_unread", "user_id", text("created_at DESC"),
              postgresql_where=text("read_at IS NULL")),
        # At most one TURN_APPROACHING per token.
        Index("uq_notifications_turn_approaching", "token_id", unique=True,
              postgresql_where=text("type = 'TURN_APPROACHING'")),
    )


class PredictionSnapshot(Base):
    """ETA recorded when a token is created; later compared with the actual wait to measure error."""
    __tablename__ = "prediction_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    office_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("offices.id", ondelete="RESTRICT"), nullable=False)
    service_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    token_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("tokens.id", ondelete="RESTRICT"))
    predicted_wait_minutes: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    lower_minutes: Mapped[float | None] = mapped_column(Numeric(8, 2))
    upper_minutes: Mapped[float | None] = mapped_column(Numeric(8, 2))
    queue_position: Mapped[int | None] = mapped_column()
    method: Mapped[str] = mapped_column(String(16), nullable=False)
    model_version: Mapped[str | None] = mapped_column(String(64))
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("predicted_wait_minutes >= 0", name="wait_nonneg"),
        CheckConstraint("method IN ('BASELINE','ML')", name="method_valid"),
        CheckConstraint("method <> 'ML' OR model_version IS NOT NULL", name="ml_requires_version"),
        ForeignKeyConstraint(["service_id", "office_id"], ["services.id", "services.office_id"],
                             name="fk_prediction_snapshots_service_office", ondelete="RESTRICT"),
        Index("ix_prediction_token_time", "token_id", text("generated_at DESC")),
    )


class AuditLog(Base):
    """Administrative / security audit trail (queue transitions live in queue_events)."""
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="RESTRICT"))
    source: Mapped[str] = mapped_column(String(16), nullable=False, default="HUMAN")
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(32), nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String(64))
    office_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("offices.id", ondelete="RESTRICT"))
    detail: Mapped[dict] = mapped_column(JsonType, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.clock_timestamp())

    __table_args__ = (
        CheckConstraint("source IN ('HUMAN','SYSTEM')", name="source_valid"),
        Index("ix_audit_logs_created", text("created_at DESC")),
        Index("ix_audit_logs_entity", "entity_type", "entity_id"),
    )


class StaffApplication(Base):
    """Staff onboarding request reviewed by a human (metadata only; no document files are stored)."""
    __tablename__ = "staff_applications"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    applicant_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    requested_role: Mapped[str] = mapped_column(String(32), nullable=False)
    requested_office_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("offices.id", ondelete="RESTRICT"),
                                                           nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="PENDING")
    documents: Mapped[list] = mapped_column(JsonType, nullable=False, default=list)
    findings: Mapped[list] = mapped_column(JsonType, nullable=False, default=list)
    reviewer_note: Mapped[str | None] = mapped_column(Text)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="RESTRICT"))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("requested_role IN ('OFFICER','OFFICE_ADMIN')", name="requested_role_valid"),
        CheckConstraint(
            "status IN ('PENDING','UNDER_REVIEW','APPROVED','REJECTED','MORE_INFO_REQUIRED')", name="status_valid"),
        Index("ix_staff_applications_office_status", "requested_office_id", "status"),
        Index("uq_staff_applications_one_open", "applicant_id", unique=True,
              postgresql_where=text("status IN ('PENDING','UNDER_REVIEW','MORE_INFO_REQUIRED')")),
    )
