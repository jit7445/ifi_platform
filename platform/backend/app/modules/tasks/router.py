"""Expert work queue: /v1/me/projects and /v1/me/tasks..."""

import json
import uuid
from datetime import UTC, datetime
from typing import Any, Literal

from fastapi import APIRouter, Body, Depends, Response
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from pydantic import Field
from sqlalchemy import func, select, text

from Frontier_platform.platform.backend.app.core import idempotency
from Frontier_platform.platform.backend.app.core.audit import write_audit
from Frontier_platform.platform.backend.app.core.config import get_settings
from Frontier_platform.platform.backend.app.core.db import commit, set_context
from Frontier_platform.platform.backend.app.core.deps import ExpertContext, expert_context, idempotency_key
from Frontier_platform.platform.backend.app.core.errors import AppError, not_found, validation
from Frontier_platform.platform.backend.app.core.jobs import enqueue
from Frontier_platform.platform.backend.app.core.schemas import StrictModel
from Frontier_platform.platform.backend.app.modules.evaluation import validation as sv
from Frontier_platform.platform.backend.app.modules.evaluation.models import Submission
from Frontier_platform.platform.backend.app.modules.experts.models import ExpertProfile
from Frontier_platform.platform.backend.app.modules.ingestion.models import DatasetItem, ModelOutput, ModelRun
from Frontier_platform.platform.backend.app.modules.orgs.models import Org
from Frontier_platform.platform.backend.app.modules.projects.models import Project, ProjectExpert
from Frontier_platform.platform.backend.app.modules.rubrics.models import RubricVersion
from Frontier_platform.platform.backend.app.modules.tasks.models import EvaluationTask, TaskAssignment

router = APIRouter(prefix="/me", tags=["expert tasks"])

VISIBLE = ("in_progress", "submitted", "rework", "accepted")
MAX_DRAFT_BYTES = 256 * 1024


class NextIn(StrictModel):
    project_id: uuid.UUID


class ScoreIn(StrictModel):
    criterion_key: str
    output_slot: Literal["A", "B"]
    value: int | float | str
    explanation: str | None = Field(default=None, max_length=10000)


class LabelIn(StrictModel):
    label_key: str
    output_slot: Literal["A", "B"]
    note: str | None = Field(default=None, max_length=5000)


class CorrectionIn(StrictModel):
    source_slot: Literal["A", "B"]
    text: str = Field(max_length=200_000)
    rationale: str | None = Field(default=None, max_length=10000)


class PreferenceIn(StrictModel):
    chosen_slot: Literal["A", "B"] | None = None
    strength: int = 1
    is_tie: bool = False
    both_bad: bool = False
    rationale: str = Field(default="", max_length=10000)


class SubmissionIn(StrictModel):
    rubric_version_id: uuid.UUID
    scores: list[ScoreIn] = Field(default_factory=list, max_length=200)
    error_labels: list[LabelIn] = Field(default_factory=list, max_length=200)
    corrected_output: CorrectionIn | None = None
    preference: PreferenceIn | None = None
    overall_comment: str | None = Field(default=None, max_length=10000)
    confidence: int
    time_spent_seconds: int


def customer_display(alias: str) -> str:
    return f"Customer #{alias}"


def _profile(ctx: ExpertContext) -> ExpertProfile:
    ctx.use_org(ctx.platform_org_id)
    p = ctx.db.execute(select(ExpertProfile).where(ExpertProfile.user_id == ctx.user_id)).scalar_one_or_none()
    if p is None:
        raise not_found("expert profile")
    return p


def _assignment(ctx: ExpertContext, aid: uuid.UUID, lock: bool = False) -> TaskAssignment:
    stmt = select(TaskAssignment).where(TaskAssignment.id == aid, TaskAssignment.expert_user_id == ctx.user_id)
    if lock:
        stmt = stmt.with_for_update()
    a = ctx.db.execute(stmt).scalar_one_or_none()
    if a is None or a.status not in VISIBLE:
        raise not_found("task")
    ctx.use_org(a.org_id)
    return a


def summary_out(a: TaskAssignment, p: Project) -> dict:
    return {"assignment_id": str(a.id), "task_id": str(a.task_id), "project_id": str(a.project_id), "project_name": p.name,
            "task_type": p.task_type, "status": a.status, "due_at": a.due_at, "lease_expires_at": a.lease_expires_at,
            "created_at": a.created_at}


