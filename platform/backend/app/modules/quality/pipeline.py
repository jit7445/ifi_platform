"""QA state machine (contract section 7). Runs inside a session whose RLS context is the task's org."""

import random
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from Frontier_platform.platform.backend.app.core.audit import write_audit
from Frontier_platform.platform.backend.app.core.config import get_settings
from Frontier_platform.platform.backend.app.core.db import commit
from Frontier_platform.platform.backend.app.core.jobs import job, system_session
from Frontier_platform.platform.backend.app.modules.evaluation.models import Submission
from Frontier_platform.platform.backend.app.modules.ingestion.models import ModelOutput, ModelRun
from Frontier_platform.platform.backend.app.modules.projects.models import Project
from Frontier_platform.platform.backend.app.modules.quality import logic
from Frontier_platform.platform.backend.app.modules.quality.models import Adjudication, GoldItem, GoldResult, Review, TaskResult
from Frontier_platform.platform.backend.app.modules.rubrics.models import RubricVersion
from Frontier_platform.platform.backend.app.modules.tasks.models import EvaluationTask, TaskAssignment
from Frontier_platform.platform.backend.app.modules.usage.models import UsageRecord

_rng = random.Random(get_settings().qa_random_seed) if get_settings().qa_random_seed is not None else random.SystemRandom()


def sample(rate: float) -> bool:
    return rate > 0 and _rng.random() < rate


def models_in_order(db: Session, item_id: uuid.UUID) -> list[str]:
    return list(db.execute(
        select(ModelRun.model_name).join(ModelOutput, ModelOutput.model_run_id == ModelRun.id)
        .where(ModelOutput.item_id == item_id).order_by(ModelOutput.position)
    ).scalars())


def rubric_criteria(db: Session, rubric_version_id: uuid.UUID) -> RubricVersion:
    return db.get(RubricVersion, rubric_version_id)


def accepted_submissions(db: Session, task_id: uuid.UUID) -> list[Submission]:
    rows = db.execute(select(Submission).where(Submission.task_id == task_id, Submission.status == "accepted")
                      .order_by(Submission.created_at)).scalars().all()
    latest: dict[uuid.UUID, Submission] = {}
    for s in rows:
        if s.assignment_id not in latest or s.revision > latest[s.assignment_id].revision:
            latest[s.assignment_id] = s
    return list(latest.values())


def open_review(db: Session, sub: Submission, kind: str) -> Review:
    r = Review(org_id=sub.org_id, project_id=sub.project_id, task_id=sub.task_id, submission_id=sub.id, kind=kind, status="open")
    db.add(r)
    db.flush()
    return r


def accept(db: Session, sub: Submission) -> None:
    sub.status = "accepted"
    a = db.get(TaskAssignment, sub.assignment_id)
    if a.status in ("submitted", "rework", "in_progress"):
        a.status = "accepted"


def finalize(db: Session, task: EvaluationTask, final: dict, source: str, agreement: float | None,
             submission_ids: list[uuid.UUID]) -> TaskResult:
    existing = db.execute(select(TaskResult).where(TaskResult.task_id == task.id)).scalar_one_or_none()
    if existing is not None:
        db.delete(existing)
        db.flush()
    res = TaskResult(org_id=task.org_id, project_id=task.project_id, task_id=task.id, item_id=task.item_id,
                     final_scores=final["final_scores"], final_preference=final.get("final_preference"),
                     final_correction=final.get("final_correction"), final_error_labels=final.get("final_error_labels") or [],
                     final_source=source, agreement=agreement, submission_ids=submission_ids)
    db.add(res)
    task.status = "completed"
    task.completed_at = datetime.now(UTC)
    db.execute(insert(UsageRecord).values(id=uuid.uuid4(), org_id=task.org_id, project_id=task.project_id, task_id=task.id,
                                          kind="accepted_task", quantity=1)
               .on_conflict_do_nothing(index_elements=["task_id", "kind"]))
    db.flush()
    write_audit(db, org_id=task.org_id, actor_user_id=None, actor_kind="system", action="task.finalized",
                target_type="evaluation_task", target_id=task.id, data={"source": source})
    return res


def evaluate_task(db: Session, task: EvaluationTask) -> str:
    """Moves a task forward once enough accepted submissions exist. Returns what happened."""
    if task.status in ("completed", "adjudication", "qa"):
        return "noop"
    subs = accepted_submissions(db, task.id)
    if len(subs) < task.required_overlap:
        return "waiting"
    project = db.get(Project, task.project_id)
    rate = float(project.quality.get("review_rate", 0))
    rv = rubric_criteria(db, task.rubric_version_id)
    models = models_in_order(db, task.item_id)
    resolveds = [s.resolved for s in subs]
    if task.required_overlap == 1:
        if sample(rate):
            open_review(db, subs[0], "sample")
            task.status = "qa"
            return "sampled"
        finalize(db, task, logic.from_single(resolveds[0], models), "single", None, [s.id for s in subs])
        return "finalized"
    disagree, summary = logic.disagreement(resolveds, rv.criteria, models, project.task_type)
    if disagree:
        db.add(Adjudication(org_id=task.org_id, project_id=task.project_id, task_id=task.id, status="open",
                            reason="disagreement", summary=summary, submission_ids=[s.id for s in subs]))
        task.status = "adjudication"
        return "adjudication"
    final = logic.consensus(resolveds, rv.criteria, models)
    finalize(db, task, final, "consensus", logic.item_agreement(resolveds, rv.criteria, models), [s.id for s in subs])
    if sample(rate):
        # Post-finalization audit sample: informs expert quality stats, does not reopen the task.
        open_review(db, _rng.choice(subs), "sample")
    return "finalized"


