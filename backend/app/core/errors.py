"""Shared error envelope: {"error": {"code", "message", "details", "request_id"}}."""
import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger("app.errors")


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str, details: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


def bad_request(code: str, message: str, details: Any = None) -> AppError:
    return AppError(400, code, message, details)


def unauthenticated(message: str = "Authentication is required.", code: str = "UNAUTHENTICATED") -> AppError:
    return AppError(401, code, message)


def forbidden(message: str = "You do not have permission to perform this action.", code: str = "FORBIDDEN") -> AppError:
    return AppError(403, code, message)


def not_found(code: str, message: str) -> AppError:
    return AppError(404, code, message)


def conflict(code: str, message: str, details: Any = None) -> AppError:
    return AppError(409, code, message, details)


def request_id_of(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def _envelope(request: Request, status: int, code: str, message: str, details: Any = None,
              headers: dict[str, str] | None = None) -> JSONResponse:
    body = {"error": {"code": code, "message": message, "details": details,
                      "request_id": request_id_of(request)}}
    return JSONResponse(status_code=status, content=body, headers=headers)


_HTTP_CODES = {
    401: "UNAUTHENTICATED", 403: "FORBIDDEN", 404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT", 413: "PAYLOAD_TOO_LARGE", 429: "RATE_LIMITED",
}


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(request: Request, exc: AppError):
        headers = None
        if exc.status_code == 429 and isinstance(exc.details, dict) and "retry_after" in exc.details:
            headers = {"Retry-After": str(exc.details["retry_after"])}
        return _envelope(request, exc.status_code, exc.code, exc.message, exc.details, headers)

    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError):
        details = []
        for err in exc.errors():
            loc = [str(p) for p in err.get("loc", []) if p not in ("body", "query", "path")]
            details.append({"field": ".".join(loc) or None, "issue": err.get("msg", "Invalid value")})
        return _envelope(request, 422, "VALIDATION_ERROR", "One or more fields are invalid.", details)

    @app.exception_handler(StarletteHTTPException)
    async def _http(request: Request, exc: StarletteHTTPException):
        code = _HTTP_CODES.get(exc.status_code, "HTTP_ERROR")
        return _envelope(request, exc.status_code, code, str(exc.detail), None,
                         dict(exc.headers) if exc.headers else None)

    @app.exception_handler(Exception)
    async def _unexpected(request: Request, exc: Exception):
        # Never leak stack traces / SQL to clients; the full error goes to the server log only.
        log.exception("Unhandled error (request_id=%s)", request_id_of(request))
        return _envelope(request, 500, "INTERNAL_ERROR", "An unexpected error occurred.")
