# Acceptance Criteria

Date: 2026-10-20
Related: `user_stories.md` (US IDs), `product_requirements.md` (FR and NFR IDs), `workflows.md` (Workflows 1 to 5), `../architecture/api_design.md` (error codes).

Scope: every Phase 1 (including conditional "1c") and Phase 2 user story, plus end-to-end criteria for each of the five workflows. Criterion IDs are `AC-<story number>.<n>` for stories and `WF<workflow>-<n>` for workflows. Each criterion is written as Given / When / Then and must be automated as an API, RLS or UI test unless marked "(manual)".

Conventions used in criteria:
- Cross-tenant reads return 404 `not_found` so the caller cannot learn that a resource exists; in-tenant permission failures return 403 `forbidden` (`api_design.md` section 2).
- Validation failures return 422 problem+json with per-field `errors[]`; invalid state transitions return 409 `invalid_state_transition`.
- "Audited" means an `audit_events` row with actor, role, org, target, request ID and no content payload.

---

## Part A: Story acceptance criteria

### A.1 Customer Admin

**US-001 Invite users with a role** (FR-002, FR-003, FR-280)
- AC-001.1: Given I am a customer admin, When I invite `a@x.com` as `customer_member`, Then an invitation email is sent, the invitation expires in 7 days and the event `org.member_invited` is audited.
- AC-001.2: Given an invitation was already accepted, When the link is opened again, Then the request is rejected and no second membership is created.
- AC-001.3 (negative): Given I am a `customer_member`, When I call the invite endpoint, Then I receive 403 `forbidden` and the denial is audited.

**US-002 Mandatory MFA** (FR-005, FR-007)
- AC-002.1: Given a new user signs in for the first time, When the password is correct, Then no access token is issued until TOTP enrolment is completed.
- AC-002.2: Given a user with TOTP enrolled, When they submit a wrong TOTP code 5 times, Then further attempts are throttled and the events are audited.
- AC-002.3: Given an admin revokes a user's sessions, When the user's refresh token is next used, Then it is rejected and the user must sign in again.

**US-003 API keys** (FR-008, FR-006)
- AC-003.1: Given I am a customer admin, When I create an API key with scope `items:write` and expiry 90 days after step-up MFA, Then the secret is shown once, only its hash is stored and the event is audited.
- AC-003.2 (negative): Given a revoked or expired key, When it calls any endpoint, Then the response is 401 `unauthenticated`.
- AC-003.3 (negative): Given a key with only `items:write`, When it requests an export, Then the response is 403 `forbidden`.
- AC-003.4 (negative): Given I have not passed step-up MFA in the last 5 minutes, When I create a key, Then the response is 403 `mfa_required`.

**US-004 Launch gating** (FR-024, FR-026, FR-044)
- AC-004.1: Given contracts are active, the rubric version is published and customer-approved, a budget cap is set and capacity is sufficient, When I launch, Then the project becomes `active` and `project.launched` is audited.
- AC-004.2 (negative): Given the DPA is not active, When I launch, Then the response is 409 `contracts_inactive` and the state is unchanged.
- AC-004.3 (negative): Given the rubric version is published but not customer-approved, When I launch, Then the response is 409 and the state is unchanged.
- AC-004.4: Given capacity is below SLA throughput, When a PM overrides with a written reason, Then launch succeeds and the override and reason are audited.

**US-005 Budget cap** (FR-253, FR-182, FR-025)
- AC-005.1: Given a budget cap of USD 10,000, When committed cost reaches 80%, Then the customer admin and PM are notified once.
- AC-005.2: Given committed cost reaches 100% of cap, When an expert requests the next task, Then no new lease is issued (204) and in-flight leases may complete.
- AC-005.3: Given an active project, When I open the dashboard, Then burn versus cap and the stored estimate are both displayed.

**US-006 Classification and region** (FR-023, FR-013)
- AC-006.1: Given a new project, When it is created without a classification, Then it defaults to C2 and the org's data region is shown.
- AC-006.2 (negative): Given a C3 project, When a PM or expert tries to lower an item to C2, Then the response is 403 and is audited; only a customer admin can lower to project level with audit.
- AC-006.3: Given an item is stored, When its object tags are inspected, Then `classification` matches the item classification and the bucket region equals the org data region.

**US-007 Download approved exports** (FR-215, FR-221, FR-006)
- AC-007.1: Given an export in `succeeded` state and recent step-up MFA, When I request a download URL, Then a presigned URL with TTL 300 seconds and `attachment` disposition is returned and `export.download_url_issued` is audited.
- AC-007.2 (negative, expired signed URL): Given a download URL issued more than 300 seconds ago, When it is used, Then storage returns 403 and I can request a fresh URL from the API, which issues and audits a new one.
- AC-007.3 (negative): Given I requested 30 URLs in the last minute, When I request another, Then the response is 429 with `Retry-After`.
- AC-007.4 (negative): Given an export older than 30 days, When I request a URL, Then the response is 409 or 404 and no URL is issued.

