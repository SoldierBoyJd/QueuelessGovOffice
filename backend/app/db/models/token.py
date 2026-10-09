import uuid
from datetime import date, datetime

from sqlalchemy import (CheckConstraint, Date, DateTime, ForeignKey, ForeignKeyConstraint, Index, Integer, String, Text,
                        UniqueConstraint, Uuid, func, text)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.db.base import Base

JsonType = JSON().with_variant(JSONB(), "postgresql")


class QueueCounter(Base):
    """One row per (office, service, local date); row-locked to allocate queue numbers atomically."""
    __tablename__ = "queue_counters"

    office_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("offices.id", ondelete="RESTRICT"), primary_key=True)
    service_id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True)
    queue_date: Mapped[date] = mapped_column(Date, primary_key=True)
    last_number: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    __table_args__ = (
        CheckConstraint("last_number >= 0", name="last_number_nonneg"),
        ForeignKeyConstraint(["service_id", "office_id"], ["services.id", "services.office_id"],
                             name="fk_queue_counters_service_office", ondelete="RESTRICT"),
    )


class Token(Base):
    __tablename__ = "tokens"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    display_number: Mapped[str] = mapped_column(String(32), nullable=False)
    citizen_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="RESTRICT"))
    office_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("offices.id", ondelete="RESTRICT"), nullable=False)
    service_id: Mapped[uuid.UUID] = mapped_column(Uuid, nullable=False)
    counter_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    queue_date: Mapped[date] = mapped_column(Date, nullable=False)
    queue_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="WAITING")
    idempotency_key: Mapped[str | None] = mapped_column(String(128))
    preferred_language: Mapped[str | None] = mapped_column(String(16))
    # clock_timestamp() (not now()) so FIFO order matches number-allocation order under concurrency.
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.clock_timestamp())
    called_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    service_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("queue_number > 0", name="queue_number_positive"),
        CheckConstraint(
            "status IN ('WAITING','CALLED','SERVING','ON_HOLD','COMPLETED','NO_SHOW','CANCELLED')",
            name="status_valid"),
        CheckConstraint("completed_at IS NULL OR service_started_at IS NULL OR completed_at >= service_started_at",
                        name="duration_nonneg"),
        ForeignKeyConstraint(["service_id", "office_id"], ["services.id", "services.office_id"],
                             name="fk_tokens_service_office", ondelete="RESTRICT"),
        ForeignKeyConstraint(["counter_id", "office_id"], ["counters.id", "counters.office_id"],
                             name="fk_tokens_counter_office", ondelete="RESTRICT"),
        UniqueConstraint("office_id", "service_id", "queue_date", "queue_number", name="uq_token_queue_number"),
        UniqueConstraint("office_id", "queue_date", "display_number", name="uq_token_display_number"),
        # Serves call-next / position queries: waiting tokens of an office-day in FIFO order.
        Index("ix_tokens_queue_order", "office_id", "queue_date", "created_at", "id",
              postgresql_where=text("status = 'WAITING'")),
        Index("ix_tokens_citizen_created", "citizen_id", text("created_at DESC")),
        Index("ix_tokens_office_status", "office_id", "status", "created_at"),
        # A counter holds at most one CALLED / SERVING / ON_HOLD token.
        Index("uq_tokens_one_active_per_counter", "counter_id", unique=True,
              postgresql_where=text("counter_id IS NOT NULL AND status IN ('CALLED','SERVING','ON_HOLD')")),
        # One live token per citizen per service.
        Index("uq_tokens_one_live_per_citizen_service", "citizen_id", "service_id", unique=True,
              postgresql_where=text("citizen_id IS NOT NULL AND status IN ('WAITING','CALLED','SERVING','ON_HOLD')")),
        # Idempotent creation: same key from the same citizen maps to one token.
        Index("uq_tokens_idempotency", "citizen_id", "idempotency_key", unique=True,
              postgresql_where=text("idempotency_key IS NOT NULL")),
    )


class QueueEvent(Base):
    """Append-only history. A DB trigger (see migration) blocks UPDATE/DELETE."""
    __tablename__ = "queue_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    token_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("tokens.id", ondelete="RESTRICT"), nullable=False)
    office_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("offices.id", ondelete="RESTRICT"), nullable=False)
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="RESTRICT"))
    counter_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("counters.id", ondelete="RESTRICT"))
    event_type: Mapped[str] = mapped_column(String(32), nullable=False)
    from_status: Mapped[str | None] = mapped_column(String(16))
    to_status: Mapped[str | None] = mapped_column(String(16))
    reason: Mapped[str | None] = mapped_column(Text)
    event_metadata: Mapped[dict] = mapped_column("metadata", JsonType, nullable=False, default=dict)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.clock_timestamp())

    __table_args__ = (
        CheckConstraint(
            "event_type IN ('TOKEN_CREATED','TOKEN_CALLED','SERVICE_STARTED','SERVICE_COMPLETED','TOKEN_HELD',"
            "'TOKEN_RESUMED','TOKEN_NO_SHOW','TOKEN_CANCELLED','TOKEN_REQUEUED','TOKEN_EXPIRED')",
            name="event_type_valid"),
        Index("ix_queue_events_token_time", "token_id", "occurred_at"),
        Index("ix_queue_events_office_time", "office_id", "occurred_at"),
    )
