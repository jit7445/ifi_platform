import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from Frontier_platform.platform.backend.app.core.errors import AppError, conflict, field_error, not_found, validation
from Frontier_platform.platform.backend.app.modules.evaluation.models import Submission
from Frontier_platform.platform.backend.app.modules.experts.models import Skill
from Frontier_platform.platform.backend.app.modules.ingestion.models import DatasetItem
from Frontier_platform.platform.backend.app.modules.projects.models import Project
from Frontier_platform.platform.backend.app.modules.tasks.models import EvaluationTask

EDITABLE = ("draft", "changes_requested")

TRANSITIONS = {
    "submit": (("draft", "changes_requested"), "submitted"),
    "approve": (("submitted",), "approved"),
    "request-changes": (("submitted", "approved"), "changes_requested"),
    "activate": (("approved", "paused"), "active"),
    "pause": (("active",), "paused"),
    "complete": (("active", "paused"), "completed"),
}

DELIVERABLE_FOR = {
    "rubric_scoring": {"evaluation_results", "sft"},
    "pairwise_preference": {"evaluation_results", "preference_pairs"},
    "sft_correction": {"evaluation_results", "sft"},
}


def get_project(db: Session, org_id: uuid.UUID, project_id: uuid.UUID, lock: bool = False) -> Project:
    stmt = select(Project).where(Project.id == project_id, Project.org_id == org_id)
    if lock:
        stmt = stmt.with_for_update()
    p = db.execute(stmt).scalar_one_or_none()
    if p is None:
        raise not_found("project")
    return p


def check_skills(db: Session, skills: list[dict]) -> None:
    keys = [s["skill_key"] for s in skills]
    known = set(db.execute(select(Skill.key).where(Skill.key.in_(keys))).scalars()) if keys else set()
    errs = [field_error(f"required_skills.{i}.skill_key", "unknown_skill", f"unknown skill {k}")
            for i, k in enumerate(keys) if k not in known]
    if len(set(keys)) != len(keys):
        errs.append(field_error("required_skills", "duplicate", "skill keys must be unique"))
    if errs:
        raise validation(errs)


def check_deliverable(task_type: str, deliverable: str) -> None:
    if deliverable not in DELIVERABLE_FOR[task_type]:
        raise validation([field_error("deliverable_format", "incompatible",
                                      f"{deliverable} is not available for {task_type} projects")])


def counts(db: Session, project_ids: list[uuid.UUID]) -> dict[uuid.UUID, dict]:
    out = {pid: {"items": 0, "tasks": 0, "tasks_completed": 0, "submissions": 0} for pid in project_ids}
    if not project_ids:
        return out
    for pid, n in db.execute(select(DatasetItem.project_id, func.count()).where(DatasetItem.project_id.in_(project_ids))
                             .group_by(DatasetItem.project_id)):
        out[pid]["items"] = n
    for pid, n, done in db.execute(
        select(EvaluationTask.project_id, func.count(), func.count().filter(EvaluationTask.status == "completed"))
        .where(EvaluationTask.project_id.in_(project_ids)).group_by(EvaluationTask.project_id)
    ):
        out[pid]["tasks"] = n
        out[pid]["tasks_completed"] = done
    for pid, n in db.execute(select(Submission.project_id, func.count()).where(Submission.project_id.in_(project_ids))
                             .group_by(Submission.project_id)):
        out[pid]["submissions"] = n
    return out


def project_out(p: Project, c: dict | None = None) -> dict:
    return {
        "id": str(p.id),
        "org_id": str(p.org_id),
        "name": p.name,
        "code": p.code,
        "description": p.description,
        "domain": p.domain,
        "task_type": p.task_type,
        "languages": list(p.languages),
        "difficulty": p.difficulty,
        "target_volume": p.target_volume,
        "deadline": p.deadline,
        "deliverable_format": p.deliverable_format,
        "quality": p.quality,
        "required_skills": p.required_skills,
        "excluded_companies": list(p.excluded_companies),
        "status": p.status,
        "status_note": p.status_note,
        "current_rubric_version_id": str(p.current_rubric_version_id) if p.current_rubric_version_id else None,
        "counts": c or {"items": 0, "tasks": 0, "tasks_completed": 0, "submissions": 0},
        "created_at": p.created_at,
    }


def transition(p: Project, action: str, note: str | None = None) -> str:
    sources, target = TRANSITIONS[action]
    if p.status not in sources:
        raise AppError(409, "invalid_status_transition", f"cannot {action} a project in status {p.status}")
    old = p.status
    p.status = target
    if note is not None:
        p.status_note = note
    return old


def ensure_code_free(db: Session, org_id: uuid.UUID, code: str) -> None:
    if db.execute(select(Project.id).where(Project.org_id == org_id, Project.code == code)).first():
        raise conflict("project_code_taken", f"project code {code} already exists in this organization")