**US-008 Pseudonymous credentials** (FR-015, FR-082)
- AC-008.1: Given a project without named disclosure, When I view results, Then raters appear only as project-scoped pseudonyms with verified credential summaries and no names, emails or profile links.
- AC-008.2: Given named disclosure is enabled for a project, When an expert has not consented, Then that expert remains pseudonymous.

**US-009 Third-party AI opt-in** (FR-030)
- AC-009.1: Given a new project, When its settings are read, Then third-party AI is off.
- AC-009.2 (negative): Given third-party AI is off, When any platform component attempts an external AI call with project data, Then the `ai_egress` gate blocks it and audits the denial.
- AC-009.3: Given I enable it, When I save without naming a provider and recording authorization, Then the response is 422.

**US-010 Deletion with certificate** (FR-269)
- AC-010.1: Given I request deletion of a completed project, When two authorized approvers approve, Then items, submissions and objects are deleted per the retention rules, deletion is verified and a certificate is available to me.
- AC-010.2 (negative): Given only one approver has approved, When the deletion job runs, Then nothing is deleted.

**US-011 Org audit view and data-handling summary** (FR-270, FR-271) Phase 2
- AC-011.1: Given I am a customer admin, When I filter my org's audit events by project and date, Then only my org's events are returned, including download URL issuance and content access counts.
- AC-011.2 (negative): Given I pass another org's ID, When I query audit events, Then the response is 404.
- AC-011.3: Given a project, When I open its data-handling summary, Then region, retention, classification and the list of accessing roles and pseudonyms are shown.

**US-012 Accept or dispute delivery** (FR-225, FR-164) Phase 2
- AC-012.1: Given a released delivery, When I accept it, Then its state becomes `accepted` and usage is final for invoicing.
- AC-012.2: Given a released delivery, When I dispute 12 items with reasons, Then 12 linked re-adjudication tasks are created and the delivery becomes `disputed`.
- AC-012.3: Given no action for N days (configured), When the timer elapses, Then the delivery is auto-accepted and audited.

### A.2 Customer ML Engineer

**US-020 Create draft project** (FR-020, FR-021, FR-022)
- AC-020.1: Given valid fields, When I create a project, Then it is saved as `draft` with default quality settings and `project.created` is audited.
- AC-020.2 (negative): Given a name already used in my org, When I create, Then 422 with field error on `name`.
- AC-020.3 (negative): Given `languages: ["english"]`, When I create, Then 422 `invalid_language_tag`.
- AC-020.4 (negative): Given a `draft` project, When I call `:activate` directly, Then 409 `invalid_state_transition`.

**US-021 Upload and validation report** (FR-060 to FR-063, FR-065)
- AC-021.1: Given a 10,000-row JSONL file, When I upload via presigned URL and complete, Then a validation report lists row-level errors and counts and valid rows form a new dataset version with sha256 per item.
- AC-021.2: Given two rows with identical content, When validated, Then both are flagged as duplicates by content hash.
- AC-021.3 (negative): Given a file whose magic bytes do not match its declared type, or that fails AV scan, When completed, Then it stays in quarantine and is never parsed.
- AC-021.4 (negative): Given a checksum mismatch on completion, When I complete the upload, Then 409 and the batch remains `uploading` and resumable.

**US-022 API ingestion with idempotency** (FR-066, FR-008)
- AC-022.1: Given a POST with `Idempotency-Key: k1`, When it is retried with the same body, Then the original response is returned and no duplicate ingestion is created.
- AC-022.2 (negative): Given key `k1` reused with a different body, When posted, Then 409 `idempotency_conflict`.

**US-023 Co-design rubric** (FR-040, FR-041, FR-042)
- AC-023.1: Given a draft rubric version, When I add a 5-point scale criterion with an anchor for every point, a binary criterion and an error taxonomy, Then the draft saves.
- AC-023.2: Given a draft version, When I edit a criterion, Then the change persists in the same draft version.

**US-024 Calibration results and rubric approval** (FR-118, FR-044, FR-180)
- AC-024.1: Given calibration tasks are finalized, When I open calibration results, Then per-criterion Krippendorff's alpha with CI, percent agreement and items with lowest agreement are shown.
- AC-024.2: Given a published version, When I approve it, Then `rubric.version_approved` is audited with my identity.
- AC-024.3 (negative): Given a draft (unpublished) version, When I approve it, Then 409.

**US-025 Dashboard** (FR-182, FR-180, FR-186)
- AC-025.1: Given finalized tasks exist, When I open the dashboard, Then progress, per-criterion distributions, model win rate with tie rate and CI, alpha with CI, aggregate gold accuracy and error taxonomy counts are shown with a staleness timestamp.
- AC-025.2: Given I am a customer user, When I view metrics, Then no individual expert performance scores are visible.

