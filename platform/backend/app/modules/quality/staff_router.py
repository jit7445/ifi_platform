"""Staff review queue and adjudication (/v1/staff/reviews, /v1/staff/adjudications)."""

import uuid
from typing import Any, Literal

from fastapi import APIRouter, Depends
from pydantic import Field
from sqlalchemy import select

from Frontier_platform.platform.backend.app.core.audit import write_audit
from Frontier_platform.platform.backend.app.core.db import commit, ops_session
from Frontier_platform.platform.backend.app.core.deps import StaffContext, reviewer_context
from Frontier_platform.platform.backend.app.core.errors import AppError, field_error, validation
from Frontier_platform.platform.backend.app.core.schemas import StrictModel
from Frontier_platform.platform.backend.app.modules.evaluation.models import Submission
from Frontier_platform.platform.backend.app.modules.ingestion.models import DatasetItem, ModelOutput, ModelRun
from Frontier_platform.platform.backend.app.modules.projects.models import Project
from Frontier_platform.platform.backend.app.modules.quality import logic
from Frontier_platform.platform.backend.app.modules.quality import pipeline
from Frontier_platform.platform.backend.app.modules.quality.models import Adjudication, Review, TaskResult
from Frontier_platform.platform.backend.app.modules.rubrics.models import RubricVersion
from Frontier_platform.platform.backend.app.modules.tasks.models import EvaluationTask

router = APIRouter(prefix="/staff", tags=["staff: qa"])


class DecideIn(StrictModel):
    decision: Literal["accept", "request_rework", "reject", "escalate"]
    feedback: str = Field(default="", max_length=10000)


class FinalResult(StrictModel):
    scores: dict[str, Any] = Field(default_factory=dict)
    preference: dict[str, Any] | None = None
    corrected_text: str | None = Field(default=None, max_length=200_000)
    corrected_source_slot: Literal["A", "B"] | None = None


class ResolveIn(StrictModel):
    resolution: Literal["select_submission", "merge"]
    selected_submission_id: uuid.UUID | None = None
    final_result: FinalResult | None = None
    rationale: str = Field(min_length=30, max_length=10000)


def item_view(db, task: EvaluationTask) -> tuple[dict, list[dict], list[str]]:
    item = db.get(DatasetItem, task.item_id)
    rows = db.execute(select(ModelOutput, ModelRun.model_name).join(ModelRun, ModelRun.id == ModelOutput.model_run_id)
                      .where(ModelOutput.item_id == task.item_id).order_by(ModelOutput.position)).all()
    models = [m for _, m in rows]
    outputs = [{"slot": "AB"[i], "model": m, "output_id": str(o.id), "text": o.text} for i, (o, m) in enumerate(rows)]
    return ({"id": str(item.id), "external_id": item.external_id, "prompt": item.prompt, "context": item.context,
             "reference_answer": item.reference_answer, "is_gold": item.is_gold}, outputs, models)


def submission_view(s: Submission, models: list[str]) -> dict:
    return {"id": str(s.id), "expert_id": str(s.expert_id), "expert_pseudonym": s.expert_pseudonym, "revision": s.revision,
            "status": s.status, "flags": list(s.flags), "confidence": s.confidence,
            "time_spent_seconds": s.time_spent_seconds, "created_at": s.created_at,
            **logic.to_canonical(s.resolved, models)}


def review_row(r: Review, project_name: str | None) -> dict:
    return {"id": str(r.id), "project_id": str(r.project_id), "project_name": project_name, "task_id": str(r.task_id),
            "submission_id": str(r.submission_id), "kind": r.kind, "status": r.status, "claimed_by": str(r.claimed_by) if r.claimed_by else None,
            "decision": r.decision, "feedback": r.feedback, "created_at": r.created_at, "decided_at": r.decided_at}


@router.get("/reviews")
def list_reviews(status: Literal["open", "claimed", "done"] | None = None, project_id: uuid.UUID | None = None,
                 limit: int = 200, ctx: StaffContext = Depends(reviewer_context)):
    with ops_session(ctx.user_id, "staff review queue") as db:
        stmt = select(Review, Project.name).join(Project, Project.id == Review.project_id)
        if status:
            stmt = stmt.where(Review.status == status)
        if project_id:
            stmt = stmt.where(Review.project_id == project_id)
        rows = db.execute(stmt.order_by(Review.created_at).limit(min(max(limit, 1), 500))).all()
        data = [review_row(r, n) for r, n in rows]
    return {"data": data, "next_cursor": None}


