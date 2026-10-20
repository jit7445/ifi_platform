import uuid
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from functools import lru_cache
from typing import Any

from sqlalchemy import DateTime, create_engine, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

from Frontier_platform.platform.backend.app.core.config import get_settings
from Frontier_platform.platform.backend.app.core.ids import uuid7


class Base(DeclarativeBase):
    pass


class IdMixin:
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid7)
    # Set client-side too: a server-only default makes SQLAlchemy emit INSERT ... RETURNING, and Postgres
    # applies SELECT policies to RETURNING, which fails on append-only tables the writer may not read.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), server_default=func.now(), nullable=False
    )


def _make_engine(url: str) -> Engine:
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=10,
        connect_args={"options": "-c timezone=UTC"},
    )


@lru_cache
def app_engine() -> Engine:
    return _make_engine(get_settings().database_url)


@lru_cache
def ops_engine() -> Engine:
    return _make_engine(get_settings().database_url_ops)


def reset_engines() -> None:
    for fn in (app_engine, ops_engine):
        if fn.cache_info().currsize:
            fn().dispose()
        fn.cache_clear()


def new_app_session() -> Session:
    return sessionmaker(app_engine(), expire_on_commit=False)()


def new_ops_session() -> Session:
    return sessionmaker(ops_engine(), expire_on_commit=False)()


SCOPES = {"tenant", "staff", "expert", "system", "auth"}


def set_context(db: Session, org_id: uuid.UUID | None, user_id: uuid.UUID | None, scope: str) -> None:
    """Transaction-local RLS context. set_config(..., true) is the parameterisable form of SET LOCAL."""
    assert scope in SCOPES
    db.execute(
        text(
            "select set_config('app.org_id', :o, true), set_config('app.user_id', :u, true),"
            " set_config('app.role_scope', :s, true)"
        ),
        {"o": str(org_id) if org_id else "", "u": str(user_id) if user_id else "", "s": scope},
    )
    db.info["ctx"] = (org_id, user_id, scope)


def current_context(db: Session) -> tuple | None:
    return db.info.get("ctx")


def after_commit(db: Session, fn: Callable[[], Any]) -> None:
    db.info.setdefault("after_commit", []).append(fn)


def commit(db: Session) -> None:
    """Commits, runs after-commit hooks, then re-applies the RLS context so the request can keep reading."""
    db.commit()
    ctx = db.info.pop("ctx", None)
    hooks = db.info.pop("after_commit", [])
    for fn in hooks:
        fn()
    if ctx is not None:
        set_context(db, *ctx)


def get_db() -> Iterator[Session]:
    db = new_app_session()
    try:
        yield db
    finally:
        db.rollback()
        db.close()


@contextmanager
def ops_session(actor_user_id: uuid.UUID | None, reason: str, org_id: uuid.UUID | None = None) -> Iterator[Session]:
    """BYPASSRLS session for cross-org staff reads and worker maintenance. Every use is audited."""
    from Frontier_platform.platform.backend.app.core.audit import write_audit

    db = new_ops_session()
    try:
        write_audit(
            db,
            org_id=org_id,
            actor_user_id=actor_user_id,
            actor_kind="ops" if actor_user_id else "system",
            action="ops.bypass_rls",
            target_type="query",
            target_id=None,
            data={"reason": reason},
        )
        yield db
        commit(db)
    finally:
        db.rollback()
        db.close()