**US-026 Preference pairs export** (FR-217, FR-131, FR-220)
- AC-026.1: Given finalized pairwise tasks, When I export `preference_pairs_jsonl` with `min_strength=2` and `drop_ties=true`, Then every row has prompt, chosen, rejected, strength >= 2, both-bad flag and absolute acceptability for each response, and no ties.
- AC-026.2 (negative): Given a project whose task type is `rate` only, When I request `preference_pairs_jsonl`, Then 422 because the format does not match the task type (no implicit conversion).

**US-027 SFT export from accepted corrections** (FR-216, FR-119, FR-219)
- AC-027.1: Given 100 finalized tasks of which 40 have corrections accepted in QA, When I export SFT JSONL, Then exactly 40 rows are produced in `messages` format.
- AC-027.2 (negative): Given an item with `usage_rights = eval_only`, When I export SFT, Then the item is excluded and listed in the exclusion file with reason.

**US-028 Manifest and traceability** (FR-218, FR-201, FR-200)
- AC-028.1: Given an export, When I open `manifest.json`, Then it lists files, row counts, sha256 per file and item, rubric version IDs, submission IDs, rater pseudonyms, QA status and schema version.
- AC-028.2: Given any exported row, When I look up its item hash, submission IDs and rubric version, Then they resolve to the stored records.
- AC-028.3 (negative): Given the dataset version frozen for the export, When anyone attempts to modify an item in it, Then the database rejects the change.

**US-029 Quality report** (FR-185)
- AC-029.1: Given an active or completed project, When I download the quality report, Then it contains methodology, alpha and percent agreement per criterion, aggregate gold accuracy, error taxonomy and exclusions with reasons, and each figure states n.

**US-030 PII blocking** (FR-064, FR-222)
- AC-030.1: Given the DPA does not permit PII and an item contains an Indian phone number and PAN, When ingested, Then the item is blocked with `pii_blocked` and never offered to experts.
- AC-030.2: Given an expert's rationale contains a person's name in a project without PII permission, When an export is built, Then the export is blocked until the field is redacted.

**US-031 Webhooks** (FR-283) Phase 2
- AC-031.1: Given a registered endpoint, When `export.succeeded` fires, Then the payload is signed with `Infollion-Signature` HMAC and includes event ID and timestamp.
- AC-031.2: Given the endpoint returns 500, When retries are exhausted after 24 hours, Then the event is `dead` and visible in the UI.

**US-032 Curate, freeze, diff** (FR-203, FR-200, FR-204) Phase 2
- AC-032.1: Given a project, When I create a version with `min_agreement=0.6`, `exclude_gold=true` and seed 42, Then only matching finalized items are included and the split is reproducible with the same seed.
- AC-032.2 (negative): Given tasks in the filtered set are not in a terminal state, When I freeze, Then 409.
- AC-032.3: Given versions 1 and 2, When I request a diff, Then added, removed and changed-label items are listed.

**US-033 Loader-ready formats** (FR-223, FR-224, FR-226) Phase 2
- AC-033.1: Given a frozen version, When exported as Parquet, Then `datasets.load_dataset` loads it with zero schema errors in CI.
- AC-033.2: Given a TRL preference export, When loaded by the TRL preference loader in CI, Then it loads without error.
- AC-033.3: Given the same frozen version and options, When re-exported, Then file and manifest sha256 are identical.

**US-034 Disagreement explorer** (FR-191) Phase 2
- AC-034.1: Given an adjudicated item, When I open it, Then each raw vote, rationale, pseudonym, the final answer and the adjudication reason code are shown.

**US-035 Ranking tasks** (FR-121, FR-142, FR-181) Phase 2
- AC-035.1: Given an item with 4 responses, When an expert submits a full ranking, Then it is stored and agreement is reported with Kendall's W.
- AC-035.2 (negative): Given a ranking with a duplicate position and ties not allowed, When submitted, Then 422.

**US-036 Red-team project** (FR-122, FR-188, FR-091) Phase 2
- AC-036.1: Given red-team tasks, When submitted, Then hazard category, attack technique, verdict, severity and over-refusal flag are required.
- AC-036.2: Given finalized red-team items, When I view metrics, Then safety failure rate and over-refusal rate per hazard category with Wilson CI are shown.

**US-037 Incremental results** (FR-228) Phase 2
- AC-037.1: Given a cursor from my last call, When I call results with `since=cursor`, Then only items finalized after the cursor are returned with a new cursor.

**US-038 Private benchmark** (FR-123, FR-224, FR-202) Phase 2
- AC-038.1: Given an authored benchmark item, When it is finalized, Then it has a reference answer, grading rubric and an independent second-expert validation record.
- AC-038.2 (negative): Given a benchmark item marked `eval_only`, When included in an SFT or preference export, Then it is excluded and listed.

### A.3 Expert

**US-050 Onboarding** (FR-005, FR-084, FR-085)
- AC-050.1: Given a new expert, When they sign in, Then TOTP enrolment and acceptance of the current Expert Services Agreement version are required before any project is visible.
- AC-050.2: Given a new agreement version is published, When the expert next signs in, Then assignment is blocked until they accept it.

