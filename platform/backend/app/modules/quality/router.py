"""Customer gold items: /v1/orgs/{org_id}/projects/{pid}/gold-items"""

import uuid
from typing import Any, Literal

from fastapi import APIRouter, Depends, Response
from pydantic import Field
from sqlalchemy import select

from Frontier_platform.platform.backend.app.core.audit import write_audit
from Frontier_platform.platform.backend.app.core.db import commit
from Frontier_platform.platform.backend.app.core.deps import OrgContext, org_context
from Frontier_platform.platform.backend.app.core.errors import AppError, field_error, not_found, validation
from Frontier_platform.platform.backend.app.core.schemas import StrictModel
from Frontier_platform.platform.backend.app.modules.ingestion.models import DatasetItem
from Frontier_platform.platform.backend.app.modules.projects.service import get_project
from Frontier_platform.platform.backend.app.modules.quality.models import GoldItem
from Frontier_platform.platform.backend.app.modules.rubrics.models import RubricVersion
from Frontier_platform.platform.backend.app.modules.tasks.models import EvaluationTask

router = APIRouter(prefix="/orgs/{org_id}/projects/{pid}", tags=["gold"])


class Expected(StrictModel):
    scores: dict[str, Any] = Field(default_factory=dict)
    preferred_model: str | None = None


class GoldIn(StrictModel):
    item_id: uuid.UUID
    expected: Expected
    tolerance: Literal[0, 1] = 0


def gold_out(g: GoldItem, external_id: str | None = None) -> dict:
    return {"id": str(g.id), "item_id": str(g.item_id), "external_id": external_id, "expected": g.expected,
            "tolerance": g.tolerance, "created_at": g.created_at}


@router.post("/gold-items", status_code=201)
def create_gold(pid: uuid.UUID, body: GoldIn, ctx: OrgContext = Depends(org_context)):
    db = ctx.db
    p = get_project(db, ctx.org_id, pid)
    item = db.execute(select(DatasetItem).where(DatasetItem.id == body.item_id, DatasetItem.project_id == p.id)).scalar_one_or_none()
    if item is None:
        raise not_found("item")
    if db.execute(select(GoldItem.id).where(GoldItem.item_id == item.id)).first():
        raise AppError(409, "gold_exists", "this item is already a gold item")
    if not body.expected.scores and not body.expected.preferred_model:
        raise validation([field_error("expected", "required", "give expected scores or a preferred model")])
    if p.current_rubric_version_id:
        rv = db.get(RubricVersion, p.current_rubric_version_id)
        keys = {c["key"] for c in rv.criteria}
        bad = [k for k in body.expected.scores if k.partition("|")[0] not in keys]
        if bad:
            raise validation([field_error(f"expected.scores.{k}", "unknown", f"unknown criterion {k}") for k in bad])
    g = GoldItem(org_id=ctx.org_id, project_id=p.id, item_id=item.id, expected=body.expected.model_dump(), tolerance=body.tolerance)
    db.add(g)
    item.is_gold = True
    task = db.execute(select(EvaluationTask).where(EvaluationTask.item_id == item.id)).scalar_one_or_none()
    if task is not None:
        task.is_gold = True
    db.flush()
    write_audit(db, org_id=ctx.org_id, actor_user_id=ctx.user_id, action="gold.created", target_type="gold_item", target_id=g.id)
    out = gold_out(g, item.external_id)
    commit(db)
    return out


@router.get("/gold-items")
def list_gold(pid: uuid.UUID, ctx: OrgContext = Depends(org_context)):
    get_project(ctx.db, ctx.org_id, pid)
    rows = ctx.db.execute(select(GoldItem, DatasetItem.external_id).join(DatasetItem, DatasetItem.id == GoldItem.item_id)
                          .where(GoldItem.project_id == pid).order_by(GoldItem.created_at)).all()
    return {"data": [gold_out(g, ext) for g, ext in rows], "next_cursor": None}


@router.delete("/gold-items/{gid}", status_code=204)
def delete_gold(pid: uuid.UUID, gid: uuid.UUID, ctx: OrgContext = Depends(org_context)):
    db = ctx.db
    g = db.execute(select(GoldItem).where(GoldItem.id == gid, GoldItem.project_id == pid)).scalar_one_or_none()
    if g is None:
        raise not_found("gold item")
    item = db.get(DatasetItem, g.item_id)
    item.is_gold = False
    task = db.execute(select(EvaluationTask).where(EvaluationTask.item_id == item.id)).scalar_one_or_none()
    if task is not None:
        task.is_gold = False
    db.delete(g)
    write_audit(db, org_id=ctx.org_id, actor_user_id=ctx.user_id, action="gold.deleted", target_type="gold_item", target_id=gid)
    commit(db)
    return Response(status_code=204)
