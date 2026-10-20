"""Pure expert recommendation scoring (algorithm rec-v1). Inputs are plain dicts so it is unit-testable."""

import re
from dataclasses import dataclass, field
from datetime import date

ALGORITHM_VERSION = "rec-v1"
WEIGHTS = {
    "skill_match": 0.35,
    "credential_verified": 0.15,
    "language": 0.10,
    "quality_history": 0.25,
    "availability": 0.10,
    "load": 0.05,
}
# Beta prior so a new expert starts near 0.7 instead of 0 or 1 after a handful of gold items.
PRIOR_ACCURACY, PRIOR_WEIGHT = 0.7, 5


@dataclass
class Candidate:
    expert_id: str
    pseudonym: str
    display_name: str
    status: str
    languages: list[str]
    weekly_hours: int
    skills: dict[str, int]
    verified_credentials: int
    conflicts: list[dict] = field(default_factory=list)
    gold_passed: int = 0
    gold_total: int = 0
    active_assignments: int = 0


def norm_org(name: str) -> str:
    s = re.sub(r"[^a-z0-9 ]", " ", name.casefold())
    s = re.sub(r"\b(inc|llc|ltd|limited|corp|corporation|co|gmbh|plc|pvt|private)\b", " ", s)
    return " ".join(s.split())


def conflict_with(c: Candidate, orgs: list[str], today: date) -> dict | None:
    targets = {norm_org(o) for o in orgs if o and norm_org(o)}
    for conf in c.conflicts:
        until = conf.get("until")
        if until is not None and until < today:
            continue
        if norm_org(conf["organization_name"]) in targets:
            return conf
    return None


def score(c: Candidate, project: dict, customer_org_name: str, today: date) -> tuple[dict | None, dict | None]:
    """Returns (candidate_row, None) or (None, exclusion_row)."""

    def excluded(reason: str, detail: str) -> tuple[None, dict]:
        return None, {"expert_id": c.expert_id, "display_name": c.display_name, "reason": reason, "detail": detail}

    if c.status != "active":
        return excluded("inactive", f"expert status is {c.status}")
    conf = conflict_with(c, [customer_org_name, *project.get("excluded_companies", [])], today)
    if conf:
        return excluded("conflict_of_interest", f"{conf['relationship']} of {conf['organization_name']}")
    reqs = project.get("required_skills") or []
    missing = [r["skill_key"] for r in reqs if c.skills.get(r["skill_key"], 0) < 1]
    if missing:
        return excluded("missing_skill", "missing " + ", ".join(missing))
    if project.get("difficulty") == "expert" and c.verified_credentials == 0:
        return excluded("unverified", "expert-difficulty projects need a verified credential")

    skill = sum(min(c.skills[r["skill_key"]] / r["min_level"], 1.0) for r in reqs) / len(reqs) if reqs else 1.0
    langs = project.get("languages") or []
    lang = sum(1 for lg in langs if lg in c.languages) / len(langs) if langs else 1.0
    quality = (c.gold_passed + PRIOR_ACCURACY * PRIOR_WEIGHT) / (c.gold_total + PRIOR_WEIGHT)
    factors = {
        "skill_match": round(skill, 4),
        "credential_verified": 1.0 if c.verified_credentials else 0.0,
        "language": round(lang, 4),
        "quality_history": round(quality, 4),
        "availability": round(min(c.weekly_hours / 20, 1.0), 4),
        "load": round(max(0.0, 1 - c.active_assignments / 50), 4),
    }
    flags = []
    if any(c.skills[r["skill_key"]] < r["min_level"] for r in reqs):
        flags.append("below_min_level")
    if lang < 1:
        flags.append("language_gap")
    if c.gold_total < PRIOR_WEIGHT:
        flags.append("limited_history")
    if not c.verified_credentials:
        flags.append("no_verified_credential")
    total = sum(WEIGHTS[k] * v for k, v in factors.items())
    return {"expert_id": c.expert_id, "pseudonym": c.pseudonym, "display_name": c.display_name,
            "score": round(total, 4), "factors": factors, "flags": flags}, None


def recommend(cands: list[Candidate], project: dict, customer_org_name: str, count: int, today: date) -> dict:
    chosen, excluded = [], []
    for c in cands:
        row, exc = score(c, project, customer_org_name, today)
        (chosen if row else excluded).append(row or exc)
    chosen.sort(key=lambda r: (-r["score"], r["pseudonym"]))
    return {"algorithm_version": ALGORITHM_VERSION, "candidates": chosen[:count], "excluded": excluded}