**US-051 Profile and credentials** (FR-080, FR-082)
- AC-051.1: Given I update domains, languages and availability, When saved, Then matching uses the new values on the next recommendation run.
- AC-051.2: Given I upload a credential, When saved, Then its status is `pending` until expert ops verifies it.

**US-052 Conflict declarations** (FR-083, FR-102)
- AC-052.1: Given I declare a conflict with org X, When a PM runs recommendations for an org X project, Then I am excluded before ranking.

**US-053 Invitation and qualification** (FR-101, FR-086, FR-084)
- AC-053.1: Given an invitation, When I accept the project addendum and score 85% on a qualification with pass mark 80%, Then I am qualified for that project and rubric version.
- AC-053.2 (negative): Given I score 70%, When the attempt is submitted, Then I am not qualified and see the result.
- AC-053.3: Given a qualification attempt, When submitted, Then the time is recorded in my earnings ledger as paid qualification.

**US-054 Pull next task** (FR-113, FR-114, FR-111)
- AC-054.1: Given I am qualified and under my caps, When I request the next task, Then I receive an assignment with a 60-minute lease within 2 seconds p95.
- AC-054.2: Given I already rated item I, When I request tasks, Then I never receive another task on item I.
- AC-054.3 (negative, expert without assignment): Given I hold no active assignment for task T, When I request T's content or item by ID, Then the response is 404 and the RLS policy returns zero rows in a direct database test.
- AC-054.4 (negative): Given my lease expired, When I fetch the content, Then 409 `lease_expired` and no content is returned.

**US-055 Rubric form** (FR-130, FR-132)
- AC-055.1: Given a rubric with explanation required (min 50 characters) and correction required, When I open a task, Then the form shows every criterion, error labels, explanation and correction fields.

**US-056 Pairwise comparison** (FR-131, FR-137)
- AC-056.1: Given a pairwise task, When I submit, Then choice, strength, tie flag, both-bad flag and absolute acceptability for each response are stored.
- AC-056.2: Given 100 assignments of pairwise tasks, When presented, Then response order is randomized and the presented order is recorded per assignment.

**US-057 Autosave** (FR-134)
- AC-057.1: Given I entered scores, When I refresh the browser, Then my draft is restored.
- AC-057.2: Given the network drops during submit, When I retry with the same idempotency key, Then exactly one submission exists.

**US-058 Release or flag** (FR-115)
- AC-058.1: Given I release a task, When released, Then my lease ends, the task returns to the pool and I lose content access.
- AC-058.2: Given I flag "PII found", When flagged, Then the task moves to `on_hold`, the PM is notified and no other expert receives it until cleared.

**US-059 Validation messages** (FR-133)
- AC-059.1 (negative, submission failing rubric validation): Given a required criterion is missing and the explanation is shorter than the minimum, When I submit, Then the server returns 422 with one error per field, no submission is stored and my draft is retained.
- AC-059.2 (negative): Given a value outside the scale (6 on a 1 to 5 scale), When submitted via API bypassing the UI, Then 422.
- AC-059.3 (negative): Given my submission references a rubric version other than the task's pinned version, When submitted, Then 409 `rubric_changed`.

**US-060 Feedback and clarifications** (FR-140, FR-155, FR-046)
- AC-060.1: Given a reviewer returns my submission for rework, When I open the feedback inbox, Then the written feedback is shown with the item.
- AC-060.2: Given a rubric clarification is published, When I open any task of that rubric, Then the clarification is visible.

**US-061 Own quality metrics** (FR-183, FR-089)
- AC-061.1: Given I have answered 25 gold items and 40 reviewed submissions, When I open my quality page, Then gold accuracy, agreement with final labels and review pass rate are shown.
- AC-061.2: Given fewer than 20 gold items, When I open the page, Then the performance score shows "insufficient data".
- AC-061.3 (negative): Given I request another expert's metrics, When called, Then 404.

**US-062 Earnings ledger** (FR-251, FR-089)
- AC-062.1: Given a submission, When it is created, Then a ledger entry `pending_qa` appears; when accepted it becomes `approved`; when returned it becomes `on_rework`.
- AC-062.2: Given a `reject` verdict, When the ledger is voided, Then the documented reason is visible to me.

**US-063 Workload caps** (FR-088)
- AC-063.1 (negative): Given I have logged 6 hours today with a 6 h/day cap, When I request a task, Then 429 `workload_cap` with the reset time.

**US-064 Rework** (FR-155, FR-157)
- AC-064.1: Given a returned task, When I open it, Then my previous answer and the reviewer feedback are shown and I can resubmit.
- AC-064.2: Given a task has been returned twice, When a third rework would be needed, Then it is escalated instead of returned.

**US-065 AI-assist declaration** (FR-141)
- AC-065.1 (negative): Given the declaration field is empty, When I submit, Then 422.
- AC-065.2: Given a submission, When stored, Then the declaration and agreement hash are in the contribution ledger.

