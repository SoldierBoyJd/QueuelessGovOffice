import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.common import StrictRequest


class EtaOut(BaseModel):
    method: str
    model_version: str | None = None
    confidence: float | None = None
    status: str
    estimated_wait_minutes: int | None = None
    estimated_service_at: datetime | None = None
    arrive_by: datetime | None = None
    lower_minutes: int | None = None
    upper_minutes: int | None = None
    range_policy: str
    basis: str
    warnings: list[str] = []
    queue_position: int | None = None
    generated_at: datetime


class TokenOut(BaseModel):
    id: uuid.UUID
    display_number: str
    office_id: uuid.UUID
    office_name: str
    service_id: uuid.UUID
    service_name: str
    department: str | None = None
    status: str
    queue_position: int | None = None
    people_ahead: int | None = None
    counter_id: uuid.UUID | None = None
    counter_name: str | None = None
    estimated_wait_minutes: int | None = None
    estimated_service_at: datetime | None = None
    arrive_by: datetime | None = None
    eta: EtaOut | None = None
    created_at: datetime
    called_at: datetime | None = None
    service_started_at: datetime | None = None
    completed_at: datetime | None = None
    citizen_name: str | None = None


class TokenCreate(StrictRequest):
    office_id: uuid.UUID
    service_id: uuid.UUID
    preferred_language: str | None = Field(default=None, max_length=16)
    idempotency_key: str | None = Field(default=None, min_length=8, max_length=128)


class TokenListItem(BaseModel):
    id: uuid.UUID
    display_number: str
    office_id: uuid.UUID
    office_name: str
    service_id: uuid.UUID
    service_name: str
    status: str
    queue_position: int | None = None
    estimated_wait_minutes: int | None = None
    counter_name: str | None = None
    created_at: datetime
    completed_at: datetime | None = None


class TokenEventOut(BaseModel):
    id: uuid.UUID
    event_type: str
    from_status: str | None = None
    to_status: str | None = None
    counter_id: uuid.UUID | None = None
    reason: str | None = None
    actor_type: str
    occurred_at: datetime


class TokenHistoryOut(BaseModel):
    token_id: uuid.UUID
    display_number: str
    events: list[TokenEventOut]


class ReasonRequest(StrictRequest):
    reason: str | None = Field(default=None, max_length=300)


class CallNextRequest(StrictRequest):
    counter_id: uuid.UUID | None = None


class CallNextOut(BaseModel):
    result: Literal["TOKEN_CALLED", "QUEUE_EMPTY"]
    token: TokenOut | None = None
    next_action: str | None = None


class QueueSummary(BaseModel):
    waiting_count: int
    called_count: int
    serving_count: int
    on_hold_count: int
    completed_today: int
    no_show_today: int
    cancelled_today: int
    active_counters: int
    paused_counters: int
    total_counters: int


class QueueItem(BaseModel):
    token_id: uuid.UUID
    display_number: str
    service_id: uuid.UUID
    service_name: str
    status: str
    queue_position: int | None = None
    counter_id: uuid.UUID | None = None
    counter_name: str | None = None
    estimated_wait_minutes: int | None = None
    estimated_service_at: datetime | None = None
    created_at: datetime
    called_at: datetime | None = None
    is_mine: bool = False
    citizen_name: str | None = None  # staff of this office only


class QueueOut(BaseModel):
    office_id: uuid.UUID
    generated_at: datetime
    summary: QueueSummary
    items: list[QueueItem]
    pagination: dict


class OfficerCurrentOut(BaseModel):
    counter_id: uuid.UUID
    counter_name: str
    counter_status: str
    current_token: TokenOut | None = None
    next_token: TokenOut | None = None
    summary: QueueSummary


class NotificationOut(BaseModel):
    id: uuid.UUID
    type: str
    severity: str
    title: str
    message: str
    token_id: uuid.UUID | None = None
    read_at: datetime | None = None
    created_at: datetime