def process_submission(db: Session, sub: Submission) -> str:
    if sub.status != "submitted":
        return "noop"
    task = db.execute(select(EvaluationTask).where(EvaluationTask.id == sub.task_id).with_for_update()).scalar_one()
    hold = False
    if task.is_gold:
        gold = db.execute(select(GoldItem).where(GoldItem.item_id == task.item_id)).scalar_one_or_none()
        if gold is not None:
            rv = rubric_criteria(db, task.rubric_version_id)
            passed, details = logic.gold_check(sub.resolved, gold.expected, gold.tolerance, rv.criteria,
                                               models_in_order(db, task.item_id))
            db.execute(insert(GoldResult).values(id=uuid.uuid4(), org_id=sub.org_id, project_id=sub.project_id,
                                                 task_id=task.id, submission_id=sub.id, expert_id=sub.expert_id,
                                                 passed=passed, details=details)
                       .on_conflict_do_nothing(index_elements=["submission_id"]))
            if not passed:
                open_review(db, sub, "gold_fail")
                hold = True
    if "too_fast" in (sub.flags or []):
        open_review(db, sub, "too_fast")
        hold = True
    if hold:
        task.status = "qa" if task.required_overlap == 1 else task.status
        return "held_for_review"
    accept(db, sub)
    db.flush()
    return evaluate_task(db, task)


@job("qa.process_submission")
def process_submission_job(submission_id: str, org_id: str) -> None:
    with system_session(uuid.UUID(org_id)) as db:
        sub = db.execute(select(Submission).where(Submission.id == uuid.UUID(submission_id)).with_for_update()).scalar_one_or_none()
        if sub is None:
            return
        process_submission(db, sub)
        commit(db)


def reopen_slot(db: Session, task: EvaluationTask) -> None:
    if task.status in ("qa", "in_progress"):
        task.status = "open"


def decide_review(db: Session, review: Review, decision: str, feedback: str, actor: uuid.UUID) -> None:
    sub = db.get(Submission, review.submission_id)
    task = db.execute(select(EvaluationTask).where(EvaluationTask.id == review.task_id).with_for_update()).scalar_one()
    a = db.get(TaskAssignment, sub.assignment_id)
    review.status, review.decision, review.feedback = "done", decision, feedback
    review.decided_by, review.decided_at = actor, datetime.now(UTC)
    post_final = task.status == "completed"
    if decision == "accept":
        if sub.status == "submitted":
            accept(db, sub)
        db.flush()
        if task.status == "qa":
            others = db.execute(select(Review.id).where(Review.task_id == task.id, Review.status != "done",
                                                        Review.id != review.id)).first()
            if others is None:
                subs = accepted_submissions(db, task.id)
                if task.required_overlap == 1 and review.kind == "sample" and subs:
                    finalize(db, task, logic.from_single(subs[-1].resolved, models_in_order(db, task.item_id)), "review",
                             None, [s.id for s in subs])
                else:
                    task.status = "in_progress"
                    evaluate_task(db, task)
        elif not post_final:
            evaluate_task(db, task)
    elif decision == "request_rework":
        if not post_final:
            sub.status = "rework_requested"
            a.status = "rework"
            a.feedback = [*(a.feedback or []), {"from": "review", "message": feedback, "created_at": datetime.now(UTC).isoformat()}]
            if task.status == "qa":
                task.status = "in_progress"
    elif decision == "reject":
        if not post_final:
            sub.status = "rejected"
            a.status = "rejected"
            a.feedback = [*(a.feedback or []), {"from": "review", "message": feedback, "created_at": datetime.now(UTC).isoformat()}]
            reopen_slot(db, task)
    elif decision == "escalate":
        if sub.status == "submitted":
            accept(db, sub)
        db.flush()
        subs = accepted_submissions(db, task.id)
        db.add(Adjudication(org_id=task.org_id, project_id=task.project_id, task_id=task.id, status="open",
                            reason="escalated", summary={"escalated_from_review": str(review.id), "feedback": feedback},
                            submission_ids=[s.id for s in subs] or [sub.id]))
        task.status = "adjudication"
    db.flush()


def resolve_adjudication(db: Session, adj: Adjudication, resolution: str, selected: uuid.UUID | None,
                         final_result: dict | None, rationale: str, actor: uuid.UUID) -> TaskResult:
    task = db.execute(select(EvaluationTask).where(EvaluationTask.id == adj.task_id).with_for_update()).scalar_one()
    models = models_in_order(db, task.item_id)
    subs = {s.id: s for s in db.execute(select(Submission).where(Submission.id.in_(adj.submission_ids))).scalars()}
    if resolution == "select_submission":
        final = logic.from_single(subs[selected].resolved, models)
    else:
        final = logic.from_canonical_final(final_result or {}, models)
    rv = rubric_criteria(db, task.rubric_version_id)
    agreement = logic.item_agreement([s.resolved for s in subs.values()], rv.criteria, models)
    adj.status, adj.resolution, adj.selected_submission_id = "resolved", resolution, selected
    adj.final_result, adj.rationale, adj.resolved_by, adj.resolved_at = final, rationale, actor, datetime.now(UTC)
    task.status = "in_progress"
    res = finalize(db, task, final, "adjudication", agreement, list(subs))
    for s in subs.values():
        a = db.get(TaskAssignment, s.assignment_id)
        if a.status == "submitted":
            a.status = "accepted"
        a.feedback = [*(a.feedback or []), {"from": "adjudication", "message": rationale, "created_at": datetime.now(UTC).isoformat()}]
    return res
