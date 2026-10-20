# API Design

> **Reconciliation note (2026-10-20):** Where this document differs from `planning/architecture_decisions.md`, the ADRs there are authoritative. In particular: Phase 1 authentication is FastAPI-native with MFA for every account (ADR-005), Langfuse and model connectors are Phase 3 (ADR-007), enterprise SSO is Phase 4, Track B is Phase 5 (ADR-015), and experts get assignment-scoped RLS (ADR-017).

Status: proposed for MVP. Date: 2026-10-20.
Related: [database_design.md](database_design.md), [component_design.md](component_design.md), [data_pipeline.md](data_pipeline.md).

---

## 1. Conventions

| Topic | Decision |
|---|---|
| Style | REST over HTTPS, JSON. Base path `/v1`. FastAPI generates OpenAPI 3.1; the Next.js app consumes a typed client generated with `openapi-typescript` in CI, so contract drift breaks the build. |
| Auth (browser) | Better Auth session cookie on the Next.js origin. Next.js server components and route handlers call FastAPI with a short-lived JWT (EdDSA, 15 min) obtained from Better Auth's JWT plugin; FastAPI verifies it against the cached JWKS. |
| Auth (machine) | `Authorization: Bearer ik_live_<prefix>_<secret>` org API keys with scopes. Customer integrations only; experts and staff cannot use API keys in MVP. |
| Tenant context | Customer routes are nested under `/v1/orgs/{org_id}/...`. The org in the path must match an active membership (or API key org). Expert routes live under `/v1/me/...` and resolve tenant from the assignment. Staff routes under `/v1/staff/...`. |
| IDs | UUIDv7 strings. |
| Time | RFC 3339 UTC (`2026-10-20T09:30:00Z`). |
| Pagination | Cursor based: `?limit=50&cursor=<opaque>`; response `{ "data": [...], "next_cursor": "..." }`. Max `limit` 200. |
| Idempotency | `Idempotency-Key` header required on POSTs that create resources or start jobs (projects, uploads, ingestion, assignments, submissions, exports). Stored 24 h keyed by (principal, key, route); replays return the original response; a different body with the same key returns 409. |
| Concurrency | Mutable resources return `ETag` (row `updated_at` hash). `PATCH`/state transitions accept `If-Match`; mismatch returns 412. |
| Validation | Pydantic v2 models with `extra="forbid"`; unknown fields are rejected. String length caps everywhere. |
| Errors | RFC 9457 `application/problem+json` (section 3). |
| Rate limits | Headers `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`; 429 with `Retry-After`. |
| Versioning | Breaking changes go to `/v2`; additive changes in place. Deprecations announced with `Deprecation` and `Sunset` headers. |

---

## 2. Roles and permission matrix

Roles: `customer_admin`, `customer_member` (customer org); `expert`, `reviewer`, `project_manager`, `internal_org_admin`, `platform_operator`, `superadmin` (platform org). "Org admin" in the brief maps to `customer_admin` on the customer side and `internal_org_admin` on the Infollion side.

Legend: Y = allowed, O = own records only, S = only on projects where staffed (`project_staff`), A = only on assigned tasks, R = read-only, - = denied.

| Permission | cust_admin | cust_member | expert | reviewer | project_manager | internal_org_admin | platform_operator | superadmin |
|---|---|---|---|---|---|---|---|---|
| org.manage_members | Y | - | - | - | - | Y (platform org) | Y | Y |
| org.manage_api_keys | Y | - | - | - | - | - | Y | Y |
| project.create | Y | Y | - | - | Y (on behalf) | - | Y | Y |
| project.read | Y | Y | - | S | S | R | Y | Y |
| project.submit_for_review | Y | Y | - | - | S | - | - | Y |
| project.approve | - | - | - | - | S | Y | Y | Y |
| dataset.upload | Y | Y | - | - | S | - | Y | Y |
| dataset.read_items | Y | Y | A | S | S | - | Y (audited) | Y |
| rubric.edit_draft | Y | Y | - | S | S | - | - | Y |
| rubric.publish | Y (with PM sign-off) | - | - | - | S | - | - | Y |
| expert.read_profile_full | - | - | O | - | Y | Y | Y | Y |
| expert.read_profile_pseudonymous | Y | Y | - | Y | Y | Y | Y | Y |
| expert.manage_vetting | - | - | - | - | - | Y | Y | Y |
| assignment.recommend | - | - | - | - | S | Y | Y | Y |
| assignment.approve | - | - | - | - | S | Y | - | Y |
| task.read_mine / submission.create | - | - | A | A (if also expert) | - | - | - | - |
| review.perform | - | - | - | S | S | - | - | Y |
| adjudication.perform | - | - | - | S (senior) | S | - | - | Y |
| gold.manage | Y (propose) | - | - | S | S | - | - | Y |
| metrics.read | Y | Y | O (own quality) | S | S | R | Y | Y |
| metrics.compute | - | - | - | - | S | - | Y | Y |
| dataset_version.freeze | Y | - | - | - | S | - | - | Y |
| export.create / download | Y | Y | - | - | S | - | Y (audited) | Y |
| billing.read | Y | - | O (payouts) | - | R | Y | Y | Y |
| billing.manage | - | - | - | - | - | Y | Y | Y |
| audit.read | Y (own org) | - | - | - | - | Y | Y | Y |
| platform.impersonate | - | - | - | - | - | - | - | Y (time-boxed, audited, customer-visible) |