def _review(ctx: StaffContext, rid: uuid.UUID, lock: bool = False) -> Review:
    ctx.resolve("review", rid, "review")
    stmt = select(Review).where(Review.id == rid)
    if lock:
        stmt = stmt.with_for_update()
    return ctx.db.execute(stmt).scalar_one()


@router.get("/reviews/{rid}")
def get_review(rid: uuid.UUID, ctx: StaffContext = Depends(reviewer_context)):
    db = ctx.db
    r = _review(ctx, rid)
    task = db.get(EvaluationTask, r.task_id)
    p = db.get(Project, r.project_id)
    sub = db.get(Submission, r.submission_id)
    item, outputs, models = item_view(db, task)
    rv = db.get(RubricVersion, task.rubric_version_id)
    from Frontier_platform.platform.backend.app.modules.tasks.router import rubric_payload

    return {**review_row(r, p.name), "task_type": p.task_type, "item": item, "outputs": outputs,
            "rubric_version": rubric_payload(rv), "submission": submission_view(sub, models),
            "expert_pseudonym": sub.expert_pseudonym}


@router.post("/reviews/{rid}:claim")
def claim_review(rid: uuid.UUID, ctx: StaffContext = Depends(reviewer_context)):
    r = _review(ctx, rid, lock=True)
    if r.status == "done":
        raise AppError(409, "review_closed", "review is already decided")
    if r.status == "claimed" and r.claimed_by != ctx.user_id:
        raise AppError(409, "review_claimed", "another reviewer claimed this review")
    sub = ctx.db.get(Submission, r.submission_id)
    if sub.expert_user_id == ctx.user_id:
        raise AppError(403, "self_review", "you cannot review your own submission")
    r.status, r.claimed_by = "claimed", ctx.user_id
    out = review_row(r, None)
    commit(ctx.db)
    return out


@router.post("/reviews/{rid}:decide")
def decide_review(rid: uuid.UUID, body: DecideIn, ctx: StaffContext = Depends(reviewer_context)):
    db = ctx.db
    r = _review(ctx, rid, lock=True)
    if r.status == "done":
        raise AppError(409, "review_closed", "review is already decided")
    if r.status == "claimed" and r.claimed_by != ctx.user_id:
        raise AppError(409, "review_claimed", "another reviewer claimed this review")
    sub = db.get(Submission, r.submission_id)
    if sub.expert_user_id == ctx.user_id:
        raise AppError(403, "self_review", "you cannot review your own submission")
    if body.decision in ("request_rework", "reject") and len(body.feedback.strip()) < 10:
        raise validation([field_error("feedback", "required", "explain the decision to the expert (at least 10 characters)")])
    pipeline.decide_review(db, r, body.decision, body.feedback, ctx.user_id)
    write_audit(db, org_id=r.org_id, actor_user_id=ctx.user_id, action=f"review.{body.decision}", target_type="review",
                target_id=r.id, data={"kind": r.kind, "submission_id": str(r.submission_id)})
    out = review_row(r, None)
    commit(db)
    return out


def adj_row(a: Adjudication, project_name: str | None) -> dict:
    return {"id": str(a.id), "project_id": str(a.project_id), "project_name": project_name, "task_id": str(a.task_id),
            "status": a.status, "reason": a.reason, "resolution": a.resolution, "created_at": a.created_at,
            "resolved_at": a.resolved_at, "n_submissions": len(a.submission_ids)}


@router.get("/adjudications")
def list_adjudications(status: Literal["open", "resolved"] | None = None, project_id: uuid.UUID | None = None,
                       ctx: StaffContext = Depends(reviewer_context)):
    with ops_session(ctx.user_id, "staff adjudication queue") as db:
        stmt = select(Adjudication, Project.name).join(Project, Project.id == Adjudication.project_id)
        if status:
            stmt = stmt.where(Adjudication.status == status)
        if project_id:
            stmt = stmt.where(Adjudication.project_id == project_id)
        data = [adj_row(a, n) for a, n in db.execute(stmt.order_by(Adjudication.created_at).limit(500)).all()]
    return {"data": data, "next_cursor": None}


