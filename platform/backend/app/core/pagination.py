import base64
import json
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Select, and_, or_
from sqlalchemy.orm import Session

from Frontier_platform.platform.backend.app.core.errors import AppError

MAX_LIMIT = 200


def encode_cursor(created_at: datetime, row_id: uuid.UUID) -> str:
    raw = json.dumps([created_at.isoformat(), str(row_id)]).encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def decode_cursor(cursor: str) -> tuple[datetime, uuid.UUID]:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        ts, rid = json.loads(base64.urlsafe_b64decode(padded))
        return datetime.fromisoformat(ts), uuid.UUID(rid)
    except Exception:
        raise AppError(422, "validation_error", "invalid cursor", [{"field": "cursor", "code": "invalid", "message": "invalid cursor"}])


def clamp_limit(limit: int | None, default: int = 50) -> int:
    if limit is None:
        return default
    if limit < 1 or limit > MAX_LIMIT:
        raise AppError(
            422, "validation_error", "limit out of range",
            [{"field": "limit", "code": "out_of_range", "message": f"limit must be 1..{MAX_LIMIT}"}],
        )
    return limit


def paginate(
    db: Session, stmt: Select, model: Any, limit: int | None, cursor: str | None, *, newest_first: bool = True
) -> tuple[list[Any], str | None]:
    """Keyset pagination on (created_at, id). `stmt` must select `model` as its first entity."""
    n = clamp_limit(limit)
    if cursor:
        ts, rid = decode_cursor(cursor)
        if newest_first:
            stmt = stmt.where(or_(model.created_at < ts, and_(model.created_at == ts, model.id < rid)))
        else:
            stmt = stmt.where(or_(model.created_at > ts, and_(model.created_at == ts, model.id > rid)))
    order = (model.created_at.desc(), model.id.desc()) if newest_first else (model.created_at, model.id)
    rows = db.execute(stmt.order_by(*order).limit(n + 1)).all()
    page = rows[:n]
    nxt = None
    if len(rows) > n:
        last = page[-1][0]
        nxt = encode_cursor(last.created_at, last.id)
    return page, nxt
