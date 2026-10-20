"""End-to-end Phase 1 flow through the HTTP API with real Postgres + RLS (jobs inline, storage faked)."""

import json
import uuid
from pathlib import Path

from sqlalchemy import select, text

from Frontier_platform.platform.backend.tests.integration.conftest import login

SAMPLE = Path(__file__).resolve().parents[2] / "sample_data"
GOOD_TEXTS = {json.loads(line)["responses"][0]["text"] for line in (SAMPLE / "pairwise.jsonl").read_text().splitlines()}
DISAGREE_ID = "q-008"


def ok(r, code=200):
    assert r.status_code == code, f"{r.status_code} {r.text}"
    return r.json() if r.content else None


def signup(client, email, org):
    body = ok(client.post("/v1/auth/signup", json={"email": email, "password": "a-long-password-123",
                                                  "full_name": "Test User", "org_name": org}), 201)
    h = {"Authorization": f"Bearer {body['access_token']}"}
    me = ok(client.get("/v1/me", headers=h))
    return h, me["memberships"][0]["org_id"]


def expert_body(task, prefer_good=True, fast=False):
    rv = task["rubric_version"]
    slot_good = next(o["slot"] for o in task["outputs"] if o["text"] in GOOD_TEXTS)
    slot_bad = "B" if slot_good == "A" else "A"
    chosen = slot_good if prefer_good else slot_bad
    scores = []
    for slot in ("A", "B"):
        good = (slot == chosen)
        scores += [
            {"criterion_key": "accuracy", "output_slot": slot, "value": 5 if good else 2,
             "explanation": None if good else "This answer is wrong for a practitioner."},
            {"criterion_key": "completeness", "output_slot": slot, "value": 4 if good else 2},
            {"criterion_key": "safe", "output_slot": slot, "value": 1 if good else 0},
        ]
    return {"rubric_version_id": rv["id"], "scores": scores,
            "error_labels": [{"label_key": "factual_error", "output_slot": "B" if chosen == "A" else "A"}],
            "preference": {"chosen_slot": chosen, "strength": 3, "is_tie": False, "both_bad": False,
                           "rationale": "The chosen answer is correct and the other one is not."},
            "corrected_output": None, "confidence": 4, "time_spent_seconds": 5 if fast else 90}


