"""Small in-process sliding-window rate limiter.

Per-process only: with several API instances each keeps its own counters. Good enough for a
single-instance demo; put a shared limiter (Redis / gateway) in front for real deployments.
"""
import threading
import time
from collections import defaultdict, deque

from fastapi import Request

from app.core.config import settings
from app.core.errors import AppError

_lock = threading.Lock()
_hits: dict[tuple[str, str], deque[float]] = defaultdict(deque)


def reset() -> None:
    with _lock:
        _hits.clear()


def rate_limit(name: str, limit: int, window_seconds: int):
    def dependency(request: Request) -> None:
        if not settings.rate_limit_enabled:
            return
        client = request.client.host if request.client else "unknown"
        now = time.monotonic()
        with _lock:
            q = _hits[(name, client)]
            while q and now - q[0] > window_seconds:
                q.popleft()
            if len(q) >= limit:
                retry_after = max(1, int(window_seconds - (now - q[0])))
                raise AppError(429, "RATE_LIMITED", "Too many requests. Please try again later.",
                               {"retry_after": retry_after})
            q.append(now)

    return dependency
