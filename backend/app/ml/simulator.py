"""Synthetic queue simulator: stands in for the historical data a new deployment does not have yet.

It plays out whole office-days minute by minute (peak-hour arrivals, weekday effects, services that really
take longer than configured, per-counter speed, afternoon fatigue, breaks, no-shows, cancellations) and records,
for every token, the features visible at the moment it was created and the wait it actually experienced.
The same module backs model training (scripts/train_eta_model.py) and the demo-history seed
(scripts/seed_history.py). Everything it produces is synthetic and must be presented as such.
"""
import math
import statistics
from collections import deque
from dataclasses import dataclass, field
from datetime import date

import numpy as np

from app.ml.features import baseline_waits, feature_row

WEEKDAY_FACTOR = {0: 1.15, 1: 1.0, 2: 0.95, 3: 1.0, 4: 1.2, 5: 0.7, 6: 0.0}  # Sunday closed
NO_SHOW_RATE = 0.06
CANCEL_PER_MIN = 0.0012
GRACE_MIN = 2.0


@dataclass
class ServiceCfg:
    code: str
    configured: float  # what the office says a service takes
    true_mean: float   # what it really takes (unknown to the baseline until it has observed data)


@dataclass
class CounterCfg:
    service: int | None  # index into services, None = serves everything
    speed: float = 1.0   # >1 = slower


@dataclass
class OfficeCfg:
    name: str
    open_min: int
    close_min: int
    services: list[ServiceCfg]
    counters: list[CounterCfg]
    demand: float = 0.85  # peak-hour arrivals relative to capacity
    recent: dict = field(default_factory=dict)  # service idx -> deque of observed durations (carried across days)


def random_office(rng: np.random.RandomState, name: str) -> OfficeCfg:
    n_services = int(rng.randint(1, 5))
    services = []
    for i in range(n_services):
        configured = float(rng.choice([5, 6, 7, 8, 10, 12, 15]))
        services.append(ServiceCfg(code=f"S{i}", configured=configured, true_mean=configured * float(rng.uniform(0.9, 1.6))))
    n_counters = int(rng.randint(2, 8))
    counters = []
    for i in range(n_counters):
        dedicated = rng.rand() < 0.5 and n_services > 1
        counters.append(CounterCfg(service=int(rng.randint(0, n_services)) if dedicated else None,
                                   speed=float(rng.uniform(0.85, 1.25))))
    # make sure every service has at least one counter that can serve it
    for i in range(n_services):
        if not any(c.service in (None, i) for c in counters):
            counters[int(rng.randint(0, n_counters))].service = None
    open_min = int(rng.choice([9 * 60, 9 * 60 + 30, 10 * 60]))
    return OfficeCfg(name=name, open_min=open_min, close_min=open_min + int(rng.choice([480, 450, 510])),
                     services=services, counters=counters, demand=float(rng.uniform(0.7, 1.0)))


def _profile(hour: float) -> float:
    return 0.35 + 0.9 * math.exp(-((hour - 11) / 1.3) ** 2) + 1.0 * math.exp(-((hour - 15) / 1.4) ** 2)


def _avg(cfg: OfficeCfg, s: int) -> float:
    obs = cfg.recent.get(s)
    if obs is not None and len(obs) >= 5:
        return float(min(max(statistics.median(obs), 1.0), 240.0))
    return cfg.services[s].configured


