"""Staff endpoints for the expert network and project staffing (/v1/staff/...)."""

import uuid
from datetime import UTC, date, datetime
from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from pydantic import Field
from sqlalchemy import func, or_, select

from Frontier_platform.platform.backend.app.core import idempotency
from Frontier_platform.platform.backend.app.core.audit import write_audit
from Frontier_platform.platform.backend.app.core.db import commit
from Frontier_platform.platform.backend.app.core.deps import StaffContext, idempotency_key, staff_context
from Frontier_platform.platform.backend.app.core.errors import AppError, not_found
from Frontier_platform.platform.backend.app.core.schemas import StrictModel
from Frontier_platform.platform.backend.app.modules.experts import matching
from Frontier_platform.platform.backend.app.modules.experts import service
from Frontier_platform.platform.backend.app.modules.experts.models import ExpertConflict, ExpertCredential, ExpertProfile, ExpertSkill
from Frontier_platform.platform.backend.app.modules.identity.models import User
from Frontier_platform.platform.backend.app.modules.orgs.models import Org
from Frontier_platform.platform.backend.app.modules.projects.models import Project, ProjectExpert

router = APIRouter(prefix="/staff", tags=["staff: experts"])


class VerifyIn(StrictModel):
    status: Literal["verified", "rejected"]
    note: str = Field(default="", max_length=2000)


class ExpertPatch(StrictModel):
    status: Literal["active", "suspended"] | None = None
    tier: Literal["standard", "senior"] | None = None


class RecommendIn(StrictModel):
    count: int = Field(default=10, ge=1, le=100)


class AssignOne(StrictModel):
    expert_id: uuid.UUID
    max_tasks: int = Field(default=50, ge=1, le=10000)


class AssignIn(StrictModel):
    experts: list[AssignOne] = Field(min_length=1, max_length=200)


def _expert(ctx: StaffContext, eid: uuid.UUID) -> ExpertProfile:
    ctx.use_platform()
    p = ctx.db.execute(select(ExpertProfile).where(ExpertProfile.id == eid)).scalar_one_or_none()
    if p is None:
        raise not_found("expert")
    return p


def _names(db, user_ids) -> dict:
    if not user_ids:
        return {}
    return dict(db.execute(select(User.id, User.full_name).where(User.id.in_(list(user_ids)))).all())


@router.get("/experts")
def list_experts(q: str | None = None, skill: str | None = None, status: str | None = None,
                 ctx: StaffContext = Depends(staff_context)):
    db = ctx.db
    stmt = select(ExpertProfile, User.full_name, User.email).join(User, User.id == ExpertProfile.user_id)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(User.full_name.ilike(like), ExpertProfile.pseudonym.ilike(like),
                              ExpertProfile.headline.ilike(like), User.email.ilike(like)))
    if skill:
        stmt = stmt.where(ExpertProfile.id.in_(select(ExpertSkill.expert_id).where(ExpertSkill.skill_key == skill)))
    if status:
        stmt = stmt.where(ExpertProfile.status == status)
    rows = db.execute(stmt.order_by(ExpertProfile.created_at).limit(500)).all()
    skills = service.skills_of(db, [p.id for p, *_ in rows])
    return {
        "data": [
            {"id": str(p.id), "pseudonym": p.pseudonym, "display_name": name, "email": email, "headline": p.headline,
             "status": p.status, "tier": p.tier, "country": p.country, "languages": list(p.languages),
             "skills": [{"skill_key": k, "level": v} for k, v in sorted(skills[p.id].items())]}
            for p, name, email in rows
        ],
        "next_cursor": None,
    }


@router.get("/experts/{eid}")
def get_expert(eid: uuid.UUID, ctx: StaffContext = Depends(staff_context)):
    db = ctx.db
    p = _expert(ctx, eid)
    user = db.get(User, p.user_id)
    creds = db.execute(select(ExpertCredential).where(ExpertCredential.expert_id == p.id).order_by(ExpertCredential.created_at)).scalars().all()
    confs = db.execute(select(ExpertConflict).where(ExpertConflict.expert_id == p.id).order_by(ExpertConflict.created_at)).scalars().all()
    stats = service.quality_stats(ctx.user_id, [p.id], "staff expert profile quality")[p.id]
    ctx.use_platform()
    return {
        **service.profile_out(db, p),
        "display_name": user.full_name, "email": user.email,
        "credentials": [service.credential_out(c) for c in creds],
        "conflicts": [service.conflict_out(c) for c in confs],
        "quality": service.summarize_quality(stats),
    }


