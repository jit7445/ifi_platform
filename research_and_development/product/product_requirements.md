# Product Requirements Document: Infollion Expert Evaluation and Training-Data Platform

Working name: Infollion Evals
Date: 2026-10-20
Status: Draft for stakeholder review
Owner: Product (synthesis of research, architecture and planning documents)

Sources: `planning/architecture_decisions.md` (ADRs, authoritative where documents conflict), `planning/mvp_scope.md`, `planning/implementation_roadmap.md`, `product/workflows.md`, `product/user_personas_and_roles.md`, `research/ai_training_and_evaluation.md`, `research/market_and_business_model.md`, `architecture/api_design.md`, `architecture/security_architecture.md` (SEC register), `research/nxted_research.md`, `research/appen_research.md`. `research/competitive_analysis.md` did not exist when this PRD was written; competitive inputs come from the Nxted and Appen reports.

Companion documents: `user_stories.md` (US IDs), `feature_prioritization.md` (MoSCoW and RICE), `acceptance_criteria.md` (Given/When/Then).

---

## 1. Problem statement

AI labs and enterprise AI teams need trustworthy judgments and data from credentialed domain experts (physicians, lawyers, chartered accountants, engineers, financial professionals) to decide whether a model is good enough to ship, to compare checkpoints, to calibrate automated judges, and to produce training data such as demonstrations and preference pairs. Today they face four problems:

1. **Opaque quality.** Vendors rarely name the agreement metric, the calibration process or how credentials were verified (Nxted research, section 7). Buyers cannot tell signal from noise.
2. **Wrong data shape.** Each training method consumes a specific shape of data; converting rubric scores into preference pairs, or treating "chosen" as "good", silently corrupts training (research `ai_training_and_evaluation.md` sections 1 and 4; ADR-016).
3. **Weak provenance and confidentiality.** Labs need to trace every label to an item, rubric version, qualified rater and QA decision, and need assurance that unreleased model outputs and customer prompts do not leak (ADR-010, ADR-017).
4. **No reusable workflow.** Open-source tools do not provide expert onboarding, conflict-of-interest checks, overlap assignment with leases, adjudication, human inter-rater reliability analytics, payouts and multi-tenant delivery; commercial tools gate these behind enterprise editions (ADR-006).

Infollion already operates a vetted expert network with compliance screening and payment rails. The product turns that network into a repeatable, measurable, auditable evaluation and data-creation service.

## 2. Goals

| ID | Goal | Measure |
|---|---|---|
| G-1 | Run a paid or co-funded expert evaluation pilot end to end on the platform | Pilot of at least 500 items completes with at least 20% overlap and at least 5% gold (MVP success criterion 1) |
| G-2 | Make quality measurable and visible | Krippendorff's alpha with CI shown per criterion with overlap; items below threshold adjudicated before export (MVP criterion 3) |
| G-3 | Full provenance | 100% of delivered labels traceable to item hash, rubric version, submission, expert pseudonym and QA decision (MVP criterion 2) |
| G-4 | Tenant and assignment isolation | Zero cross-tenant or cross-assignment access in the CI test suite at API and RLS level (MVP criterion 4; SEC-025) |
| G-5 | Self-service delivery | Customer downloads a validated export and quality report without staff intervention (MVP criterion 5) |
| G-6 | Typed, loader-ready datasets | Phase 2 exports load with `datasets.load_dataset` and TRL loaders in CI; re-export yields identical hashes |
| G-7 | Repeatable evaluation | Phase 3: customer re-runs a frozen benchmark on a new model version and sees per-criterion regression with CIs |

## 3. Non-goals

1. **Infollion does not train models.** The platform produces human evaluations, evaluation datasets, benchmarks and training data. Customers run SFT, DPO, reward modeling or RL themselves. The platform must understand training formats only so that its deliverables load correctly (`mvp_scope.md`; research section 2).
2. No automatic conversion between deliverable types (ADR-016). For example, rubric scores are never turned into preference pairs by the platform.
3. No customer data sent to third-party AI services without an explicit, recorded, per-project opt-in naming the provider (ADR-014).
4. No physical AI capture in Phases 1 to 4 (ADR-015). Only extension points are reserved.
5. No general-purpose crowd marketplace or commodity labeling; the product is built around vetted, credentialed experts.
6. No building of image, audio or video editors in-house; Label Studio Community is the Phase 3 candidate (ADR-008).
7. No dependency on Argilla, and no hosting of Elastic-2.0 or BSL tools for third parties (ADR-008 licensing guardrails).
8. Phase 1 excludes enterprise SSO and SCIM, automated payouts, invoicing, model API connectors, LLM-as-a-judge and multimodal work (`mvp_scope.md` out-of-scope list).

## 4. Target customers

| Segment | Need | First packages | Evidence |
|---|---|---|---|
| Frontier and mid-size model labs | Expert preference data, SFT, private benchmarks, red-teaming, judge calibration | Preference, Benchmark, SFT, Red-team | Market report sections 1 and 5 |
| AI startups building domain copilots (health, legal, finance, tax) | Trustworthy domain evaluation before launch | Expert Evaluation Pilot, then Monitoring | Package 5.1 |
| Enterprise AI teams in regulated sectors (BFSI, healthcare) in India and abroad | Evaluation with residency, DPDP alignment, audit evidence | Pilot, Red-team, Monitoring | Personas 2.1; security research |
| Evaluation and agent-tooling startups | Task suites, human baselines, trajectory grading | Agent Evaluation (Phase 3) | Package 5.7 |
| Robotics and VLA teams (future) | Skilled-task demonstrations | Physical AI (Phase 5, gated) | Package 5.9; ADR-015 |

Differentiation (from Nxted and Appen takeaways): verifiable senior-expert credentials, published methodology (named agreement metric, calibration and gold process), India-native compliance with Indic-language and India-specific regulatory domains, and quality artifacts shipped with every delivery.

## 5. Service tracks

### 5.1 Track A: Expert evaluation and training data (Phases 1 to 4)

| Package (market report section) | Deliverable type(s) (ADR-016) | Platform phase | Notes |
|---|---|---|---|
| 5.1 Expert Evaluation Pilot | Rubric-scored items, pairwise judgments, quality report | 1 | Entry offer; 20 to 30% overlap, 10% gold recommended |
| 5.4 Preference Data Collection | Preference pairs with strength, tie, both-bad and absolute acceptability | 1 (pairwise), 2 (ranking k > 2) | Llama 2 style degree labels |
| 5.3 SFT Dataset Creation | SFT conversations | 1 (from accepted corrections), 2 (authoring tasks) | Correction path ships in MVP export |
| 5.2 Domain Benchmark Creation | Benchmark items, gold QA, grading rubrics | 2 | Two-expert validation; model difficulty check manual in Phase 2, automated via connectors in Phase 3 |
| 5.5 AI Red-Teaming | Red-team items with hazard, verdict, severity | 2 (transcripts and expert-authored attacks), 3 (live sandboxed endpoint) | Wellbeing controls and restricted workspace |
| 5.6 Ongoing Model-Quality Monitoring | Scorecards, alerts, anchor drift | 3 | Workflow 5 |
| 5.7 AI Agent Evaluation | Agent trajectories, task suites | 3 | Inspect AI integration |
| 5.8 Multimodal Annotation | Multimodal annotations | 3 | Label Studio integration |

### 5.2 Track B: Physical AI data collection (Phase 5, gated)

