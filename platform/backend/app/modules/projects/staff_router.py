"""Staff project oversight (/v1/staff/projects...) and the cross-org audit log."""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select

from Frontier_platform.platform.backend.app.core.audit import write_audit
from Frontier_platform.platform.backend.app.core.db import commit, ops_session
from Frontier_platform.platform.backend.app.core.deps import StaffContext, staff_context
from Frontier_platform.platform.backend.app.core.errors import AppError, not_found
from Frontier_platform.platform.backend.app.core.pagination import paginate
from Frontier_platform.platform.backend.app.modules.audit.models import AuditEvent
from Frontier_platform.platform.backend.app.modules.ingestion.models import DatasetItem
from Frontier_platform.platform.backend.app.modules.orgs.models import Org
from Frontier_platform.platform.backend.app.modules.orgs.router import audit_out
from Frontier_platform.platform.backend.app.modules.projects import service
from Frontier_platform.platform.backend.app.modules.projects.models import Project
from Frontier_platform.platform.backend.app.modules.projects.schemas import NoteIn
from Frontier_platform.platform.backend.app.modules.rubrics.models import RubricVersion
from Frontier_platform.platform.backend.app.modules.tasks.models import EvaluationTask

router = APIRouter(prefix="/staff", tags=["staff: projects"])


@router.get("/projects")
def list_projects(status: str | None = None, ctx: StaffContext = Depends(staff_context)):
    with ops_session(ctx.user_id, "staff project list") as db:
        stmt = select(Project, Org.name).join(Org, Org.id == Project.org_id)
        if status:
            stmt = stmt.where(Project.status == status)
        rows = db.execute(stmt.order_by(Project.created_at.desc()).limit(500)).all()
        c = service.counts(db, [p.id for p, _ in rows])
        data = [{**service.project_out(p, c[p.id]), "org_name": n} for p, n in rows]
    return {"data": data, "next_cursor": None}


def _project(ctx: StaffContext, pid: uuid.UUID) -> Project:
    ctx.resolve("project", pid, "project")
    p = ctx.db.execute(select(Project).where(Project.id == pid).with_for_update()).scalar_one_or_none()
    if p is None:
        raise not_found("project")
    return p


def _transition(pid: uuid.UUID, action: str, ctx: StaffContext, note: str | None = None) -> dict:
    db = ctx.db
    p = _project(ctx, pid)
    if action == "activate":
        rv = db.get(RubricVersion, p.current_rubric_version_id) if p.current_rubric_version_id else None
        if rv is None or rv.status != "published":
            raise AppError(409, "rubric_not_published", "publish a rubric version and set it as current first")
        if db.execute(select(DatasetItem.id).where(DatasetItem.project_id == p.id).limit(1)).first() is None:
            raise AppError(409, "no_items", "ingest items before activating")
    old = service.transition(p, action, note)
    write_audit(db, org_id=p.org_id, actor_user_id=ctx.user_id, action=f"project.{action.replace('-', '_')}",
                target_type="project", target_id=p.id, data={"from": old, "to": p.status, "note": note})
    db.flush()
    out = service.project_out(p, service.counts(db, [p.id])[p.id])
    commit(db)
    return out


@router.post("/projects/{pid}:approve")
def approve(pid: uuid.UUID, ctx: StaffContext = Depends(staff_context)):
    return _transition(pid, "approve", ctx)


@router.post("/projects/{pid}:request-changes")
def request_changes(pid: uuid.UUID, body: NoteIn, ctx: StaffContext = Depends(staff_context)):
    return _transition(pid, "request-changes", ctx, body.note)


@router.post("/projects/{pid}:activate")
def activate(pid: uuid.UUID, ctx: StaffContext = Depends(staff_context)):
    return _transition(pid, "activate", ctx)


@router.post("/projects/{pid}:pause")
def pause(pid: uuid.UUID, ctx: StaffContext = Depends(staff_context)):
    return _transition(pid, "pause", ctx)


@router.post("/projects/{pid}:complete")
def complete(pid: uuid.UUID, ctx: StaffContext = Depends(staff_context)):
    return _transition(pid, "complete", ctx)


@router.post("/projects/{pid}:generate-tasks")
def generate_tasks(pid: uuid.UUID, ctx: StaffContext = Depends(staff_context)):
    db = ctx.db
    p = _project(ctx, pid)
    if p.status not in ("approved", "active", "paused"):
        raise AppError(409, "invalid_status_transition", f"cannot generate tasks for a {p.status} project")
    rv = db.get(RubricVersion, p.current_rubric_version_id) if p.current_rubric_version_id else None
    if rv is None or rv.status != "published":
        raise AppError(409, "rubric_not_published", "publish a rubric version and set it as current first")
    have = set(db.execute(select(EvaluationTask.item_id).where(EvaluationTask.project_id == p.id)).scalars())
    items = db.execute(select(DatasetItem.id, DatasetItem.is_gold).where(DatasetItem.project_id == p.id)
                       .order_by(DatasetItem.created_at, DatasetItem.id)).all()
    overlap = int(p.quality.get("overlap_k", 1))
    created = gold = 0
    for item_id, is_gold in items:
        if item_id in have:
            continue
        db.add(EvaluationTask(org_id=p.org_id, project_id=p.id, item_id=item_id, rubric_version_id=rv.id,
                              required_overlap=overlap, is_gold=is_gold, status="open"))
        created += 1
        gold += bool(is_gold)
    db.flush()
    write_audit(db, org_id=p.org_id, actor_user_id=ctx.user_id, action="project.tasks_generated", target_type="project",
                target_id=p.id, data={"created": created, "gold_tasks": gold, "rubric_version_id": str(rv.id)})
    commit(db)
    return {"created": created, "gold_tasks": gold}


@router.get("/audit-events")
def staff_audit(org_id: uuid.UUID | None = None, limit: int = 50, cursor: str | None = None,
                ctx: StaffContext = Depends(staff_context)):
    with ops_session(ctx.user_id, "staff audit log") as db:
        stmt = select(AuditEvent)
        if org_id:
            stmt = stmt.where(AuditEvent.org_id == org_id)
        page, nxt = paginate(db, stmt, AuditEvent, limit, cursor)
        data = [audit_out(r[0]) for r in page]
    return {"data": data, "next_cursor": nxt}