Permission checks are implemented as a FastAPI dependency `require(permission, resource_loader)` that (1) resolves the principal and active memberships, (2) loads the target resource under RLS, (3) evaluates role permission plus the relationship rule (own, staffed, assigned). Denials return 404 when the caller must not learn that the resource exists (cross-tenant), 403 otherwise.

---

## 3. Error format

```json
HTTP/1.1 422 Unprocessable Content
Content-Type: application/problem+json

{
  "type": "https://api.infollion.ai/problems/validation-error",
  "title": "Request validation failed",
  "status": 422,
  "code": "validation_error",
  "detail": "2 fields are invalid",
  "instance": "/v1/orgs/0192.../projects",
  "request_id": "req_01JABCXYZ",
  "errors": [
    { "field": "overlap_k", "code": "out_of_range", "message": "must be between 1 and 7" },
    { "field": "languages[0]", "code": "invalid_language_tag", "message": "'english' is not a BCP 47 tag" }
  ]
}
```

| status | code examples |
|---|---|
| 400 | `malformed_json`, `unsupported_media_type` |
| 401 | `unauthenticated`, `token_expired` |
| 403 | `forbidden`, `mfa_required`, `conflict_of_interest` |
| 404 | `not_found` |
| 409 | `invalid_state_transition`, `idempotency_conflict`, `duplicate` |
| 412 | `etag_mismatch` |
| 413 | `payload_too_large` |
| 422 | `validation_error`, `rubric_incomplete`, `quota_exceeded` |
| 429 | `rate_limited` |
| 503 | `maintenance`, `dependency_unavailable` |

---

## 4. Endpoint groups

| Group | Base | Main endpoints |
|---|---|---|
| Identity | `/v1/me` | `GET /me`, `GET /me/memberships`, `POST /me/switch-org` (UI only) |
| Orgs | `/v1/orgs` | `POST /orgs` (signup), `GET/PATCH /orgs/{org_id}`, members CRUD, invitations, API keys |
| Projects | `/v1/orgs/{org_id}/projects` | CRUD, `POST /{id}:submit`, `:approve`, `:request-changes`, `:activate`, `:pause`, `:complete`, requirements CRUD |
| Uploads/objects | `/v1/orgs/{org_id}/uploads`, `/objects` | create upload (presign), complete, download-url |
| Ingestion | `/v1/orgs/{org_id}/projects/{pid}/ingestions` | create, get status, error report |
| Datasets | `/v1/orgs/{org_id}/datasets` | datasets CRUD, versions list/get, `POST /versions` (derive/curate), `:freeze`, items list, diff between versions |
| Model runs | `/v1/orgs/{org_id}/projects/{pid}/model-runs` | create, list, compare (`GET /model-runs/{a}/compare/{b}`) |
| Rubrics | `/v1/orgs/{org_id}/rubrics` | rubrics CRUD, `POST /{rid}/versions`, `PATCH /versions/{vid}`, `:publish`, `:retire`; taxonomies |
| Experts (staff) | `/v1/staff/experts` | search, profile, credentials verify, availability, conflicts |
| Experts (self) | `/v1/me/expert` | profile, skills, credentials upload, availability, conflict declarations, earnings |
| Recommendations and assignments | `/v1/staff/projects/{pid}/...` | `POST :recommend-experts`, `POST /assignments` (approve batch), `DELETE /assignments/{id}` (revoke) |
| Expert work | `/v1/me/tasks` | list, get, accept, decline, `PUT /draft`, `POST /submission`, calibration |
| Reviews | `/v1/staff/reviews` | queue, claim, decide; `POST /v1/staff/projects/{pid}/reviews` (create) |
| Adjudication | `/v1/staff/adjudications` | queue, claim, resolve |
| Gold | `/v1/orgs/{org_id}/projects/{pid}/gold-items` | CRUD, approve |
| Metrics | `/v1/orgs/{org_id}/projects/{pid}/metrics` | `POST :compute`, `GET` latest, `GET /experts` (staff), dashboard summary |
| Exports | `/v1/orgs/{org_id}/projects/{pid}/exports` | create, get, list, download-url |
| Deliverables | `/v1/orgs/{org_id}/projects/{pid}/deliverables` | create, deliver, accept/reject |
| Billing | `/v1/orgs/{org_id}/billing` | usage summary, invoices, invoice PDF URL |
| Audit | `/v1/orgs/{org_id}/audit-events` | filtered list (admin) |
| Integrations | `/v1/orgs/{org_id}/integrations`, `/webhooks` | Langfuse connect, webhook endpoints |
| Platform | `/v1/platform/...` | orgs list, suspend, impersonation sessions, health |

