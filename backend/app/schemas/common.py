import uuid
from datetime import datetime
from typing import Annotated, Generic, TypeVar

from fastapi import Query
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class Pagination(BaseModel):
    limit: int
    offset: int
    total: int


class Page(BaseModel, Generic[T]):
    items: list[T]
    pagination: Pagination


class StrictRequest(BaseModel):
    """Request bodies reject unknown fields, so privileged fields (role, office_id, ...) cannot be smuggled in."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


Limit = Annotated[int, Query(ge=1, le=100, description="Page size (max 100)")]
Offset = Annotated[int, Query(ge=0, le=100_000, description="Rows to skip")]


def page(items: list, total: int, limit: int, offset: int) -> dict:
    return {"items": items, "pagination": {"limit": limit, "offset": offset, "total": total}}


class MessageOut(BaseModel):
    message: str


class IdOut(BaseModel):
    id: uuid.UUID


Timestamp = datetime
