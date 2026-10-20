import uuid
from datetime import UTC, datetime
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import Field
from sqlalchemy import func, select

from Frontier_platform.platform.backend.app.core.audit import write_audit
from Frontier_platform.platform.backend.app.core.db import commit
from Frontier_platform.platform.backend.app.core.deps import OrgContext, org_context
from Frontier_platform.platform.backend.app.core.errors import AppError, not_found, validation
from Frontier_platform.platform.backend.app.core.schemas import StrictModel
from Frontier_platform.platform.backend.app.modules.projects.service import get_project
from Frontier_platform.platform.backend.app.modules.rubrics import validation as rv
from Frontier_platform.platform.backend.app.modules.rubrics.models import Rubric, RubricVersion

router = APIRouter(prefix="/orgs/{org_id}", tags=["rubrics"])


class Criterion(StrictModel):
    key: str = Field(max_length=64)
    label: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=5000)
    scale_type: Literal["likert", "binary", "categorical"]
    scale_min: int | None = None
    scale_max: int | None = None
    anchors: dict[str, str] = Field(default_factory=dict)
    options: list[str] = Field(default_factory=list, max_length=20)
    weight: float = 1.0
    is_required: bool = True
    explanation_required_below: float | None = None


class ErrorLabel(StrictModel):
    key: str = Field(max_length=64)
    label: str = Field(min_length=1, max_length=200)
    severity: Literal["minor", "major", "critical"]


class RubricCreate(StrictModel):
    name: str = Field(min_length=1, max_length=200)
    project_id: uuid.UUID


class VersionIn(StrictModel):
    instructions_md: str = Field(default="", max_length=100_000)
    criteria: list[Criterion] = Field(default_factory=list, max_length=30)
    error_labels: list[ErrorLabel] = Field(default_factory=list, max_length=50)
    require_correction: bool = False
    require_overall_comment: bool = False


class VersionPatch(StrictModel):
    instructions_md: str | None = Field(default=None, max_length=100_000)
    criteria: list[Criterion] | None = Field(default=None, max_length=30)
    error_labels: list[ErrorLabel] | None = Field(default=None, max_length=50)
    require_correction: bool | None = None
    require_overall_comment: bool | None = None


class PublishIn(StrictModel):
    set_as_project_current: bool = True


def version_out(v: RubricVersion) -> dict:
    return {
        "id": str(v.id),
        "rubric_id": str(v.rubric_id),
        "version": v.version,
        "status": v.status,
        "instructions_md": v.instructions_md,
        "criteria": v.criteria,
        "error_labels": v.error_labels,
        "require_correction": v.require_correction,
        "require_overall_comment": v.require_overall_comment,
        "content_sha256": v.content_sha256,
        "published_at": v.published_at,
        "created_at": v.created_at,
    }


def rubric_out(db, r: Rubric) -> dict:
    versions = db.execute(select(RubricVersion).where(RubricVersion.rubric_id == r.id).order_by(RubricVersion.version)).scalars()
    return {"id": str(r.id), "name": r.name, "project_id": str(r.project_id), "created_at": r.created_at,
            "versions": [version_out(v) for v in versions]}


def _get_rubric(ctx: OrgContext, rid: uuid.UUID) -> Rubric:
    r = ctx.db.execute(select(Rubric).where(Rubric.id == rid, Rubric.org_id == ctx.org_id)).scalar_one_or_none()
    if r is None:
        raise not_found("rubric")
    return r


def _get_version(ctx: OrgContext, rid: uuid.UUID, vid: uuid.UUID, lock: bool = False) -> RubricVersion:
    stmt = select(RubricVersion).where(RubricVersion.id == vid, RubricVersion.rubric_id == rid,
                                       RubricVersion.org_id == ctx.org_id)
    if lock:
        stmt = stmt.with_for_update()
    v = ctx.db.execute(stmt).scalar_one_or_none()
    if v is None:
        raise not_found("rubric version")
    return v


def _check(criteria: list[dict], labels: list[dict], for_publish: bool = False) -> None:
    errs = rv.validate_criteria(criteria, for_publish=for_publish) + rv.validate_error_labels(labels)
    if errs:
        raise validation(errs, "rubric failed validation")