Action endpoints use the `:verb` suffix (Google AIP style) for state transitions, which keeps them distinguishable from sub-resources.

---

## 5. Representative contracts

### 5.1 Create project

`POST /v1/orgs/{org_id}/projects` . Permission: `project.create`. Idempotency-Key required.

```json
{
  "name": "Cardiology QA benchmark v1",
  "code": "CARDIO-QA",
  "description": "Evaluate clinical answer quality of our assistant for cardiology questions.",
  "domain": "medicine",
  "task_type": "rubric_scoring",
  "languages": ["en", "hi"],
  "difficulty": "expert",
  "target_volume": 2000,
  "deadline": "2026-12-15T18:30:00Z",
  "deliverable_format": "eval_benchmark",
  "quality": { "overlap_k": 3, "second_review_rate": 0.15, "gold_rate": 0.05, "agreement_threshold": 0.7 },
  "requirements": [
    { "kind": "skill", "skill_key": "medicine.cardiology", "min_level": 4, "is_mandatory": true },
    { "kind": "credential_kind", "value": "license", "is_mandatory": true },
    { "kind": "language", "value": "hi", "is_mandatory": false, "weight": 0.5 },
    { "kind": "exclude_company", "value": "Competitor Health Pvt Ltd" }
  ]
}
```

Validation:
- `code` matches `^[A-Z0-9-]{2,24}$`, unique within org (409 `duplicate`).
- `languages` non-empty, each a valid BCP 47 tag from the supported list.
- `deadline` at least 72 h in the future (422 otherwise); warns (not fails) when `target_volume / days_left` exceeds historical throughput for the domain.
- `overlap_k` 1..7; `task_type = pairwise_preference` requires `overlap_k >= 1` and later at least 2 model outputs per item; `deliverable_format` must be compatible with `task_type` (matrix in data_pipeline.md section 7).
- `skill_key` must exist in the skills taxonomy.
- Org status must be `active`; `pending_verification` orgs may create drafts only (status stays `draft`, cannot `:submit`).

Response `201 Created`:

```json
{
  "id": "0192f0a1-7c3e-7b2a-9d11-5e8a7c2f4b10",
  "org_id": "0192e9c0-1111-7000-8000-000000000001",
  "code": "CARDIO-QA",
  "status": "draft",
  "current_rubric_version_id": null,
  "quality": { "overlap_k": 3, "second_review_rate": 0.15, "gold_rate": 0.05, "agreement_threshold": 0.7 },
  "created_at": "2026-10-20T09:30:00Z",
  "links": { "self": "/v1/orgs/0192e9c0-.../projects/0192f0a1-..." }
}
```

### 5.2 Upload items (presigned upload + ingestion)

Step 1. `POST /v1/orgs/{org_id}/uploads` . Permission: `dataset.upload`.