def _summary_canonical(summary: dict, models: list[str]) -> dict:
    slot = logic.canonical_slots(models)
    issues = []
    for i in summary.get("issues", []):
        row = dict(i)
        if "model" in row:
            row["output_slot"] = slot.get(row["model"])
        if row.get("criterion") == "preference":
            row["values"] = [None if v is None else ("tie" if v == "tie" else "both_bad" if v == "both_bad"
                             else slot.get(v.removeprefix("model:"))) for v in row.get("values", [])]
        issues.append(row)
    return {**summary, "issues": issues}


@router.get("/adjudications/{aid}")
def get_adjudication(aid: uuid.UUID, ctx: StaffContext = Depends(reviewer_context)):
    db = ctx.db
    ctx.resolve("adjudication", aid, "adjudication")
    a = db.get(Adjudication, aid)
    task = db.get(EvaluationTask, a.task_id)
    p = db.get(Project, a.project_id)
    item, outputs, models = item_view(db, task)
    subs = db.execute(select(Submission).where(Submission.id.in_(a.submission_ids)).order_by(Submission.created_at)).scalars()
    rv = db.get(RubricVersion, task.rubric_version_id)
    from Frontier_platform.platform.backend.app.modules.tasks.router import rubric_payload

    result = db.execute(select(TaskResult).where(TaskResult.task_id == task.id)).scalar_one_or_none()
    return {**adj_row(a, p.name), "task_type": p.task_type, "item": item, "outputs": outputs,
            "rubric_version": rubric_payload(rv), "submissions": [submission_view(s, models) for s in subs],
            "disagreement": _summary_canonical(a.summary or {}, models), "rationale": a.rationale,
            "final_result": result_canonical(result, models) if result else None}


def result_canonical(r: TaskResult, models: list[str]) -> dict:
    slot = logic.canonical_slots(models)
    scores = {f"{c}|{slot[m]}": v for m, crits in (r.final_scores or {}).items() if m in slot for c, v in crits.items()}
    pref = r.final_preference
    return {"scores": scores, "final_scores_by_model": r.final_scores, "final_source": r.final_source,
            "preference": None if not pref else {**pref, "chosen_slot": slot.get(pref.get("chosen_model"))},
            "corrected_output": r.final_correction, "agreement": r.agreement}


@router.post("/adjudications/{aid}:resolve")
def resolve_adjudication(aid: uuid.UUID, body: ResolveIn, ctx: StaffContext = Depends(reviewer_context)):
    db = ctx.db
    ctx.resolve("adjudication", aid, "adjudication")
    a = db.execute(select(Adjudication).where(Adjudication.id == aid).with_for_update()).scalar_one()
    if a.status != "open":
        raise AppError(409, "adjudication_closed", "adjudication is already resolved")
    if body.resolution == "select_submission":
        if body.selected_submission_id not in a.submission_ids:
            raise validation([field_error("selected_submission_id", "invalid", "pick one of the adjudicated submissions")])
    elif body.final_result is None:
        raise validation([field_error("final_result", "required", "merge needs a final_result")])
    own = db.execute(select(Submission.id).where(Submission.id.in_(a.submission_ids),
                                                 Submission.expert_user_id == ctx.user_id)).first()
    if own:
        raise AppError(403, "self_review", "you cannot adjudicate a task you worked on")
    try:
        res = pipeline.resolve_adjudication(db, a, body.resolution, body.selected_submission_id,
                                            body.final_result.model_dump() if body.final_result else None,
                                            body.rationale, ctx.user_id)
    except (ValueError, KeyError) as e:
        raise validation([field_error("final_result", "invalid", str(e))])
    write_audit(db, org_id=a.org_id, actor_user_id=ctx.user_id, action="adjudication.resolved", target_type="adjudication",
                target_id=a.id, data={"resolution": body.resolution})
    task = db.get(EvaluationTask, a.task_id)
    _, _, models = item_view(db, task)
    out = {**adj_row(a, None), "final_result": result_canonical(res, models)}
    commit(db)
    return out
