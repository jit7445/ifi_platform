import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from Frontier_platform.platform.backend.app.modules.evaluation.models import Submission
from Frontier_platform.platform.backend.app.modules.metrics import compute as mc
from Frontier_platform.platform.backend.app.modules.projects.models import Project
from Frontier_platform.platform.backend.app.modules.quality.models import GoldResult, Review, TaskResult
from Frontier_platform.platform.backend.app.modules.rubrics.models import RubricVersion
from Frontier_platform.platform.backend.app.modules.tasks.models import EvaluationTask


def latest_accepted(db: Session, project_id: uuid.UUID) -> list[Submission]:
    rows = db.execute(select(Submission).where(Submission.project_id == project_id, Submission.status == "accepted")).scalars().all()
    latest: dict = {}
    for s in rows:
        if s.assignment_id not in latest or s.revision > latest[s.assignment_id].revision:
            latest[s.assignment_id] = s
    return list(latest.values())


def project_metrics(db: Session, project_id: uuid.UUID) -> dict:
    p = db.get(Project, project_id)
    rv = db.get(RubricVersion, p.current_rubric_version_id) if p.current_rubric_version_id else None
    total, done = db.execute(select(func.count(), func.count().filter(EvaluationTask.status == "completed"))
                             .where(EvaluationTask.project_id == project_id)).one()
    week = datetime.now(UTC) - timedelta(days=7)
    recent = db.execute(select(func.count()).where(EvaluationTask.project_id == project_id,
                                                   EvaluationTask.completed_at >= week)).scalar()
    nsubs = db.execute(select(func.count()).where(Submission.project_id == project_id)).scalar()
    subs = [{"task_id": str(s.task_id), "expert_id": str(s.expert_id), "resolved": s.resolved}
            for s in latest_accepted(db, project_id)]
    results = [{"task_id": str(r.task_id), "final_scores": r.final_scores, "final_preference": r.final_preference}
               for r in db.execute(select(TaskResult).where(TaskResult.project_id == project_id)).scalars()]
    passed, n = db.execute(select(func.count().filter(GoldResult.passed), func.count())
                           .where(GoldResult.project_id == project_id)).one()
    decisions = list(db.execute(select(Review.decision).where(Review.project_id == project_id, Review.status == "done")).scalars())
    return mc.compute(criteria=rv.criteria if rv else [], error_labels=rv.error_labels if rv else [], task_type=p.task_type,
                      tasks_total=total, tasks_completed=done, submissions_count=nsubs, completed_last_7d=recent,
                      accepted_submissions=subs, results=results, gold=(passed, n), review_decisions=decisions)


def expert_metrics(db: Session, project_id: uuid.UUID) -> list[dict]:
    subs = db.execute(select(Submission).where(Submission.project_id == project_id)).scalars().all()
    results = {str(r.task_id): {"final_scores": r.final_scores}
               for r in db.execute(select(TaskResult).where(TaskResult.project_id == project_id)).scalars()}
    gold = {}
    for e, passed, n in db.execute(select(GoldResult.expert_id, func.count().filter(GoldResult.passed), func.count())
                                   .where(GoldResult.project_id == project_id).group_by(GoldResult.expert_id)):
        gold[e] = (passed, n)
    by_expert: dict = {}
    for s in subs:
        by_expert.setdefault(s.expert_id, []).append(s)
    out = []
    for e, ss in by_expert.items():
        decided = [s for s in ss if s.status in ("accepted", "rejected", "rework_requested")]
        accepted = [s for s in ss if s.status == "accepted"]
        g = gold.get(e)
        out.append({
            "expert_id": str(e), "pseudonym": ss[0].expert_pseudonym, "submissions": len(ss),
            "gold_accuracy": round(g[0] / g[1], 4) if g and g[1] else None,
            "acceptance_rate": round(len(accepted) / len(decided), 4) if decided else None,
            "avg_time_seconds": round(sum(s.time_spent_seconds for s in ss) / len(ss), 1),
            "agreement_with_consensus": mc.agreement_with_consensus(
                [{"task_id": str(s.task_id), "resolved": s.resolved} for s in accepted], results),
        })
    return sorted(out, key=lambda r: r["pseudonym"])

