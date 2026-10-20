"""API checks that need no database: routing, auth gate, problem+json shape, contract paths."""

from fastapi.testclient import TestClient

from Frontier_platform.platform.backend.app.main import app

client = TestClient(app)


def test_health():
    assert client.get("/healthz").json()["status"] == "ok"


def test_auth_required_problem_json():
    r = client.get("/v1/me")
    assert r.status_code == 401
    assert r.headers["content-type"].startswith("application/problem+json")
    body = r.json()
    assert set(body) == {"type", "title", "status", "code", "detail", "errors"} and body["code"] == "unauthorized"


def test_bad_token_rejected():
    r = client.get("/v1/me/tasks", headers={"Authorization": "Bearer nope"})
    assert r.status_code == 401


def test_validation_errors_use_field_shape():
    r = client.post("/v1/auth/signup", json={"email": "bad", "password": "short", "full_name": "", "org_name": "x"})
    assert r.status_code == 422
    fields = {e["field"] for e in r.json()["errors"]}
    assert {"email", "password", "full_name"} <= fields


def test_unknown_route_is_problem():
    r = client.get("/v1/nope")
    assert r.status_code == 404 and r.json()["code"] == "not_found"


CONTRACT_PATHS = {
    ("post", "/v1/auth/signup"), ("post", "/v1/auth/login"), ("post", "/v1/auth/refresh"), ("post", "/v1/auth/logout"),
    ("post", "/v1/auth/mfa/setup"), ("post", "/v1/auth/mfa/verify"), ("get", "/v1/me"),
    ("post", "/v1/orgs/{org_id}/projects"), ("get", "/v1/orgs/{org_id}/projects"), ("patch", "/v1/orgs/{org_id}/projects/{pid}"),
    ("post", "/v1/orgs/{org_id}/projects/{pid}:submit"),
    ("post", "/v1/orgs/{org_id}/rubrics"), ("post", "/v1/orgs/{org_id}/rubrics/{rid}/versions"),
    ("patch", "/v1/orgs/{org_id}/rubrics/{rid}/versions/{vid}"), ("post", "/v1/orgs/{org_id}/rubrics/{rid}/versions/{vid}:publish"),
    ("post", "/v1/orgs/{org_id}/uploads"), ("post", "/v1/orgs/{org_id}/uploads/{upload_id}:complete"),
    ("post", "/v1/orgs/{org_id}/projects/{pid}/ingestions"), ("get", "/v1/orgs/{org_id}/projects/{pid}/ingestions/{iid}"),
    ("get", "/v1/orgs/{org_id}/projects/{pid}/items"), ("post", "/v1/orgs/{org_id}/projects/{pid}/gold-items"),
    ("delete", "/v1/orgs/{org_id}/projects/{pid}/gold-items/{gid}"),
    ("post", "/v1/orgs/{org_id}/projects/{pid}/metrics:compute"), ("get", "/v1/orgs/{org_id}/projects/{pid}/metrics"),
    ("post", "/v1/orgs/{org_id}/projects/{pid}/dataset-versions"), ("post", "/v1/orgs/{org_id}/projects/{pid}/exports"),
    ("get", "/v1/orgs/{org_id}/projects/{pid}/exports/{eid}"), ("get", "/v1/orgs/{org_id}/exports/{eid}/download-url"),
    ("get", "/v1/orgs/{org_id}/members"), ("get", "/v1/orgs/{org_id}/audit-events"), ("get", "/v1/orgs/{org_id}/usage"),
    ("get", "/v1/skills"), ("get", "/v1/me/expert"), ("put", "/v1/me/expert"), ("post", "/v1/me/expert/credentials"),
    ("post", "/v1/me/expert/conflicts"), ("delete", "/v1/me/expert/conflicts/{cid}"), ("get", "/v1/me/projects"),
    ("post", "/v1/me/tasks:next"), ("get", "/v1/me/tasks"), ("get", "/v1/me/tasks/{aid}"), ("put", "/v1/me/tasks/{aid}/draft"),
    ("post", "/v1/me/tasks/{aid}/submission"), ("post", "/v1/me/tasks/{aid}:release"),
    ("get", "/v1/staff/projects"), ("post", "/v1/staff/projects/{pid}:approve"), ("post", "/v1/staff/projects/{pid}:request-changes"),
    ("post", "/v1/staff/projects/{pid}:activate"), ("post", "/v1/staff/projects/{pid}:pause"), ("post", "/v1/staff/projects/{pid}:complete"),
    ("post", "/v1/staff/projects/{pid}:generate-tasks"), ("post", "/v1/staff/projects/{pid}:recommend-experts"),
    ("post", "/v1/staff/projects/{pid}/assignments"), ("get", "/v1/staff/projects/{pid}/experts"),
    ("delete", "/v1/staff/projects/{pid}/experts/{eid}"), ("get", "/v1/staff/experts"), ("get", "/v1/staff/experts/{eid}"),
    ("post", "/v1/staff/experts/{eid}/credentials/{cid}:verify"), ("patch", "/v1/staff/experts/{eid}"),
    ("get", "/v1/staff/reviews"), ("get", "/v1/staff/reviews/{rid}"), ("post", "/v1/staff/reviews/{rid}:claim"),
    ("post", "/v1/staff/reviews/{rid}:decide"), ("get", "/v1/staff/adjudications"), ("get", "/v1/staff/adjudications/{aid}"),
    ("post", "/v1/staff/adjudications/{aid}:resolve"), ("get", "/v1/staff/projects/{pid}/metrics/experts"),
    ("get", "/v1/staff/audit-events"),
}


def test_every_contract_endpoint_is_routed():
    spec = app.openapi()["paths"]
    have = {(m, p) for p, ops in spec.items() for m in ops}
    assert CONTRACT_PATHS - have == set()


def test_colon_actions_route_to_the_action():
    r = client.post("/v1/me/tasks:next", json={"project_id": "00000000-0000-0000-0000-000000000000"})
    assert r.status_code == 401