def simulate_day(cfg: OfficeCfg, day: date, rng: np.random.RandomState) -> list[dict]:
    wd = day.weekday()
    day_factor = WEEKDAY_FACTOR[wd] * float(rng.lognormal(0, 0.15))
    if day_factor == 0:
        return []
    mean_true = statistics.fmean(s.true_mean for s in cfg.services)
    capacity = len(cfg.counters) / mean_true  # tokens per minute at full staffing
    base = capacity * cfg.demand * day_factor

    n = len(cfg.counters)
    free_at = [float(cfg.open_min)] * n
    held: list[dict | None] = [None] * n  # token currently at the counter
    paused_until = [-1.0] * n
    pauses: list[tuple[int, float, float]] = []
    for _ in range(int(rng.choice([0, 1, 2], p=[0.3, 0.55, 0.15]))):
        start = float(rng.uniform(12.5 * 60, 14.5 * 60))
        pauses.append((int(rng.randint(0, n)), start, start + float(rng.uniform(20, 45))))
    for c in range(n):  # a short late-morning break is common too
        if rng.rand() < 0.15:
            start = float(rng.uniform(10.5 * 60, 11.5 * 60))
            pauses.append((c, start, start + float(rng.uniform(10, 20))))

    waiting: list[dict] = []
    done: list[dict] = []
    numbers: dict[int, int] = {}
    last_arrival = cfg.close_min - 15
    t = cfg.open_min
    hard_stop = cfg.close_min + 25

    while t < hard_stop:
        # --- counter pauses
        for c, a, b in pauses:
            if a <= t < b:
                paused_until[c] = b
        active = [c for c in range(n) if paused_until[c] <= t]

        # --- arrivals during this minute
        if t < last_arrival:
            for _ in range(int(rng.poisson(base * _profile(t / 60)))):
                s = int(rng.randint(0, len(cfg.services))) if len(cfg.services) > 1 else 0
                created = t + float(rng.rand())
                avg = {i: _avg(cfg, i) for i in range(len(cfg.services))}
                counter_free = {}
                for c in active:
                    h = held[c]
                    if h is None or free_at[c] <= created:
                        counter_free[c] = created
                    elif created < h["start"]:  # called, citizen still arriving: assume a full service
                        counter_free[c] = created + avg[h["service"]]
                    else:
                        counter_free[c] = created + max(avg[h["service"]] - (created - h["start"]), 1.0)
                cs = {c: cfg.counters[c].service for c in active}
                queue = [w["service"] for w in waiting] + [s]
                waits = baseline_waits(created, counter_free, cs, queue, avg)
                numbers[s] = numbers.get(s, 0) + 1
                tok = {"service": s, "number": numbers[s], "created": created, "baseline_wait": waits[-1],
                       "status": "WAITING", "counter": None, "called": None, "start": None, "complete": None}
                if waits[-1] is not None:
                    tok["features"] = feature_row(
                        ahead_same=sum(1 for w in waiting if w["service"] == s), ahead_total=len(waiting),
                        in_service=sum(1 for c in range(n) if held[c] is not None and free_at[c] > created),
                        eligible=sum(1 for c in active if cs[c] in (None, s)), active=len(active), total=n,
                        paused=n - len(active), avg_min=avg[s], baseline_wait=waits[-1],
                        hour=created / 60.0, weekday=wd)
                waiting.append(tok)
                done.append(tok)

        # --- cancellations
        for w in list(waiting):
            if rng.rand() < CANCEL_PER_MIN:
                w["status"] = "CANCELLED"
                waiting.remove(w)

        # --- free counters pick the earliest eligible token
        for c in active:
            if free_at[c] > t or not waiting:
                continue
            held[c] = None
            pick = next((w for w in waiting if cfg.counters[c].service in (None, w["service"])), None)
            if pick is None:
                continue
            waiting.remove(pick)
            pick["counter"], pick["called"] = c, float(t)
            if rng.rand() < NO_SHOW_RATE:
                pick["status"] = "NO_SHOW"
                free_at[c] = t + GRACE_MIN
                continue
            sv = cfg.services[pick["service"]]
            fatigue = 1.0 + 0.12 * max(0.0, (t / 60 - 14) / 3)
            dur = float(rng.lognormal(math.log(sv.true_mean * cfg.counters[c].speed * fatigue) - 0.1, 0.45))
            dur = min(max(dur, 1.0), 90.0)
            pick["start"] = t + float(rng.uniform(0.5, 2.5))
            pick["complete"] = pick["start"] + dur
            pick["status"] = "COMPLETED"
            free_at[c] = pick["complete"]
            held[c] = {"service": pick["service"], "start": pick["start"]}
            cfg.recent.setdefault(pick["service"], deque(maxlen=30)).append(dur)
        t += 1

    for w in waiting:  # still waiting when the office shut: expired
        w["status"] = "CANCELLED"
    return done


def simulate(cfg: OfficeCfg, days: list[date], rng: np.random.RandomState) -> list[dict]:
    out = []
    for d in days:
        for tok in simulate_day(cfg, d, rng):
            tok["date"] = d
            out.append(tok)
    return out


def training_rows(tokens: list[dict]) -> tuple[list[list[float]], list[float]]:
    """(features, actual wait minutes) for tokens that were really served."""
    X, y = [], []
    for t in tokens:
        if t["status"] == "COMPLETED" and "features" in t:
            X.append(t["features"])
            y.append(max(0.0, t["start"] - t["created"]))
    return X, y
