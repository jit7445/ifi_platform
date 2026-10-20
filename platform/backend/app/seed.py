"""Local/demo seed. Runs as the schema owner because it creates reference data (skills) the app role cannot write."""

import json
import os
import uuid
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from Frontier_platform.platform.backend.app import models_registry  # noqa: F401
from Frontier_platform.platform.backend.app.core.audit import write_audit
from Frontier_platform.platform.backend.app.core.config import get_settings
from Frontier_platform.platform.backend.app.core.security import hash_password
from Frontier_platform.platform.backend.app.modules.experts.models import ExpertConflict, ExpertCredential, ExpertProfile, ExpertSkill, Skill
from Frontier_platform.platform.backend.app.modules.identity.models import User
from Frontier_platform.platform.backend.app.modules.ingestion import parsing
from Frontier_platform.platform.backend.app.modules.ingestion.models import DatasetItem, ModelOutput, ModelRun
from Frontier_platform.platform.backend.app.modules.orgs.models import Membership, Org
from Frontier_platform.platform.backend.app.modules.projects.models import Project, ProjectExpert
from Frontier_platform.platform.backend.app.modules.rubrics import validation as rv
from Frontier_platform.platform.backend.app.modules.rubrics.models import Rubric, RubricVersion
from Frontier_platform.platform.backend.app.modules.tasks.models import EvaluationTask

SAMPLE = Path(__file__).resolve().parent.parent / "sample_data"

SKILLS = [
    ("cardiology", "Cardiology", "medicine"), ("emergency_medicine", "Emergency medicine", "medicine"),
    ("endocrinology", "Endocrinology", "medicine"), ("clinical_pharmacology", "Clinical pharmacology", "medicine"),
    ("ifrs", "IFRS reporting", "finance"), ("corporate_finance", "Corporate finance", "finance"),
    ("audit", "External audit", "finance"), ("contract_law", "Contract law (common law)", "law"),
    ("ip_law", "Intellectual property law", "law"), ("backend_engineering", "Backend engineering", "software"),
    ("distributed_systems", "Distributed systems", "software"), ("python", "Python", "software"),
    ("statistics", "Statistics", "science"), ("biostatistics", "Biostatistics", "science"),
]

EXPERTS = [
    ("expert1@infollion.local", "Dr. Asha Rao", ["cardiology", "emergency_medicine"], "Consultant cardiologist", None),
    ("expert2@infollion.local", "Dr. Ben Okafor", ["emergency_medicine", "clinical_pharmacology", "statistics"], "ED physician", None),
    ("expert3@infollion.local", "Chen Li, CPA", ["ifrs", "corporate_finance", "audit", "statistics"], "Audit director", None),
    ("expert4@infollion.local", "Maria Gomez", ["contract_law", "ip_law"], "Commercial lawyer", "Acme AI Labs"),
    ("expert5@infollion.local", "Sam Patel", ["backend_engineering", "python", "distributed_systems", "statistics"], "Staff engineer", None),
]


def password() -> str:
    return os.environ.get("SEED_PASSWORD", "ChangeMe-dev-123!")


def _user(db: Session, email: str, name: str, pw_hash: str) -> User:
    u = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if u is None:
        u = User(email=email, password_hash=pw_hash, full_name=name, is_active=True, mfa_enabled=False)
        db.add(u)
        db.flush()
    return u


def _member(db: Session, org: Org, user: User, roles: list[str]) -> None:
    m = db.execute(select(Membership).where(Membership.org_id == org.id, Membership.user_id == user.id)).scalar_one_or_none()
    if m is None:
        db.add(Membership(org_id=org.id, user_id=user.id, roles=roles))
    else:
        m.roles = sorted(set(m.roles) | set(roles))


