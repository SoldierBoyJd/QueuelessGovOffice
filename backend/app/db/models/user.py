import uuid
from datetime import datetime

from sqlalchemy import (Boolean, CheckConstraint, DateTime, ForeignKey, ForeignKeyConstraint, Index, String, Text,
                        Uuid, func)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    # Stored lower-cased; uniqueness is therefore case-insensitive.
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True)
    phone: Mapped[str | None] = mapped_column(Text)
    password_hash: Mapped[str | None] = mapped_column(Text)
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="CITIZEN")
    office_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("offices.id", ondelete="RESTRICT"))
    # Optional: an officer pinned to one counter. NULL = may operate any counter in their office.
    counter_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    verification_status: Mapped[str] = mapped_column(String(32), nullable=False, default="NOT_REQUIRED")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Logout / session revocation: access tokens issued before this instant are rejected.
    token_valid_after: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint(
            "role IN ('CITIZEN','OFFICER','OFFICE_ADMIN','CENTRAL_ADMIN','SUPER_ADMIN')", name="role_valid"),
        CheckConstraint(
            "verification_status IN ('NOT_REQUIRED','PENDING','UNDER_REVIEW','APPROVED','REJECTED',"
            "'MORE_INFO_REQUIRED')", name="verification_status_valid"),
        CheckConstraint("role NOT IN ('OFFICER','OFFICE_ADMIN') OR office_id IS NOT NULL",
                        name="staff_must_have_office"),
        CheckConstraint("counter_id IS NULL OR office_id IS NOT NULL", name="counter_requires_office"),
        ForeignKeyConstraint(["counter_id", "office_id"], ["counters.id", "counters.office_id"],
                             name="fk_users_counter_office", ondelete="RESTRICT"),
        Index("ix_users_office_role", "office_id", "role"),
    )
