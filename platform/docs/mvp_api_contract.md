# MVP API Contract (Phase 1 build)

This is the binding contract between `backend/` and `frontend/` for the Phase 1 build. It is a simplified subset of `research_and_development/architecture/api_design.md`; where they differ, this file wins for the build and the difference is listed in section 9.

## 1. Conventions

- Backend base path: `/v1`. The Next.js app proxies `/api/v1/*` to `${API_URL}/v1/*` (rewrite), so the browser is same-origin. It also proxies `/v1/auth/*` to `${API_URL}/v1/auth/*`, and the browser calls auth endpoints on that path, because the refresh cookie is scoped to `Path=/v1/auth` and would not be sent to `/api/v1/auth/*`.
- JSON only. IDs are UUID strings. Times are RFC 3339 UTC.
- List responses: `{ "data": [...], "next_cursor": string | null }`, query `?limit=50&cursor=...` (max 200).
- Errors: RFC 9457 problem JSON `{ "type", "title", "status", "code", "detail", "errors": [{ "field", "code", "message" }] }`.
- `Idempotency-Key` header is accepted (and honoured for 24h) on: create project, ingestion, assignments, submission, export. Frontend sends a random UUID per user action.
- Auth: `Authorization: Bearer <access_token>` (JWT, 15 min). Refresh token in httpOnly cookie `ifl_refresh` (path `/v1/auth`). Frontend keeps the access token in memory and calls refresh on 401 `token_expired` or on page load.
- Cross-tenant or unassigned access returns 404 `not_found`; insufficient role returns 403 `forbidden`.

## 2. Roles

Platform org (kind `platform`, Infollion): `platform_admin`, `project_manager`, `reviewer`, `expert`.
Customer org (kind `customer`): `customer_admin`, `customer_member`.
A user may hold several roles. "Staff" = `platform_admin` or `project_manager` (and `reviewer` for review/adjudication endpoints).

## 3. Auth and identity

| Method | Path | Body | Response |
|---|---|---|---|
| POST | /v1/auth/signup | `{ email, password (>=12 chars), full_name, org_name }` | 201 `{ access_token, expires_in, user }` (creates customer org + customer_admin) |
| POST | /v1/auth/login | `{ email, password, totp_code? }` | 200 `{ access_token, expires_in, user }` or 401 `mfa_required` when MFA enrolled and code missing/invalid |
| POST | /v1/auth/refresh | (cookie) | 200 `{ access_token, expires_in }` |
| POST | /v1/auth/logout | | 204 |
| POST | /v1/auth/mfa/setup | | 200 `{ secret, otpauth_url }` |
| POST | /v1/auth/mfa/verify | `{ code }` | 200 `{ mfa_enabled: true }` |
| GET | /v1/me | | `{ user: { id, email, full_name, mfa_enabled }, memberships: [{ org_id, org_name, org_kind, roles: [] }], expert_profile_id: string|null, mfa_required_but_missing: bool }` |

When server setting `REQUIRE_MFA=true` and the user has no MFA, every endpoint except auth, `/v1/me` and MFA setup returns 403 `mfa_required`. Local development defaults to `false`.

## 4. Customer endpoints (`/v1/orgs/{org_id}/...`)

Projects
- `POST /projects` body: `{ name, code (^[A-Z0-9-]{2,24}$), description, domain, task_type: "rubric_scoring"|"pairwise_preference"|"sft_correction", languages: ["en"], difficulty: "general"|"professional"|"expert", target_volume, deadline, deliverable_format: "evaluation_results"|"sft"|"preference_pairs", quality: { overlap_k (1..5), review_rate (0..1), gold_rate (0..0.3), agreement_threshold (0..1) }, required_skills: [{ skill_key, min_level (1..5) }], excluded_companies: [string] }` -> 201 Project.
- `GET /projects`, `GET /projects/{pid}`, `PATCH /projects/{pid}` (draft or changes_requested only).
- `POST /projects/{pid}:submit` draft -> submitted.
- Project shape: `{ id, org_id, name, code, description, domain, task_type, languages, difficulty, target_volume, deadline, deliverable_format, quality, required_skills, excluded_companies, status, current_rubric_version_id, counts: { items, tasks, tasks_completed, submissions }, created_at }`.
- Status: `draft -> submitted -> approved -> active -> completed`; also `changes_requested`, `paused`, `cancelled`.

