"""In-process WebSocket fan-out.

State lives in this process only, so it works for a single API instance. For several instances
put a pub/sub backend (Redis, Postgres LISTEN/NOTIFY) behind `publish_*`. The database stays the
source of truth: clients must refetch REST state after (re)connecting.
"""
import asyncio
import logging
import threading
import uuid
from dataclasses import dataclass
from typing import Any

from fastapi import WebSocket

log = logging.getLogger("app.realtime")


@dataclass(eq=False)
class Connection:
    ws: WebSocket
    user_id: uuid.UUID
    role: str
    office_id: uuid.UUID


class ConnectionManager:
    def __init__(self) -> None:
        self._conns: set[Connection] = set()
        self._lock = threading.Lock()
        self._loop: asyncio.AbstractEventLoop | None = None

    def bind_loop(self, loop: asyncio.AbstractEventLoop | None) -> None:
        self._loop = loop

    def add(self, conn: Connection) -> None:
        with self._lock:
            self._conns.add(conn)

    def remove(self, conn: Connection) -> None:
        with self._lock:
            self._conns.discard(conn)

    def count(self) -> int:
        with self._lock:
            return len(self._conns)

    def has_office_listeners(self, office_id: uuid.UUID) -> bool:
        with self._lock:
            return any(c.office_id == office_id for c in self._conns)

    def _targets(self, *, office_id: uuid.UUID | None = None, user_id: uuid.UUID | None = None) -> list[Connection]:
        with self._lock:
            return [c for c in self._conns
                    if (office_id is None or c.office_id == office_id)
                    and (user_id is None or c.user_id == user_id)]

    # --- thread-safe publishers (called from sync request threads) -------------------------
    def publish_office(self, office_id: uuid.UUID, message: dict[str, Any]) -> None:
        self._dispatch(self._targets(office_id=office_id), message)

    def publish_user(self, user_id: uuid.UUID, message: dict[str, Any]) -> None:
        self._dispatch(self._targets(user_id=user_id), message)

    def _dispatch(self, targets: list[Connection], message: dict[str, Any]) -> None:
        if not targets or self._loop is None or self._loop.is_closed():
            return
        asyncio.run_coroutine_threadsafe(self._send_all(targets, message), self._loop)

    async def _send_all(self, targets: list[Connection], message: dict[str, Any]) -> None:
        for conn in targets:
            try:
                await conn.ws.send_json(message)
            except Exception:  # connection died; the receive loop will clean up
                self.remove(conn)


manager = ConnectionManager()