def test_full_pairwise_flow(client, fake_storage):
    cust, org = signup(client, f"owner-{uuid.uuid4().hex[:6]}@acme-labs.io", "Acme AI Labs")
    pm = login(client, "pm@infollion.local")
    reviewer = login(client, "reviewer@infollion.local")
    e1, e2 = login(client, "expert1@infollion.local"), login(client, "expert2@infollion.local")
    base = f"/v1/orgs/{org}"

    key = str(uuid.uuid4())
    payload = {"name": "Pairwise", "code": "PW-1", "task_type": "pairwise_preference", "deliverable_format": "preference_pairs",
               "quality": {"overlap_k": 2, "review_rate": 0, "gold_rate": 0, "agreement_threshold": 0.667}}
    project = ok(client.post(f"{base}/projects", json=payload, headers={**cust, "Idempotency-Key": key}), 201)
    again = ok(client.post(f"{base}/projects", json=payload, headers={**cust, "Idempotency-Key": key}), 201)
    assert again["id"] == project["id"]
    assert client.post(f"{base}/projects", json=payload, headers=cust).json()["code"] == "project_code_taken"
    pid = project["id"]

    rubric = ok(client.post(f"{base}/rubrics", json={"name": "R", "project_id": pid}, headers=cust), 201)
    spec = json.loads((SAMPLE / "rubric_pairwise.json").read_text())
    v = ok(client.post(f"{base}/rubrics/{rubric['id']}/versions", json=spec, headers=cust), 201)
    pub = ok(client.post(f"{base}/rubrics/{rubric['id']}/versions/{v['id']}:publish", json={"set_as_project_current": True}, headers=cust))
    assert pub["status"] == "published" and len(pub["content_sha256"]) == 64
    r = client.patch(f"{base}/rubrics/{rubric['id']}/versions/{v['id']}", json={"instructions_md": "x"}, headers=cust)
    assert r.status_code == 409 and r.json()["code"] == "rubric_immutable"

    data = (SAMPLE / "pairwise.jsonl").read_bytes()
    up = ok(client.post(f"{base}/uploads", json={"filename": "items.jsonl", "content_type": "application/x-ndjson",
                                                 "size_bytes": len(data)}, headers=cust), 201)
    missing = client.post(f"{base}/uploads/{up['upload_id']}:complete", headers=cust)
    assert missing.status_code == 409 and missing.json()["code"] == "upload_missing"
    fake_storage.objects[fake_storage.last_put_key] = data
    done = ok(client.post(f"{base}/uploads/{up['upload_id']}:complete", headers=cust))
    assert done["status"] == "available" and done["size_bytes"] == len(data)
    ing = ok(client.post(f"{base}/projects/{pid}/ingestions", json={"upload_id": up["upload_id"], "format": "jsonl"}, headers=cust), 202)
    status = ok(client.get(f"{base}/projects/{pid}/ingestions/{ing['ingestion_id']}", headers=cust))
    assert status["status"] == "succeeded" and status["rows_ok"] == 8, status
    items = ok(client.get(f"{base}/projects/{pid}/items?limit=50", headers=cust))["data"]
    assert len(items) == 8

    ok(client.post(f"{base}/projects/{pid}:submit", headers=cust))
    ok(client.post(f"/v1/staff/projects/{pid}:approve", headers=pm))
    assert ok(client.post(f"/v1/staff/projects/{pid}:generate-tasks", headers=pm)) == {"created": 8, "gold_tasks": 0}
    assert ok(client.post(f"/v1/staff/projects/{pid}:activate", headers=pm))["status"] == "active"
    staff_list = ok(client.get("/v1/staff/projects", headers=pm))["data"]
    assert any(p["id"] == pid and p["org_name"] == "Acme AI Labs" for p in staff_list)

    rec = ok(client.post(f"/v1/staff/projects/{pid}:recommend-experts", json={"count": 10}, headers=pm))
    reasons = {x["reason"] for x in rec["excluded"]}
    assert "conflict_of_interest" in reasons  # expert4 consults for Acme AI Labs
    experts = ok(client.get("/v1/staff/experts", headers=pm))["data"]
    by_email = {x["email"]: x["id"] for x in experts}
    assigned = ok(client.post(f"/v1/staff/projects/{pid}/assignments", headers=pm, json={"experts": [
        {"expert_id": by_email["expert1@infollion.local"], "max_tasks": 20},
        {"expert_id": by_email["expert2@infollion.local"], "max_tasks": 20},
        {"expert_id": by_email["expert4@infollion.local"], "max_tasks": 20}]}))
    assert len(assigned["approved"]) == 2 and assigned["rejected"][0]["reason"] == "conflict_of_interest"

    mine = ok(client.get("/v1/me/projects", headers=e1))
    assert mine[0]["customer_display"].startswith("Customer #") and mine[0]["available_tasks"] == 8
    assert "Acme" not in json.dumps(mine)

    ext_by_prompt = {i["prompt"]: i["external_id"] for i in items}
    for who, headers in (("e1", e1), ("e2", e2)):
        first = True
        while True:
            r = client.post("/v1/me/tasks:next", json={"project_id": pid}, headers=headers)
            if r.status_code == 404:
                assert r.json()["code"] == "no_tasks_available"
                break
            summary = ok(r, 201)
            task = ok(client.get(f"/v1/me/tasks/{summary['assignment_id']}", headers=headers))
            assert "model" not in json.dumps(task["outputs"])
            ext = ext_by_prompt[task["item"]["prompt"]]
            ok(client.put(f"/v1/me/tasks/{summary['assignment_id']}/draft", json={"note": "wip"}, headers=headers))
            body = expert_body(task, prefer_good=not (who == "e2" and ext == DISAGREE_ID), fast=(who == "e1" and first))
            first = False
            res = ok(client.post(f"/v1/me/tasks/{summary['assignment_id']}/submission", json=body,
                                 headers={**headers, "Idempotency-Key": str(uuid.uuid4())}), 201)
            assert res["status"] == "submitted"

    # too_fast review on e1's first submission, decided by the reviewer; staff view uses canonical slots.
    reviews = ok(client.get(f"/v1/staff/reviews?project_id={pid}", headers=reviewer))["data"]
    assert [r["kind"] for r in reviews] == ["too_fast"]
    detail = ok(client.get(f"/v1/staff/reviews/{reviews[0]['id']}", headers=reviewer))
    assert [o["slot"] for o in detail["outputs"]] == ["A", "B"] and detail["outputs"][0]["model"] == "model-a"
    assert detail["submission"]["preference"]["chosen_slot"] == "A"
    assert detail["submission"]["preference"]["chosen_model"] == "model-a"
    ok(client.post(f"/v1/staff/reviews/{reviews[0]['id']}:claim", headers=reviewer))
    ok(client.post(f"/v1/staff/reviews/{reviews[0]['id']}:decide", json={"decision": "accept", "feedback": "fine"}, headers=reviewer))

    adjs = ok(client.get(f"/v1/staff/adjudications?project_id={pid}&status=open", headers=reviewer))["data"]
    assert len(adjs) == 1
    adj = ok(client.get(f"/v1/staff/adjudications/{adjs[0]['id']}", headers=reviewer))
    assert {s["preference"]["chosen_slot"] for s in adj["submissions"]} == {"A", "B"}
    assert ext_by_prompt[adj["item"]["prompt"]] == DISAGREE_ID
    keep = next(s for s in adj["submissions"] if s["preference"]["chosen_model"] == "model-a")
    ok(client.post(f"/v1/staff/adjudications/{adj['id']}:resolve", headers=reviewer, json={
        "resolution": "select_submission", "selected_submission_id": keep["id"],
        "rationale": "Model A is clinically correct; the other rating misread the question."}))

    proj = ok(client.get(f"{base}/projects/{pid}", headers=cust))
    assert proj["counts"]["tasks_completed"] == 8

    ok(client.post(f"{base}/projects/{pid}/metrics:compute", headers=cust), 202)
    m = ok(client.get(f"{base}/projects/{pid}/metrics?run=latest", headers=cust))
    assert m["progress"]["tasks_completed"] == 8
    assert m["preference_agreement"]["n_items"] == 8
    assert m["preference_agreement"]["percent_agreement"] == 7 / 8  # only the deliberate q-008 split
    assert m["win_rates"] == [{"model_a": "model-a", "model_b": "model-b", "a_wins": 8, "b_wins": 0, "ties": 0, "n": 8}]
    assert m["review"]["n"] == 1

    ex = ok(client.get(f"/v1/staff/projects/{pid}/metrics/experts", headers=pm))["data"]
    assert {r["submissions"] for r in ex} == {8}

    dv = ok(client.post(f"{base}/projects/{pid}/dataset-versions", json={"include": {"exclude_gold": True}}, headers=cust), 201)
    assert dv["status"] == "frozen" and dv["item_count"] == 8
    bad = client.post(f"{base}/projects/{pid}/exports", json={"dataset_version_id": dv["id"], "format": "sft_jsonl"}, headers=cust)
    assert bad.status_code == 422
    e = ok(client.post(f"{base}/projects/{pid}/exports", json={"dataset_version_id": dv["id"], "format": "preference_pairs_jsonl",
                                                               "options": {"drop_ties": True}}, headers=cust), 202)
    exp = ok(client.get(f"{base}/projects/{pid}/exports/{e['export_id']}", headers=cust))
    assert exp["status"] == "succeeded" and exp["row_count"] == 8, exp
    url = ok(client.get(f"{base}/exports/{e['export_id']}/download-url", headers=cust))
    assert url["sha256"] == exp["sha256"]
    manifest_key = next(k for k in fake_storage.objects if k.endswith("manifest.json"))
    man = json.loads(fake_storage.objects[manifest_key])
    assert man["project_code"] == "PW-1" and man["row_count"] == 8
    rows = [json.loads(x) for x in fake_storage.objects[manifest_key.replace("manifest.json", man["file"])].decode().splitlines()]
    assert all(r["metadata"]["chosen_model"] == "model-a" for r in rows)

    usage = ok(client.get(f"{base}/usage", headers=cust))
    assert usage["accepted_tasks"] == 8
    actions = {a["action"] for a in ok(client.get(f"{base}/audit-events?limit=200", headers=cust))["data"]}
    assert {"project.created", "rubric_version.published", "export.download_url_issued"} <= actions

    # Tenant isolation: another customer cannot see this org's project; an expert cannot open another's task.
    other, other_org = signup(client, f"o-{uuid.uuid4().hex[:6]}@other-co.io", "Other Co")
    assert client.get(f"{base}/projects/{pid}", headers=other).status_code == 404
    assert client.get(f"/v1/orgs/{other_org}/projects/{pid}", headers=other).status_code == 404
    e1_tasks = ok(client.get("/v1/me/tasks", headers=e1))["data"]
    assert client.get(f"/v1/me/tasks/{e1_tasks[0]['assignment_id']}", headers=e2).status_code == 404
    assert client.get(f"{base}/projects", headers=e1).status_code == 404