Deferred per ADR-015. Gate (all required): paying Track A customers, a co-funded robotics pilot, counsel sign-off on consent (including biometric data), worker welfare and cross-border transfer, and capture operations staffing. Extension points reserved from Phase 1: item schema registry, media storage kind, consent records, exporter registry (LeRobot, RLDS, HDF5), C4 classification.

---

## 6. Functional requirements

Phase key: 1 Evaluation MVP, 2 Dataset delivery, 3 Integrations and advanced evaluation, 4 Enterprise, 5 Physical AI (gated). "1c" means Phase 1 conditional on a stated trigger. IDs are grouped in numeric blocks per module; gaps are intentional so new requirements can be added without renumbering.

### 6.1 Accounts and access (FR-001 to FR-019)

| ID | Requirement | Phase |
|---|---|---|
| FR-001 | Platform staff create customer organizations and the internal Infollion organization, each with a data region (default `ap-south-1`) and default data classification (C2). | 1 |
| FR-002 | Customer admins and staff invite users by email with a role; invitations expire after 7 days and are single use. | 1 |
| FR-003 | Roles `customer_admin`, `customer_member`, `expert`, `reviewer`, `project_manager`, `internal_org_admin`, `platform_operator` with the permission matrix in `api_design.md` section 2; default deny; finance roles see metadata only, never task content. | 1 |
| FR-004 | Email and password sign-in with Argon2id hashing, breached-password check, throttling and lockout (SEC-003). | 1 |
| FR-005 | TOTP MFA is mandatory for every human account and is enrolled at first sign-in (ADR-005, SEC-001). | 1 |
| FR-006 | Step-up MFA is required for export creation and download, API key creation, role changes, payout detail changes and expert identity reveal (SEC-005). | 1 |
| FR-007 | Sessions use a 15-minute access JWT and a rotating refresh token in an httpOnly, Secure, SameSite cookie; users and admins can revoke sessions; idle and absolute limits per SEC-004. | 1 |
| FR-008 | Customer admins create org API keys that are scoped, hashed at rest, expiring, revocable and optionally IP allow-listed (SEC-007); experts and staff cannot use API keys. | 1 |
| FR-009 | Infollion staff sign in through the company IdP via OIDC once OQ-11 is resolved; until then staff use password plus TOTP (ADR-005). | 1c |
| FR-010 | Customer SSO (SAML and OIDC) and SCIM provisioning (SEC-008; ADR-005 revisit trigger OQ-04). | 4 |
| FR-011 | Passkeys as an additional second factor (ADR-005 "passkeys later"). | 2 |
| FR-012 | Staff (PMs, reviewers) access only projects they are staffed on (SEC-024). | 1 |
| FR-013 | Each organization records data region, default retention and default classification; storage region must equal the org data region. | 1 |
| FR-014 | Break-glass access and time-boxed impersonation with two-person approval, alerting and customer-visible audit (SEC-074). | 2 |
| FR-015 | Experts are shown to customers by pseudonymous ID plus verified credential summary; named disclosure is a per-project setting requiring expert consent; experts see a blinded customer alias by default (ADR-013, Proposed). | 1 |
| FR-016 | Data principal rights intake (access, correction, erasure, grievance) with routing to the controller where Infollion is processor (SEC-115). | 2 |

### 6.2 Projects (FR-020 to FR-039)

| ID | Requirement | Phase |
|---|---|---|
| FR-020 | Create a draft project with name, package type, domain(s), languages (BCP 47), task type, difficulty, volume, deadline, deliverable format, overlap %, gold %, review %. Name unique within org. | 1 |
| FR-021 | Project lifecycle `draft`, `submitted`, `in_review`, `active`, `paused`, `completed`, `cancelled` (`mvp_scope.md`). A `stage` attribute (`calibration`, `production`) and launch preconditions represent the finer workflow states (scoping review, awaiting contracts, calibration, rubric revision) from `workflows.md` Workflow 1. Invalid transitions return 409. | 1 |
| FR-022 | Quality configuration per project: overlap 0 to 100%, gold 0 to 30%, review 0 to 100%, agreement threshold (defaults per ADR-009), gold accuracy thresholds, max rework cycles. Customers see defaults; non-default values are PM-only. | 1 |
| FR-023 | Data classification per project (C1 to C3; default C2) stored on project and items and propagated to object tags and audit events; cannot be lowered below project level except by customer admin with audit (SEC-010, SEC-012). C4 reserved for Track B. | 1 |
| FR-024 | Contract gating: PM records NDA, DPA and SOW status with document references and effective dates; launch requires all required contracts active. E-signature integration is Phase 4. | 1 |
| FR-025 | Cost and turnaround estimate (volume x overlap x rate, expert capacity) stored as a snapshot for later variance tracking. | 1 |
| FR-026 | Launch requires: contracts active, rubric version published by PM and approved by customer, budget cap set, and estimated qualified capacity at least the SLA throughput (PM override with written reason). Launch is performed by a customer admin. | 1 |
| FR-027 | Pause, resume and cancel with audit; pause stops new leases and lets in-flight leases finish or expire. | 1 |
| FR-028 | Blind-customer flag hides customer identity from experts; rater-identity-disclosed flag (default off). | 1 |
| FR-029 | Usage rights per project and item (`eval_only`, `training_permitted`) recorded at creation and carried into every export (research section 2). | 1 |
| FR-030 | Third-party AI setting per project, default off; enabling requires a recorded customer authorization naming the provider; an `ai_egress` gate blocks all calls otherwise and audits every decision (ADR-014, SEC-090, SEC-091). Phase 1 ships the gate in "block all" mode; authorized routing is Phase 3. | 1 |
| FR-031 | Project templates per package (pilot, preference, SFT, benchmark, red-team) with recommended quality settings. | 2 |

### 6.3 Rubrics (FR-040 to FR-059)

| ID | Requirement | Phase |
|---|---|---|
| FR-040 | Rubric versions contain criteria of type scale (with an anchor description per point), binary, categorical and free text, each with weight, required flag, explanation-required flag (with minimum length) and correction-required flag. | 1 |
| FR-041 | Each rubric version carries an error taxonomy (code, label, description, severity). | 1 |
| FR-042 | Draft versions are editable. Publishing makes a version immutable (database trigger); any change creates a new version (ADR-010). | 1 |
| FR-043 | Publish validation: at least one criterion; every scale point anchored; weights valid; explanation minimum length set when required. Failures return 422 `rubric_incomplete`. | 1 |
| FR-044 | Customer approval of a published rubric version is recorded before launch. PM publishes; customer admin or authorized ML engineer approves. | 1 |
| FR-045 | Every task is pinned to one published rubric version; new versions apply only to newly generated tasks; in-flight tasks keep their version unless the PM reissues them. | 1 |
| FR-046 | Rubric clarifications (non-scoring guidance notes) can be published to experts without a new version and are shown in the workbench and feedback inbox; scoring changes always need a new version. | 1 |
| FR-047 | Comment threads on rubric versions for reviewers and customer ML engineers; ML engineers propose drafts. | 2 |
| FR-048 | Rubric template library by domain and package. | 2 |
| FR-049 | Side-by-side diff between rubric versions. | 2 |
| FR-050 | Signed point values (for example -10 to +10) on atomic criteria for rubric-as-reward deliverables (HealthBench pattern). | 2 |
| FR-051 | LLM-grader dry run of a rubric with expert-versus-grader agreement shown before release; subject to ADR-014 opt-in. | 3 |