**US-066 Wellbeing controls** (FR-091) Phase 2
- AC-066.1: Given a harmful-content project, When I open it for the first time, Then a content warning must be acknowledged.
- AC-066.2: Given the exposure cap (for example 2 hours per day) is reached, When I request another task, Then 429 with the reset time.
- AC-066.3: Given I opt out, When I leave the project, Then my quality score and future invitations are not affected.

**US-067 Payout statement** (FR-255, FR-092) Phase 2
- AC-067.1: Given a closed period, When I open my statement, Then approved earnings, deductions and tax fields are shown; bank and ID numbers are masked.

**US-068 Authoring editor** (FR-123, FR-142) Phase 2
- AC-068.1: Given an SFT authoring task, When I write a response with markdown and code blocks, Then it is saved and rendered escaped in review.
- AC-068.2 (negative): Given a benchmark authoring task without a reference answer, When submitted, Then 422.

**US-069 Tiers** (FR-090) Phase 2
- AC-069.1: Given expert ops changes my tier, When saved, Then the change and reason are audited and visible in my profile history.

### A.4 Senior Reviewer

**US-070 Review queue** (FR-154, FR-160)
- AC-070.1: Given I filter by project and "too fast", When the queue loads, Then only matching items appear, oldest first.
- AC-070.2 (negative): Given I rated item I, When the queue is built, Then submissions on item I never appear for me, and a direct link returns 403 `coi_conflict`.

**US-071 Side-by-side review** (FR-155)
- AC-071.1: Given a submission, When I choose `accept_with_edit` and edit a score, Then the original submission is preserved and the edit is stored as a review.
- AC-071.2 (negative): Given `return_for_rework` or `reject` without feedback text, When I submit, Then 422.

**US-072 Blind adjudication** (FR-156, FR-153)
- AC-072.1: Given a task below the agreement threshold, When I open adjudication, Then submissions and rationales are shown without rater identities.
- AC-072.2 (negative): Given I am one of the raters, When I attempt to adjudicate, Then 403.
- AC-072.3 (negative): Given no reason code, When I submit adjudication, Then 422.
- AC-072.4: Given an adjudication, When saved, Then the task is `finalized` and all raw votes remain unchanged.

**US-073 Propose gold** (FR-150)
- AC-073.1: Given two senior reviewers agree on an answer, When the PM approves, Then the item becomes gold and is excluded from deliveries.
- AC-073.2 (negative): Given only one senior agreement and no customer key, When PM approval is attempted, Then 409.

**US-074 Rubric ambiguity** (FR-046, FR-158)
- AC-074.1: Given 6% of a batch's adjudications are coded `rubric_ambiguity`, When the threshold of 5% is crossed, Then the PM receives an escalation.

**US-075 Pre-delivery audit** (FR-161)
- AC-075.1: Given a project's first export, When it is requested, Then a 2% random sample must be re-reviewed by a senior reviewer who did not review those items before the export can be built.

**US-076 Re-adjudicate disputes** (FR-164) Phase 2
- AC-076.1: Given a disputed item, When I re-adjudicate, Then a new adjudication record is linked to the dispute and a superseding delivery version can be built without changing the original.

**US-077 Reviewer audit** (FR-163) Phase 2
- AC-077.1: Given a 5% audit rate, When 200 of my decisions are made, Then about 10 are sampled for peer re-review and my reviewer agreement is shown to the PM.

### A.5 Project Manager

**US-080 Quality configuration** (FR-022)
- AC-080.1: Given I set overlap 20%, gold 10%, review 10% and alpha threshold 0.667, When saved, Then values are stored and `quality_config.changed` is audited.
- AC-080.2 (negative): Given gold 40%, When saved, Then 422 (`out_of_range`, max 30%).
- AC-080.3 (negative): Given gold > 0 and fewer than max(20, 5% of batch) gold items, When launching, Then 409.

**US-081 Publish immutable rubric** (FR-042, FR-043, FR-045)
- AC-081.1: Given a complete draft, When I publish, Then the version is immutable and `rubric.version_published` is audited.
- AC-081.2 (negative, editing a published rubric): Given a published version, When anyone sends PATCH to it through the API or an UPDATE through the database, Then the API returns 409 `invalid_state_transition` and the database trigger rejects the update.
- AC-081.3 (negative): Given a scale point without an anchor, When I publish, Then 422 `rubric_incomplete`.
- AC-081.4: Given version 2 is published while tasks pinned to version 1 are in progress, When experts submit, Then those submissions validate against version 1.

**US-082 Record contracts** (FR-024)
- AC-082.1: Given I record NDA, DPA and SOW as active with document references, When saved, Then the project's contract status is active and the change is audited.

**US-083 Recommendations** (FR-100, FR-102)
- AC-083.1: Given a cardiology project, When I request recommendations, Then results are ranked with a reason string each (for example "verified cardiologist, 12 years, gold 92%, 15 h/week").
- AC-083.2: Given an expert with a declared conflict, missing consent or suspended status, When recommendations run, Then the expert is absent.

