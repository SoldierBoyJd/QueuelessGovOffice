import uuid
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import func, or_, select

from app.api.deps import CurrentUser, DbSession
from app.core.errors import not_found
from app.db.models import Counter, Office, Service
from app.domain.token_states import CounterStatus
from app.schemas.catalog import CounterOut, OfficeOut, ServiceOut
from app.schemas.common import Limit, Offset, Page, page
from app.services import access, views
from app.services.timeutil import is_within_hours

router = APIRouter(tags=["offices"])


def _get_active_office(db, office_id: uuid.UUID) -> Office:
    office = db.get(Office, office_id)
    if office is None or not office.is_active:
        raise not_found("OFFICE_NOT_FOUND", "The requested office was not found.")
    return office


@router.get("/offices", response_model=Page[OfficeOut])
def list_offices(
    db: DbSession,
    q: Annotated[str | None, Query(max_length=100, description="Search name, code, city or address")] = None,
    state: Annotated[str | None, Query(max_length=120)] = None,
    district: Annotated[str | None, Query(max_length=120)] = None,
    city: Annotated[str | None, Query(max_length=120)] = None,
    is_open: bool | None = None,
    limit: Limit = 20,
    offset: Offset = 0,
):
    """Public discovery of active offices. `is_open` is computed from configured hours."""
    stmt = select(Office).where(Office.is_active.is_(True))
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Office.name.ilike(like), Office.code.ilike(like), Office.city.ilike(like),
                              Office.address.ilike(like)))
    if state:
        stmt = stmt.where(func.lower(Office.state) == state.strip().lower())
    if district:
        stmt = stmt.where(func.lower(Office.district) == district.strip().lower())
    if city:
        stmt = stmt.where(func.lower(Office.city) == city.strip().lower())
    stmt = stmt.order_by(Office.name, Office.id)
    if is_open is None:
        total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        rows = db.scalars(stmt.limit(limit).offset(offset)).all()
    else:  # open/closed depends on the local clock, so filter in Python
        all_rows = [o for o in db.scalars(stmt).all() if is_within_hours(o) == is_open]
        total = len(all_rows)
        rows = all_rows[offset:offset + limit]
    return page(views.office_out(db, list(rows)), total, limit, offset)


@router.get("/offices/{office_id}", response_model=OfficeOut)
def get_office(office_id: uuid.UUID, db: DbSession):
    office = _get_active_office(db, office_id)
    return views.office_out(db, [office])[0]


@router.get("/offices/{office_id}/services", response_model=dict)
def list_office_services(office_id: uuid.UUID, db: DbSession):
    office = _get_active_office(db, office_id)
    services = db.scalars(select(Service).where(Service.office_id == office.id, Service.is_active.is_(True))
                          .order_by(Service.department, Service.name)).all()
    items = views.service_outs(db, office, list(services))
    return {"items": [ServiceOut(**i).model_dump(mode="json") for i in items]}


@router.get("/services/{service_id}", response_model=ServiceOut)
def get_service(service_id: uuid.UUID, db: DbSession):
    service = db.get(Service, service_id)
    if service is None or not service.is_active:
        raise not_found("SERVICE_NOT_FOUND", "The requested service was not found.")
    office = _get_active_office(db, service.office_id)
    return views.service_outs(db, office, [service])[0]


@router.get("/offices/{office_id}/counters", response_model=dict)
def list_office_counters(office_id: uuid.UUID, db: DbSession, user: CurrentUser):
    """Staff of the office (and central/super admins) only: counters expose operational detail."""
    office = db.get(Office, office_id)
    if office is None:
        raise not_found("OFFICE_NOT_FOUND", "The requested office was not found.")
    access.ensure_office_staff(user, office.id)
    counters = db.scalars(select(Counter).where(Counter.office_id == office.id).order_by(Counter.name)).all()
    items = views.counter_outs(db, list(counters))
    return {
        "items": [CounterOut(**i).model_dump(mode="json") for i in items],
        "summary": {
            "total": len(counters),
            "active": sum(c.status == CounterStatus.ACTIVE.value for c in counters),
            "paused": sum(c.status == CounterStatus.PAUSED.value for c in counters),
            "closed": sum(c.status == CounterStatus.CLOSED.value for c in counters),
        },
    }