### 6.4 Ingestion (FR-060 to FR-079)

| ID | Requirement | Phase |
|---|---|---|
| FR-060 | Upload JSONL and CSV directly to object storage via presigned URLs with server-generated keys under `orgs/{org_id}/...`; multipart and resumable for large files (ADR-011). | 1 |
| FR-061 | Field mapping to the item schema: prompt, optional context and system message, one or more responses each with model label and version, metadata, optional reference answer. | 1 |
| FR-062 | Row-level validation report: UTF-8, required fields, max payload size, duplicate content hashes flagged; the customer chooses to accept valid rows or reject the batch. | 1 |
| FR-063 | Upload quarantine, antivirus scan, type, size, magic-byte and archive-depth checks before ingestion (SEC-080, SEC-104). | 1 |
| FR-064 | In-house PII scan (self-hosted Presidio with India recognizers; SEC-081) with a per-project policy: block, redact or allow as the DPA permits. Blocked items never reach experts. | 1 |
| FR-065 | Every ingestion produces a new dataset version; items are content-addressed with sha256 (ADR-010). | 1 |
| FR-066 | Ingestion through the customer API with org API keys and `Idempotency-Key`. | 1 |
| FR-067 | PII detector hits automatically raise item classification to C3 (SEC-011). | 2 |
| FR-068 | Parquet ingestion. | 2 |
| FR-069 | Ingestion from a customer bucket using a customer-provided role. | 3 |
| FR-070 | Multimodal items (image, audio, video, document) as media objects. | 3 |
| FR-071 | Agent trajectory item schema (actions, observations, tool calls, outcome). | 3 |
| FR-072 | Physical AI episode schemas registered through the item schema registry. | 5 |

### 6.5 Experts (FR-080 to FR-099)

| ID | Requirement | Phase |
|---|---|---|
| FR-080 | Expert profile: domains and sub-domains, skills, languages, seniority and years of practice, availability in hours per week, time zone. | 1 |
| FR-081 | Expert ops import existing Infollion expert profiles in bulk. | 1 |
| FR-082 | Credentials with verification status (unverified, pending, verified, rejected), verifier and date; a credential summary is derived for customer display. | 1 |
| FR-083 | Conflict-of-interest declarations (organizations, employers) maintained by the expert and by expert ops. | 1 |
| FR-084 | Versioned consent records (Expert Services Agreement with NDA and IP assignment, project confidentiality addendum); assignment is gated on accepted current versions (SEC-130, SEC-151). | 1 |
| FR-085 | KYC status recorded at onboarding (SEC-006); liveness re-check for C3 is Phase 2. | 1 |
| FR-086 | Project qualification test built from gold items with a pass mark (default 80%). | 1 |
| FR-087 | Probation, removal from project, network suspension and reinstatement with preserved history; network removal requires a second approver. | 1 |
| FR-088 | Server-enforced workload caps per expert (default 6 h/day, 30 h/week, configurable). | 1 |
| FR-089 | Expert home: invitations, projects, own quality metrics, feedback, earnings ledger. | 1 |
| FR-090 | Expert tiers (T1 to T4), calibration program across projects and tier changes by expert ops with audit. | 2 |
| FR-091 | Wellbeing controls for harmful-content projects: content warnings, exposure time caps and opt-out without penalty. | 2 |
| FR-092 | Expert tax and bank details (PAN, GSTIN, foreign tax forms) with field-level encryption (SEC-052). | 2 |

### 6.6 Matching (FR-100 to FR-109)

| ID | Requirement | Phase |
|---|---|---|
| FR-100 | Ranked expert recommendations scoring domain match, language, credential verification, calibration or gold accuracy and availability, each with a human-readable reason string. | 1 |
| FR-101 | PM approves recommended experts onto a project; the system sends invitations; experts accept the project addendum and take qualification. | 1 |
| FR-102 | Hard exclusions before ranking: declared or detected conflict with the customer org, missing consents, unverified credentials when the project requires verification, suspended status. | 1 |
| FR-103 | Capacity check of qualified, approved expert hours against required throughput. | 1 |
| FR-104 | Configurable ranking weights with the recommendation explanation stored for audit. | 2 |
| FR-105 | Project country allow-list and anonymizing-proxy blocking for C3 projects (SEC-038). | 2 |
| FR-106 | Stable pool designation and continuity tracking for monitoring programs. | 3 |

### 6.7 Tasks (FR-110 to FR-129)

| ID | Requirement | Phase |
|---|---|---|
| FR-110 | Generate tasks per item and pinned rubric version; Phase 1 task types: `rate` (single response) and `compare` (pairwise). | 1 |
| FR-111 | Overlap creates k assignments on selected tasks; an expert never receives the same item twice. | 1 |
| FR-112 | Gold tasks are indistinguishable from normal tasks in the expert UI and API. | 1 |
| FR-113 | Experts pull the next task and receive a lease (default 60 minutes, configurable per task type); expired leases return the task to the pool. | 1 |
| FR-114 | Allocation honors qualification, rubric version, conflicts, workload caps and overlap rules. | 1 |
| FR-115 | Experts can release a task or flag it (PII found, harmful content, unclear rubric, out of expertise); flags put the task on hold for PM review. | 1 |
| FR-116 | Task state machine per `workflows.md` Workflow 3 (open, collecting, ready_for_qa, consensus, adjudication, sampled_review, rework, escalated, finalized, excluded, delivered, disputed). | 1 |
| FR-117 | Item content is readable by an expert only within an active lease or the edit window of their own submission; enforced by application checks and assignment-scoped RLS (ADR-017, SEC-023, SEC-030). | 1 |
| FR-118 | Calibration task set: 20 to 50 items rated by 3 to 5 experts each before production. | 1 |
| FR-119 | Correction capture on rate and compare tasks (corrected ideal answer) feeding SFT export. | 1 |
| FR-120 | Queue ordering by priority and SLA. | 2 |
| FR-121 | Ranking tasks (k > 2 responses). | 2 |
| FR-122 | Red-team tasks with hazard category, attack technique, verdict (full refusal, safe partial, unsafe compliance), severity and over-refusal flag. | 2 |
| FR-123 | Authoring tasks: SFT demonstrations and benchmark items with reference answer, grading rubric, independent second-expert validation and recorded difficulty check. | 2 |
| FR-124 | Agent trajectory grading tasks (step-level and outcome-level). | 3 |
| FR-125 | Multimodal annotation tasks via Label Studio with Infollion's own assignment layer (ADR-008). | 3 |

### 6.8 Expert workbench (FR-130 to FR-149)