@router.get("/projects")
def my_projects(ctx: ExpertContext = Depends(expert_context)):
    db = ctx.db
    rows = db.execute(
        select(ProjectExpert, Project, Org.alias).join(Project, Project.id == ProjectExpert.project_id)
        .join(Org, Org.id == Project.org_id)
        .where(ProjectExpert.user_id == ctx.user_id, ProjectExpert.status == "approved")
        .order_by(Project.created_at)
    ).all()
    out = []
    for pe, p, alias in rows:
        counts = dict(db.execute(select(TaskAssignment.status, func.count()).where(
            TaskAssignment.project_id == p.id, TaskAssignment.expert_user_id == ctx.user_id).group_by(TaskAssignment.status)).all())
        available = db.execute(text("select app_expert_available_tasks(:p, :u)"), {"p": p.id, "u": ctx.user_id}).scalar()
        out.append({"project_id": str(p.id), "name": p.name, "customer_display": customer_display(alias),
                    "task_type": p.task_type, "status": p.status, "available_tasks": available if p.status == "active" else 0,
                    "my_submitted": counts.get("submitted", 0) + counts.get("accepted", 0),
                    "my_in_progress": counts.get("in_progress", 0) + counts.get("rework", 0), "max_tasks": pe.max_tasks})
    return out


@router.post("/tasks:next", status_code=201)
def next_task(body: NextIn, ctx: ExpertContext = Depends(expert_context)):
    db = ctx.db
    _profile(ctx)
    row = db.execute(text("select assignment_id, reason from app_claim_next_task(:p, :u, :h)"),
                     {"p": body.project_id, "u": ctx.user_id, "h": get_settings().lease_hours}).one()
    if row.reason != "ok":
        status, msg = {
            "no_tasks_available": (404, "no tasks are available right now"),
            "max_tasks_reached": (409, "you reached the task limit for this project"),
            "project_not_active": (409, "the project is not active"),
            "expert_inactive": (403, "your expert profile is not active"),
        }.get(row.reason, (404, "project not found"))
        raise AppError(status, row.reason if row.reason != "forbidden" else "not_found", msg)
    a = db.get(TaskAssignment, row.assignment_id)
    p = db.get(Project, a.project_id)
    write_audit(db, org_id=ctx.platform_org_id, actor_user_id=ctx.user_id, action="task.claimed",
                target_type="task_assignment", target_id=a.id, data={"project_id": str(a.project_id)})
    out = summary_out(a, p)
    commit(db)
    return out


@router.get("/tasks")
def my_tasks(status: Literal["in_progress", "submitted", "rework", "accepted"] | None = None,
             ctx: ExpertContext = Depends(expert_context)):
    stmt = (select(TaskAssignment, Project).join(Project, Project.id == TaskAssignment.project_id)
            .where(TaskAssignment.expert_user_id == ctx.user_id))
    stmt = stmt.where(TaskAssignment.status == status) if status else stmt.where(TaskAssignment.status.in_(VISIBLE))
    rows = ctx.db.execute(stmt.order_by(TaskAssignment.created_at.desc()).limit(500)).all()
    return {"data": [summary_out(a, p) for a, p in rows], "next_cursor": None}


def rubric_payload(rv: RubricVersion) -> dict:
    return {"id": str(rv.id), "version": rv.version, "instructions_md": rv.instructions_md, "criteria": rv.criteria,
            "error_labels": rv.error_labels, "require_correction": rv.require_correction,
            "require_overall_comment": rv.require_overall_comment}


@router.get("/tasks/{aid}")
def task_payload(aid: uuid.UUID, ctx: ExpertContext = Depends(expert_context)):
    db = ctx.db
    a = _assignment(ctx, aid)
    task = db.get(EvaluationTask, a.task_id)
    if task is None:
        raise not_found("task")
    item = db.get(DatasetItem, task.item_id)
    p = db.get(Project, a.project_id)
    alias = db.execute(select(Org.alias).where(Org.id == p.org_id)).scalar()
    outputs = {str(o.id): o.text for o in db.execute(select(ModelOutput).where(ModelOutput.item_id == task.item_id)).scalars()}
    rv = db.get(RubricVersion, task.rubric_version_id)
    return {
        "assignment_id": str(a.id), "task_id": str(task.id), "status": a.status, "task_type": p.task_type,
        "project": {"id": str(p.id), "name": p.name, "customer_display": customer_display(alias)},
        "item": {"prompt": item.prompt, "context": item.context, "reference_answer_visible": False},
        "outputs": [{"slot": slot, "text": outputs[oid]} for slot, oid in sorted(a.slot_map.items())],
        "rubric_version": rubric_payload(rv),
        "draft": a.draft, "feedback": a.feedback or [], "lease_expires_at": a.lease_expires_at, "due_at": a.due_at,
    }