```json
{
  "filename": "cardio_prompts_oct.jsonl",
  "content_type": "application/x-ndjson",
  "size_bytes": 48211932,
  "sha256": "9f2c...e1",
  "purpose": "upload_source"
}
```

Validation: `content_type` in {`text/csv`, `application/x-ndjson`, `application/jsonl`, `application/json`}; `size_bytes` <= 2 GiB (MVP); filename length <= 255 and stored only as metadata; org storage quota not exceeded.

Response `201`:

```json
{
  "upload_id": "0192f0b2-...",
  "method": "PUT",
  "url": "https://infollion-prod-data-aps1.s3.ap-south-1.amazonaws.com/orgs/0192e9c0.../incoming/0192f0b2...?X-Amz-...",
  "headers": { "Content-Type": "application/x-ndjson", "x-amz-checksum-sha256": "nyxe...=" },
  "expires_at": "2026-10-20T09:45:00Z",
  "multipart": null
}
```

For `size_bytes > 100 MiB` the response contains `"multipart": { "upload_id": "...", "part_size": 67108864, "parts": [{"part_number":1,"url":"..."}] }` and the completion call carries ETags.

Step 2. `POST /v1/orgs/{org_id}/uploads/{upload_id}:complete` returns `{ "status": "uploaded" }` after HeadObject verifies size and checksum.

Step 3. `POST /v1/orgs/{org_id}/projects/{project_id}/ingestions` . Permission: `dataset.upload` on project. Idempotency-Key required.

```json
{
  "upload_id": "0192f0b2-...",
  "dataset": { "id": null, "name": "cardio-prompts", "kind": "input", "item_schema": "prompt_multi_response" },
  "format": "jsonl",
  "mapping": {
    "external_id": "$.id",
    "prompt": "$.messages",
    "reference_answer": "$.reference",
    "metadata": ["$.topic", "$.source"],
    "language": "$.lang"
  },
  "model_outputs": [
    { "path": "$.responses.model_a", "model_run": { "label": "prod-2026-10", "model_name": "acme-chat", "model_version": "2026.10.01" } },
    { "path": "$.responses.model_b", "model_run": { "label": "cand-2026-10", "model_name": "acme-chat", "model_version": "2026.10.18-rc1", "baseline_label": "prod-2026-10" } }
  ],
  "on_error": "skip_row",
  "max_error_rate": 0.02
}
```

Validation: upload belongs to the org and is `available`; dataset name unique in org when creating; JSONPath expressions limited to a safe subset (no filters/scripts); `on_error` in {`skip_row`, `fail`}; `max_error_rate` 0..0.2; project not `completed`/`cancelled`.

Response `202 Accepted`:

```json
{ "ingestion_id": "0192f0c3-...", "status": "queued", "links": { "self": "/v1/orgs/.../ingestions/0192f0c3-..." } }
```

Polling `GET .../ingestions/{id}`:

```json
{
  "id": "0192f0c3-...", "status": "partially_succeeded",
  "rows_total": 2050, "rows_ok": 2041, "rows_failed": 9,
  "result_dataset_version": { "id": "0192f0d4-...", "dataset_id": "0192f0d0-...", "version": 1 },
  "model_runs": [{ "id": "0192f0d5-...", "label": "prod-2026-10" }, { "id": "0192f0d6-...", "label": "cand-2026-10" }],
  "error_report_url": "/v1/orgs/.../objects/0192f0d7-.../download-url"
}
```

API-first alternative for programmatic customers: `POST .../ingestions` with `"source_type":"api_batch"` and up to 1,000 inline `items` per request (max 10 MiB body), same validation per item.

### 5.3 Create rubric version

`POST /v1/orgs/{org_id}/rubrics/{rubric_id}/versions` . Permission: `rubric.edit_draft`. Creates a draft (409 if a draft or in_review version already exists).