| ID | Requirement | Phase |
|---|---|---|
| FR-130 | Rubric form generated from the pinned rubric version for single-response scoring. | 1 |
| FR-131 | Pairwise comparison capturing choice (A, B, tie), preference strength (significantly better, better, slightly better, negligibly better or unsure), both-bad flag and per-response absolute acceptability (ADR-016). | 1 |
| FR-132 | Error labels from the taxonomy, explanation text and corrected answer fields according to rubric flags. | 1 |
| FR-133 | Client-side validation plus authoritative server-side validation against the pinned rubric version; failures return 422 with per-field errors. | 1 |
| FR-134 | Autosave drafts (encrypted at rest) that survive refresh and short network loss; submit is idempotent. | 1 |
| FR-135 | Content protection: visible per-session watermark (SEC-032), configurable copy, print and drag friction (SEC-034), strict CSP without third-party scripts (SEC-033), escaped rendering and sandboxed HTML (SEC-100). | 1 |
| FR-136 | Time-on-task capture; submissions below the plausible minimum are accepted but routed to 100% review; straight-lining and paste heuristics produce a risk score, not an automatic rejection. | 1 |
| FR-137 | Pairwise response order randomized per assignment and the presented order recorded (position-bias control). | 1 |
| FR-138 | Keyboard-first operation and shortcuts. | 1 |
| FR-139 | C3 content streamed through an authenticated proxy with burned-in watermark, never as a raw object URL (ADR-017, SEC-046). Required in Phase 1 only for C3 projects that need it; mandatory before any C4 data. | 1c |
| FR-140 | Feedback inbox with reviewer feedback, gold results and rubric clarifications. | 1 |
| FR-141 | AI-assist declaration on every submission, stored in the contribution ledger (SEC-131). | 1 |
| FR-142 | Ranking, red-team and authoring editors (markdown and code blocks). | 2 |
| FR-143 | Trajectory viewer for long agent traces. | 3 |

### 6.9 Quality assurance (FR-150 to FR-179)

| ID | Requirement | Phase |
|---|---|---|
| FR-150 | Gold items are created from a customer key or two senior reviewer agreements, approved by the PM, and retired after repeated exposure. | 1 |
| FR-151 | Gold scoring per submission with per-criterion tolerance rules; rolling gold accuracy per expert over the last 50 gold items. | 1 |
| FR-152 | Agreement per overlapped task and criterion; auto-consensus when agreement meets threshold (majority for nominal, median for ordinal, mean for interval, as configured). | 1 |
| FR-153 | Tasks below the agreement threshold go to the adjudication queue. | 1 |
| FR-154 | Sampled review at the project review rate; 100% review for experts on probation, too-fast submissions and risk-flagged submissions. | 1 |
| FR-155 | Review verdicts `accept`, `accept_with_edit`, `return_for_rework`, `reject`; written feedback mandatory for rework and reject and visible to the expert. | 1 |
| FR-156 | Adjudication is blind to rater identity, performed by someone who is not a rater on the task and at Tier 3 or above (configurable), with mandatory reason code (`rubric_ambiguity`, `expert_error`, `item_defect`, `genuine_subjectivity`) and final answer; raw votes are never overwritten. | 1 |
| FR-157 | Maximum two rework cycles per task (configurable), then automatic escalation. | 1 |
| FR-158 | Escalations: rubric ambiguity above 5% of a batch alerts the PM to clarify or version the rubric; confirmed item defects move items to `excluded` with customer notification. | 1 |
| FR-159 | Expert thresholds: rolling gold accuracy below 85% puts the expert on probation with 100% review; below 70% removes the expert from the project; PM confirms. | 1 |
| FR-160 | Reviewers cannot review their own submission or any submission on an item they rated; reviewer COI excludes items automatically. | 1 |
| FR-161 | Pre-delivery audit: a 2% random sample re-reviewed by a different senior reviewer before the first delivery on any project. | 1 |
| FR-162 | Expert "missed PII" flag and PM sampling QA of redaction (SEC-083). | 1 |
| FR-163 | Reviewer audit: a default 5% of reviewer and adjudicator decisions re-reviewed by another senior reviewer; reviewer agreement tracked. | 2 |
| FR-164 | Customer disputes on delivered items create linked re-adjudication tasks and a superseding version without overwriting the original. | 2 |
| FR-165 | Optional LLM-assisted pre-review, advisory only and opt-in (ADR-014). | 3 |
| FR-166 | Judge calibration: judge-versus-expert agreement per category on a stratified sample, with order-swap and length-padding bias probes. | 3 |

### 6.10 Metrics and reporting (FR-180 to FR-199)

| ID | Requirement | Phase |
|---|---|---|
| FR-180 | Agreement engine: Krippendorff's alpha (nominal, ordinal or interval per criterion) as primary with bootstrap 95% CI, item and rater counts; raw percent agreement always shown alongside (ADR-009). | 1 |
| FR-181 | Companion metrics per ADR-009: Cohen's kappa (fixed pairs), Fleiss' kappa (fixed rater count), ICC (continuous scores, model and form stated), Kendall's W (rankings). | 2 |
| FR-182 | Project dashboard for customers and PMs: progress, throughput, per-criterion score distributions, model comparison, agreement, gold accuracy (aggregate), error taxonomy counts, budget burn, SLA risk, staleness timestamp. | 1 |
| FR-183 | Expert quality dashboard (staff; experts see their own): gold accuracy, agreement with final labels, review pass rate, trend, probation status. | 1 |
| FR-184 | Metrics refresh within 15 minutes of QA events; ops alert when lag exceeds 15 minutes. | 1 |
| FR-185 | Downloadable quality report (HTML, PDF) per project or batch: methodology, agreement, gold accuracy, error taxonomy, exclusions with reasons. | 1 |
| FR-186 | Model scores by domain and task type with CIs; win rate with tie rate for pairwise. | 1 |
| FR-187 | Metric runs are reproducible: inputs, code version and random seed stored with each run. | 1 |
| FR-188 | Safety failure and over-refusal rates by hazard category. | 2 |
| FR-189 | Coverage and diversity metrics per stratum (domain, task type, language, difficulty). | 2 |
| FR-190 | Batch quality certificate shipped with every delivery. | 2 |
| FR-191 | Customer disagreement explorer: votes and rationales per item with pseudonymous raters. | 2 |
| FR-192 | Regression comparison between model versions with per-criterion deltas and CIs. | 3 |

### 6.11 Datasets (FR-200 to FR-214)

| ID | Requirement | Phase |
|---|---|---|
| FR-200 | Dataset versions are immutable once frozen (database trigger) and carry a manifest sha256 and provenance (ADR-010). | 1 |
| FR-201 | Each export snapshot automatically freezes a dataset version of the finalized items it contains. | 1 |
| FR-202 | Usage-rights enforcement: `eval_only` items never enter training-format exports; items are never reused across customers. | 1 |
| FR-203 | Curation: derive versions by filters (task status, final source, minimum agreement, exclude gold, exclude labels) with seeded splits. | 2 |
| FR-204 | Diff between dataset versions (added, removed, changed labels). | 2 |
| FR-205 | Datasheet or dataset card per frozen version: purpose, collection process, aggregated expert profile, QA methodology, metrics, limitations, licence and IP terms matching the SOW. | 2 |

### 6.12 Exports and delivery (FR-215 to FR-234)

