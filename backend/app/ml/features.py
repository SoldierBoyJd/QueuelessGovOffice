"""Shared feature definition for the wait-time model, plus the pure baseline scheduling rule.

`baseline_waits` is the same FIFO rule as `eta_service.simulate_office` (give each waiting token to the
eligible counter that frees up first), written over plain numbers so the training simulator and the
production code produce the same `baseline_wait` feature.
"""
import math

FEATURES = [
    "ahead_same", "ahead_total", "in_service", "eligible_counters", "active_counters", "total_counters",
    "paused_counters", "avg_service_min", "baseline_wait", "hour", "weekday", "load",
]


def feature_row(*, ahead_same: int, ahead_total: int, in_service: int, eligible: int, active: int, total: int,
                paused: int, avg_min: float, baseline_wait: float, hour: float, weekday: int) -> list[float]:
    return [ahead_same, ahead_total, in_service, eligible, active, total, paused, avg_min, baseline_wait, hour,
            weekday, ahead_total / max(1, active)]


def baseline_waits(now: float, free_at: dict, counter_service: dict, queue: list, avg: dict,
                   default: float = 10.0) -> list[int | None]:
    """Minutes (ceil) until each queued service request would start; None when no counter can serve it.

    free_at: counter -> minute it becomes free (only ACTIVE counters); counter_service: counter -> service/None.
    queue: service keys in FIFO order. All times in minutes on one clock.
    """
    free = dict(free_at)
    out: list[int | None] = []
    for service in queue:
        usable = [c for c in free if counter_service[c] is None or counter_service[c] == service]
        if not usable:
            out.append(None)
            continue
        chosen = min(usable, key=lambda c: (free[c], str(c)))
        start = max(free[chosen], now)
        free[chosen] = start + avg.get(service, default)
        out.append(max(0, math.ceil(start - now)))
    return out
