from datetime import date

from Frontier_platform.platform.backend.app.modules.experts.matching import Candidate, conflict_with, norm_org, recommend, score

TODAY = date(2026, 10, 20)
PROJECT = {"required_skills": [{"skill_key": "cardiology", "min_level": 3}], "excluded_companies": ["Rival Pharma Ltd"],
           "languages": ["en"], "difficulty": "professional"}


def cand(i, **over):
    c = Candidate(expert_id=f"e{i}", pseudonym=f"P{i}", display_name=f"N{i}", status="active", languages=["en"],
                  weekly_hours=20, skills={"cardiology": 4}, verified_credentials=1)
    for k, v in over.items():
        setattr(c, k, v)
    return c


def test_exclusions():
    cases = {
        "inactive": cand(1, status="suspended"),
        "missing_skill": cand(2, skills={}),
        "conflict_of_interest": cand(3, conflicts=[{"organization_name": "ACME AI Labs, Inc.", "relationship": "employee", "until": None}]),
    }
    for reason, c in cases.items():
        row, exc = score(c, PROJECT, "Acme AI Labs", TODAY)
        assert row is None and exc["reason"] == reason


def test_excluded_company_and_expired_conflict():
    c = cand(1, conflicts=[{"organization_name": "rival pharma", "relationship": "consultant", "until": None}])
    assert score(c, PROJECT, "Acme", TODAY)[1]["reason"] == "conflict_of_interest"
    old = cand(2, conflicts=[{"organization_name": "Acme", "relationship": "employee", "until": date(2020, 1, 1)}])
    assert conflict_with(old, ["Acme"], TODAY) is None


def test_unverified_only_blocks_expert_difficulty():
    c = cand(1, verified_credentials=0)
    assert score(c, PROJECT, "Acme", TODAY)[0] is not None
    assert score(c, {**PROJECT, "difficulty": "expert"}, "Acme", TODAY)[1]["reason"] == "unverified"


def test_ranking_prefers_quality_history():
    good = cand(1, gold_passed=20, gold_total=20)
    poor = cand(2, gold_passed=2, gold_total=20)
    out = recommend([poor, good], PROJECT, "Acme", 10, TODAY)
    assert [c["expert_id"] for c in out["candidates"]] == ["e1", "e2"]
    assert out["algorithm_version"] == "rec-v1"
    assert set(out["candidates"][0]["factors"]) == {"skill_match", "credential_verified", "language", "quality_history",
                                                    "availability", "load"}


def test_count_limits_candidates():
    assert len(recommend([cand(i) for i in range(5)], PROJECT, "Acme", 2, TODAY)["candidates"]) == 2


def test_norm_org():
    assert norm_org("Acme AI Labs, Inc.") == norm_org("acme ai labs")