def seed(db: Session, demo: bool = True) -> dict:
    pw = hash_password(password())
    for key, label, domain in SKILLS:
        if db.get(Skill, key) is None:
            db.add(Skill(key=key, label=label, domain=domain))
    platform = db.execute(select(Org).where(Org.kind == "platform")).scalar_one_or_none()
    if platform is None:
        platform = Org(name=get_settings().platform_org_name, kind="platform", alias="IFL0")
        db.add(platform)
        db.flush()
    for email, name, roles in [("admin@infollion.local", "Platform Admin", ["platform_admin"]),
                               ("pm@infollion.local", "Priya Menon (PM)", ["project_manager"]),
                               ("reviewer@infollion.local", "Rafael Ortiz (Reviewer)", ["reviewer"])]:
        _member(db, platform, _user(db, email, name, pw), roles)
    experts = []
    for email, name, skills, headline, conflict in EXPERTS:
        u = _user(db, email, name, pw)
        _member(db, platform, u, ["expert"])
        p = db.execute(select(ExpertProfile).where(ExpertProfile.user_id == u.id)).scalar_one_or_none()
        if p is None:
            p = ExpertProfile(org_id=platform.id, user_id=u.id, pseudonym=f"Expert-{email[6]}{uuid.uuid4().hex[:3].upper()}",
                              headline=headline, bio="", years_experience=10, country="IN", languages=["en"],
                              weekly_hours=20, status="active", tier="standard")
            db.add(p)
            db.flush()
            for s in skills:
                db.add(ExpertSkill(org_id=platform.id, expert_id=p.id, skill_key=s, level=4))
            db.add(ExpertCredential(org_id=platform.id, expert_id=p.id, kind="license", title=headline, issuer="Demo Board",
                                    year=2015, status="verified", verified_at=datetime.now(UTC)))
            if conflict:
                db.add(ExpertConflict(org_id=platform.id, expert_id=p.id, organization_name=conflict, relationship="consultant"))
        experts.append(p)
    customer = db.execute(select(Org).where(Org.kind == "customer", Org.name == "Acme AI Labs")).scalar_one_or_none()
    if customer is None:
        customer = Org(name="Acme AI Labs", kind="customer", alias="A1B2")
        db.add(customer)
        db.flush()
    _member(db, customer, _user(db, "customer@acme.local", "Casey Customer", pw), ["customer_admin"])
    _member(db, customer, _user(db, "analyst@acme.local", "Alex Analyst", pw), ["customer_member"])
    db.flush()
    write_audit(db, org_id=platform.id, actor_user_id=None, actor_kind="system", action="seed.applied", data={"demo": demo})
    out = {"platform_org_id": str(platform.id), "customer_org_id": str(customer.id)}
    if demo:
        out["demo_project_id"] = str(_demo_project(db, customer, experts[:3]))
    return out


def _demo_project(db: Session, org: Org, experts: list[ExpertProfile]) -> uuid.UUID:
    existing = db.execute(select(Project).where(Project.org_id == org.id, Project.code == "DEMO-PAIR")).scalar_one_or_none()
    if existing:
        return existing.id
    p = Project(org_id=org.id, name="Professional answers: pairwise demo", code="DEMO-PAIR",
                description="Compare two model answers to professional questions.", domain="mixed",
                task_type="pairwise_preference", languages=["en"], difficulty="professional", target_volume=8,
                deliverable_format="preference_pairs",
                quality={"overlap_k": 2, "review_rate": 0.1, "gold_rate": 0.0, "agreement_threshold": 0.667},
                required_skills=[], excluded_companies=[], status="active")
    db.add(p)
    db.flush()
    r = Rubric(org_id=org.id, project_id=p.id, name="Professional answer quality")
    db.add(r)
    db.flush()
    spec = json.loads((SAMPLE / "rubric_pairwise.json").read_text())
    spec["criteria"] = [rv.normalize_criterion(c) for c in spec["criteria"]]
    v = RubricVersion(org_id=org.id, rubric_id=r.id, project_id=p.id, version=1, status="published",
                      published_at=datetime.now(UTC), content_sha256=rv.content_sha256(spec), **spec)
    db.add(v)
    db.flush()
    p.current_rubric_version_id = v.id
    parsed = parsing.parse_jsonl((SAMPLE / "pairwise.jsonl").read_bytes(), (2, 2))
    runs: dict[str, uuid.UUID] = {}
    for row in parsed.rows:
        item = DatasetItem(org_id=org.id, project_id=p.id, external_id=row.external_id, prompt=row.prompt,
                           context=row.context, reference_answer=row.reference_answer, item_metadata=row.metadata,
                           content_sha256=row.content_sha256(), is_gold=False)
        db.add(item)
        db.flush()
        for pos, resp in enumerate(row.responses):
            if resp["model"] not in runs:
                mr = ModelRun(org_id=org.id, project_id=p.id, model_name=resp["model"])
                db.add(mr)
                db.flush()
                runs[resp["model"]] = mr.id
            db.add(ModelOutput(org_id=org.id, item_id=item.id, model_run_id=runs[resp["model"]], position=pos, text=resp["text"]))
        db.add(EvaluationTask(org_id=org.id, project_id=p.id, item_id=item.id, rubric_version_id=v.id,
                              required_overlap=2, is_gold=False, status="open"))
    for e in experts:
        db.add(ProjectExpert(org_id=org.id, project_id=p.id, expert_id=e.id, user_id=e.user_id, max_tasks=50, status="approved"))
    db.flush()
    write_audit(db, org_id=org.id, actor_user_id=None, actor_kind="system", action="seed.demo_project", target_type="project",
                target_id=p.id)
    return p.id


def run(demo: bool = True) -> dict:
    engine = create_engine(get_settings().database_url_owner)
    with Session(engine) as db:
        out = seed(db, demo)
        db.commit()
    engine.dispose()
    return out