```json
{
  "based_on_version_id": "0192f100-...",
  "instructions_md": "## Task\nRate the assistant answer for a cardiology question...",
  "error_taxonomy_id": "0192f0ff-...",
  "scoring_config": {
    "aggregation": "weighted_mean",
    "pass_rule": { "criterion": "safety", "min": 4 },
    "agreement": { "default_metric": "krippendorff_alpha", "level": "ordinal" }
  },
  "criteria": [
    {
      "key": "accuracy", "label": "Clinical accuracy",
      "description": "Is the answer consistent with current guidelines (ACC/AHA, ESC, CSI)?",
      "scale_type": "likert", "scale_min": 1, "scale_max": 5,
      "anchors": { "1": "Dangerous or clearly wrong", "3": "Mostly correct, minor gaps", "5": "Specialist-level, complete" },
      "weight": 0.5, "is_required": true, "explanation_required_below": 3
    },
    {
      "key": "safety", "label": "Patient safety",
      "description": "Does the answer avoid harmful advice and escalate red flags?",
      "scale_type": "likert", "scale_min": 1, "scale_max": 5, "weight": 0.3, "is_required": true,
      "explanation_required_below": 4
    },
    { "key": "cites_guideline", "label": "Cites a guideline", "description": "Binary", "scale_type": "binary", "weight": 0.2 }
  ],
  "changelog": "Split accuracy and safety; added guideline citation."
}
```

Validation: 1..30 criteria; keys unique and snake_case; weights sum to 1.0 +/- 0.001 when `aggregation = weighted_mean`; likert/numeric require `scale_min < scale_max`; anchors keys within scale; `pass_rule.criterion` references a defined key; taxonomy must be published; `instructions_md` <= 50,000 chars and sanitized on render.

Publish: `POST /v1/orgs/{org_id}/rubrics/{rubric_id}/versions/{vid}:publish` with `If-Match`. Requires `rubric.publish`; a customer-authored rubric additionally needs PM sign-off recorded (`review_approved_by`). On publish the server computes `content_sha256`, sets status `published`, and optionally `"set_as_project_current": true`. Tasks already generated keep their original `rubric_version_id`; a migration of open tasks is an explicit PM action.

Response `200`:

```json
{ "id": "0192f101-...", "rubric_id": "0192f0fe-...", "version": 3, "status": "published",
  "content_sha256": "b1946ac92492d2347c6235b4d2611184", "published_at": "2026-10-20T10:02:11Z" }
```

### 5.4 Recommend experts

`POST /v1/staff/projects/{project_id}:recommend-experts` . Permission: `assignment.recommend` and staffed on project.

```json
{ "count": 15, "batch_id": "0192f200-...", "include_unavailable": false, "exclude_expert_ids": [] }
```

Response `200` (recommendations are computed synchronously for pools up to ~20k experts; persisted as `task_assignments` only on approval):

```json
{
  "project_id": "0192f0a1-...",
  "generated_at": "2026-10-20T10:05:00Z",
  "algorithm_version": "match-v1",
  "candidates": [
    {
      "expert_id": "0192a001-...", "pseudonym": "EXP-7Q4K", "display_name": "Dr. A. Rao",
      "score": 0.912,
      "factors": { "skill_match": 0.95, "credential_verified": 1.0, "language": 1.0,
                   "quality_history": 0.88, "availability": 0.80, "load": 0.70 },
      "available_hours_next_14d": 22,
      "open_assignments": 4,
      "qualification_status": "qualified",
      "flags": []
    }
  ],
  "excluded": [
    { "expert_id": "0192a0ff-...", "reason": "conflict_of_interest", "detail": "declared former_employee of customer within 12 months" },
    { "expert_id": "0192a0fe-...", "reason": "missing_mandatory_requirement", "detail": "credential_kind=license not verified" }
  ]
}
```

Rules: hard filters first (status active, mandatory requirements, language, conflict declarations matching the customer org/domain or excluded companies, no current revocation for this project), then weighted score. `excluded` list is shown to PMs only and never to customers.

### 5.5 Assign (approve recommendations)

`POST /v1/staff/projects/{project_id}/assignments` . Permission: `assignment.approve`. Idempotency-Key required.

```json
{
  "mode": "pool",
  "experts": [
    { "expert_id": "0192a001-...", "max_tasks": 200 },
    { "expert_id": "0192a002-...", "max_tasks": 150 }
  ],
  "task_filter": { "batch_id": "0192f200-...", "status": ["ready"] },
  "due_in_hours": 72,
  "require_calibration": true
}
```

`mode`:
- `pool` (default): experts are approved for the project/batch; tasks are pulled by experts one at a time via `POST /v1/me/tasks:next`, respecting overlap (an expert never gets two slots of the same task) and `max_tasks`.
- `direct`: `"task_ids": [...]` explicit pairing; system creates `task_assignments` in `offered`.

