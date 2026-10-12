"""Runtime access to the trained wait-time model (artifact written by scripts/train_eta_model.py).

The model learns the *correction* to the baseline estimate (actual wait - baseline wait), with two
quantile models for a prediction interval (compiled to numpy arrays, see compiled.py). If the artifact is missing or broken the app silently keeps
using the baseline; nothing here is required for the API to work.
"""
import json
import logging
import threading
from pathlib import Path

from app.core.config import settings

log = logging.getLogger("app.ml")
ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "eta_model.npz"
METRICS_PATH = ARTIFACT_DIR / "metrics.json"


_lock = threading.Lock()
_loaded = False
_model = None


def _bundle():
    """Load once, thread-safely (many request threads can ask at the same time)."""
    global _loaded, _model
    if _loaded:
        return _model
    with _lock:
        if _loaded:
            return _model
        try:
            if MODEL_PATH.exists():
                import numpy as np
                with np.load(MODEL_PATH, allow_pickle=False) as z:
                    raw = {k: z[k] for k in z.files}
                _model = {
                    "version": str(raw["version"]), "coverage": float(raw["coverage"]),
                    "features": [str(f) for f in raw["features"]],
                    **{name: {k.split("/", 1)[1]: v for k, v in raw.items() if k.startswith(name + "/")}
                       for name in ("mean", "lo", "hi")},
                }
                log.info("Loaded ETA model %s", _model["version"])
        except Exception:  # corrupt or incompatible artifact
            log.exception("ETA model could not be loaded; using the baseline estimator")
            _model = None
        _loaded = True
    return _model


def preload() -> None:
    """Called at startup so the first request does not pay the numpy artifact load."""
    if settings.eta_ml_enabled:
        _bundle()


def available() -> bool:
    return settings.eta_ml_enabled and _bundle() is not None


def version() -> str | None:
    b = _bundle() if settings.eta_ml_enabled else None
    return b["version"] if b else None


def coverage() -> float | None:
    b = _bundle() if settings.eta_ml_enabled else None
    return b.get("coverage") if b else None


def metrics() -> dict | None:
    if METRICS_PATH.exists():
        try:
            return json.loads(METRICS_PATH.read_text(encoding="utf-8"))
        except Exception:
            return None
    return None


def predict(rows: list[list[float]]) -> list[tuple[float, float, float]] | None:
    """(expected, lower, upper) wait in minutes per feature row, or None if no model is available."""
    b = _bundle() if settings.eta_ml_enabled else None
    if b is None or not rows:
        return None
    try:
        import numpy as np
        from app.ml.compiled import evaluate
        X = np.asarray(rows, dtype=float)
        base = X[:, b["features"].index("baseline_wait")]
        mean = np.maximum(0.0, base + evaluate(b["mean"], X))
        lo = np.maximum(0.0, base + evaluate(b["lo"], X))
        hi = np.maximum(0.0, base + evaluate(b["hi"], X))
        lo = np.minimum(lo, mean)
        hi = np.maximum(hi, mean)
        return [(float(m), float(a), float(c)) for m, a, c in zip(mean, lo, hi)]
    except Exception:
        log.exception("ETA model prediction failed; using the baseline estimator")
        return None