def test_rls_hides_unassigned_items_from_experts(client):
    import pytest

    from Frontier_platform.platform.backend.app.core.db import new_app_session, new_ops_session, set_context
    from Frontier_platform.platform.backend.app.modules.identity.models import User
    from Frontier_platform.platform.backend.app.modules.ingestion.models import DatasetItem

    ops = new_ops_session()
    try:
        org = ops.execute(text("select org_id from dataset_items limit 1")).scalar()
    finally:
        ops.close()
    if org is None:
        pytest.skip("needs items from the flow test")
    db = new_app_session()
    try:
        expert5 = db.execute(select(User).where(User.email == "expert5@infollion.local")).scalar_one()
        set_context(db, org, expert5.id, "expert")
        assert db.execute(select(DatasetItem)).all() == []
        set_context(db, org, None, "tenant")
        assert db.execute(text("select count(*) from dataset_items")).scalar() > 0
        set_context(db, None, None, "tenant")
        assert db.execute(text("select count(*) from dataset_items")).scalar() == 0
    finally:
        db.rollback()
        db.close()


def test_auth_refresh_rotation_and_reuse(client):
    h, _ = signup(client, f"r-{uuid.uuid4().hex[:6]}@acme-labs.io", "Refresh Co")
    first = client.cookies.get("ifl_refresh")
    assert first
    ok(client.post("/v1/auth/refresh"))
    second = client.cookies.get("ifl_refresh")
    assert second and second != first
    client.cookies.clear()
    client.cookies.set("ifl_refresh", first, domain="testserver.local", path="/v1/auth")
    r = client.post("/v1/auth/refresh")
    assert r.status_code == 401
    client.cookies.clear()
    client.cookies.set("ifl_refresh", second, domain="testserver.local", path="/v1/auth")
    assert client.post("/v1/auth/refresh").status_code == 401  # whole family revoked after reuse
    bad = client.post("/v1/auth/login", json={"email": "nobody@x.test", "password": "whatever-123"})
    assert bad.status_code == 401 and bad.json()["code"] == "invalid_credentials"


