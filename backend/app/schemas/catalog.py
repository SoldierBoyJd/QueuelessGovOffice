import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import StrictRequest


class OfficeOut(BaseModel):
    id: uuid.UUID
    name: str
    code: str
    address: str
    city: str | None = None
    district: str | None = None
    state: str | None = None
    phone: str | None = None
    lat: float | None = None
    lng: float | None = None
    timezone: str
    opening_time: str | None = None
    closing_time: str | None = None
    call_grace_minutes: int
    is_active: bool
    is_open: bool
    services_count: int
    total_waiting: int
    active_counters: int
    paused_counters: int
    total_counters: int
    congestion: str
    avg_wait_minutes: float | None = None


class ServiceOut(BaseModel):
    id: uuid.UUID
    office_id: uuid.UUID
    name: str
    code: str
    department: str | None = None
    description: str | None = None
    icon_name: str | None = None
    average_service_minutes: float
    average_service_minutes_basis: str
    configured_service_minutes: int
    is_active: bool
    document_requirements: list[str] = []
    current_wait_minutes: int | None = None
    current_wait_status: str | None = None
    current_queue_length: int | None = None


class CounterOut(BaseModel):
    id: uuid.UUID
    office_id: uuid.UUID
    name: str
    service_id: uuid.UUID | None = None
    service_name: str | None = None
    status: str
    status_reason: str | None = None
    status_changed_at: datetime | None = None
    officer_id: uuid.UUID | None = None
    officer_name: str | None = None
    current_token_id: uuid.UUID | None = None
    current_token_display: str | None = None
    current_token_status: str | None = None
    tokens_served_today: int
    avg_service_seconds: int | None = None


class CounterActionRequest(StrictRequest):
    reason: str | None = Field(default=None, max_length=300)
    # Only used by /close: return the counter's CALLED/SERVING/ON_HOLD token to the queue.
    release_active_token: bool = False


class OfficeCreate(StrictRequest):
    name: str = Field(min_length=2, max_length=200)
    code: str = Field(min_length=2, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    address: str = Field(min_length=2, max_length=500)
    city: str | None = Field(default=None, max_length=120)
    district: str | None = Field(default=None, max_length=120)
    state: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=32)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    timezone: str = "Asia/Kolkata"
    opening_time: str | None = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    closing_time: str | None = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    call_grace_minutes: int = Field(default=5, ge=0, le=60)


class OfficeUpdate(StrictRequest):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    address: str | None = Field(default=None, min_length=2, max_length=500)
    city: str | None = Field(default=None, max_length=120)
    district: str | None = Field(default=None, max_length=120)
    state: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=32)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    opening_time: str | None = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    closing_time: str | None = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    call_grace_minutes: int | None = Field(default=None, ge=0, le=60)
    # SUPER_ADMIN only:
    timezone: str | None = None
    is_active: bool | None = None


class ServiceCreate(StrictRequest):
    name: str = Field(min_length=2, max_length=200)
    code: str = Field(min_length=1, max_length=16, pattern=r"^[A-Za-z0-9]+$")
    department: str | None = Field(default=None, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    icon_name: str | None = Field(default=None, max_length=64)
    estimated_service_minutes: int = Field(default=10, ge=1, le=240)


class ServiceUpdate(StrictRequest):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    department: str | None = Field(default=None, max_length=120)
    description: str | None = Field(default=None, max_length=1000)
    icon_name: str | None = Field(default=None, max_length=64)
    estimated_service_minutes: int | None = Field(default=None, ge=1, le=240)
    is_active: bool | None = None


class CounterCreate(StrictRequest):
    name: str = Field(min_length=1, max_length=64)
    service_id: uuid.UUID | None = None


class CounterUpdate(StrictRequest):
    name: str | None = Field(default=None, min_length=1, max_length=64)
    service_id: uuid.UUID | None = None
    clear_service: bool = False  # set true to make the counter serve every service
