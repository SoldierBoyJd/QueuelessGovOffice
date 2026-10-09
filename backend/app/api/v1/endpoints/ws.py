"""WebSocket live updates: WS /api/v1/ws/offices/{office_id}.

Auth: the first client message must be {"type":"auth","token":"<access token>"} (so the token never
appears in a URL/log). Office-wide events are privacy-safe; token/notification events are delivered
only to the owning user. Treat messages as hints: refetch REST state after (re)connecting.
"""
import asyncio
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.concurrency import run_in_threadpool

from app.core.config import settings
from app.core.errors import AppError
from app.db.models import Office, User
from app.db.session import SessionLocal
from app.domain.token_states import Role
from app.api.deps import user_from_token
from app.realtime.manager import Connection, manager
from app.services import access

router = APIRouter()
AUTH_TIMEOUT_SECONDS = 5


def _authenticate(token: str | None, office_id: uuid.UUID) -> tuple[User | None, int | None]:
    """Returns (user, None) or (None, close_code)."""
    with SessionLocal() as db:
        try:
            user = user_from_token(db, token)
        except AppError:
            return None, 4401
        office = db.get(Office, office_id)
        if office is None or not office.is_active:
            return None, 4404
        if user.role != Role.CITIZEN.value and not access.is_staff_of(user, office_id):
            return None, 4403
        db.expunge(user)
        return user, None


@router.websocket("/ws/offices/{office_id}")
async def office_updates(websocket: WebSocket, office_id: uuid.UUID):
    await websocket.accept()
    try:
        first = await asyncio.wait_for(websocket.receive_json(), timeout=AUTH_TIMEOUT_SECONDS)
    except (asyncio.TimeoutError, ValueError, WebSocketDisconnect):
        await _close(websocket, 4401)
        return
    if not isinstance(first, dict) or first.get("type") != "auth" or not isinstance(first.get("token"), str):
        await _close(websocket, 4401)
        return
    user, code = await run_in_threadpool(_authenticate, first["token"], office_id)
    if user is None:
        await _close(websocket, code or 4401)
        return

    conn = Connection(ws=websocket, user_id=user.id, role=user.role, office_id=office_id)
    manager.add(conn)
    try:
        await websocket.send_json({"type": "connected", "office_id": str(office_id), "user_id": str(user.id)})
        lifetime = settings.access_token_expire_minutes * 60  # a socket never outlives its access token
        deadline = asyncio.get_running_loop().time() + lifetime
        while True:
            remaining = deadline - asyncio.get_running_loop().time()
            if remaining <= 0:
                await _close(websocket, 4401)
                return
            try:
                msg = await asyncio.wait_for(websocket.receive_json(), timeout=remaining)
            except asyncio.TimeoutError:
                await _close(websocket, 4401)
                return
            if isinstance(msg, dict) and msg.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except (WebSocketDisconnect, RuntimeError, ValueError):
        pass
    finally:
        manager.remove(conn)


async def _close(websocket: WebSocket, code: int) -> None:
    try:
        await websocket.close(code=code)
    except RuntimeError:
        pass
