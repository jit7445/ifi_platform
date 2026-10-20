"""Background jobs: a transactional outbox row is written with the business change, then handed to
procrastinate after commit (or run in-process when JOBS_MODE=inline, used by tests and quick demos)."""

import logging
import threading
import uuid
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from typing import Any

import procrastinate
from sqlalchemy import select
from sqlalchemy.orm import Session

from Frontier_platform.platform.backend.app.core.config import get_settings
from Frontier_platform.platform.backend.app.core.db import after_commit, commit, new_app_session, set_context
from Frontier_platform.platform.backend.app.core.models import OutboxEvent

log = logging.getLogger("ifl.jobs")

HANDLERS: dict[str, Callable[..., Any]] = {}

proc_app = procrastinate.App(
    connector=procrastinate.PsycopgConnector(conninfo=get_settings().sync_dsn)
)
_open_lock = threading.Lock()
_opened = False

RETRY = procrastinate.RetryStrategy(max_attempts=3, wait=5)


def job(name: str) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    def deco(fn: Callable[..., Any]) -> Callable[..., Any]:
        HANDLERS[name] = fn
        proc_app.task(name=name, retry=RETRY, pass_context=False)(fn)
        return fn

    return deco


def _json_safe(v: Any) -> Any:
    return str(v) if isinstance(v, uuid.UUID) else v


def enqueue(db: Session, org_id: uuid.UUID, name: str, /, **kwargs: Any) -> None:
    if name not in HANDLERS:
        raise KeyError(f"unknown job {name}")
    payload = {k: _json_safe(v) for k, v in kwargs.items()}
    ev = OutboxEvent(org_id=org_id, topic=name, payload=payload, status="pending", attempts=0)
    db.add(ev)
    db.flush()
    event_id = ev.id
    after_commit(db, lambda: dispatch(event_id))


@contextmanager
def system_session(org_id: uuid.UUID | None = None) -> Iterator[Session]:
    db = new_app_session()
    try:
        set_context(db, org_id, None, "system")
        yield db
    finally:
        db.rollback()
        db.close()


def mark_worker_mode() -> None:
    """Inside the worker the connector is already open (async) and defers from sync tasks bridge to it."""
    global _opened
    _opened = True


def _ensure_open() -> None:
    global _opened
    with _open_lock:
        if not _opened:
            proc_app.open()
            _opened = True


def dispatch(event_id: uuid.UUID) -> None:
    inline = get_settings().jobs_mode == "inline"
    with system_session() as db:
        ev = db.execute(
            select(OutboxEvent).where(OutboxEvent.id == event_id, OutboxEvent.status == "pending").with_for_update(skip_locked=True)
        ).scalar_one_or_none()
        if ev is None:
            return
        topic, payload = ev.topic, dict(ev.payload)
        ev.attempts += 1
        if not inline:
            try:
                _ensure_open()
                proc_app.configure_task(topic).defer(**payload)
            except Exception:
                log.exception("deferring %s failed; the outbox sweep will retry", topic)
                commit(db)
                return
        ev.status = "dispatched"
        ev.dispatched_at = datetime.now(UTC)
        commit(db)
    if inline:
        HANDLERS[topic](**payload)


def sweep_outbox(limit: int = 200) -> int:
    with system_session() as db:
        ids = db.execute(
            select(OutboxEvent.id).where(OutboxEvent.status == "pending").order_by(OutboxEvent.created_at).limit(limit)
        ).scalars().all()
    for eid in ids:
        dispatch(eid)
    return len(ids)
