import hashlib
import json
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from Frontier_platform.platform.backend.app.core.errors import AppError
from Frontier_platform.platform.backend.app.core.models import IdempotencyKey

TTL = timedelta(hours=24)


def _digest(body: Any) -> str:
    return hashlib.sha256(json.dumps(jsonable_encoder(body), sort_keys=True).encode()).hexdigest()


def replay(db: Session, user_id, key: str | None, scope: str, body: Any) -> JSONResponse | None:
    """Returns the stored response for a repeated key, or None when the request should run."""
    if not key:
        return None
    row = db.execute(
        select(IdempotencyKey).where(
            IdempotencyKey.user_id == user_id, IdempotencyKey.key == key, IdempotencyKey.scope == scope
        )
    ).scalar_one_or_none()
    if row is None:
        return None
    if row.created_at < datetime.now(UTC) - TTL:
        db.execute(delete(IdempotencyKey).where(IdempotencyKey.id == row.id))
        db.flush()
        return None
    if row.request_sha256 != _digest(body):
        raise AppError(409, "idempotency_key_reused", "Idempotency-Key was used with a different request body")
    return JSONResponse(row.response, status_code=row.status_code, headers={"Idempotent-Replayed": "true"})


def remember(db: Session, user_id, key: str | None, scope: str, body: Any, status_code: int, response: Any) -> None:
    if not key:
        return
    db.add(
        IdempotencyKey(
            user_id=user_id,
            key=key,
            scope=scope,
            request_sha256=_digest(body),
            status_code=status_code,
            response=jsonable_encoder(response),
        )
    )
    db.flush()
