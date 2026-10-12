from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings

# Vercel Functions open a short-lived process per isolate. A QueuePool of 10 would
# exhaust Neon/Render Postgres quickly; NullPool opens/closes one connection per request.
_engine_kwargs: dict = {"pool_pre_ping": True}
if settings.on_vercel:
    _engine_kwargs["poolclass"] = NullPool
else:
    _engine_kwargs["pool_size"] = settings.db_pool_size
    _engine_kwargs["max_overflow"] = settings.db_max_overflow

engine = create_engine(settings.database_url, **_engine_kwargs)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)


def get_db() -> Iterator[Session]:
    """Request-scoped session. Service functions own commit/rollback."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