Validation: each expert passes the same hard filters as recommendation at approval time (re-checked, 409 `conflict_of_interest` per expert otherwise); project `active`; project has a published current rubric version; if `require_calibration`, experts without `qualified` status get calibration tasks first.

Response `201`:

```json
{
  "approved": [
    { "expert_id": "0192a001-...", "qualification_status": "in_calibration", "calibration_tasks": 10 },
    { "expert_id": "0192a002-...", "qualification_status": "qualified" }
  ],
  "rejected": []
}
```

### 5.6 Get my tasks

`GET /v1/me/tasks?status=offered,accepted,in_progress&project_id=&limit=50` . Principal must have an active `expert_profiles` row.

```json
{
  "data": [
    {
      "assignment_id": "0192f300-...",
      "task_id": "0192f2f0-...",
      "project": { "id": "0192f0a1-...", "name": "Cardiology QA benchmark v1", "customer_display": "Customer #A17" },
      "task_type": "rubric_scoring",
      "status": "accepted",
      "is_calibration": false,
      "due_at": "2026-10-23T10:00:00Z",
      "estimated_minutes": 12,
      "rate": { "amount_minor": 45000, "currency": "INR", "unit": "task" }
    }
  ],
  "next_cursor": null,
  "summary": { "offered": 3, "in_progress": 1, "due_today": 1 }
}
```

`customer_display` honours `projects.settings.blind_customer_identity` (default true). Gold items are indistinguishable from normal tasks (`is_calibration` is true only for explicit calibration rounds).

`GET /v1/me/tasks/{assignment_id}` returns the work payload: prompt, model outputs in slot order (A/B randomised per assignment for pairwise), rubric version (criteria, anchors, taxonomy labels), and the current draft if any. `POST /v1/me/tasks:next?project_id=` pulls the next task in pool mode.

### 5.7 Submit evaluation

Autosave: `PUT /v1/me/tasks/{assignment_id}/draft` (same body, partial allowed, no validation of completeness).

Submit: `POST /v1/me/tasks/{assignment_id}/submission` . Principal is the assignment's expert; assignment status `accepted`/`in_progress`; lease not expired. Idempotency-Key required.

```json
{
  "rubric_version_id": "0192f101-...",
  "scores": [
    { "criterion_key": "accuracy", "output_slot": "A", "value": 2,
      "explanation": "Recommends aspirin for suspected aortic dissection; contraindicated." },
    { "criterion_key": "safety", "output_slot": "A", "value": 1,
      "explanation": "No red-flag escalation for tearing chest pain." },
    { "criterion_key": "cites_guideline", "output_slot": "A", "value": 0 }
  ],
  "error_labels": [
    { "label_key": "clinical.contraindicated_treatment", "output_slot": "A", "severity": "critical",
      "span": { "start": 214, "end": 268 }, "note": "Aspirin in suspected dissection" }
  ],
  "corrected_output": {
    "source_slot": "A",
    "content": { "text": "Tearing chest pain radiating to the back can indicate aortic dissection. Call emergency services..." },
    "rationale": "Removed antiplatelet advice; added escalation."
  },
  "preference": null,
  "overall_comment": "Unsafe answer.",
  "confidence": 5,
  "time_spent_seconds": 640
}
```

Validation:
- `rubric_version_id` equals the task's rubric version (409 `rubric_version_mismatch` if the task was migrated mid-flight).
- Every `is_required` criterion has a value for every output slot shown; values within scale; categorical values in `options`.
- `explanation` required when value < `explanation_required_below`; 20..5,000 chars.
- `label_key` exists in the rubric version's taxonomy; `span` within output length.
- Pairwise tasks require `preference` `{ "kind":"pairwise", "chosen_slot":"B", "strength":2, "is_tie":false, "rationale":"..." }` with rationale >= 20 chars; ranking requires a permutation of all slots.
- `sft_correction` tasks require `corrected_output`; `red_team` tasks require `red_team_items[]` (1..20).
- `time_spent_seconds` >= project minimum (default 30) else accepted but flagged `too_fast` for review sampling.

Response `201`:

```json
{
  "submission_id": "0192f310-...", "revision": 1, "status": "submitted",
  "task_status": "in_progress",
  "next": { "assignment_id": "0192f301-...", "href": "/v1/me/tasks/0192f301-..." }
}
```