**US-084 Approve and invite** (FR-101, FR-280)
- AC-084.1: Given I approve 10 experts, When saved, Then 10 invitations are sent and assignments to tasks remain blocked until each expert accepts and qualifies.

**US-085 Estimate and capacity** (FR-025, FR-103)
- AC-085.1: Given volume, overlap and rate, When I request an estimate, Then a cost range, ETA and capacity are returned and stored as a snapshot.

**US-086 Calibration batch** (FR-118, FR-180)
- AC-086.1: Given a 30-item calibration set and 4 experts, When all submit, Then alpha with CI per criterion is computed and low-agreement items are listed.

**US-087 Dashboards** (FR-182, FR-183, FR-184)
- AC-087.1: Given a QA event, When 15 minutes pass, Then dashboards reflect it; if not, an ops alert fires.

**US-088 Flags and escalations** (FR-115, FR-158, FR-162, FR-281)
- AC-088.1: Given a flagged task, When I clear it, Then it returns to `in_progress` for the same expert; when I remove the item, Then it becomes `excluded` and the customer is notified.

**US-089 Probation and removal** (FR-159, FR-087)
- AC-089.1: Given an expert's rolling gold accuracy falls to 82%, When metrics update, Then the expert is proposed for probation and, after my confirmation, 100% of their work is reviewed.
- AC-089.2: Given accuracy falls below 70%, When I confirm, Then the expert is removed from the project and the history is preserved and reversible.

**US-090 Pause, resume, cancel** (FR-027)
- AC-090.1: Given an active project, When I pause, Then no new leases are issued and existing leases can complete.
- AC-090.2 (negative): Given a `completed` project, When I resume, Then 409.

**US-091 Exports on behalf** (FR-215 to FR-222)
- AC-091.1: Given I am staffed on the project, When I create an export, Then it is created and audited as created by staff on behalf of the customer.
- AC-091.2 (negative): Given I am not staffed on the project, When I create an export, Then 404.

**US-092 Build and release delivery** (FR-225, FR-205, FR-190, FR-227) Phase 2
- AC-092.1: Given validation passes, When I release, Then the delivery contains data files, manifest, datasheet and quality certificate, and `delivery.released` is audited.
- AC-092.2 (negative): Given any contribution lacks valid consent, When I build, Then the delivery is `validation_failed` with the list of offending items.

**US-093 Calibration program and tiering** (FR-090) Phase 2
- AC-093.1: Given an expert completes the cross-project calibration set, When scored, Then the result is stored and available to matching.

**US-094 Templates** (FR-031, FR-048) Phase 2
- AC-094.1: Given the preference template, When I create a project from it, Then quality settings and rubric draft are prefilled and editable.

### A.6 Ops / Finance and Expert Ops

**US-100 Usage and earnings CSV** (FR-250, FR-252)
- AC-100.1: Given a period, When I export, Then one row per accepted task appears with project, task type, rate and pseudonymous expert ID, and totals reconcile with the ledger.

**US-101 Earnings states** (FR-251)
- AC-101.1 (negative): Given a submission accepted with edit, When the ledger updates, Then it is paid in full by default; voiding is only possible from a `reject` verdict with a reason.

**US-102 Metadata-only finance views** (FR-003)
- AC-102.1 (negative): Given a finance user, When requesting item or submission content, Then 403.

**US-103 Rate within band** (FR-254)
- AC-103.1 (negative): Given an approved band of USD 20 to 30 per task, When a PM sets USD 35, Then 422.

**US-104 Bulk import** (FR-081)
- AC-104.1: Given a CSV of 200 existing profiles, When imported, Then valid rows create expert profiles with `pending` credentials and invalid rows are reported.

**US-105 Credential verification and KYC** (FR-082, FR-085)
- AC-105.1: Given a pending credential, When I verify it, Then status, verifier and date are stored and the customer-facing summary updates.

**US-106 Dual approval for network removal** (FR-087)
- AC-106.1 (negative): Given one approver, When network removal is requested, Then it remains pending until a different second approver approves.

**US-107 Payout report** (FR-255, FR-092) Phase 2
- AC-107.1: Given a closed period, When I generate the payout report, Then each expert has approved totals, tax fields (PAN or foreign forms) and payout status; field-encrypted values are decrypted only for finance roles.

### A.7 Platform Admin

**US-120 Create org with region** (FR-001, FR-013)
- AC-120.1: Given I create an org with region `ap-south-1`, When objects are uploaded for it, Then they are stored only in that region.

**US-121 Default-deny permissions** (FR-003, NFR-002)
- AC-121.1: Given a new endpoint without a permission declaration, When CI runs, Then the build fails.
- AC-121.2: Given the decision table, When unit tests run, Then every role and permission combination matches the matrix in `api_design.md`.