@router.post("/experts/{eid}/credentials/{cid}:verify")
def verify_credential(eid: uuid.UUID, cid: uuid.UUID, body: VerifyIn, ctx: StaffContext = Depends(staff_context)):
    p = _expert(ctx, eid)
    c = ctx.db.execute(select(ExpertCredential).where(ExpertCredential.id == cid, ExpertCredential.expert_id == p.id)
                       .with_for_update()).scalar_one_or_none()
    if c is None:
        raise not_found("credential")
    c.status, c.note, c.verified_by, c.verified_at = body.status, body.note, ctx.user_id, datetime.now(UTC)
    write_audit(ctx.db, org_id=ctx.platform_org_id, actor_user_id=ctx.user_id, action=f"expert.credential_{body.status}",
                target_type="expert_credential", target_id=c.id, data={"expert_id": str(p.id)})
    out = service.credential_out(c)
    commit(ctx.db)
    return out


@router.patch("/experts/{eid}")
def patch_expert(eid: uuid.UUID, body: ExpertPatch, ctx: StaffContext = Depends(staff_context)):
    p = _expert(ctx, eid)
    changes = body.model_dump(exclude_none=True)
    for k, v in changes.items():
        setattr(p, k, v)
    write_audit(ctx.db, org_id=ctx.platform_org_id, actor_user_id=ctx.user_id, action="expert.updated",
                target_type="expert_profile", target_id=p.id, data=changes)
    ctx.db.flush()
    out = service.profile_out(ctx.db, p)
    commit(ctx.db)
    return out


def _project(ctx: StaffContext, pid: uuid.UUID) -> Project:
    ctx.resolve("project", pid, "project")
    p = ctx.db.get(Project, pid)
    if p is None:
        raise not_found("project")
    return p


def _candidates(ctx: StaffContext, expert_ids: list[uuid.UUID] | None = None) -> list[matching.Candidate]:
    db = ctx.db
    ctx.use_platform()
    stmt = select(ExpertProfile, User.full_name).join(User, User.id == ExpertProfile.user_id)
    if expert_ids is not None:
        stmt = stmt.where(ExpertProfile.id.in_(expert_ids))
    rows = db.execute(stmt).all()
    ids = [p.id for p, _ in rows]
    skills = service.skills_of(db, ids)
    verified = dict(db.execute(select(ExpertCredential.expert_id, func.count())
                               .where(ExpertCredential.expert_id.in_(ids), ExpertCredential.status == "verified")
                               .group_by(ExpertCredential.expert_id)).all()) if ids else {}
    conflicts: dict = {}
    if ids:
        for c in db.execute(select(ExpertConflict).where(ExpertConflict.expert_id.in_(ids))).scalars():
            conflicts.setdefault(c.expert_id, []).append(
                {"organization_name": c.organization_name, "relationship": c.relationship, "until": c.until})
    stats = service.quality_stats(ctx.user_id, ids, "expert recommendation quality history")
    return [
        matching.Candidate(
            expert_id=str(p.id), pseudonym=p.pseudonym, display_name=name, status=p.status,
            languages=list(p.languages), weekly_hours=p.weekly_hours, skills=skills[p.id],
            verified_credentials=verified.get(p.id, 0), conflicts=conflicts.get(p.id, []),
            gold_passed=stats[p.id]["gold_passed"], gold_total=stats[p.id]["gold_total"],
            active_assignments=stats[p.id]["active"],
        )
        for p, name in rows
    ]


def _project_dict(p: Project) -> dict:
    return {"required_skills": p.required_skills, "excluded_companies": list(p.excluded_companies),
            "languages": list(p.languages), "difficulty": p.difficulty}


@router.post("/projects/{pid}:recommend-experts")
def recommend(pid: uuid.UUID, body: RecommendIn | None = None, ctx: StaffContext = Depends(staff_context)):
    body = body or RecommendIn()
    p = _project(ctx, pid)
    customer = ctx.db.get(Org, p.org_id)
    project = _project_dict(p)
    already = set(ctx.db.execute(select(ProjectExpert.expert_id).where(ProjectExpert.project_id == pid,
                                                                         ProjectExpert.status == "approved")).scalars())
    cands = [c for c in _candidates(ctx) if uuid.UUID(c.expert_id) not in already]
    result = matching.recommend(cands, project, customer.name, body.count, date.today())
    ctx.use_org(p.org_id)
    write_audit(ctx.db, org_id=p.org_id, actor_user_id=ctx.user_id, action="project.experts_recommended",
                target_type="project", target_id=p.id,
                data={"algorithm_version": result["algorithm_version"], "candidates": [c["expert_id"] for c in result["candidates"]]})
    commit(ctx.db)
    return result