| ID | Requirement | Phase |
|---|---|---|
| FR-215 | Evaluation results JSONL: per item final labels, per-criterion scores, explanation (optional), consensus method, agreement statistics, rubric version, pseudonymous rater IDs (optional), timestamps. | 1 |
| FR-216 | SFT JSONL (`messages`) built only from accepted corrected answers. | 1 |
| FR-217 | Preference pairs JSONL (prompt, chosen, rejected, strength, tie, both-bad, absolute acceptability) with filters `min_strength` and `drop_ties`. | 1 |
| FR-218 | Every export has a manifest: file list, row counts, sha256 per file and item, rubric version, submission IDs, pseudonymous expert IDs, QA status, schema version (ADR-010). | 1 |
| FR-219 | Only finalized, QA-approved items are exportable; gold items are excluded; excluded items are listed with reasons. Requests including other items are rejected. | 1 |
| FR-220 | Typed exporters per deliverable type; the requested format must match the project task type; no implicit conversion (ADR-016). | 1 |
| FR-221 | Downloads via short-lived presigned URLs (TTL 5 minutes default, 15 maximum) issued after step-up MFA, audited per issuance, rate limited (30 per minute per user), export objects expire after 30 days (ADR-011, SEC-045, SEC-049). | 1 |
| FR-222 | PII re-scan of rationales and corrections before export; block unless the DPA allows. | 1 |
| FR-223 | Parquet and Hugging Face `datasets` export; TRL preference, unpaired (KTO) and prompt-only formats; OpenAI SFT and DPO formats; CI loader tests. | 2 |
| FR-224 | Exporters for ranking, red-team, benchmark, gold QA and rubric-scored items. | 2 |
| FR-225 | Deliveries: PM builds, validates and releases; customer accepts or disputes; auto-accept after N days; corrected versions supersede without overwriting. | 2 |
| FR-226 | Reproducible re-export yields identical file and manifest hashes. | 2 |
| FR-227 | Signed provenance manifest; export blocked if any contribution lacks valid rights or consent (SEC-132, SEC-133). | 2 |
| FR-228 | Incremental results API with cursor. | 2 |
| FR-229 | Push deliveries to a customer bucket via customer-provided role. | 3 |
| FR-230 | Agent trajectory and multimodal exporters. | 3 |
| FR-231 | LeRobot, RLDS and HDF5 exporters. | 5 |

### 6.13 Ongoing evaluation (FR-235 to FR-249)

| ID | Requirement | Phase |
|---|---|---|
| FR-235 | Monitoring programs with cadence, SLA hours, max items per cycle (budget guard) and anchor set. | 3 |
| FR-236 | API ingestion per program with mandatory `model_version`, `trace_id` deduplication and mandatory PII redaction unless the DPA permits raw processing. | 3 |
| FR-237 | Cycle state machine and scheduler per Workflow 5 (scheduled, ingesting, in_evaluation, qa, scoring, published, alerted, acknowledged, sla_breach_risk, partial_published). | 3 |
| FR-238 | Anchor sets of at least 20 items rated by at least 3 pool members every cycle; rater drift detection per expert and pool. | 3 |
| FR-239 | Scorecards per criterion by model version and cycle with CIs, sample size and error taxonomy trends. | 3 |
| FR-240 | Regression alerts fire only when the change exceeds threshold, the CI excludes zero and anchor drift is below the rater-drift threshold; otherwise the scorecard notes suspected rater drift and alerts the PM only. | 3 |
| FR-241 | Model endpoint connectors (OpenAI-compatible and customer-hosted) with SSRF protection and per-tenant credentials (SEC-095) to re-run frozen benchmarks. | 3 |
| FR-242 | Langfuse adapter behind `eval_engine` (traces in, scores out); Infollion stays system of record for human judgments (ADR-007). | 3 |
| FR-243 | Inspect AI integration for agent tasks and human baselines. | 3 |
| FR-244 | Opt-in LLM-as-a-judge pre-scoring with human calibration sets; judge-human agreement reported for every judge (ADR-014). | 3 |
| FR-245 | Partial scorecard at SLA with coverage stated when the cycle cannot complete. | 3 |

### 6.14 Billing and payouts (FR-250 to FR-264)

| ID | Requirement | Phase |
|---|---|---|
| FR-250 | Usage records per accepted task (and per monitoring cycle from Phase 3). | 1 |
| FR-251 | Earnings ledger per assignment with states `pending_qa`, `approved`, `on_rework`, `void`; void only for `reject` with documented reason; `accept_with_edit` paid in full by default. | 1 |
| FR-252 | Usage and earnings CSV export for finance; invoicing and payouts run in existing Infollion processes in Phase 1. | 1 |
| FR-253 | Budget cap enforcement: no new leases once committed cost reaches the cap; PM and customer admin notified at 80% and 100%. | 1 |
| FR-254 | Per-project task rate set by PM within a finance-approved band. | 1 |
| FR-255 | Payout report per expert per period with tax fields and payout status. | 2 |
| FR-256 | Rate cards managed by finance per package and tier. | 4 |
| FR-257 | Usage-based invoicing with GST. | 4 |
| FR-258 | Payouts integration. | 4 |
| FR-259 | Customer self-serve billing and payments. | 4 |
| FR-260 | SLA reporting per contract. | 4 |

### 6.15 Audit, retention and compliance (FR-265 to FR-279)

| ID | Requirement | Phase |
|---|---|---|
| FR-265 | Append-only audit events for authentication, project, rubric publish, assignment, submission, review, adjudication, export, download URL issuance and denied authorization decisions; IDs and hashes only, never content payloads (SEC-061). | 1 |
| FR-266 | Audit table hash chain (SEC-060). | 1 |
| FR-267 | Content access events per item view (item ID, expert ID, timestamp) for leakage investigation. | 1 |
| FR-268 | Staff audit query by project, actor, event type and time range. | 1 |
| FR-269 | Retention engine with defaults from `security_architecture.md` section 9; deletion workflow with two-person approval, verification and deletion certificate (SEC-110 to SEC-112). | 1 |
| FR-270 | Customer admin audit view and API for their own tenant (SEC-064). | 2 |
| FR-271 | Per-project data-handling summary: region, retention, classification, who accessed. | 2 |
| FR-272 | Legal hold overriding deletion with audit (SEC-114). | 2 |
| FR-273 | Audit log export and external anchoring of the hash chain to an Object Lock bucket. | 4 |
| FR-274 | Customer-configurable retention and per-tenant KMS crypto-shredding on offboarding (SEC-113). | 4 |

### 6.16 Notifications (FR-280 to FR-289)

| ID | Requirement | Phase |
|---|---|---|
| FR-280 | Transactional email: invitations, MFA enrolment, password reset, project status changes, expert project invitations, rework and feedback, budget thresholds. | 1 |
| FR-281 | In-app notification center for experts, reviewers and PMs (rework, feedback, clarifications, escalations, flags). | 1 |
| FR-282 | Ops alerts: metrics lag over 15 minutes, SLA risk, export or ingestion job failures. | 1 |
| FR-283 | Customer webhooks signed with HMAC (`Infollion-Signature`), retried for 24 hours with dead-letter visible in UI; events per `api_design.md` section 6. | 2 |
| FR-284 | User notification preferences. | 2 |
| FR-285 | Monitoring alert channels (email, webhook, Slack via webhook). | 3 |

FR count: 194 requirements across 16 modules (Phase 1: 115 plus 2 conditional; Phase 2: 42; Phase 3: 25; Phase 4: 8; Phase 5: 2).

---

## 7. Non-functional requirements

### 7.1 Security (references SEC register in `architecture/security_architecture.md` section 18)

