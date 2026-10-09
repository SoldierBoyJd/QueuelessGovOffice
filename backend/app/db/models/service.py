import uuid
from datetime import datetime

from sqlalchemy import (Boolean, CheckConstraint, DateTime, ForeignKey, ForeignKeyConstraint, Index, Integer, String,
                        Text, UniqueConstraint, Uuid, func)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Service(Base):
    __tablename__ = "services"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    office_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("offices.id", ondelete="RESTRICT"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    # Also the display-number prefix (e.g. "A" -> "A-018"); unique within the office.
    code: Mapped[str] = mapped_column(String(16), nullable=False)
    department: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    icon_name: Mapped[str | None] = mapped_column(String(64))
    estimated_service_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("estimated_service_minutes > 0", name="service_minutes_positive"),
        UniqueConstraint("office_id", "code", name="uq_services_office_code"),
        UniqueConstraint("id", "office_id", name="uq_services_id_office"),
        Index("ix_services_office_active", "office_id", "is_active"),
    )


class Counter(Base):
    __tablename__ = "counters"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    office_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("offices.id", ondelete="RESTRICT"), nullable=False)
    # NULL = generalist counter that serves every service of the office.
    service_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="ACTIVE")
    status_reason: Mapped[str | None] = mapped_column(Text)
    status_changed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("status IN ('ACTIVE','PAUSED','CLOSED')", name="status_valid"),
        ForeignKeyConstraint(["service_id", "office_id"], ["services.id", "services.office_id"],
                             name="fk_counters_service_office", ondelete="RESTRICT"),
        UniqueConstraint("office_id", "name", name="uq_counters_office_name"),
        UniqueConstraint("id", "office_id", name="uq_counters_id_office"),
        Index("ix_counters_office_status", "office_id", "status"),
    )