**US-122 Isolation test suite** (FR-117, NFR-003, NFR-004)
- AC-122.1 (negative, cross-tenant access denied): Given a user of org A, When they request any org B resource by ID on any endpoint, Then the response is 404 and an RLS-level test with `app.org_id = A` returns zero org B rows.
- AC-122.2: Given a new tenant table without RLS ENABLE and FORCE, When CI runs, Then the build fails.
- AC-122.3 (negative): Given the application role, When it attempts to bypass RLS, Then it is refused because it is NOBYPASSRLS.

**US-123 AI egress gate** (FR-030, NFR-009)
- AC-123.1 (negative): Given no project opt-in, When code calls an external AI endpoint with project data, Then the call is blocked by the gate and by default-deny network egress, and the attempt is audited.

**US-124 Hash-chained audit** (FR-265 to FR-268)
- AC-124.1: Given audit rows, When one row is modified directly in the database, Then chain verification reports the break.
- AC-124.2: Given a denied request, When it occurs, Then a denial event is recorded.
- AC-124.3: Given any audit row, When inspected, Then no item content, prompt or response text is present.

**US-125 Two-person deletion** (FR-269)
- AC-125.1 (negative): Given the requester is also the only approver, When approving, Then approval is refused.

**US-126 Staff IdP sign-in** (FR-009) Phase 1c
- AC-126.1: Given OQ-11 is resolved and OIDC is configured, When a staff member signs in, Then they authenticate through the company IdP and local password sign-in is disabled for staff.

**US-127 Ops alerts** (FR-282, FR-184)
- AC-127.1: Given the metrics job lags over 15 minutes or an export job fails 3 times, When detected, Then an alert reaches the on-call channel.

**US-128 C3 proxy** (FR-139, FR-135) Phase 1c
- AC-128.1: Given a C3 project, When an expert opens a task, Then content is streamed through the authenticated proxy with a burned-in watermark containing the expert pseudonym and session, and no presigned object URL appears in any response.

**US-129 Break-glass** (FR-014) Phase 2
- AC-129.1: Given a break-glass request, When a second admin approves, Then access is time-boxed, alerted and visible in the customer's audit view.

**US-130 Data principal rights** (FR-016) Phase 2
- AC-130.1: Given a request where Infollion is processor, When received, Then it is logged with a 90-day deadline and routed to the customer controller.

**US-131 Legal hold** (FR-272) Phase 2
- AC-131.1: Given a legal hold on a project, When the retention job runs, Then nothing in scope is deleted and the skip is audited.

---

## Part B: Workflow acceptance criteria

### Workflow 1: Customer creates an evaluation project (Phase 1)

- WF1-01: Given a customer admin and ML engineer, When they create a draft, upload items, draft a rubric, and the PM sets quality, records contracts, publishes the rubric and runs calibration, Then the customer can approve the rubric and launch to `active` without engineering intervention.
- WF1-02: Given any task created in the project, When inspected, Then it references a published rubric version.
- WF1-03: Given launch is attempted without active contracts or customer rubric approval, When called directly via API, Then the server returns 409 regardless of UI state.
- WF1-04: Given the estimate generated before launch, When the project completes, Then the stored estimate is available next to actual usage.
- WF1-05: Given each step, When the workflow completes, Then `project.created`, `batch.uploaded`, `batch.pii_scanned`, `rubric.version_created`, `rubric.version_published`, `rubric.version_approved`, `quality_config.changed`, `estimate.generated`, `project.calibration_started` and `project.launched` are queryable by project.
- WF1-06 (negative, editing a published rubric rejected): Given a published rubric version, When the ML engineer or PM attempts to change a criterion, Then 409 is returned, the version is unchanged, and the UI offers "create new version".
- WF1-07 (negative, cross-tenant access denied): Given a user of org B, When they request org A's project, batch, rubric or estimate by ID, Then each returns 404.
- WF1-08 (negative): Given an upload containing PII and a DPA that forbids it, When calibration is submitted, Then 422 `pii_blocked` until items are redacted or removed.

### Workflow 2: Expert evaluates outputs (Phase 1)

- WF2-01: Given a qualified expert with accepted addendum and no conflict, When they request the next task, Then a task is assigned within 2 seconds p95.
- WF2-02: Given an automated test with declared and detected conflicts, When allocation runs over 10,000 requests, Then no expert is assigned an item from a conflicted org.
- WF2-03: Given drafts in progress, When the browser refreshes or the network drops briefly, Then no work is lost and resubmission creates one submission.
- WF2-04: Given workload caps, When exceeded, Then the server refuses new tasks (429) regardless of client behavior.
- WF2-05: Given a submission, When stored, Then it links rubric version, expert ID, time spent, client metadata and AI-assist declaration, and `submission.created` and `content.accessed` are audited.
- WF2-06 (negative, expert without assignment denied): Given expert E has no active or submitted assignment on task T, When E requests T, its item, its objects or its submissions, Then the API returns 404 and the database RLS returns no rows for E.
- WF2-07 (negative, submission failing rubric validation): Given a submission missing a required criterion or with an explanation below minimum length, When posted, Then 422 with per-field errors, no submission row, no ledger entry and the draft retained.
- WF2-08 (negative): Given a lease has expired and the task has been reassigned, When the original expert submits, Then 409 `lease_expired`.
- WF2-09 (negative, expired signed URL): Given a C1 or C2 content URL issued to the workbench has expired, When the workbench loads content, Then storage refuses it and the workbench refetches the assignment, receiving a new URL only while the lease is active.