| ID | Requirement | SEC IDs | Phase |
|---|---|---|---|
| NFR-001 | Every human account uses a second factor; passwords Argon2id with breached-password check; session controls; step-up MFA for sensitive actions. | SEC-001, SEC-003, SEC-004, SEC-005 | 1 |
| NFR-002 | Central policy module with default deny and decision-table unit tests. | SEC-020 | 1 |
| NFR-003 | RLS ENABLE and FORCE on every tenant table, `app_rw` NOBYPASSRLS, RESTRICTIVE actor-kind, assignment-scoped and project-scope policies, CI check that new tables have RLS. | SEC-021 to SEC-024; ADR-003, ADR-017 | 1 |
| NFR-004 | Cross-tenant and cross-assignment integration test suite covering every endpoint runs in CI and blocks merge on failure. Cross-tenant reads return 404, not 403. | SEC-025 | 1 |
| NFR-005 | Operator bypass role used only by operator endpoints and always audited. | SEC-026 | 1 |
| NFR-006 | Expert workspace controls: leasing, per-expert view rate limits with alerts, visible watermark, CSP and Trusted Types, copy friction. | SEC-030 to SEC-034 | 1 |
| NFR-007 | Storage: Block Public Access, versioning, deny non-TLS and unencrypted PUT; presigned URLs signed by short-session role, signatures stripped from logs, no PII in keys. | SEC-041, SEC-045, SEC-047, SEC-048 | 1 |
| NFR-008 | Encryption: TLS 1.2+ and HSTS; RDS and backups encrypted; field-level encryption for bank, ID and secret fields. SSE-KMS throughout; per-tenant CMKs for C3 projects (SEC-040) pulled into Phase 1 if a C3 pilot is accepted, otherwise delivered in Phase 4 with crypto-shredding. | SEC-040, SEC-050 to SEC-052 | 1 / 4 |
| NFR-009 | Default-deny egress; `ai_egress` gate; contractual prohibition on external AI use by experts and staff. | SEC-090, SEC-091, SEC-093; ADR-014 | 1 |
| NFR-010 | Upload quarantine, AV scan and upload safety limits. | SEC-080, SEC-104 | 1 |
| NFR-011 | Escaped rendering, ASVS 5.0 L2 in review (L3 for authn, access control, logging), SAST, SCA, container and IaC scanning, WAF and quotas, signed minimal images. | SEC-100 to SEC-102, SEC-105, SEC-106 | 1 |
| NFR-012 | Secrets only in Secrets Manager; no long-lived cloud keys; secret scanning. | SEC-070 to SEC-072 | 1 |
| NFR-013 | Incident response plan, on-call with counsel, notification templates, evidence preservation, customer security contacts. | SEC-140 to SEC-143, SEC-145 | 1 |
| NFR-014 | Contractual baseline: DPA, Expert Services Agreement, no PHI until a HIPAA tier exists, policy set, security training. | SEC-150 to SEC-153, SEC-156 | 1 |
| NFR-015 | Pre-launch and annual external penetration test; tabletop exercises; access and vendor reviews. | SEC-103, SEC-144, SEC-154 | 2 |
| NFR-016 | SOC 2 Type I then Type II; ISO/IEC 27001 readiness. | SEC-155 | 4 |

### 7.2 Performance and scale

| ID | Requirement | Phase |
|---|---|---|
| NFR-020 | Next-task allocation p95 under 2 seconds when eligible tasks exist (Workflow 2). | 1 |
| NFR-021 | API p95 latency under 300 ms for reads and under 800 ms for writes at pilot load, excluding asynchronous jobs. | 1 |
| NFR-022 | Workbench renders a text task (up to 20k tokens of content) interactive within 1.5 seconds p95 on a 10 Mbps connection. | 1 |
| NFR-023 | Ingestion validates 100k rows within 10 minutes; export of 100k rows completes within 15 minutes. | 1 |
| NFR-024 | Metrics refresh within 15 minutes of QA events. | 1 |
| NFR-025 | Sustain tens of thousands of submissions per day and at least 500 concurrent experts on a single Postgres primary; load test before launch (ADR-001, ADR-004 risk). | 1 |

### 7.3 Availability and recovery (ADR-012, Proposed)

| ID | Requirement | Phase |
|---|---|---|
| NFR-030 | Monthly availability target 99.5% for the customer portal, API and workbench in Phases 1 to 3; 99.9% from Phase 4. | 1 / 4 |
| NFR-031 | Single AZ failure: RDS Multi-AZ failover with no committed-data loss. | 1 |
| NFR-032 | Regional failure: RPO 4 hours and RTO 4 hours with DR in `ap-south-2` during early MVP. | 1 |
| NFR-033 | RPO 5 minutes via cross-region replica before the first enterprise contract; DR drill meets RTO 4 h and RPO 5 min. | 4 |
| NFR-034 | Drafts are never lost on client network loss (local cache plus idempotent retry). | 1 |

### 7.4 Data residency

| ID | Requirement | Phase |
|---|---|---|
| NFR-040 | Primary data in AWS `ap-south-1`, DR in `ap-south-2`, keeping data in India (ADR-012). | 1 |
| NFR-041 | SCP region restriction to India regions for data services; backups confined to India regions (SEC-107, SEC-051). | 1 |
| NFR-042 | Storage region equals the organization's data region; non-India residency requires a dedicated cell (Phase 4 option). | 1 / 4 |
| NFR-043 | No customer data to third-party AI services without per-project opt-in (ADR-014). | 1 |

### 7.5 Accessibility and usability

| ID | Requirement | Phase |
|---|---|---|
| NFR-050 | Customer portal and expert workbench meet WCAG 2.1 AA; workbench fully keyboard operable. | 1 |
| NFR-051 | Watermarks and C3 rendering do not block screen readers for text content; the C3 rendering approach is an open item (`security_architecture.md` section 19). | 1 |
| NFR-052 | Unicode and Indic script rendering (Devanagari and other Eighth Schedule scripts) and code-mixed text display correctly. | 1 |
| NFR-053 | Workbench is usable on tablet-width screens (mobile-responsive per personas). | 1 |

### 7.6 Auditability and provenance

| ID | Requirement | Phase |
|---|---|---|
| NFR-060 | Every delivered label traceable to item hash, rubric version, submission, expert pseudonym and QA decision. | 1 |
| NFR-061 | Audit and access logs retained at least 1 year in India; CloudTrail with log file validation; clock sync to a traceable source (SEC-062, SEC-063). | 1 |
| NFR-062 | Audit events emitted for denied decisions as well as allowed ones. | 1 |
| NFR-063 | Metric runs and exports are reproducible from stored inputs. | 1 / 2 |

### 7.7 Maintainability and operability

| ID | Requirement | Phase |
|---|---|---|
| NFR-070 | Module boundaries enforced by import-linter in CI; side effects via outbox (ADR-001). | 1 |
| NFR-071 | OpenAPI 3.1 contract with generated typed client; contract drift breaks the build. | 1 |
| NFR-072 | Job queue behind a `jobs` facade so Procrastinate can be swapped (ADR-004). | 1 |
| NFR-073 | Per-project observability: throughput, queue age, SLA, cost burn. | 1 |

---

## 8. Quality metric definitions

Notation: an item i receives n_i ratings on a criterion. "Finalized" means the task reached `finalized` through consensus, review or adjudication. Gold tasks are excluded from customer-facing quality metrics except gold accuracy. All rates are reported with numerator, denominator and, where n allows, a 95% CI (Wilson for proportions, bootstrap over items with 1,000 resamples and a recorded seed for means and alpha).