def test_mfa_enrolment_then_login_requires_code(client):
    import pyotp

    email = f"m-{uuid.uuid4().hex[:6]}@acme-labs.io"
    h, _ = signup(client, email, "MFA Co")
    setup = ok(client.post("/v1/auth/mfa/setup", headers=h))
    code = pyotp.TOTP(setup["secret"]).now()
    assert ok(client.post("/v1/auth/mfa/verify", json={"code": code}, headers=h)) == {"mfa_enabled": True}
    r = client.post("/v1/auth/login", json={"email": email, "password": "a-long-password-123"})
    assert r.status_code == 401 and r.json()["code"] == "mfa_required"
    ok(client.post("/v1/auth/login", json={"email": email, "password": "a-long-password-123", "totp_code": code}))


def test_expert_profile_404_before_creation(client):
    import os

    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from Frontier_platform.platform.backend.app.core.security import hash_password
    from Frontier_platform.platform.backend.app.modules.identity.models import User
    from Frontier_platform.platform.backend.app.modules.orgs.models import Membership, Org

    eng = create_engine(os.environ["DATABASE_URL_OWNER"])
    email = f"new-expert-{uuid.uuid4().hex[:6]}@infollion.local"
    with Session(eng) as s:
        u = User(email=email, password_hash=hash_password("a-long-password-123"), full_name="New Expert",
                 is_active=True, mfa_enabled=False)
        s.add(u)
        s.flush()
        platform = s.execute(select(Org).where(Org.kind == "platform")).scalar_one()
        s.add(Membership(org_id=platform.id, user_id=u.id, roles=["expert"]))
        s.commit()
    eng.dispose()
    h = login(client, email, "a-long-password-123")
    r = client.get("/v1/me/expert", headers=h)
    assert r.status_code == 404 and r.json()["code"] == "not_found"
    prof = ok(client.put("/v1/me/expert", headers=h, json={"headline": "Pharmacist", "languages": ["en"], "weekly_hours": 10,
                                                           "skills": [{"skill_key": "clinical_pharmacology", "level": 4}]}))
    assert prof["pseudonym"] and ok(client.get("/v1/me", headers=h))["expert_profile_id"] == prof["id"]
