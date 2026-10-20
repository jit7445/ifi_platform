import uuid

from fastapi import APIRouter, Depends
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy import select

from Frontier_platform.platform.backend.app.core import idempotency
from Frontier_platform.platform.backend.app.core.audit import write_audit
from Frontier_platform.platform.backend.app.core.db import commit
from Frontier_platform.platform.backend.app.core.deps import OrgContext, idempotency_key, org_context
from Frontier_platform.platform.backend.app.core.errors import AppError
from Frontier_platform.platform.backend.app.core.pagination import paginate
from Frontier_platform.platform.backend.app.modules.projects import service
from Frontier_platform.platform.backend.app.modules.projects.models import Project
from Frontier_platform.platform.backend.app.modules.projects.schemas import ProjectCreate, ProjectPatch

router = APIRouter(prefix="/orgs/{org_id}", tags=["projects"])


@router.post("/projects", status_code=201)
def create_project(body: ProjectCreate, ctx: OrgContext = Depends(org_context), key: str | None = Depends(idempotency_key)):
    db = ctx.db
    replay = idempotency.replay(db, ctx.user_id, key, f"project:create:{ctx.org_id}", body.model_dump(mode="json"))
    if replay:
        return replay
    data = body.model_dump(mode="json")
    service.check_skills(db, data["required_skills"])
    service.check_deliverable(body.task_type, body.deliverable_format)
    service.ensure_code_free(db, ctx.org_id, body.code)
    p = Project(org_id=ctx.org_id, status="draft", created_by=ctx.user_id, deadline=body.deadline,
                **{k: v for k, v in data.items() if k != "deadline"})
    db.add(p)
    db.flush()
    write_audit(db, org_id=ctx.org_id, actor_user_id=ctx.user_id, action="project.created", target_type="project",
                target_id=p.id, data={"code": p.code})
    out = service.project_out(p)
    idempotency.remember(db, ctx.user_id, key, f"project:create:{ctx.org_id}", data, 201, out)
    commit(db)
    return JSONResponse(jsonable_encoder(out), status_code=201)


@router.get("/projects")
def list_projects(limit: int = 50, cursor: str | None = None, status: str | None = None,
                  ctx: OrgContext = Depends(org_context)):
    stmt = select(Project).where(Project.org_id == ctx.org_id)
    if status:
        stmt = stmt.where(Project.status == status)
    page, nxt = paginate(ctx.db, stmt, Project, limit, cursor)
    projects = [r[0] for r in page]
    c = service.counts(ctx.db, [p.id for p in projects])
    return {"data": [service.project_out(p, c[p.id]) for p in projects], "next_cursor": nxt}


@router.get("/projects/{pid}")
def get_project(pid: uuid.UUID, ctx: OrgContext = Depends(org_context)):
    p = service.get_project(ctx.db, ctx.org_id, pid)
    return service.project_out(p, service.counts(ctx.db, [p.id])[p.id])


@router.patch("/projects/{pid}")
def patch_project(pid: uuid.UUID, body: ProjectPatch, ctx: OrgContext = Depends(org_context)):
    db = ctx.db
    p = service.get_project(db, ctx.org_id, pid, lock=True)
    if p.status not in service.EDITABLE:
        raise AppError(409, "project_not_editable", f"project in status {p.status} cannot be edited")
    changes = body.model_dump(mode="json", exclude_unset=True)
    if "required_skills" in changes:
        service.check_skills(db, changes["required_skills"] or [])
    if "deliverable_format" in changes:
        service.check_deliverable(p.task_type, changes["deliverable_format"])
    for k, v in changes.items():
        if v is None and k not in ("deadline",):
            continue
        setattr(p, k, body.deadline if k == "deadline" else v)
    write_audit(db, org_id=ctx.org_id, actor_user_id=ctx.user_id, action="project.updated", target_type="project",
                target_id=p.id, data={"fields": sorted(changes)})
    db.flush()
    out = service.project_out(p, service.counts(db, [p.id])[p.id])
    commit(db)
    return out


@router.post("/projects/{pid}:submit")
def submit_project(pid: uuid.UUID, ctx: OrgContext = Depends(org_context)):
    db = ctx.db
    p = service.get_project(db, ctx.org_id, pid, lock=True)
    old = service.transition(p, "submit")
    write_audit(db, org_id=ctx.org_id, actor_user_id=ctx.user_id, action="project.submitted", target_type="project",
                target_id=p.id, data={"from": old})
    db.flush()
    out = service.project_out(p, service.counts(db, [p.id])[p.id])
    commit(db)
    return out
