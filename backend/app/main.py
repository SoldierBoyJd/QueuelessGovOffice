import asyncio
import logging
import re
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.errors import install_error_handlers
from app.ml import eta_model
from app.realtime.manager import manager

logging.basicConfig(level=settings.log_level.upper(), format="%(asctime)s %(levelname)s %(name)s %(message)s")
access_log = logging.getLogger("app.access")
_SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9_.-]{8,64}$")


@asynccontextmanager
async def lifespan(app: FastAPI):
    manager.bind_loop(asyncio.get_running_loop())
    await asyncio.to_thread(eta_model.preload)
    yield
    manager.bind_loop(None)


def create_app() -> FastAPI:
    app = FastAPI(
        title="SkipTheLine / QueueLess API",
        version=settings.app_version,
        description="Virtual queue tokens and wait-time estimates for government offices.",
        lifespan=lifespan,
        docs_url="/docs" if settings.enable_docs else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.enable_docs else None,
    )
    install_error_handlers(app)

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        supplied = request.headers.get("x-request-id", "")
        request.state.request_id = supplied if _SAFE_REQUEST_ID.match(supplied) else f"req_{uuid.uuid4().hex[:20]}"
        started = time.perf_counter()
        response = await call_next(request)
        response.headers["X-Request-ID"] = request.state.request_id
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Cache-Control", "no-store")
        # Path only: query strings and bodies are never logged.
        access_log.info("%s %s -> %s %.1fms rid=%s", request.method, request.url.path, response.status_code,
                        (time.perf_counter() - started) * 1000, request.state.request_id)
        return response

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID", "Retry-After"],
    )
    app.include_router(api_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
