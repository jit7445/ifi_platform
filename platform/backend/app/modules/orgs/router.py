from fastapi import APIRouter, Depends
from sqlalchemy import func, select

from Frontier_platform.platform.backend.app.core.deps import OrgContext, org_context
from Frontier_platform.platform.backend.app.core.pagination import paginate
from Frontier_platform.platform.backend.app.modules.audit.models import AuditEvent
from Frontier_platform.platform.backend.app.modules.identity.models import User
from Frontier_platform.platform.backend.app.modules.orgs.models import Membership
from Frontier_platform.platform.backend.app.modules.projects.models import Project
from Frontier_platform.platform.backend.app.modules.usage.models import UsageRecord

router = APIRouter(prefix="/orgs/{org_id}", tags=["org admin"])


def audit_out(e: AuditEvent) -> dict:
    return {
        "id": str(e.id),
        "org_id": str(e.org_id),
        "actor_user_id": str(e.actor_user_id) if e.actor_user_id else None,
        "actor_kind": e.actor_kind,
        "action": e.action,
        "target_type": e.target_type,
        "target_id": e.target_id,
        "data": e.data,
        "created_at": e.created_at,
    }


@router.get("/members")
def members(ctx: OrgContext = Depends(org_context)):
    rows = ctx.db.execute(
        select(User, Membership.roles, Membership.created_at)
        .join(Membership, Membership.user_id == User.id)
        .where(Membership.org_id == ctx.org_id)
        .order_by(Membership.created_at)
    ).all()
    return {
        "data": [
            {"user_id": str(u.id), "email": u.email, "full_name": u.full_name, "roles": list(roles), "joined_at": joined}
            for u, roles, joined in rows
        ],
        "next_cursor": None,
    }


@router.get("/audit-events")
def audit_events(limit: int = 50, cursor: str | None = None, ctx: OrgContext = Depends(org_context)):
    ctx.require_admin()
    stmt = select(AuditEvent).where(AuditEvent.org_id == ctx.org_id)
    page, nxt = paginate(ctx.db, stmt, AuditEvent, limit, cursor)
    return {"data": [audit_out(r[0]) for r in page], "next_cursor": nxt}


@router.get("/usage")
def usage(ctx: OrgContext = Depends(org_context)):
    ctx.require_admin()
    rows = ctx.db.execute(
        select(Project.id, Project.name, Project.code, func.coalesce(func.sum(UsageRecord.quantity), 0))
        .outerjoin(UsageRecord, (UsageRecord.project_id == Project.id) & (UsageRecord.kind == "accepted_task"))
        .where(Project.org_id == ctx.org_id)
        .group_by(Project.id, Project.name, Project.code)
        .order_by(Project.name)
    ).all()
    by_project = [{"project_id": str(pid), "name": n, "code": c, "accepted_tasks": int(q)} for pid, n, c, q in rows]
    return {"accepted_tasks": sum(p["accepted_tasks"] for p in by_project), "by_project": by_project}