Rubrics
- `POST /rubrics` `{ name, project_id }` -> Rubric `{ id, name, project_id, versions: [...] }`; `GET /rubrics?project_id=`, `GET /rubrics/{rid}`.
- `POST /rubrics/{rid}/versions` creates draft: `{ instructions_md, criteria: [Criterion], error_labels: [{ key, label, severity: "minor"|"major"|"critical" }], require_correction: bool, require_overall_comment: bool }`.
- Criterion: `{ key (snake_case), label, description, scale_type: "likert"|"binary"|"categorical", scale_min, scale_max, anchors: {"1": "..."}, options: [string] (categorical), weight, is_required, explanation_required_below: number|null }`. Weights sum to 1 (+/-0.001).
- `PATCH /rubrics/{rid}/versions/{vid}` (draft only; published -> 409 `rubric_immutable`).
- `POST /rubrics/{rid}/versions/{vid}:publish` `{ set_as_project_current: true }` -> `{ id, version, status: "published", content_sha256, published_at }`.

Uploads and ingestion
- `POST /uploads` `{ filename, content_type ("application/x-ndjson"|"text/csv"|"application/json"), size_bytes (<= 200 MiB in MVP build) }` -> `{ upload_id, method: "PUT", url, headers, expires_at }`. Browser PUTs the file to `url`.
- `POST /uploads/{upload_id}:complete` -> `{ status: "available", size_bytes, sha256 }`.
- `POST /projects/{pid}/ingestions` `{ upload_id, format: "jsonl"|"csv", on_error: "skip_row"|"fail" }` -> 202 `{ ingestion_id, status: "queued" }`.
- `GET /projects/{pid}/ingestions/{id}` -> `{ id, status: "queued"|"running"|"succeeded"|"partially_succeeded"|"failed", rows_total, rows_ok, rows_failed, errors: [{ row, message }] (first 100), dataset_version_id }`.
- Input JSONL line: `{ "id": "q-001", "prompt": "...", "context": "..."?, "reference_answer": "..."?, "responses": [{ "model": "model-a", "text": "..." }], "metadata": {}? }`. CSV columns: `id,prompt,context,reference_answer,model_a,response_a,model_b,response_b`.
- `GET /projects/{pid}/items?limit&cursor` -> items `{ id, external_id, prompt, context, reference_answer, responses: [{ model_run_id, model, text }], is_gold }`.

Gold
- `POST /projects/{pid}/gold-items` `{ item_id, expected: { scores: { criterion_key: value }, preferred_model?: string }, tolerance: 0|1 }`; `GET /projects/{pid}/gold-items`; `DELETE /projects/{pid}/gold-items/{gid}`.

Metrics
- `POST /projects/{pid}/metrics:compute` -> 202 `{ metric_run_id, status }` (staff or customer_admin).
- `GET /projects/{pid}/metrics?run=latest` -> `{ metric_run_id, computed_at, progress: { tasks_total, tasks_completed, submissions, throughput_per_day }, agreement: [{ criterion, metric: "krippendorff_alpha", level, value, n_items, percent_agreement, interpretation: "reliable"|"tentative"|"unreliable"|"insufficient_data" }], preference_agreement: { metric, value, percent_agreement, n_items } | null, gold_accuracy: { value, n }, review: { acceptance_rate, rework_rate, rejection_rate, n }, model_scores: [{ model, criterion, mean, ci: [lo, hi], n }], win_rates: [{ model_a, model_b, a_wins, b_wins, ties, n }] | null, error_labels: [{ key, label, count, critical_count }] }`.

Datasets and exports
- `POST /projects/{pid}/dataset-versions` `{ include: { min_agreement: number|null, exclude_gold: true }, notes }` -> 201 frozen `{ id, version, status: "frozen", item_count, manifest_sha256, created_at }`. Only tasks with status `completed` and a final result are included.
- `GET /projects/{pid}/dataset-versions`.
- `POST /projects/{pid}/exports` `{ dataset_version_id, format: "evaluation_results_jsonl"|"sft_jsonl"|"preference_pairs_jsonl", options: { include_rationales: bool, drop_ties: bool } }` -> 202 `{ export_id, status }`. Format must be compatible with project task_type (sft_jsonl requires corrections; preference_pairs_jsonl requires pairwise_preference).
- `GET /projects/{pid}/exports`, `GET /projects/{pid}/exports/{eid}` -> `{ id, status, format, row_count, sha256, size_bytes, created_at }`.
- `GET /exports/{eid}/download-url` -> `{ url, expires_at, filename, sha256 }` (TTL 300 s; audited).