@router.post("/rubrics", status_code=201)
def create_rubric(body: RubricCreate, ctx: OrgContext = Depends(org_context)):
    p = get_project(ctx.db, ctx.org_id, body.project_id)
    r = Rubric(org_id=ctx.org_id, project_id=p.id, name=body.name)
    ctx.db.add(r)
    ctx.db.flush()
    write_audit(ctx.db, org_id=ctx.org_id, actor_user_id=ctx.user_id, action="rubric.created", target_type="rubric", target_id=r.id)
    out = rubric_out(ctx.db, r)
    commit(ctx.db)
    return out


@router.get("/rubrics")
def list_rubrics(project_id: uuid.UUID | None = None, ctx: OrgContext = Depends(org_context)):
    stmt = select(Rubric).where(Rubric.org_id == ctx.org_id).order_by(Rubric.created_at)
    if project_id:
        stmt = stmt.where(Rubric.project_id == project_id)
    return {"data": [rubric_out(ctx.db, r) for r in ctx.db.execute(stmt).scalars()], "next_cursor": None}


@router.get("/rubrics/{rid}")
def get_rubric(rid: uuid.UUID, ctx: OrgContext = Depends(org_context)):
    return rubric_out(ctx.db, _get_rubric(ctx, rid))


@router.post("/rubrics/{rid}/versions", status_code=201)
def create_version(rid: uuid.UUID, body: VersionIn, ctx: OrgContext = Depends(org_context)):
    db = ctx.db
    r = _get_rubric(ctx, rid)
    db.execute(select(Rubric.id).where(Rubric.id == r.id).with_for_update())
    data = body.model_dump(mode="json")
    data["criteria"] = [rv.normalize_criterion(c) for c in data["criteria"]]
    _check(data["criteria"], data["error_labels"])
    n = db.execute(select(func.coalesce(func.max(RubricVersion.version), 0)).where(RubricVersion.rubric_id == r.id)).scalar()
    v = RubricVersion(org_id=ctx.org_id, rubric_id=r.id, project_id=r.project_id, version=n + 1, status="draft", **data)
    db.add(v)
    db.flush()
    write_audit(db, org_id=ctx.org_id, actor_user_id=ctx.user_id, action="rubric_version.created",
                target_type="rubric_version", target_id=v.id, data={"version": v.version})
    out = version_out(v)
    commit(db)
    return out


@router.patch("/rubrics/{rid}/versions/{vid}")
def patch_version(rid: uuid.UUID, vid: uuid.UUID, body: VersionPatch, ctx: OrgContext = Depends(org_context)):
    v = _get_version(ctx, rid, vid, lock=True)
    if v.status != "draft":
        raise AppError(409, "rubric_immutable", "published rubric versions cannot change; create a new version")
    changes = body.model_dump(mode="json", exclude_unset=True, exclude_none=True)
    if "criteria" in changes:
        changes["criteria"] = [rv.normalize_criterion(c) for c in changes["criteria"]]
    _check(changes.get("criteria", v.criteria), changes.get("error_labels", v.error_labels))
    for k, val in changes.items():
        setattr(v, k, val)
    ctx.db.flush()
    out = version_out(v)
    commit(ctx.db)
    return out


@router.post("/rubrics/{rid}/versions/{vid}:publish")
def publish_version(rid: uuid.UUID, vid: uuid.UUID, body: PublishIn | None = None, ctx: OrgContext = Depends(org_context)):
    body = body or PublishIn()
    db = ctx.db
    v = _get_version(ctx, rid, vid, lock=True)
    if v.status != "draft":
        raise AppError(409, "rubric_immutable", f"rubric version is already {v.status}")
    _check(v.criteria, v.error_labels, for_publish=True)
    v.content_sha256 = rv.content_sha256(version_out(v))
    v.status = "published"
    v.published_at = datetime.now(UTC)
    if body.set_as_project_current:
        p = get_project(db, ctx.org_id, v.project_id, lock=True)
        p.current_rubric_version_id = v.id
    write_audit(db, org_id=ctx.org_id, actor_user_id=ctx.user_id, action="rubric_version.published",
                target_type="rubric_version", target_id=v.id, data={"content_sha256": v.content_sha256})
    db.flush()
    out = {"id": str(v.id), "version": v.version, "status": v.status, "content_sha256": v.content_sha256,
           "published_at": v.published_at}
    commit(db)
    return out
