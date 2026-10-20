"""Expert self-service endpoints (/v1/me/expert...) and the skills catalogue."""

import uuid
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from Frontier_platform.platform.backend.app.core.audit import write_audit
from Frontier_platform.platform.backend.app.core.db import commit, get_db
from Frontier_platform.platform.backend.app.core.deps import ExpertContext, Principal, current_principal, expert_context
from Frontier_platform.platform.backend.app.core.errors import field_error, not_found, validation
from Frontier_platform.platform.backend.app.core.schemas import StrictModel
from Frontier_platform.platform.backend.app.modules.experts import service
from Frontier_platform.platform.backend.app.modules.experts.models import ExpertConflict, ExpertCredential, ExpertProfile, ExpertSkill, Skill

router = APIRouter(tags=["experts"])


class SkillLevel(StrictModel):
    skill_key: str = Field(min_length=1, max_length=64)
    level: int = Field(ge=1, le=5)


class ProfileIn(StrictModel):
    headline: str = Field(default="", max_length=300)
    bio: str = Field(default="", max_length=10000)
    years_experience: int = Field(default=0, ge=0, le=80)
    country: str = Field(default="", max_length=100)
    languages: list[str] = Field(default_factory=list, max_length=20)
    weekly_hours: int = Field(default=0, ge=0, le=80)
    skills: list[SkillLevel] = Field(default_factory=list, max_length=50)


class CredentialIn(StrictModel):
    kind: Literal["degree", "license", "certification", "employment", "publication"]
    title: str = Field(min_length=1, max_length=300)
    issuer: str = Field(min_length=1, max_length=300)
    year: int | None = Field(default=None, ge=1900, le=2100)
    identifier: str | None = Field(default=None, max_length=200)


class ConflictIn(StrictModel):
    organization_name: str = Field(min_length=1, max_length=300)
    relationship: Literal["employee", "former_employee", "consultant", "investor", "family", "other"]
    until: date | None = None


@router.get("/skills")
def list_skills(p: Principal = Depends(current_principal), db: Session = Depends(get_db)):
    rows = db.execute(select(Skill).order_by(Skill.domain, Skill.label)).scalars()
    return [{"key": s.key, "label": s.label, "domain": s.domain} for s in rows]


def _profile(ctx: ExpertContext) -> ExpertProfile:
    p = ctx.db.execute(select(ExpertProfile).where(ExpertProfile.user_id == ctx.user_id)).scalar_one_or_none()
    if p is None:
        raise not_found("expert profile")
    return p


@router.get("/me/expert")
def get_profile(ctx: ExpertContext = Depends(expert_context)):
    return service.profile_out(ctx.db, _profile(ctx))


@router.put("/me/expert")
def put_profile(body: ProfileIn, ctx: ExpertContext = Depends(expert_context)):
    db = ctx.db
    keys = [s.skill_key for s in body.skills]
    known = set(db.execute(select(Skill.key).where(Skill.key.in_(keys))).scalars()) if keys else set()
    errs = [field_error(f"skills.{i}.skill_key", "unknown_skill", f"unknown skill {k}") for i, k in enumerate(keys) if k not in known]
    if len(set(keys)) != len(keys):
        errs.append(field_error("skills", "duplicate", "skill keys must be unique"))
    if errs:
        raise validation(errs)
    p = db.execute(select(ExpertProfile).where(ExpertProfile.user_id == ctx.user_id)).scalar_one_or_none()
    data = body.model_dump(exclude={"skills"})
    if p is None:
        p = ExpertProfile(org_id=ctx.platform_org_id, user_id=ctx.user_id, pseudonym=service.new_pseudonym(db),
                          status="active", tier="standard", **data)
        db.add(p)
    else:
        for k, v in data.items():
            setattr(p, k, v)
    db.flush()
    db.execute(delete(ExpertSkill).where(ExpertSkill.expert_id == p.id))
    for s in body.skills:
        db.add(ExpertSkill(org_id=p.org_id, expert_id=p.id, skill_key=s.skill_key, level=s.level))
    write_audit(db, org_id=ctx.platform_org_id, actor_user_id=ctx.user_id, action="expert.profile_updated",
                target_type="expert_profile", target_id=p.id)
    db.flush()
    out = service.profile_out(db, p)
    commit(db)
    return out


@router.get("/me/expert/credentials")
def list_credentials(ctx: ExpertContext = Depends(expert_context)):
    p = _profile(ctx)
    rows = ctx.db.execute(select(ExpertCredential).where(ExpertCredential.expert_id == p.id).order_by(ExpertCredential.created_at)).scalars()
    return {"data": [service.credential_out(c) for c in rows], "next_cursor": None}


@router.post("/me/expert/credentials", status_code=201)
def add_credential(body: CredentialIn, ctx: ExpertContext = Depends(expert_context)):
    p = _profile(ctx)
    c = ExpertCredential(org_id=p.org_id, expert_id=p.id, status="pending", **body.model_dump())
    ctx.db.add(c)
    ctx.db.flush()
    write_audit(ctx.db, org_id=p.org_id, actor_user_id=ctx.user_id, action="expert.credential_added",
                target_type="expert_credential", target_id=c.id, data={"kind": c.kind})
    out = service.credential_out(c)
    commit(ctx.db)
    return out


@router.get("/me/expert/conflicts")
def list_conflicts(ctx: ExpertContext = Depends(expert_context)):
    p = _profile(ctx)
    rows = ctx.db.execute(select(ExpertConflict).where(ExpertConflict.expert_id == p.id).order_by(ExpertConflict.created_at)).scalars()
    return {"data": [service.conflict_out(c) for c in rows], "next_cursor": None}


@router.post("/me/expert/conflicts", status_code=201)
def add_conflict(body: ConflictIn, ctx: ExpertContext = Depends(expert_context)):
    p = _profile(ctx)
    c = ExpertConflict(org_id=p.org_id, expert_id=p.id, **body.model_dump())
    ctx.db.add(c)
    ctx.db.flush()
    write_audit(ctx.db, org_id=p.org_id, actor_user_id=ctx.user_id, action="expert.conflict_declared",
                target_type="expert_conflict", target_id=c.id)
    out = service.conflict_out(c)
    commit(ctx.db)
    return out


@router.delete("/me/expert/conflicts/{cid}", status_code=204)
def delete_conflict(cid: uuid.UUID, ctx: ExpertContext = Depends(expert_context)):
    p = _profile(ctx)
    c = ctx.db.execute(select(ExpertConflict).where(ExpertConflict.id == cid, ExpertConflict.expert_id == p.id)).scalar_one_or_none()
    if c is None:
        raise not_found("conflict")
    ctx.db.delete(c)
    write_audit(ctx.db, org_id=p.org_id, actor_user_id=ctx.user_id, action="expert.conflict_removed",
                target_type="expert_conflict", target_id=cid, data={"organization_name": c.organization_name})
    commit(ctx.db)