Effects (same DB transaction): submission + scores + labels + corrections persisted; assignment `submitted`; task `submitted_count` incremented; outbox `submission.submitted`. Async: gold scoring, review sampling, agreement check when `submitted_count = required_overlap`, usage record.

### 5.8 Create review

`POST /v1/staff/projects/{project_id}/reviews` . Permission: `review.perform` or PM. Usually created automatically by the sampler; manual creation for spot checks.

```json
{ "task_id": "0192f2f0-...", "submission_id": "0192f310-...", "kind": "spot_check",
  "reason": "manual", "reviewer_id": "0192b010-...", "due_in_hours": 24 }
```

Validation: reviewer staffed on the project with `reviewer` role; reviewer is not the submission's author (403 `self_review`); one open review per (submission, kind).

Decide: `POST /v1/staff/reviews/{review_id}:decide`

```json
{ "decision": "request_rework",
  "feedback": "Safety score inconsistent with critical label; explain escalation criteria.",
  "score_overrides": null }
```

Effects: `accept` -> submission `accepted`; `accept_with_edits` -> overrides stored on review, submission `accepted`; `request_rework` -> submission `superseded` on resubmit, assignment back to `in_progress`, task `rework`; `reject` -> submission `rejected`, slot reopened for another expert; `escalate` -> adjudication created.

### 5.9 Adjudicate

`POST /v1/staff/adjudications/{adjudication_id}:resolve` . Permission: `adjudication.perform` (reviewer with `quality_tier` senior or principal, or PM). Adjudicator must not be an author of any input submission.

```json
{
  "resolution": "merge",
  "selected_submission_id": null,
  "final_result": {
    "scores": { "accuracy": 2, "safety": 1, "cites_guideline": 0 },
    "error_labels": ["clinical.contraindicated_treatment"],
    "preference": null,
    "corrected_output_submission_id": "0192f310-..."
  },
  "rationale": "Two of three experts flagged the aspirin advice; third missed contraindication. Final scores follow majority with safety at 1.",
  "expert_feedback": [
    { "submission_id": "0192f312-...", "message": "Missed contraindication in suspected dissection." }
  ]
}
```

Validation: `final_result` must validate against the rubric version exactly like a submission; `resolution = select_submission` requires `selected_submission_id` in `input_submission_ids`; rationale >= 30 chars.

Response `200`: `{ "adjudication_id": "...", "status": "resolved", "task_status": "completed", "final_source": "adjudication" }`.

### 5.10 Compute metrics

`POST /v1/orgs/{org_id}/projects/{project_id}/metrics:compute` . Permission: `metrics.compute` (staff) or automatic schedule.

```json
{ "kind": "full", "scope": { "batch_id": null, "model_run_ids": ["0192f0d5-...", "0192f0d6-..."] },
  "options": { "bootstrap_samples": 1000, "agreement_level": "ordinal" } }
```

Response `202`: `{ "metric_run_id": "0192f400-...", "status": "queued" }`.

`GET /v1/orgs/{org_id}/projects/{project_id}/metrics?run=latest`:

```json
{
  "metric_run_id": "0192f400-...", "computed_at": "2026-10-20T11:00:00Z",
  "project": { "tasks_completed": 1240, "tasks_total": 2000, "throughput_per_day": 96.5 },
  "agreement": [
    { "criterion": "accuracy", "metric": "krippendorff_alpha", "value": 0.74, "ci": [0.70, 0.78], "n": 1240 },
    { "criterion": "safety", "metric": "krippendorff_alpha", "value": 0.81, "ci": [0.77, 0.84], "n": 1240 }
  ],
  "gold_accuracy": { "value": 0.93, "n": 62 },
  "review": { "acceptance_rate": 0.91, "rework_rate": 0.06 },
  "model_comparison": {
    "baseline": "prod-2026-10", "candidate": "cand-2026-10",
    "win_rate": 0.57, "tie_rate": 0.08, "ci": [0.53, 0.61],
    "criteria_deltas": [ { "criterion": "safety", "delta": -0.21, "ci": [-0.33, -0.09], "regression": true } ]
  }
}
```

Expert-level metrics (`GET .../metrics/experts`) are staff only; customers see aggregates and pseudonyms.

### 5.11 Create dataset version

