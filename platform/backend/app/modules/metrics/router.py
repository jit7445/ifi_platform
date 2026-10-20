import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy import select

from Frontier_platform.platform.backend.app.core.audit import write_audit
from Frontier_platform.platform.backend.app.core.db import commit
from Frontier_platform.platform.backend.app.core.deps import OrgContext, StaffContext, org_context, staff_context
from Frontier_platform.platform.backend.app.core.errors import AppError, not_found
from Frontier_platform.platform.backend.app.core.jobs import job, enqueue, system_session
from Frontier_platform.platform.backend.app.modules.metrics import service
from Frontier_platform.platform.backend.app.modules.metrics.models import MetricRun
from Frontier_platform.platform.backend.app.modules.projects.models import Project
from Frontier_platform.platform.backend.app.modules.projects.service import get_project

router = APIRouter(tags=["metrics"])


@router.post("/orgs/{org_id}/projects/{pid}/metrics:compute", status_code=202)
def compute_metrics(pid: uuid.UUID, ctx: OrgContext = Depends(org_context)):
    ctx.require_admin()
    p = get_project(ctx.db, ctx.org_id, pid)
    run = MetricRun(org_id=ctx.org_id, project_id=p.id, status="queued", requested_by=ctx.user_id)
    ctx.db.add(run)
    ctx.db.flush()
    enqueue(ctx.db, ctx.org_id, "metrics.compute", metric_run_id=run.id, org_id=ctx.org_id)
    write_audit(ctx.db, org_id=ctx.org_id, actor_user_id=ctx.user_id, action="metrics.requested", target_type="metric_run",
                target_id=run.id)
    out = {"metric_run_id": str(run.id), "status": "queued"}
    commit(ctx.db)
    return JSONResponse(out, status_code=202)


@router.get("/orgs/{org_id}/projects/{pid}/metrics")
def get_metrics(pid: uuid.UUID, run: str = "latest", ctx: OrgContext = Depends(org_context)):
    get_project(ctx.db, ctx.org_id, pid)
    stmt = select(MetricRun).where(MetricRun.project_id == pid)
    if run == "latest":
        stmt = stmt.where(MetricRun.status == "succeeded").order_by(MetricRun.computed_at.desc()).limit(1)
    else:
        try:
            stmt = stmt.where(MetricRun.id == uuid.UUID(run))
        except ValueError:
            raise AppError(422, "validation_error", "run must be 'latest' or a metric run id")
    m = ctx.db.execute(stmt).scalar_one_or_none()
    if m is None:
        raise not_found("metric run")
    if m.status != "succeeded":
        return {"metric_run_id": str(m.id), "status": m.status, "error": m.error, "computed_at": None}
    return jsonable_encoder({"metric_run_id": str(m.id), "status": m.status, "computed_at": m.computed_at, **(m.result or {})})


@router.get("/staff/projects/{pid}/metrics/experts", tags=["staff: projects"])
def staff_expert_metrics(pid: uuid.UUID, ctx: StaffContext = Depends(staff_context)):
    ctx.resolve("project", pid, "project")
    if ctx.db.get(Project, pid) is None:
        raise not_found("project")
    return {"data": service.expert_metrics(ctx.db, pid), "next_cursor": None}


@job("metrics.compute")
def compute_job(metric_run_id: str, org_id: str) -> None:
    with system_session(uuid.UUID(org_id)) as db:
        m = db.get(MetricRun, uuid.UUID(metric_run_id))
        if m is None or m.status not in ("queued", "running"):
            return
        m.status = "running"
        commit(db)
        try:
            result = service.project_metrics(db, m.project_id)
            m.result, m.status, m.computed_at = jsonable_encoder(result), "succeeded", datetime.now(UTC)
        except Exception as e:
            db.rollback()
            from Frontier_platform.platform.backend.app.core.db import set_context

            set_context(db, uuid.UUID(org_id), None, "system")
            m = db.get(MetricRun, uuid.UUID(metric_run_id))
            m.status, m.error = "failed", f"{type(e).__name__}: {e}"[:2000]
        commit(db)
