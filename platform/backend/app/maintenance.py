"""Periodic housekeeping jobs; cross-org, so they run on the audited ops connection."""

from datetime import UTC, datetime

from sqlalchemy import and_, exists, update

from Frontier_platform.platform.backend.app.core.db import ops_session
from Frontier_platform.platform.backend.app.core.jobs import proc_app, sweep_outbox
from Frontier_platform.platform.backend.app.modules.tasks.models import ACTIVE_ASSIGNMENT_STATUSES, EvaluationTask, TaskAssignment


def reclaim_leases() -> dict:
    now = datetime.now(UTC)
    with ops_session(None, "reclaim expired task leases") as db:
        expired = db.execute(
            update(TaskAssignment).where(TaskAssignment.status == "in_progress", TaskAssignment.lease_expires_at < now)
            .values(status="expired").returning(TaskAssignment.id)
        ).scalars().all()
        reopened = db.execute(
            update(EvaluationTask).where(
                EvaluationTask.status == "in_progress",
                ~exists().where(and_(TaskAssignment.task_id == EvaluationTask.id,
                                     TaskAssignment.status.in_(ACTIVE_ASSIGNMENT_STATUSES))),
            ).values(status="open").returning(EvaluationTask.id)
        ).scalars().all()
    return {"expired": len(expired), "reopened": len(reopened)}


@proc_app.periodic(cron="*/5 * * * *")
@proc_app.task(name="maintenance.reclaim_leases")
def reclaim_leases_job(timestamp: int) -> None:
    reclaim_leases()


@proc_app.periodic(cron="* * * * *")
@proc_app.task(name="maintenance.sweep_outbox")
def sweep_outbox_job(timestamp: int) -> None:
    sweep_outbox()


__all__ = ["reclaim_leases"]