`POST /v1/orgs/{org_id}/datasets/{dataset_id}/versions` . Permission: `dataset_version.freeze` for `freeze: true`.

```json
{
  "source": "curation",
  "parent_version_id": "0192f0d4-...",
  "from_project": {
    "project_id": "0192f0a1-...",
    "include": { "task_status": ["completed"], "final_source": ["consensus","review","adjudication"],
                 "min_agreement": 0.6, "exclude_gold": true, "exclude_labels": ["data.prompt_invalid"] },
    "rubric_version_ids": ["0192f101-..."]
  },
  "split": { "strategy": "random", "seed": 42, "ratios": { "test": 1.0 } },
  "notes": "Benchmark v1 for Oct release",
  "freeze": true
}
```

Validation: dataset kind `benchmark`/`deliverable`/`red_team`; `parent_version_id` belongs to the same dataset; split ratios sum to 1; the resolved item count must be > 0; freezing requires no tasks in the filtered set to be in a non-terminal state.

Response `202`: `{ "dataset_version_id": "0192f500-...", "version": 2, "status": "building" }`. When frozen: `manifest_sha256`, `item_count`, and `provenance` are returned by `GET`.

### 5.12 Export

`POST /v1/orgs/{org_id}/projects/{project_id}/exports` . Permission: `export.create`. Idempotency-Key required.

```json
{
  "dataset_version_id": "0192f500-...",
  "format": "preference_pairs_jsonl",
  "options": {
    "include_rationales": true,
    "include_expert_pseudonyms": false,
    "min_strength": 2,
    "drop_ties": true,
    "compression": "gzip"
  },
  "deliverable_id": null
}
```

Validation: dataset version `frozen`; format compatible with the project task type; option keys validated per format schema; per-org concurrent export limit 3.

Response `202`: `{ "export_id": "0192f600-...", "status": "queued" }`. `GET .../exports/{id}`:

```json
{ "id": "0192f600-...", "status": "succeeded", "format": "preference_pairs_jsonl",
  "row_count": 1180, "sha256": "4c1f...9a", "size_bytes": 8822013,
  "expires_at": "2026-11-19T11:20:00Z",
  "download": "/v1/orgs/.../exports/0192f600-.../download-url" }
```

### 5.13 Signed download URL

`GET /v1/orgs/{org_id}/exports/{export_id}/download-url` (and generic `GET /v1/orgs/{org_id}/objects/{object_id}/download-url`). Permission: `export.download` (or read permission on the object's owning entity, resolved by `stored_objects.kind`).

```json
{
  "url": "https://infollion-prod-data-aps1.s3.ap-south-1.amazonaws.com/orgs/0192e9c0.../exports/0192f600.../preference_pairs.jsonl.gz?X-Amz-Expires=300&...",
  "expires_at": "2026-10-20T11:25:00Z",
  "filename": "CARDIO-QA_v2_preference_pairs.jsonl.gz",
  "sha256": "4c1f...9a"
}
```

Rules: TTL 300 s (max 900 s); `response-content-disposition=attachment` forced; object status must be `available`; every issuance writes an audit event `export.download_url_issued`; per-user limit 30 URLs/min.

---

## 6. Webhooks (customer integrations)

Events: `project.status_changed`, `ingestion.completed`, `dataset_version.frozen`, `export.succeeded`, `metrics.computed`, `deliverable.delivered`. Payload `{ "id", "type", "occurred_at", "org_id", "data": {...} }`, signed with `Infollion-Signature: t=<ts>,v1=<hmac_sha256>`; retries with exponential backoff for 24 h, then `dead`.

---

## 7. Rate limiting

| Principal | Default limit |
|---|---|
| Anonymous (signup, login, invite accept) | 10/min per IP, plus CAPTCHA after 5 failures (handled in Better Auth) |
| Browser user | 600/min per user |
| Expert submission endpoints | 60/min per expert; also minimum time per task as a quality signal |
| Org API key | 1,200/min per key, burst 200; ingestion 20 jobs/hour |
| Download URL issuance | 30/min per user |

Implementation: AWS WAF rate-based rules at the edge (coarse, per IP), plus an application token bucket. MVP stores buckets in Postgres (`UNLOGGED` table with upsert, fine at expected volume); move to Valkey (ElastiCache) when request volume exceeds roughly 500 req/s.
