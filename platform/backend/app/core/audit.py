import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from Frontier_platform.platform.backend.app.modules.audit.models import AuditEvent


def platform_org_id(db: Session) -> uuid.UUID:
    return _platform_org_cached(db)


_cache: dict[str, uuid.UUID] = {}


def _platform_org_cached(db: Session) -> uuid.UUID:
    from Frontier_platform.platform.backend.app.modules.orgs.models import Org

    key = str(db.get_bind().url)
    if key not in _cache:
        org_id = db.execute(select(Org.id).where(Org.kind == "platform").order_by(Org.created_at)).scalar()
        if org_id is None:
            raise RuntimeError("platform org missing; run the seed")
        _cache[key] = org_id
    return _cache[key]


def clear_cache() -> None:
    _cache.clear()


def write_audit(
    db: Session,
    *,
    org_id: uuid.UUID | None,
    actor_user_id: uuid.UUID | None,
    action: str,
    target_type: str | None = None,
    target_id: Any = None,
    data: dict | None = None,
    actor_kind: str = "user",
) -> None:
    if org_id is None:
        org_id = platform_org_id(db)
    db.add(
        AuditEvent(
            org_id=org_id,
            actor_user_id=actor_user_id,
            actor_kind=actor_kind if actor_user_id or actor_kind != "user" else "system",
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id is not None else None,
            data=data or {},
        )
    )
    db.flush()
