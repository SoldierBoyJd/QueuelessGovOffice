from datetime import date, datetime, time, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.db.models import Office


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def office_tz(office: Office) -> ZoneInfo:
    try:
        return ZoneInfo(office.timezone)
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo("UTC")


def office_local_now(office: Office, now: datetime | None = None) -> datetime:
    return (now or utcnow()).astimezone(office_tz(office))


def office_local_date(office: Office, now: datetime | None = None) -> date:
    return office_local_now(office, now).date()


def is_within_hours(office: Office, now: datetime | None = None) -> bool:
    """True when `now` falls inside the office's opening hours (no hours configured = always open)."""
    if office.opening_time is None or office.closing_time is None:
        return True
    t: time = office_local_now(office, now).time().replace(tzinfo=None)
    o, c = office.opening_time, office.closing_time
    if o <= c:
        return o <= t < c
    return t >= o or t < c  # overnight window


def closes_at(office: Office, now: datetime | None = None) -> datetime | None:
    """Today's closing instant in UTC (None if no hours configured or overnight window)."""
    if office.opening_time is None or office.closing_time is None or office.opening_time > office.closing_time:
        return None
    local = office_local_now(office, now)
    return datetime.combine(local.date(), office.closing_time, tzinfo=office_tz(office)).astimezone(timezone.utc)