Org admin
- `GET /members`, `GET /audit-events?limit&cursor` (customer_admin), `GET /usage` -> `{ accepted_tasks, by_project: [...] }`.

## 5. Expert endpoints (`/v1/me/...`)

- `GET /v1/skills` -> `[{ key, label, domain }]` (any authenticated user).
- `GET /me/expert`, `PUT /me/expert` `{ headline, bio, years_experience, country, languages, weekly_hours, skills: [{ skill_key, level 1..5 }] }`.
- `GET /me/expert/credentials`, `POST /me/expert/credentials` `{ kind: "degree"|"license"|"certification"|"employment"|"publication", title, issuer, year?, identifier? }` (status `pending`).
- `GET /me/expert/conflicts`, `POST /me/expert/conflicts` `{ organization_name, relationship: "employee"|"former_employee"|"consultant"|"investor"|"family"|"other", until? }`, `DELETE /me/expert/conflicts/{id}`.
- `GET /me/projects` -> projects the expert is approved on: `{ project_id, name, customer_display ("Customer #A1B2"), task_type, status, available_tasks, my_submitted, my_in_progress, max_tasks }`.
- `POST /me/tasks:next` `{ project_id }` -> 201 TaskSummary or 404 `no_tasks_available`.
- `GET /me/tasks?status=in_progress|submitted|rework` -> TaskSummary list `{ assignment_id, task_id, project_id, project_name, task_type, status, due_at, created_at }`.
- `GET /me/tasks/{assignment_id}` -> TaskPayload `{ assignment_id, task_id, status, task_type, project: { id, name, customer_display }, item: { prompt, context, reference_answer_visible: false }, outputs: [{ slot: "A"|"B", text }], rubric_version: { id, version, instructions_md, criteria, error_labels, require_correction, require_overall_comment }, draft: object|null, feedback: [{ from: "review"|"adjudication", message, created_at }], lease_expires_at }`. Model names are hidden from experts; slot order randomised per assignment.
- `PUT /me/tasks/{assignment_id}/draft` (any partial body).
- `POST /me/tasks/{assignment_id}/submission` body:
  `{ rubric_version_id, scores: [{ criterion_key, output_slot, value, explanation? }], error_labels: [{ label_key, output_slot, note? }], corrected_output: { source_slot, text, rationale? } | null, preference: { chosen_slot: "A"|"B"|null, strength: 1..3, is_tie: bool, both_bad: bool, rationale } | null, overall_comment?, confidence (1..5), time_spent_seconds }` -> 201 `{ submission_id, revision, status: "submitted" }`.
- `POST /me/tasks/{assignment_id}:release` -> 204 (returns slot to pool).

Validation rules on submission (422 `validation_error` with field errors): rubric version matches task; each required criterion scored for each output slot; values in scale/options; explanation (>= 20 chars) required where value < `explanation_required_below`; label keys exist; pairwise requires `preference` with rationale >= 20 chars, and exactly one of chosen_slot / is_tie / both_bad semantics (both_bad may combine with chosen_slot); `require_correction` or task_type `sft_correction` requires `corrected_output.text` >= 20 chars; time_spent_seconds < 20 is accepted but flagged `too_fast`.

## 6. Staff endpoints (`/v1/staff/...`)