@router.put("/tasks/{aid}/draft")
def save_draft(aid: uuid.UUID, draft: dict[str, Any] = Body(...), ctx: ExpertContext = Depends(expert_context)):
    a = _assignment(ctx, aid, lock=True)
    if a.status not in ("in_progress", "rework"):
        raise AppError(409, "assignment_not_open", f"task is {a.status}")
    if len(json.dumps(draft)) > MAX_DRAFT_BYTES:
        raise AppError(413, "draft_too_large", "draft exceeds 256 KiB")
    a.draft = draft
    commit(ctx.db)
    return {"saved_at": datetime.now(UTC)}


@router.post("/tasks/{aid}/submission", status_code=201)
def submit(aid: uuid.UUID, body: SubmissionIn, ctx: ExpertContext = Depends(expert_context),
           key: str | None = Depends(idempotency_key)):
    db = ctx.db
    raw = body.model_dump(mode="json")
    profile = _profile(ctx)
    replay = idempotency.replay(db, ctx.user_id, key, f"submission:{aid}", raw)
    if replay:
        return replay
    a = _assignment(ctx, aid, lock=True)
    if a.status not in ("in_progress", "rework"):
        raise AppError(409, "assignment_not_open", f"task is {a.status}")
    if a.status == "in_progress" and a.lease_expires_at and a.lease_expires_at < datetime.now(UTC):
        raise AppError(409, "lease_expired", "the task lease expired")
    task = db.get(EvaluationTask, a.task_id)
    p = db.get(Project, a.project_id)
    rv = db.get(RubricVersion, task.rubric_version_id)
    errors, flags = sv.validate_submission(p.task_type, rubric_payload(rv), sorted(a.slot_map), raw)
    if errors:
        raise validation(errors, "submission failed validation")
    # model_runs is hidden from the expert scope (model names stay blind); the server resolves them under the
    # system scope for this one lookup and never returns them to the expert.
    set_context(db, a.org_id, ctx.user_id, "system")
    model_of = {str(oid): name for oid, name in db.execute(
        select(ModelOutput.id, ModelRun.model_name).join(ModelRun, ModelRun.id == ModelOutput.model_run_id)
        .where(ModelOutput.item_id == task.item_id)).all()}
    ctx.use_org(a.org_id)
    resolved = sv.resolve(raw, {k: str(v) for k, v in a.slot_map.items()}, model_of)
    revision = (db.execute(select(func.max(Submission.revision)).where(Submission.assignment_id == a.id)).scalar() or 0) + 1
    sub = Submission(org_id=a.org_id, project_id=a.project_id, task_id=a.task_id, assignment_id=a.id, expert_id=profile.id,
                     expert_user_id=ctx.user_id, expert_pseudonym=profile.pseudonym, rubric_version_id=rv.id,
                     revision=revision, payload=raw, resolved=resolved, confidence=body.confidence,
                     time_spent_seconds=body.time_spent_seconds, flags=flags, status="submitted")
    db.add(sub)
    a.status, a.submitted_at, a.draft = "submitted", datetime.now(UTC), None
    db.flush()
    enqueue(db, a.org_id, "qa.process_submission", submission_id=sub.id, org_id=a.org_id)
    write_audit(db, org_id=a.org_id, actor_user_id=ctx.user_id, action="submission.created", target_type="submission",
                target_id=sub.id, data={"revision": revision, "flags": flags})
    out = {"submission_id": str(sub.id), "revision": revision, "status": "submitted"}
    idempotency.remember(db, ctx.user_id, key, f"submission:{aid}", raw, 201, out)
    commit(db)
    return JSONResponse(jsonable_encoder(out), status_code=201)


@router.post("/tasks/{aid}:release", status_code=204)
def release(aid: uuid.UUID, ctx: ExpertContext = Depends(expert_context)):
    a = _assignment(ctx, aid, lock=True)
    if a.status != "in_progress":
        raise AppError(409, "assignment_not_open", f"only in-progress tasks can be released (task is {a.status})")
    a.status = "released"
    write_audit(ctx.db, org_id=a.org_id, actor_user_id=ctx.user_id, action="task.released", target_type="task_assignment",
                target_id=a.id)
    commit(ctx.db)
    return Response(status_code=204)
