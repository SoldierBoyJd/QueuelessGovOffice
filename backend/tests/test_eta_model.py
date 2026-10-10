"""The trained wait-time model: loads, returns ordered intervals, and corrects the baseline in a sensible direction."""
import pytest

from app.core.config import settings
from app.ml import eta_model
from app.ml.features import FEATURES, baseline_waits, feature_row


@pytest.fixture()
def ml_on(monkeypatch):
    monkeypatch.setattr(settings, "eta_ml_enabled", True)
    if not eta_model.MODEL_PATH.exists():
        pytest.skip("no trained model artifact (run scripts/train_eta_model.py)")


def _row(ahead, counters, baseline, hour=11.0):
    return feature_row(ahead_same=ahead, ahead_total=ahead, in_service=counters, eligible=counters, active=counters,
                       total=counters, paused=0, avg_min=8.0, baseline_wait=baseline, hour=hour, weekday=1)


def test_feature_row_matches_feature_list():
    assert len(_row(3, 2, 10)) == len(FEATURES)


def test_baseline_waits_assign_to_earliest_free_counter():
    waits = baseline_waits(0.0, {"a": 0.0, "b": 5.0}, {"a": None, "b": None}, ["x", "x", "x"], {"x": 10.0})
    assert waits == [0, 5, 10]
    assert baseline_waits(0.0, {}, {}, ["x"], {"x": 10.0}) == [None]


def test_model_returns_ordered_interval(ml_on):
    assert eta_model.available() and eta_model.version()
    out = eta_model.predict([_row(0, 3, 0), _row(10, 3, 25), _row(30, 2, 100)])
    assert out is not None and len(out) == 3
    for mean, lo, hi in out:
        assert 0 <= lo <= mean <= hi


def test_disabled_flag_falls_back_to_baseline(monkeypatch):
    monkeypatch.setattr(settings, "eta_ml_enabled", False)
    assert eta_model.available() is False and eta_model.predict([_row(1, 1, 5)]) is None