- `GET /staff/projects?status=` (all orgs) -> Project + `org_name`.
- `POST /staff/projects/{pid}:approve` | `:request-changes` `{ note }` | `:activate` (requires published current rubric and items) | `:pause` | `:complete`.
- `POST /staff/projects/{pid}:generate-tasks` -> `{ created, gold_tasks }` (one task per item, `required_overlap = quality.overlap_k`; gold items are tasks too and indistinguishable to experts).
- `POST /staff/projects/{pid}:recommend-experts` `{ count }` -> `{ algorithm_version, candidates: [{ expert_id, pseudonym, display_name, score, factors: { skill_match, credential_verified, language, quality_history, availability, load }, flags: [] }], excluded: [{ expert_id, display_name, reason: "conflict_of_interest"|"missing_skill"|"inactive"|"unverified", detail }] }`.
- `POST /staff/projects/{pid}/assignments` `{ experts: [{ expert_id, max_tasks }] }` -> `{ approved: [...], rejected: [{ expert_id, reason }] }` (re-checks conflicts).
- `GET /staff/projects/{pid}/experts`, `DELETE /staff/projects/{pid}/experts/{expert_id}`.
- `GET /staff/experts?q=&skill=&status=`, `GET /staff/experts/{id}` (full profile incl. credentials, conflicts, quality: { gold_accuracy, acceptance_rate, submissions }).
- `POST /staff/experts/{id}/credentials/{cid}:verify` `{ status: "verified"|"rejected", note }`.
- `PATCH /staff/experts/{id}` `{ status: "active"|"suspended", tier?: "standard"|"senior" }`.
- `GET /staff/reviews?status=open|claimed|done&project_id=` -> `{ id, project_id, project_name, task_id, submission_id, kind: "sample"|"low_agreement"|"gold_fail"|"too_fast", status, created_at }`.
- `GET /staff/reviews/{id}` -> review + TaskPayload-like item/outputs (with model names) + submission + expert pseudonym.
- `POST /staff/reviews/{id}:claim`, `POST /staff/reviews/{id}:decide` `{ decision: "accept"|"request_rework"|"reject"|"escalate", feedback }`. Reviewer cannot review own submission (403 `self_review`).
- `GET /staff/adjudications?status=open|resolved&project_id=`, `GET /staff/adjudications/{id}` (item, outputs, all input submissions with pseudonyms, disagreement summary).
- `POST /staff/adjudications/{id}:resolve` `{ resolution: "select_submission"|"merge", selected_submission_id?, final_result: { scores: { "criterion_key|slot": value }, preference?: { chosen_slot, is_tie, both_bad, strength }, corrected_text? }, rationale (>= 30 chars) }`.
- `GET /staff/projects/{pid}/metrics/experts` -> per expert `{ expert_id, pseudonym, submissions, gold_accuracy, acceptance_rate, avg_time_seconds, agreement_with_consensus }`.
- `GET /staff/audit-events?org_id=&limit&cursor`.

## 7. QA behaviour (backend)

After each submission (in a job):
1. Gold task: compare with expected (per criterion within tolerance; preference match). Record `gold_results`. Failing gold creates a `gold_fail` review.
2. `time_spent_seconds < 20` creates a `too_fast` review.
3. When accepted submissions for a task reach `required_overlap`:
   - overlap 1: with probability `review_rate` create a `sample` review, else finalize.
   - overlap >= 2: compute item disagreement (any required criterion range > 1 on likert, any mismatch on binary/categorical, or preference disagreement). Disagreement -> `adjudication`. Otherwise finalize with consensus (median for likert rounded, majority otherwise; correction from the highest-confidence submission) and sample a review with `review_rate`.
4. Finalizing writes `task_results` `{ final_scores, final_preference, final_correction, final_source: "single"|"consensus"|"review"|"adjudication", agreement }` and a usage record.
Review `request_rework` sets assignment `rework`; the expert resubmits (revision + 1). Review `reject` opens the slot for another expert.

## 8. Exports

Each export writes the data file and `manifest.json` (project code, dataset version, rubric version hash, row count, sha256, created_at, generator version) under `orgs/{org_id}/exports/{export_id}/`.
- `evaluation_results_jsonl`: `{ item_id, external_id, prompt, outputs: [{ model, text }], final_scores: { model: { criterion: value } }, error_labels, preference, final_source, agreement, rubric_version, expert_pseudonyms? }`.
- `sft_jsonl`: `{ "messages": [{ "role": "user", "content": prompt }, { "role": "assistant", "content": corrected_text }], "metadata": { item_id, source_model, rubric_version } }` only for items with an accepted correction.
- `preference_pairs_jsonl`: `{ "prompt": [{ "role": "user", "content": ... }], "chosen": [{ "role": "assistant", "content": ... }], "rejected": [...], "metadata": { item_id, chosen_model, rejected_model, strength, both_bad } }`. Ties dropped when `drop_ties`; both_bad pairs excluded by default. This matches the TRL conversational preference format.

## 9. Differences from architecture/api_design.md

- FastAPI-native auth instead of Better Auth (ADR-005).
- Single-part presigned upload only, 200 MiB cap.
- Fixed input schema instead of JSONPath mapping.
- Pool assignment only (no direct mode); no leases beyond a 24h `lease_expires_at` reclaimed by a periodic job.
- No ETag/If-Match, webhooks, API keys, deliverables, billing invoices in this build.
