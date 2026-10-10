"""Train the wait-time model on SYNTHETIC queue history and write app/ml/artifacts/.

    python scripts/train_eta_model.py            # ~2-4 minutes

No real queue data is needed: scripts' simulator (app/ml/simulator.py) plays out many offices day by day.
The model is evaluated on offices it never saw during training, against the baseline estimator, and the
numbers are saved to metrics.json (shown on the Super Admin > AI Models page, labelled synthetic).
Retrain on real data later by replacing the simulator rows with rows built from real tokens.
"""
import json
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np  # noqa: E402
from sklearn.ensemble import HistGradientBoostingRegressor  # noqa: E402

from app.ml.compiled import compile_hgb, evaluate  # noqa: E402
from app.ml.eta_model import ARTIFACT_DIR, METRICS_PATH, MODEL_PATH  # noqa: E402
from app.ml.features import FEATURES  # noqa: E402
from app.ml.simulator import random_office, simulate, training_rows  # noqa: E402

TRAIN_OFFICES, TEST_OFFICES, DAYS = 14, 5, 70
START = date(2026, 1, 5)


def build(n_offices: int, seed: int):
    rng = np.random.RandomState(seed)
    days = [START + timedelta(days=i) for i in range(DAYS)]
    X, y = [], []
    for i in range(n_offices):
        cfg = random_office(rng, f"sim-{seed}-{i}")
        rx, ry = training_rows(simulate(cfg, days, rng))
        X += rx
        y += ry
    return np.asarray(X, float), np.asarray(y, float)


def save_compiled(mean, lo, hi, version: str, cov: float, check: np.ndarray) -> None:
    """Flatten the fitted trees to numpy and verify they reproduce scikit-learn's predictions exactly."""
    arrays = {}
    for name, model in (("mean", mean), ("lo", lo), ("hi", hi)):
        comp = compile_hgb(model)
        assert np.allclose(evaluate(comp, check), model.predict(check), atol=1e-6), f"{name}: compiled mismatch"
        arrays.update({f"{name}/{k}": v for k, v in comp.items()})
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(MODEL_PATH, version=np.str_(version), coverage=np.float64(cov),
                        features=np.array(FEATURES), **arrays)


def main() -> None:
    print("Simulating training offices ...")
    Xtr, ytr = build(TRAIN_OFFICES, seed=11)
    print(f"  {len(ytr):,} served tokens")
    print("Simulating unseen test offices ...")
    Xte, yte = build(TEST_OFFICES, seed=999)
    print(f"  {len(yte):,} served tokens")

    bcol = FEATURES.index("baseline_wait")
    resid = ytr - Xtr[:, bcol]
    common = dict(max_iter=250, learning_rate=0.07, max_depth=6, min_samples_leaf=40, random_state=0)
    mean = HistGradientBoostingRegressor(loss="squared_error", **common).fit(Xtr, resid)
    lo = HistGradientBoostingRegressor(loss="quantile", quantile=0.10, **common).fit(Xtr, resid)
    hi = HistGradientBoostingRegressor(loss="quantile", quantile=0.90, **common).fit(Xtr, resid)

    base_te = Xte[:, bcol]
    pred = np.maximum(0.0, base_te + mean.predict(Xte))
    plo = np.minimum(np.maximum(0.0, base_te + lo.predict(Xte)), pred)
    phi = np.maximum(np.maximum(0.0, base_te + hi.predict(Xte)), pred)

    mae_base = float(np.mean(np.abs(base_te - yte)))
    mae_ml = float(np.mean(np.abs(pred - yte)))
    cov = float(np.mean((yte >= plo) & (yte <= phi)))
    # the baseline's own range policy (0.75x .. 1.5x, at least +2 min) for a like-for-like coverage figure
    blo = np.floor(base_te * 0.75)
    bhi = np.maximum(np.ceil(base_te * 1.5), base_te + 2)
    cov_base = float(np.mean((yte >= blo) & (yte <= bhi)))
    metrics = {
        "version": "hgb-eta-v1",
        "data": "synthetic (simulated offices); evaluated on offices not used for training",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "train_rows": int(len(ytr)), "test_rows": int(len(yte)),
        "baseline_mae_minutes": round(mae_base, 2), "ml_mae_minutes": round(mae_ml, 2),
        "baseline_median_abs_error": round(float(np.median(np.abs(base_te - yte))), 2),
        "ml_median_abs_error": round(float(np.median(np.abs(pred - yte))), 2),
        "mae_improvement_pct": round(100 * (mae_base - mae_ml) / mae_base, 1),
        "ml_interval_coverage": round(cov, 3), "baseline_interval_coverage": round(cov_base, 3),
        "interval": "10th-90th percentile (nominal 80%)",
    }
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    save_compiled(mean, lo, hi, metrics["version"], cov, Xte[:200])
    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