@router.post("/projects/{pid}/assignments")
def assign(pid: uuid.UUID, body: AssignIn, ctx: StaffContext = Depends(staff_context),
           key: str | None = Depends(idempotency_key)):
    db = ctx.db
    replay = idempotency.replay(db, ctx.user_id, key, f"assignments:{pid}", body.model_dump(mode="json"))
    if replay:
        return replay
    p = _project(ctx, pid)
    if p.status in ("completed", "cancelled"):
        raise AppError(409, "project_closed", f"project is {p.status}")
    customer = db.get(Org, p.org_id)
    wanted = {a.expert_id: a for a in body.experts}
    cands = {uuid.UUID(c.expert_id): c for c in _candidates(ctx, list(wanted))}
    user_of = dict(db.execute(select(ExpertProfile.id, ExpertProfile.user_id).where(ExpertProfile.id.in_(list(wanted)))).all())
    approved, rejected = [], []
    project = _project_dict(p)
    ctx.use_org(p.org_id)
    for eid, a in wanted.items():
        c = cands.get(eid)
        if c is None:
            rejected.append({"expert_id": str(eid), "reason": "not_found"})
            continue
        row, exc = matching.score(c, {**project, "required_skills": []}, customer.name, date.today())
        if exc:
            rejected.append({"expert_id": str(eid), "reason": exc["reason"], "detail": exc["detail"]})
            continue
        pe = db.execute(select(ProjectExpert).where(ProjectExpert.project_id == pid, ProjectExpert.expert_id == eid)).scalar_one_or_none()
        if pe is None:
            pe = ProjectExpert(org_id=p.org_id, project_id=pid, expert_id=eid, user_id=user_of[eid], max_tasks=a.max_tasks,
                               status="approved", approved_by=ctx.user_id)
            db.add(pe)
        else:
            pe.status, pe.max_tasks, pe.approved_by = "approved", a.max_tasks, ctx.user_id
        approved.append({"expert_id": str(eid), "pseudonym": c.pseudonym, "max_tasks": a.max_tasks})
    db.flush()
    write_audit(db, org_id=p.org_id, actor_user_id=ctx.user_id, action="project.experts_assigned", target_type="project",
                target_id=p.id, data={"approved": [a["expert_id"] for a in approved], "rejected": rejected})
    out = {"approved": approved, "rejected": rejected}
    idempotency.remember(db, ctx.user_id, key, f"assignments:{pid}", body.model_dump(mode="json"), 200, out)
    commit(db)
    return JSONResponse(jsonable_encoder(out))


@router.get("/projects/{pid}/experts")
def project_experts(pid: uuid.UUID, ctx: StaffContext = Depends(staff_context)):
    p = _project(ctx, pid)
    rows = ctx.db.execute(select(ProjectExpert).where(ProjectExpert.project_id == p.id).order_by(ProjectExpert.created_at)).scalars().all()
    names = _names(ctx.db, {r.user_id for r in rows})
    ctx.use_platform()
    pseud = dict(ctx.db.execute(select(ExpertProfile.id, ExpertProfile.pseudonym)
                                .where(ExpertProfile.id.in_([r.expert_id for r in rows]))).all()) if rows else {}
    return {"data": [{"expert_id": str(r.expert_id), "pseudonym": pseud.get(r.expert_id), "display_name": names.get(r.user_id),
                      "max_tasks": r.max_tasks, "status": r.status, "created_at": r.created_at} for r in rows],
            "next_cursor": None}


@router.delete("/projects/{pid}/experts/{eid}", status_code=204)
def remove_expert(pid: uuid.UUID, eid: uuid.UUID, ctx: StaffContext = Depends(staff_context)):
    p = _project(ctx, pid)
    pe = ctx.db.execute(select(ProjectExpert).where(ProjectExpert.project_id == p.id, ProjectExpert.expert_id == eid)).scalar_one_or_none()
    if pe is None or pe.status == "removed":
        raise not_found("project expert")
    pe.status = "removed"
    write_audit(ctx.db, org_id=p.org_id, actor_user_id=ctx.user_id, action="project.expert_removed", target_type="project",
                target_id=p.id, data={"expert_id": str(eid)})
    commit(ctx.db)
