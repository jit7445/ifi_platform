import hashlib
import json
import uuid

from fastapi import APIRouter, Depends
from fastapi.encoders import jsonable_encoder
from pydantic import Field
from sqlalchemy import func, select

from Frontier_platform.platform.backend.app.core.audit import write_audit
from Frontier_platform.platform.backend.app.core.db import commit
from Frontier_platform.platform.backend.app.core.deps import OrgContext, org_context
from Frontier_platform.platform.backend.app.core.errors import AppError
from Frontier_platform.platform.backend.app.core.schemas import StrictModel
from Frontier_platform.platform.backend.app.modules.datasets.models import DatasetVersion, DatasetVersionItem
from Frontier_platform.platform.backend.app.modules.evaluation.models import Submission
from Frontier_platform.platform.backend.app.modules.ingestion.models import DatasetItem, ModelOutput, ModelRun
from Frontier_platform.platform.backend.app.modules.projects.service import get_project
from Frontier_platform.platform.backend.app.modules.quality.models import TaskResult
from Frontier_platform.platform.backend.app.modules.rubrics.models import RubricVersion
from Frontier_platform.platform.backend.app.modules.tasks.models import EvaluationTask

router = APIRouter(prefix="/orgs/{org_id}/projects/{pid}", tags=["datasets"])


class Include(StrictModel):
    min_agreement: float | None = Field(default=None, ge=0, le=1)
    exclude_gold: bool = True


class DatasetIn(StrictModel):
    include: Include = Include()
    notes: str | None = Field(default=None, max_length=5000)


def canonical_sha(obj) -> str:
    return hashlib.sha256(json.dumps(jsonable_encoder(obj), sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def dv_out(d: DatasetVersion) -> dict:
    return {"id": str(d.id), "version": d.version, "status": d.status, "item_count": d.item_count,
            "manifest_sha256": d.manifest_sha256, "include": d.include, "notes": d.notes,
            "rubric_version_id": str(d.rubric_version_id) if d.rubric_version_id else None,
            "rubric_content_sha256": d.rubric_content_sha256, "created_at": d.created_at}


@router.post("/dataset-versions", status_code=201)
def create_dataset_version(pid: uuid.UUID, body: DatasetIn | None = None, ctx: OrgContext = Depends(org_context)):
    body = body or DatasetIn()
    db = ctx.db
    p = get_project(db, ctx.org_id, pid, lock=True)
    stmt = (select(EvaluationTask, TaskResult, DatasetItem)
            .join(TaskResult, TaskResult.task_id == EvaluationTask.id)
            .join(DatasetItem, DatasetItem.id == EvaluationTask.item_id)
            .where(EvaluationTask.project_id == p.id, EvaluationTask.status == "completed")
            .order_by(DatasetItem.created_at, DatasetItem.id))
    if body.include.exclude_gold:
        stmt = stmt.where(EvaluationTask.is_gold.is_(False))
    rows = db.execute(stmt).all()
    if body.include.min_agreement is not None:
        rows = [r for r in rows if r[1].agreement is None or r[1].agreement >= body.include.min_agreement]
    if not rows:
        raise AppError(422, "no_completed_tasks", "no completed tasks match the selection")
    item_ids = [i.id for _, _, i in rows]
    outputs: dict = {}
    for o, m in db.execute(select(ModelOutput, ModelRun.model_name).join(ModelRun, ModelRun.id == ModelOutput.model_run_id)
                           .where(ModelOutput.item_id.in_(item_ids)).order_by(ModelOutput.position)):
        outputs.setdefault(o.item_id, []).append({"model": m, "output_id": str(o.id), "text": o.text})
    pseud: dict = {}
    sub_ids = [sid for _, r, _ in rows for sid in r.submission_ids]
    for sid, name in db.execute(select(Submission.id, Submission.expert_pseudonym).where(Submission.id.in_(sub_ids))):
        pseud[sid] = name
    rv_ids = {t.rubric_version_id for t, _, _ in rows}
    rvs = {v.id: v for v in db.execute(select(RubricVersion).where(RubricVersion.id.in_(rv_ids))).scalars()}
    version = (db.execute(select(func.max(DatasetVersion.version)).where(DatasetVersion.project_id == p.id)).scalar() or 0) + 1
    current_rv = rvs.get(p.current_rubric_version_id) or next(iter(rvs.values()))
    dv = DatasetVersion(org_id=ctx.org_id, project_id=p.id, version=version, status="building",
                        include=body.include.model_dump(), notes=body.notes, rubric_version_id=current_rv.id,
                        rubric_content_sha256=current_rv.content_sha256, created_by=ctx.user_id)
    db.add(dv)
    db.flush()
    hashes = []
    for t, r, i in rows:
        rv = rvs[t.rubric_version_id]
        snap = {
            "item_id": str(i.id), "external_id": i.external_id, "prompt": i.prompt, "context": i.context,
            "metadata": i.item_metadata, "outputs": outputs.get(i.id, []),
            "result": {"final_scores": r.final_scores, "final_preference": r.final_preference,
                       "final_correction": r.final_correction, "final_error_labels": r.final_error_labels,
                       "final_source": r.final_source, "agreement": r.agreement},
            "rubric_version": {"id": str(rv.id), "version": rv.version, "content_sha256": rv.content_sha256},
            "error_label_meta": rv.error_labels,
            "expert_pseudonyms": sorted({pseud[s] for s in r.submission_ids if s in pseud}),
            "is_gold": t.is_gold, "task_type": p.task_type,
        }
        h = canonical_sha(snap)
        hashes.append(h)
        db.add(DatasetVersionItem(org_id=ctx.org_id, dataset_version_id=dv.id, task_id=t.id, item_id=i.id,
                                  item_sha256=h, snapshot=jsonable_encoder(snap)))
    db.flush()
    dv.item_count = len(rows)
    dv.manifest_sha256 = hashlib.sha256("\n".join(sorted(hashes)).encode()).hexdigest()
    dv.status = "frozen"
    db.flush()
    write_audit(db, org_id=ctx.org_id, actor_user_id=ctx.user_id, action="dataset_version.frozen",
                target_type="dataset_version", target_id=dv.id, data={"version": version, "item_count": dv.item_count})
    out = dv_out(dv)
    commit(db)
    return out


@router.get("/dataset-versions")
def list_dataset_versions(pid: uuid.UUID, ctx: OrgContext = Depends(org_context)):
    get_project(ctx.db, ctx.org_id, pid)
    rows = ctx.db.execute(select(DatasetVersion).where(DatasetVersion.project_id == pid).order_by(DatasetVersion.version.desc())).scalars()
    return {"data": [dv_out(d) for d in rows], "next_cursor": None}
