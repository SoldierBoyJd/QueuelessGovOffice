from fastapi import APIRouter

from app.api.v1.endpoints import (admin, analytics, auth, counters, health, notifications, offices, predictions, queue,
                                  system, tokens, verification, ws)

api_router = APIRouter()
for module in (health, auth, offices, tokens, queue, counters, predictions, notifications, analytics, verification,
               admin, system, ws):
    api_router.include_router(module.router)
