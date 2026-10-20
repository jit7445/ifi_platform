import secrets
import uuid
from collections import defaultdict

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from Frontier_platform.platform.backend.app.core.db import ops_session
from Frontier_platform.platform.backend.app.modules.evaluation.models import Submission
from Frontier_platform.platform.backend.app.modules.experts.models import ExpertConflict, ExpertCredential, ExpertProfile, ExpertSkill
from Frontier_platform.platform.backend.app.modules.quality.models import GoldResult
from Frontier_platform.platform.backend.app.modules.tasks.models import ACTIVE_ASSIGNMENT_STATUSES, TaskAssignment

ADJECTIVES = ["Amber", "Cobalt", "Crimson", "Indigo", "Jade", "Onyx", "Saffron", "Silver", "Teal", "Violet"]
NOUNS = ["Falcon", "Heron", "Lynx", "Otter", "Kestrel", "Marten", "Orca", "Ibis", "Puma", "Wren"]


def new_pseudonym(db: Session) -> str:
    while True:
        p = f"{secrets.choice(ADJECTIVES)}-{secrets.choice(NOUNS)}-{secrets.token_hex(2).upper()}"
        if db.execute(select(ExpertProfile.id).where(ExpertProfile.pseudonym == p)).first() is None:
            return p


def credential_out(c: ExpertCredential) -> dict:
    return {"id": str(c.id), "kind": c.kind, "title": c.title, "issuer": c.issuer, "year": c.year,
            "identifier": c.identifier, "status": c.status, "note": c.note, "verified_at": c.verified_at,
            "created_at": c.created_at}


def conflict_out(c: ExpertConflict) -> dict:
    return {"id": str(c.id), "organization_name": c.organization_name, "relationship": c.relationship,
            "until": c.until, "created_at": c.created_at}


def skills_of(db: Session, expert_ids: list[uuid.UUID]) -> dict[uuid.UUID, dict[str, int]]:
    out: dict[uuid.UUID, dict[str, int]] = defaultdict(dict)
    if expert_ids:
        for s in db.execute(select(ExpertSkill).where(ExpertSkill.expert_id.in_(expert_ids))).scalars():
            out[s.expert_id][s.skill_key] = s.level
    return out


def profile_out(db: Session, p: ExpertProfile) -> dict:
    return {
        "id": str(p.id), "user_id": str(p.user_id), "pseudonym": p.pseudonym, "headline": p.headline, "bio": p.bio,
        "years_experience": p.years_experience, "country": p.country, "languages": list(p.languages),
        "weekly_hours": p.weekly_hours, "status": p.status, "tier": p.tier,
        "skills": [{"skill_key": k, "level": v} for k, v in sorted(skills_of(db, [p.id])[p.id].items())],
        "created_at": p.created_at,
    }


def quality_stats(actor_user_id: uuid.UUID, expert_ids: list[uuid.UUID], reason: str) -> dict[uuid.UUID, dict]:
    """Cross-tenant aggregates about experts; runs on the audited BYPASSRLS connection."""
    stats = {e: {"gold_passed": 0, "gold_total": 0, "submissions": 0, "accepted": 0, "decided": 0, "active": 0}
             for e in expert_ids}
    if not expert_ids:
        return stats
    with ops_session(actor_user_id, reason) as db:
        for e, passed, total in db.execute(
            select(GoldResult.expert_id, func.count().filter(GoldResult.passed), func.count())
            .where(GoldResult.expert_id.in_(expert_ids)).group_by(GoldResult.expert_id)
        ):
            stats[e]["gold_passed"], stats[e]["gold_total"] = passed, total
        for e, n, acc, dec in db.execute(
            select(Submission.expert_id, func.count(),
                   func.count().filter(Submission.status == "accepted"),
                   func.count().filter(Submission.status.in_(("accepted", "rejected", "rework_requested"))))
            .where(Submission.expert_id.in_(expert_ids)).group_by(Submission.expert_id)
        ):
            stats[e].update(submissions=n, accepted=acc, decided=dec)
        for e, n in db.execute(
            select(TaskAssignment.expert_id, func.count())
            .where(TaskAssignment.expert_id.in_(expert_ids), TaskAssignment.status.in_(("in_progress", "rework")))
            .group_by(TaskAssignment.expert_id)
        ):
            stats[e]["active"] = n
    return stats


def summarize_quality(s: dict) -> dict:
    return {
        "gold_accuracy": round(s["gold_passed"] / s["gold_total"], 4) if s["gold_total"] else None,
        "gold_n": s["gold_total"],
        "acceptance_rate": round(s["accepted"] / s["decided"], 4) if s["decided"] else None,
        "submissions": s["submissions"],
        "active_assignments": s["active"],
    }


__all__ = ["ACTIVE_ASSIGNMENT_STATUSES"]