| Metric | Definition and formula | Shown to | Phase |
|---|---|---|---|
| Expert agreement (percent) | Per item: PA_i = agreeing rating pairs / (n_i (n_i - 1) / 2). Project PA = mean of PA_i over overlapped items. For ordinal scales "agreeing" means equal unless a tolerance is configured. Always reported next to alpha. | Customer, staff | 1 |
| Inter-rater reliability (primary) | Krippendorff's alpha per criterion: alpha = 1 - D_o / D_e. D_o = (1/n) sum_c sum_k o_ck delta^2(c,k), D_e = (1/(n(n - 1))) sum_c sum_k n_c n_k delta^2(c,k), where o_ck is the coincidence matrix from items with at least 2 ratings and n the number of pairable values. delta^2: nominal 0 if c = k else 1; ordinal (sum_{g=c..k} n_g - (n_c + n_k)/2)^2; interval (c - k)^2. Chosen by ADR-009 because pool assignment yields variable rater sets and missing data. Bands: >= 0.800 reliable, 0.667 to 0.800 tentative, < 0.667 triggers adjudication or rubric revision (per-project configurable). | Customer, staff | 1 |
| IRR companions | Cohen's kappa = (p_o - p_e) / (1 - p_e) for fixed pairs (weighted for ordinal); Fleiss' kappa = (P_bar - P_e) / (1 - P_e) for fixed rater counts; ICC(2,1) or ICC(2,k) for continuous scores with model, type and definition stated; Kendall's W = 12 S / (m^2 (n^3 - n) - m sum T_j) for rankings. | Customer, staff | 2 |
| Gold accuracy | Per expert: correct gold answers / gold items answered, rolling last 50. Correct means every gold-scored criterion matches the key: nominal and binary exact; ordinal within tolerance (default 0 on scales up to 5 points, 1 on 7+ points); pairwise choice equals key (a tie key accepts only tie). Per-criterion gold accuracy also reported. Project aggregate is the mean over experts weighted by gold answered. | Expert (own), staff; aggregate to customer | 1 |
| Acceptance rate | (accept + accept_with_edit) / reviewed submissions, per expert and project. Phase 2 adds customer acceptance = items accepted / items delivered. | Staff; aggregate to customer | 1 |
| Correction rate | Expert correction rate = submissions with a non-empty corrected answer / submissions where correction was allowed. Reviewer edit rate = accept_with_edit / reviewed. | Customer, staff | 1 |
| Disagreement rate | Overlapped tasks routed to adjudication / overlapped tasks reaching `ready_for_qa`. Per item, nominal disagreement = 1 - (largest label share). Adjudication reason-code mix reported alongside. | Customer, staff | 1 |
| Rework rate | Submissions returned for rework / reviewed submissions. Default alert above 10%. | Staff | 1 |
| Completion time | Active time per assignment (`time_spent_s`) reported as median and p90 per task type; cycle time = finalized_at - first claimed_at per task; turnaround = delivery released_at - batch ingested_at. | Customer (turnaround), staff | 1 |
| Expert performance score | EPS = 0.4 GA + 0.3 AC + 0.3 RP, where GA is rolling gold accuracy, AC is the share of the expert's overlapped submissions matching the finalized answer within tolerance, RP is review pass rate. Shown only with at least 20 gold and 30 reviewed submissions, otherwise "insufficient data". Weights are an initial assumption, revisited after three projects. Customers never see individual EPS. | Expert (own), staff | 1 |
| Coverage | Per stratum s (domain, task type, language, difficulty): finalized items in s / target items in s. | Customer, staff | 2 |
| Diversity | Per stratum: effective number of raters = 1 / sum_e p_e^2 (p_e = share of finalized labels from expert e); max single-expert share (alert above 25% by default); near-duplicate prompt rate. | Customer, staff | 2 |
| Model score by domain and task type | Item score s_i = sum_c w_c v_ic / sum_{c: w_c > 0} w_c, where v_ic is 1 or 0 for binary criteria and (x - min) / (max - min) for scales. Domain-task score = mean s_i over finalized items in (domain, task type) with bootstrap CI. Pairwise win rate = (wins + 0.5 ties) / comparisons with Wilson CI; tie rate reported separately. | Customer | 1 |
| Safety failure rate | Per hazard category: unsafe-compliance verdicts / adversarial items evaluated. Over-refusal rate = refusals on benign prompts / benign prompts. Severity-weighted variant = sum severity of unsafe items / (items x max severity). | Customer | 2 |
| Reproducibility | Export reproducibility: re-export of a frozen version yields identical file and manifest sha256 (target 100%). Metric reproducibility: recomputing a stored metric run with the same inputs, code version and seed yields identical values. Rater reproducibility: alpha between cycles on anchor items (Phase 3). | Customer, staff | 2 (export, metric), 3 (anchor) |

Reporting rules (research section 7): each metric shows item count, rater count and label prevalence; subjective criteria may legitimately show lower agreement, and raw votes are always available so customers can use distributional labels.

## 9. Data type to method suitability (summary)

The platform labels each deliverable with its type and the exporter refuses formats that do not match (ADR-016). Summary of `research/ai_training_and_evaluation.md` section 4:

| Deliverable | Suitable for | Unsuitable or risky | Platform consequence |
|---|---|---|---|
| SFT conversation | SFT, distillation, `chosen` side when a rejected exists | DPO-family alone; eval reuse if also trained on | SFT export only from accepted corrections or authored demonstrations |
| Pairwise preference | DPO, IPO, ORPO, SimPO, CPO, reward models | SFT on `chosen` without absolute check; unpairing for KTO | Always capture absolute acceptability, strength, tie, both-bad |
| Pairwise with degree or tie | Margin reward models, filtering low-confidence pairs | Treating negligible margins as strong pairs | `min_strength`, `drop_ties` export filters |
| Ranking (k responses) | Expansion to pairs, Kendall-based agreement | Treating rank gaps as interval scores | Ranking exporter; agreement via Kendall's W |
| Binary good or bad | KTO, SFT filtering, classifiers, pass rates | DPO without same-prompt pairs | Absolute acceptability exported as KTO-ready field in Phase 2 |
| Likert or scalar rating | Regression reward models, best-of-n, ICC | Direct DPO input; cross-rater comparison without calibration | Scales kept ordinal; ICC only where interval is justified |
| Rubric-scored item | Evaluation, rubric rewards, judge calibration | Holistic SFT target; reward use with vague criteria | Atomic criteria and signed weights (FR-050) |
| Verifiable problem | RLVR, RFT graders, evaluation | SFT without worked solution; preference methods | Benchmark authoring requires checkable answer and second solve |
| Process or step labels | PRM training, reasoning evaluation | Outcome-only RL as-is | Future task type, not scheduled before Phase 3 |
| Red-team item | Safety evaluation, refusal SFT with safe target, classifiers | Public release of uplift content; imitating unsafe output | Restricted workspace, CBRN routed to vetted specialists |
| Agent task and trajectory | Agent evaluation, agentic RL, SFT on successful trajectories | Failed trajectories as SFT targets | Phase 3 task types and exporters |
| Multimodal annotation | VLM SFT, evaluation | Use without consent and licence records | Phase 3 via Label Studio |
| Robotics episode | Imitation learning (LeRobot, RLDS) | Reuse without embodiment metadata | Phase 5 only |

## 10. Gold, calibration, reviewer audit and adjudication policy

Defaults below are configurable per project and are revisited after three projects (ADR-009).

### 10.1 Qualification
- Each expert passes a domain screen (existing Infollion vetting) and a task-specific qualification of 20 to 50 gold items; default pass mark 80% gold match and, where a lead rater exists, Cohen's kappa against the lead of at least 0.6.
- Qualification time is paid (persona 2.3 pain point).

