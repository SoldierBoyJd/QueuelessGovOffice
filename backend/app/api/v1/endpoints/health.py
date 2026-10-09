from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.deps import DbSession
from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    """Liveness only: the process is up. Does not touch the database."""
    return {"status": "ok", "service": settings.app_name, "version": settings.app_version}


@router.get("/health/ready")
def ready(db: DbSession):
    """Readiness: the database answers. Never reveals hostnames or credentials."""
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse(status_code=503, content={"status": "unavailable", "database": "down"})
    return {"status": "ok", "database": "up"}
