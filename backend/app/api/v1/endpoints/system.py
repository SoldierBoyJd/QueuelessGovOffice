"""Super-admin diagnostics: component health and ETA-model registry. No secrets or topology are returned."""
import time
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select, text

from app.api.deps import DbSession, require_roles
from app.core.config import settings
from app.db.models import PredictionSnapshot, Token, User
from app.domain.token_states import Role
from app.realtime.manager import manager
from app.ml import eta_model
from app.services import eta_service
from app.services.timeutil import utcnow

router = APIRouter(prefix="/admin", tags=["admin"])
SuperUser = Annotated[User, Depends(require_roles(Role.SUPER_ADMIN.value))]


@router.get("/system/health", response_model=dict)
def system_health(db: DbSession, user: SuperUser):
    now = utcnow().isoformat()
    components = [{"name": "API", "status": "HEALTHY", "detail": f"version {settings.app_version}",
                   "latency_ms": None, "last_checked": now}]
    started = time.perf_counter()
    try:
        db.execute(text("SELECT 1"))
        latency = round((time.perf_counter() - started) * 1000, 1)
        components.append({"name": "PostgreSQL", "status": "HEALTHY" if latency < 500 else "DEGRADED",
                           "latency_ms": latency, "detail": None, "last_checked": now})
    except Exception:
        components.append({"name": "PostgreSQL", "status": "DOWN", "latency_ms": None,
                           "detail": "Query failed", "last_checked": now})
    components.append({"name": "Realtime (WebSocket)", "status": "HEALTHY", "latency_ms": None,
                       "detail": f"{manager.count()} connection(s), single-instance in-process fan-out",
                       "last_checked": now})
    components.append({"name": "ETA engine (baseline)", "status": "HEALTHY", "latency_ms": None,
                       "detail": "Scheduling simulation", "last_checked": now})
    if eta_model.available():
        components.append({"name": "ML ETA model", "status": "HEALTHY", "latency_ms": None,
                           "detail": f"{eta_model.version()} loaded (trained on synthetic data)", "last_checked": now})
    else:
        components.append({"name": "ML ETA model", "status": "NOT_CONFIGURED", "latency_ms": None,
                           "detail": "No trained model is deployed; the baseline estimator is used.",
                           "last_checked": now})
    components.append({"name": "OCR / document analysis", "status": "NOT_CONFIGURED", "latency_ms": None,
                       "detail": "Not implemented", "last_checked": now})
    overall = "DOWN" if any(c["status"] == "DOWN" for c in components) else (
        "DEGRADED" if any(c["status"] == "DEGRADED" for c in components) else "HEALTHY")
    return {"status": overall, "components": components, "generated_at": now}


@router.get("/models", response_model=dict)
def models(db: DbSession, user: SuperUser):
    """ETA methods in use. Live error is measured from real data: each token's ETA at creation is compared with
    its actual wait. The ML model's offline benchmark (synthetic data, unseen offices) comes from metrics.json."""
    actual = func.extract("epoch", Token.service_started_at - Token.created_at) / 60.0
    err = func.abs(PredictionSnapshot.predicted_wait_minutes - actual)

    def live(method: str) -> dict:
        n, mae, median, coverage = db.execute(
            select(func.count(), func.avg(err), func.percentile_cont(0.5).within_group(err),
                   func.avg(case((actual.between(PredictionSnapshot.lower_minutes, PredictionSnapshot.upper_minutes),
                                  1), else_=0)))
            .select_from(PredictionSnapshot).join(Token, Token.id == PredictionSnapshot.token_id)
            .where(PredictionSnapshot.method == method, Token.service_started_at.is_not(None))).one()
        return {
            "sample_size": n,
            "mean_absolute_error_minutes": round(float(mae), 2) if mae is not None else None,
            "median_absolute_error_minutes": round(float(median), 2) if median is not None else None,
            "range_coverage": round(float(coverage), 3) if coverage is not None else None,
        }

    benchmark = eta_model.metrics()
    ml_on = eta_model.available()
    items = [
        {"id": "baseline-eta-simulator", "name": "Baseline ETA simulator", "version": eta_service.METHOD,
         "status": "INACTIVE" if ml_on else "ACTIVE", "accuracy": None, "evaluation": live("BASELINE"),
         "benchmark": None, "last_trained": None,
         "description": "FIFO scheduling simulation over eligible counters using observed service times. Used as "
                        "the fallback and as an input to the ML model. Not a trained model."},
        {"id": "hgb-eta", "name": "Gradient-boosted wait-time model", "version": eta_model.version(),
         "status": "ACTIVE" if ml_on else "INACTIVE", "accuracy": None, "evaluation": live("ML") if ml_on else None,
         "benchmark": benchmark, "last_trained": benchmark.get("trained_at") if benchmark else None,
         "description": "Learns the correction to the baseline from queue length, counters, service type and time "
                        "of day, with a 10th-90th percentile interval. Trained on synthetic data until real queue "
                        "history exists; benchmark numbers come from offices unseen in training."},
    ]
    return {"items": items, "generated_at": utcnow().isoformat()}