### 10.2 Calibration round
- Before production, 20 to 50 calibration items are rated by 3 to 5 experts each (at least 30 items and 3 raters where ICC is reported).
- Agreement is computed per criterion. Clusters of disagreement drive rubric clarification or a new version. Production starts when the customer approves the rubric and the alpha target is met (default tentative band 0.667) or the customer accepts a documented lower threshold for a subjective criterion.
- Gold items are drafted from calibration consensus plus the customer key.

### 10.3 Gold insertion
- Hidden gold at 5 to 10% of each expert's queue (MVP floor 5%; pilot package recommends 10%), with at least 20 gold items or 5% of the batch, whichever is greater.
- Gold is indistinguishable from normal tasks, never shown to the same expert twice, and retired after a configurable exposure count (default 10 exposures) or when its key is disputed.
- Gold creation requires a customer key or two senior reviewer agreements plus PM approval. Gold items are never delivered.
- Rolling gold accuracy (last 50) below 85% puts the expert on probation with 100% review; below 70% removes the expert from the project. Both are reversible with history.

### 10.4 Overlap
- Production overlap default 20% with 2 to 3 raters (MVP floor 20%); 100% overlap with 3 raters for benchmark items and high-stakes evaluations.

### 10.5 Review sampling and reviewer audit
- Sampled review at the project review rate (default 10%); 100% for experts on probation, too-fast submissions and risk-flagged submissions; 100% senior review of disagreements in the pilot package.
- Pre-delivery audit: 2% random sample re-reviewed by a different senior reviewer before the first delivery on any project (Phase 1).
- Reviewer audit (Phase 2): 5% of review and adjudication decisions re-reviewed by another senior reviewer; reviewer agreement below 0.8 percent agreement triggers coaching.

### 10.6 Adjudication
- Triggered when task agreement is below the project threshold or on customer dispute (Phase 2).
- Adjudicator sees all submissions blind to rater identity, plus rationales and gold context; must not be a rater on the task and must be Tier 3 or above.
- Records final answer and reason code (`rubric_ambiguity`, `expert_error`, `item_defect`, `genuine_subjectivity`). Raw votes are never overwritten and are exportable.
- `rubric_ambiguity` above 5% of a batch alerts the PM for clarification or a new rubric version; `item_defect` moves the item to `excluded` with customer notification.
- Maximum two rework cycles, then automatic escalation.

### 10.7 Convergence gate for RL-grade data
- Before delivering verifiable problems or rubric data intended as rewards, show that independent experts converge (alpha at least 0.800 or exact-match agreement on final answers at least 90%), following OpenAI RFT guidance cited in the research.

## 11. Dependencies

| ID | Dependency | Affects | Status or owner |
|---|---|---|---|
| D-01 | Phase 0 sign-off; Proposed ADRs confirmed: ADR-012 (AWS regions, OQ-10) and ADR-013 (pseudonymity) | All phases | Stakeholders |
| D-02 | One design-partner customer for the pilot with signed NDA, DPA, SOW | Phase 1 release | Sales |
| D-03 | 10 to 30 pilot-domain experts recruited with signed NDA and IP assignment | Phase 1 release | Expert ops |
| D-04 | Company IdP details for staff OIDC (OQ-11) | FR-009 | IT |
| D-05 | First customer requiring SSO or SCIM (OQ-04) | FR-010 timing | Sales |
| D-06 | Self-hosted Presidio with India recognizers built and tested | FR-064, FR-222 | Engineering |
| D-07 | Counsel review: Expert Services Agreement, DPA, earnings `void` policy, red-team rules of engagement, DPDP notices (SEC-115, SEC-116 target 13 Nov 2026) | Phase 1 and 2 | Legal |
| D-08 | Procrastinate load test on the primary (ADR-004 risk) | NFR-025 | Engineering |
| D-09 | Langfuse self-host operations (ClickHouse, Redis), Label Studio, Inspect AI evaluations | Phase 3 | Engineering |
| D-10 | Robotics co-funded pilot and counsel sign-off | Phase 5 gate | Leadership |

Document conflicts resolved in this PRD (ADRs win; otherwise the roadmap sets phase):
1. MFA for every account (ADR-005) supersedes `mvp_scope.md` "MFA for staff and reviewers".
2. Phase 1 authentication is FastAPI-native (ADR-005), superseding the Better Auth description in `api_design.md` section 1.
3. Langfuse is Phase 3 (ADR-007), not Phase 2.
4. Track B is Phase 5 (ADR-015, roadmap), not Phase 3 as in the operations agent findings.
5. Staff IdP SSO (SEC-002 MVP) applies once OQ-11 is resolved; until then password plus TOTP (ADR-005).
6. Passkeys (SEC-001 MVP) are Phase 2 per ADR-005 "passkeys later".
7. Open, needs decision: SEC-040 places per-tenant KMS keys for C3 in MVP and SEC-060 places daily hash-chain anchoring in MVP, while the roadmap places both in Phase 4. This PRD ships the hash chain in Phase 1 and anchoring in Phase 4, and pulls per-tenant CMKs into Phase 1 only if a C3 pilot is accepted. Security lead to confirm.
8. Payout report: `mvp_scope.md` implies a Phase 1 payout report while the roadmap lists it in Phase 2. This PRD ships a usage and earnings CSV in Phase 1 (FR-252) and the full payout report with tax fields in Phase 2 (FR-255).

## 12. Release criteria

### Phase 1: Evaluation MVP
1. All Phase 1 FRs implemented, or explicitly deferred with stakeholder sign-off; every Phase 1 acceptance criterion in `acceptance_criteria.md` passes.
2. MVP success criteria 1 to 5 met on a pilot of at least 500 items with at least 20% overlap and at least 5% gold.
3. Cross-tenant and cross-assignment test suite green in CI (SEC-025); OWASP ASVS L2 items marked MVP pass; SEC items marked MVP implemented or risk-accepted in writing.
4. Load test meets NFR-020 to NFR-025; restore from backup tested against RPO 4 h and RTO 4 h.
5. Audit events emitted for every action listed in Workflows 1 to 4 and verified by test.
6. Counsel-approved Expert Services Agreement, DPA template and earnings policy in place.

### Phase 2: Dataset delivery
1. Exports validate against published schemas and load with `datasets.load_dataset` and TRL preference loaders in CI.
2. Frozen versions cannot be modified (trigger tested); re-export yields identical hashes.
3. Delivery acceptance and dispute flow works end to end with superseding versions.
4. External penetration test completed with no open high findings; DPDP notices and rights intake live if the substantive commencement date has passed.

### Phase 3: Integrations and advanced evaluation
1. A customer registers a new model version, re-runs a frozen benchmark and sees per-criterion regression with CIs, and can request human review of regressions.
2. Judge-human agreement reported for every judge; no AI egress without recorded opt-in (verified by test).
3. Monitoring cycles meet SLA in at least 95% of cycles in a pilot program; scorecards distinguish model regression from rater drift.

### Phase 4: Enterprise
1. SSO with at least two IdPs in staging; SCIM provisioning tested.
2. Tenant key deletion renders tenant objects unreadable in test.
3. DR drill meets RTO 4 h and RPO 5 min; SOC 2 Type I report issued.

### Phase 5: Physical AI (gated)
1. Gate conditions met and documented.
2. Pilot dataset passes customer QA; every episode links to a valid consent record and redaction log; exports load with LeRobot tooling.