### Workflow 3: QA and adjudication (Phase 1, disputes and reviewer audit Phase 2)

- WF3-01: Given any finalized task, When inspected, Then it has a consensus record or an adjudication record, never neither.
- WF3-02: Given reviewers and adjudicators, When assignment of reviews runs, Then no reviewer or adjudicator is a rater on the same task (enforced and tested).
- WF3-03: Given a QA event, When 15 minutes pass, Then expert metrics reflect it.
- WF3-04: Given every `return_for_rework` and `reject`, When stored, Then written feedback exists and is visible to the expert.
- WF3-05: Given probation or suspension, When reversed, Then history is preserved.
- WF3-06: Given an overlapped task with alpha-based agreement below the project threshold, When it reaches `ready_for_qa`, Then it routes to adjudication; above threshold, Then it reaches consensus and enters sampling.
- WF3-07: Given a gold task, When submissions arrive, Then they are scored against the key, expert gold accuracy updates and the task is never delivered.
- WF3-08 (negative): Given a task already returned twice, When a reviewer returns it again, Then 409 and the task auto-escalates.
- WF3-09 (negative, cross-tenant access denied): Given a reviewer staffed only on project P1 of org A, When they open a review queue item from org B, Then 404.
- WF3-10 (Phase 2): Given a customer dispute, When filed, Then linked re-adjudication tasks are created and the original delivery is not overwritten.

### Workflow 4: Deliver training-ready data (Phase 1 exports, Phase 2 deliveries)

- WF4-01: Given a Phase 1 export, When loaded by a JSON Lines reader, Then there are zero schema errors against the published JSON Schema for its type.
- WF4-02: Given a manifest, When checksums are recomputed, Then they match.
- WF4-03: Given every download URL issuance, When it happens, Then it is audited with user, file and IP.
- WF4-04 (Phase 2): Given a delivery, When released, Then datasheet and quality report are present.
- WF4-05 (Phase 2): Given a dispute, When resolved with changes, Then a superseding version is released and the original remains retrievable.
- WF4-06 (negative, export of non-approved items blocked): Given an export request whose scope includes tasks not in `finalized` state, rejected items or gold items, When submitted, Then those items are excluded and listed with reasons; if the request explicitly names non-approved item IDs, Then 422 and no export is created.
- WF4-07 (negative, expired signed URL): Given a download URL older than its TTL (300 seconds default, 900 maximum), When used, Then storage returns 403; When the customer requests a new URL from the API with valid permission and step-up MFA, Then a fresh URL is issued and audited.
- WF4-08 (negative): Given a requested format incompatible with the task type, When requested, Then 422 and no conversion is attempted (ADR-016).
- WF4-09 (negative): Given rationales containing PII and a DPA that forbids it, When the export builds, Then it fails validation until redacted.
- WF4-10 (negative, cross-tenant access denied): Given a user of org B with a valid export ID from org A, When they request a download URL, Then 404.

### Workflow 5: Ongoing evaluation (Phase 3)

- WF5-01: Given a monitoring program, When the customer pushes items via API, Then a scorecard is published within SLA for at least 95% of cycles in a pilot.
- WF5-02: Given anchors rated each cycle, When a score drop coincides with anchor drift above the rater-drift threshold, Then the scorecard notes suspected rater drift and only the PM is alerted.
- WF5-03: Given a real regression (threshold exceeded, CI excludes zero, anchor drift below threshold), When the scorecard publishes, Then the customer receives an alert by the configured channel.
- WF5-04: Given automated tests with seeded production PII, When items are ingested, Then no unredacted PII reaches the workbench; items failing redaction are quarantined.
- WF5-05: Given cycle usage records, When reconciled, Then they match invoice line items.
- WF5-06 (negative): Given items exceeding `max_items_per_cycle`, When pushed, Then 429 `cycle_quota_exceeded` with the rejected count.
- WF5-07 (negative): Given an item without `model_version` or with a duplicate `trace_id`, When pushed, Then 422 or 409 respectively.
- WF5-08 (negative, cross-tenant access denied): Given an API key of org B, When it pushes to or reads scorecards of org A's program, Then 404.
- WF5-09: Given the cycle cannot complete by SLA, When the SLA time is reached, Then a partial scorecard is published stating coverage per criterion.

---

## Summary

| Part | Scope | Criteria |
|---|---|---|
| A | Phase 1 and 2 user stories (94 stories) | 185 |
| B | Workflows 1 to 5 | 46 |
| **Total** | | **231** |
