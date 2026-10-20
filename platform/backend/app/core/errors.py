from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

PROBLEM_CT = "application/problem+json"

_TITLES = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    409: "Conflict",
    413: "Payload Too Large",
    422: "Unprocessable Content",
    429: "Too Many Requests",
    500: "Internal Server Error",
}


class AppError(Exception):
    def __init__(
        self,
        status: int,
        code: str,
        detail: str | None = None,
        errors: list[dict[str, Any]] | None = None,
        headers: dict[str, str] | None = None,
    ):
        super().__init__(detail or code)
        self.status = status
        self.code = code
        self.detail = detail or code.replace("_", " ")
        self.errors = errors or []
        self.headers = headers


def not_found(what: str = "resource") -> AppError:
    return AppError(404, "not_found", f"{what} not found")


def forbidden(detail: str = "insufficient role") -> AppError:
    return AppError(403, "forbidden", detail)


def conflict(code: str, detail: str | None = None) -> AppError:
    return AppError(409, code, detail)


def validation(errors: list[dict[str, Any]], detail: str = "request failed validation") -> AppError:
    return AppError(422, "validation_error", detail, errors)


def field_error(field: str, code: str, message: str) -> dict[str, str]:
    return {"field": field, "code": code, "message": message}


def problem(status: int, code: str, detail: str, errors: list | None = None, headers=None) -> JSONResponse:
    body = {
        "type": f"https://errors.infollion.ai/{code}",
        "title": _TITLES.get(status, "Error"),
        "status": status,
        "code": code,
        "detail": detail,
        "errors": errors or [],
    }
    return JSONResponse(body, status_code=status, media_type=PROBLEM_CT, headers=headers)


def _loc_to_field(loc: tuple) -> str:
    parts = [str(p) for p in loc if p not in ("body", "query", "path", "header", "cookie")]
    return ".".join(parts) or (str(loc[0]) if loc else "")


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError):
        return problem(exc.status, exc.code, exc.detail, exc.errors, exc.headers)

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, exc: RequestValidationError):
        errors = [
            field_error(_loc_to_field(tuple(e.get("loc", ()))), e.get("type", "invalid"), e.get("msg", "invalid"))
            for e in exc.errors()
        ]
        return problem(422, "validation_error", "request failed validation", errors)

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, exc: StarletteHTTPException):
        code = {404: "not_found", 405: "method_not_allowed", 401: "unauthorized", 403: "forbidden"}.get(
            exc.status_code, "http_error"
        )
        detail = exc.detail if isinstance(exc.detail, str) else code
        return problem(exc.status_code, code, detail, headers=getattr(exc, "headers", None))

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception):
        import logging

        logging.getLogger("ifl.api").exception("unhandled error", exc_info=exc)
        return problem(500, "internal_error", "unexpected server error")
