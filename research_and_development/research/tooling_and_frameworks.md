# Tooling and Frameworks for Infollion's Expert-Powered AI Evaluation Platform

Prepared by: Tooling Research Agent
Access date for all sources: 2026-10-20
Planned stack: Next.js + TypeScript, FastAPI + PostgreSQL, S3, Docker
Detailed verification log: `research_and_development/agents/tooling_agent_findings.md`

## 1. Executive summary

- No existing open-source tool covers Infollion's core business: an expert workforce (sourcing, credentialing, conflict checks, payments), multi-annotator task routing, adjudication, inter-rater reliability (IRR), and customer-facing versioned dataset delivery. Every candidate covers one slice.
- **Langfuse** (MIT core, very active, now owned by ClickHouse) is the strongest fit for the *model-output side*: ingesting customer traces, datasets, experiments, LLM-as-a-judge, and a typed score schema. Its human annotation queues are single-pass review tools with no documented overlap, adjudication, or human-to-human agreement.
- **Label Studio Community** (Apache-2.0, very active) is a strong, flexible *labeling UI*, but task assignment, reviewer workflow, overlap, agreement metrics, RBAC, and SSO are all paid-only. Treat it as an embeddable editor at most, not a workflow engine.
- **Argilla** is effectively in maintenance mode: last release v2.8.0 on 2025-03-11, last default-branch commit 2025-08-05, and its README says no new features will be added. Do not build on it.
- Recommendation: build the expert workflow core in-house (FastAPI + Postgres), use Langfuse (self-hosted OSS or Cloud) as the trace/eval/judge backbone behind an internal API, and borrow interaction patterns (not dependencies) from Label Studio, Argilla and Potato. Use Inspect AI / Harbor for agentic task environments, and Hugging Face `datasets` + Parquet on S3 for delivery.

## 2. Deep dive: Langfuse

### 2.1 Status

| Item | Finding | Evidence |
|---|---|---|
| Repo | langfuse/langfuse, 36,051 stars, not archived | REPO, GitHub API |
| Latest release | v4.64.0 (2026-10-19); previous v4.63.0 (2026-10-16) | REPO, releases feed |
| SDKs | Python `langfuse` 5.0.2 (2026-10-16); JS/TS `@langfuse/client` 6.0.1; Java (GitHub Packages) | PKG, OD |
| Ownership | Acquired by ClickHouse, announced 2026-01-16; Langfuse states no planned licensing changes. LICENSE copyright now "ClickHouse, Inc." | OD, IND, REPO |
| License | MIT for everything outside `ee/`, `web/src/ee/`, `worker/src/ee/`; those directories use the Langfuse Enterprise License | REPO (LICENSE) |

### 2.2 Capabilities (verified)

- **Tracing/observability**: OpenTelemetry is the supported ingestion path; the legacy ingestion API is scheduled for sunset on Cloud on 2026-11-16. Read APIs: observations v2, scores v3, experiments, metrics v2. (OD)
- **Datasets and experiments**: items carry `input`, optional `expected_output`, `metadata`; can link to a source trace/observation; media items via SDK; optional JSON Schema validation on input and expected output; every item add/update/delete/archive creates a new dataset version, retrievable by timestamp; versioning covers items, not schemas. Experiments run via SDK (`run_experiment` / `runExperiment`), UI, or OTel, and can target historical versions. (OD)
- **Prompt management**: prompts fetched via SDK with caching, retries, fallbacks; "protected deployment labels" are Enterprise-only on self-host. (OD)
- **Scores**: types numeric, categorical, boolean, text. Score configs define name, type, min/max, categories, description; configs are immutable but archivable. A score attaches to exactly one of trace, observation, session, or dataset run. Source is `API`, `EVAL`, or `ANNOTATION`. (OD)
- **LLM-as-a-judge**: templates or custom prompts with `{{input}}`, `{{output}}`, `{{ground_truth}}`; numeric/categorical/boolean outputs; targets observations or experiments (trace-level evaluators deprecated in v4); sampling rate per rule; executed by the worker and requires an LLM connection. Docs estimate $0.01 to $0.10 per assessment. (OD)
- **Human annotation queues**: add traces, observations or sessions in bulk; each queue requires score configs; optional user assignment; "Complete + next" flow; corrected outputs can be recorded; queues manageable by API. (OD)
- **RBAC/SSO**: roles Owner, Admin, Member, Viewer, None. Org-level RBAC and Enterprise SSO (Okta, Entra ID) with enforcement are available in OSS self-host; project-level roles need Enterprise (or Cloud Pro + Teams add-on). (OD)
- **API/SDK**: public REST API with Basic auth (project keys), OpenAPI spec published, self-hosted v4.36.0+ serves spec at `/api/openapi.yaml`; scheduled blob-storage export for scores to a warehouse. (OD)

### 2.3 Self-hosting (v3+ architecture, current v4 images)

| Component | Role | Notes |
|---|---|---|
| langfuse web | UI and APIs | image `langfuse:4` in compose |
| langfuse worker | async processing, evaluators | image `langfuse-worker:4` |
| PostgreSQL | transactional data | compose default Postgres 17 |
| ClickHouse | traces, observations, scores | compose `clickhouse-server:25.12` |
| Redis / Valkey | cache and queue | compose `redis:7` |
| S3 / blob | raw events, multimodal | compose uses a MinIO image (`cgr.dev/chainguard/minio`); use AWS S3 in production |

Docker Compose is described by Langfuse as "Single VM without high availability, scaling, or backups"; production paths are Kubernetes (Helm), AWS, Azure, GCP. Minimum CPU/RAM: unknown (not stated on the overview page).

### 2.4 OSS vs Enterprise (self-hosted)

| Available in MIT OSS | Enterprise license only |
|---|---|
| Tracing, evaluations, prompt management, experiments, annotation (incl. queues), playground | Project-level RBAC |
| Org-level RBAC | Audit logs |
| Enterprise SSO and SSO enforcement | Data retention management |
| Public API, SDKs | SCIM, Admin API, Instance management API |
| | Organization creators, UI customization |
| | Protected deployment labels, server-side data masking |

Self-hosted Enterprise is custom priced, billed via AWS Marketplace or invoice, and "additive to your ClickHouse commercial plan". (OD)

### 2.5 Cloud pricing (verified 2026-10-20)

| Plan | Price | Included | Retention (data access) | Users | Annotation queues |
|---|---|---|---|---|---|
| Hobby | Free | 50k units/month | 30 days | 2 | 1 |
| Core | $29/month | 100k units/month | 90 days | Unlimited | 3 |
| Pro | $199/month | 100k units/month | 3 years | Unlimited | Unlimited |
| Enterprise | $2,499/month | 100k units/month | 3 years | Unlimited | Yes |

Teams add-on for Pro: $300/month. Overage per 100k units: $8.00 (100k to 1M), $7.00 (1M to 10M), $6.50 (10M to 50M), $6.00 (50M+). (OD)

### 2.6 Langfuse can / cannot (for an expert-workforce business)

| Need | Langfuse? | Basis |
|---|---|---|
| Ingest customer model outputs/traces at scale | Can | OTel ingestion, ClickHouse store (OD) |
| Versioned eval datasets with expected outputs | Can (item-level versioning by timestamp) | Datasets docs (OD) |
| Run experiments comparing prompts/models on a dataset | Can | Experiments via SDK/UI (OD) |
| Typed rubric dimensions (numeric/categorical/boolean/text) | Can, via score configs | Scores data model (OD) |
| LLM-as-a-judge pre-scoring and judge calibration vs humans | Can | LLM-as-a-judge and annotation queue docs (OD) |
| Simple expert review queue with corrections | Can | Annotation queues (OD) |
| Multi-rubric scoring with rich instructions, gold questions, per-criterion rationales | Partially (text scores up to 500 chars; no gold/honeypot concept documented) | Scores data model (OD); INF |
| Pairwise preference (A vs B) as a first-class task | Cannot natively; must be modeled as a categorical score on one object | INF from score model (score attaches to exactly one object) |
| Configurable overlap (N experts per item) and routing by expertise | Cannot (not documented) | Annotation queues page (OD) |
| Adjudication / consensus workflow | Cannot (not documented) | Annotation queues page (OD) |
| Human-to-human IRR (Cohen/Fleiss kappa, Krippendorff alpha) | Cannot (only human-vs-judge agreement in Score Analytics) | Annotation queues page (OD) |
| Restrict an expert to only assigned items | Cannot (no such role) | RBAC page (OD) |
| Expert marketplace, onboarding, credential verification, conflict-of-interest checks | Cannot (out of scope; not in docs) | INF |
| Expert payments, time tracking, payouts | Cannot | INF |
| Customer-facing multi-tenant portal and dataset delivery packaging | Cannot as a product; org/project separation exists, but org creators and UI customization are EE | pricing-self-host (OD); INF |
| Audit logs, data retention policies, SCIM on self-host | Only with Enterprise license | pricing-self-host (OD) |

Verdict: use Langfuse as an internal evaluation engine, not as the expert-facing or customer-facing application.

## 3. Deep dive: Label Studio

| Item | Finding | Evidence |
|---|---|---|
| Repo | HumanSignal/label-studio, 28,497 stars, Apache-2.0 | REPO |
| Latest release | 1.23.2 (2026-09-29); dev pre-release 1.24.0.dev20261020 | REPO, PKG |
| SDK | label-studio-sdk 2.1.2 (2026-09-25) | PKG |
| Modalities | text, documents, images, audio, video, time series via XML labeling configs | OD (templates, export docs) |
| GenAI templates | Supervised LLM Fine-Tuning; Human Preferences collection for RLHF; RAG Retrieval; LLM Response Moderation; LLM Response Grading; Side-by-Side LLM Output Comparison; Evaluate RAG with Human Feedback; Multi-Turn Chat Evaluation. Chat (incl. "Red-Teaming in Chat") and Agent Evaluation interfaces are marked paid | OD |
| Export | JSON, JSON_MIN, CSV, TSV, COCO, YOLO, Pascal VOC, CoNLL2003, ASR_MANIFEST, brush masks to NumPy/PNG; spaCy via CoNLL conversion. Community UI export is synchronous (proxy timeout risk ~90s); use Snapshot API for large projects | OD |
| API | REST API, Python SDK, webhooks in all editions | OD |
| Embedding | `new LabelStudio(container, {config, interfaces, user, task})` with `submitAnnotation` event. Standalone frontend "deprecated as a separate library" since 1.11.0; npm `@heartexlabs/label-studio` last published 1.8.0 on 2023-06-06 | OD, PKG |
| Pricing | Starter Cloud $99/month up to 12 users, $49/month per extra user; Enterprise custom | OD |

Community vs paid (from the official comparison page):

| Feature | Community | Starter Cloud | Enterprise |
|---|---|---|---|
| Assign tasks / automatic distribution | No | Yes | Yes |
| Assign reviewers | No | Yes | Yes |
| Overlap configuration | No | Yes | Yes |
| Agreement metrics | No | Limited | Yes |
| Annotator consensus matrices, custom agreement, auto-reassign low agreement, pause annotators | No | No | Yes |
| RBAC (Admin, Manager, Reviewer, Annotator) | No | Yes | Yes |
| SSO (SAML/LDAP), audit logs, workspaces | No | No | Yes |
| LLM pre-labeling, LLM eval, benchmarks | No | Limited trial | Yes |
| API/SDK and webhooks, import/sync storage | Yes | Yes | Yes |

Verdict: excellent configurable editor; in Community every workforce-management feature Infollion needs is missing. Embedding the editor is possible but relies on a deprecated standalone distribution, so expect to vendor and maintain the frontend bundle.

## 4. Deep dive: Argilla

| Item | Finding | Evidence |
|---|---|---|
| Repo | argilla-io/argilla, 5,162 stars, Apache-2.0 | REPO |
| Latest release | v2.8.0 on 2025-03-11 (PyPI 2025-03-10) | REPO, PKG |
| Latest default-branch commit | 2025-08-05 (README update) | REPO |
| Stated status | README: "The original authors have moved on to exciting new projects ... we won't be adding new features going forward, we're committed to solve bug fixes and publish patches as needed." It invites new maintainers | REPO |
| Data model | Fields: TextField, ImageField, ChatField, CustomField. Questions: LabelQuestion, MultiLabelQuestion, RankingQuestion, RatingQuestion, SpanQuestion, TextQuestion. Metadata (terms, integer, float), vectors for similarity search, guidelines | OD |
| Distribution | `TaskDistribution(min_submitted=N)` overlap; records `pending` until N submitted, then `completed`; no per-user assignment documented; N can only be changed before any responses | OD |
| Deployment | Docker compose: argilla-server, worker, Postgres 14, Elasticsearch 8.17.0, Redis; Hugging Face Spaces template | REPO |
| Sister project | distilabel: last release 1.5.3 (2025-01-28), last commit 2025-12-15 | REPO |

Verdict: the data model (fields + typed questions + min_submitted overlap) is a good design reference for Infollion's own schema, but Argilla should not be a production dependency given no releases in 19 months and an explicit no-new-features stance.

## 5. Tool matrix

Maintenance key: Active = release or default-branch commit within ~30 days; Moderate = within ~6 months; Low = older; Dormant = maintenance-only/archived. Dates are 2026-10-20 snapshots.

| Tool | Primary purpose | Human review | Dataset annotation | LLM evaluation | Self-hosting | API/SDK | License | Maintenance | Limitations |
|---|---|---|---|---|---|---|---|---|---|
| Langfuse | LLM observability, evals, prompts | Annotation queues (single pass) | Datasets with expected outputs | Yes, LLM judge + experiments | Yes (Postgres, ClickHouse, Redis, S3) | REST + Python/JS/Java | MIT core + EE | Active (v4.64.0, 2026-10-19) | No overlap/adjudication/IRR; project RBAC, audit, retention are EE |
| Label Studio | Multimodal labeling | Paid only (assign, review) | Yes, XML configs | Templates; LLM features paid | Yes | REST + Python SDK, webhooks | Apache-2.0 (Community) | Active (1.23.2, 2026-09-29) | Community lacks assignment, overlap, agreement, RBAC, SSO |
| Argilla | LLM dataset curation, feedback | Yes, min_submitted overlap | Yes | Rating/ranking feedback | Yes (Postgres, Elasticsearch, Redis) | Python SDK | Apache-2.0 | Dormant (v2.8.0, 2025-03-11) | No new features; no per-user assignment |
| Opik (Comet) | LLM tracing and evals | Annotation queues, multi-reviewer averaging | Datasets | Yes | Yes | Python/TS SDK, REST | Apache-2.0 | Active (2.2.105, 2026-10-19) | No per-reviewer assignment documented; OSS availability of queues not stated |
| Arize Phoenix | LLM tracing and evals | Span/trace annotations | Datasets | Yes | Yes | Python/TS | Elastic License 2.0 | Active (v20.23.0, 2026-10-16) | ELv2 bars offering it as a hosted service to third parties |
| Braintrust | Eval and observability SaaS | Human review scores | Datasets | Yes | Enterprise only (on-prem or hosted) | SDKs | Proprietary | Commercial | Pro $249/month; Starter 1 human review score per project |
| promptfoo | Eval and red-team CLI | No | Test cases | Yes, red-teaming | CLI/local | CLI, Node | MIT | Active (0.124.1, 2026-10-08) | Owned by OpenAI since 2026 (IND) |
| Inspect AI (UK AISI) | Eval framework incl. agentic | `human_cli` human baselining | Datasets | Yes | Yes (local) | Python | MIT | Active (v0.3.282, 2026-10-19) | Framework, not a workforce UI |
| OpenAI Evals (OSS) | Eval registry | No | YAML/JSONL | Yes | Local | Python | MIT | Dormant (3.0.1, 2024-05-01) | Maintenance-only commits |
| lm-evaluation-harness | Benchmark runner | No | No | Yes (benchmarks) | Local | Python | MIT | Moderate (v0.4.13, 2026-08-31) | Academic benchmarks focus |
| DeepEval | LLM unit-test metrics | No | Test sets | Yes | Local; cloud separate | Python, TS | Apache-2.0 | Active (4.3.1, 2026-10-16) | Metrics library |
| Ragas | RAG metrics | No | Test sets | Yes (RAG) | Local | Python | Apache-2.0 | Moderate/Low (v0.4.3, 2026-01-13; repo moved to vibrantlabsai) | Slowing activity |
| HELM | Holistic benchmark suite | No | No | Yes | Local | Python | Apache-2.0 | Moderate (v0.5.16, 2026-04-30) | Research benchmark harness |
| CVAT | CV annotation | Review, ground truth jobs, honeypots | Images/video | No | Yes | REST, Python SDK | MIT | Active (v2.79.0, 2026-10-15) | CV-focused; SSO/RBAC/audit paid on cloud |
| Doccano | Text annotation | Basic | Text | No | Yes | REST | MIT | Low (v1.8.5 GitHub, 2026-01-11) | Little development |
| Potato | NLP, agent-trace, QDA annotation | Yes | Text, audio, video, image, docs, agent traces | Agent trace eval | Yes | Python/config | GPL-3.0 | Active (v2.11.1, 2026-10-15) | Copyleft; small community (436 stars) |
| Prodigy | Scriptable annotation | Yes | Text, image, audio | Recipes | Yes (local) | Python | Commercial | unknown (closed) | $390 personal; $490/seat company (5-seat packs) |
| MLflow | ML lifecycle + GenAI eval | Feedback/labeling (not verified) | Datasets | Yes | Yes | Python, REST | Apache-2.0 | Active (3.17.1, 2026-10-13) | Not a workforce tool |
| W&B Weave | LLM tracing and eval | Feedback (not verified) | Datasets | Yes | SaaS primarily | Python, TS | Apache-2.0 (SDK) | Active (v0.53.12, 2026-10-13) | Server is W&B platform |
| DVC | Data versioning (git-based) | No | No | No | Local + S3 remotes | CLI, Python | Apache-2.0 | Moderate (3.67.1, 2026-03-31; repo now under Treeverse) | Git-centric, not a DB |
| lakeFS | Data lake versioning | No | No | No | Yes | REST, SDKs | BSL 1.1 | Active (v1.88.0, 2026-10-01) | Internal-use-only grant; cannot expose to customers |
| HF datasets | Dataset loading/format | No | No | No | Library + Hub | Python | Apache-2.0 | Active (5.1.0, 2026-10-05) | Delivery format, not versioning DB |
| OpenLineage | Lineage spec | No | No | No | Spec + clients | Many clients | Apache-2.0 | Active (1.54.0, 2026-10-13) | Spec only |
| Marquez | Lineage server | No | No | No | Yes | REST | Apache-2.0 | Low (0.51.1, 2025-03-27) | Slow releases |
| SWE-bench | Coding agent benchmark | No | No | Agent eval | Docker | Python | MIT | Moderate (v5.0.1, 2026-08-18) | Benchmark harness |
| tau2-bench | Tool-agent benchmark | No | No | Agent eval | Local | Python | MIT | Active (2.0.0, 2026-10-20) | tau-bench v1 superseded |
| Harbor | Sandboxed agent task framework | No | Task datasets | Agent eval | Yes | Python CLI | Apache-2.0 | Active (v0.24.0, 2026-10-05) | Young project |
| Terminal-Bench | Terminal agent benchmark | No | No | Agent eval | Docker | Python | Apache-2.0 | Moderate (repo renamed terminal-bench-1, last commit 2026-07-11) | Successor tooling is Harbor (INF) |
| LeRobot | Robotics datasets, policies | No | Robot episodes | No | Library + Hub | Python | Apache-2.0 | Active (v0.6.1, 2026-08-03; commits 2026-10-19) | Robotics-specific |
| RLDS | RL episode format | No | No | No | Library | Python | Apache-2.0 | Archived (2024-09-26) | Do not adopt |
| TFDS | Dataset catalog | No | No | No | Library | Python | Apache-2.0 | Active (v4.9.10, 2026-05-08) | TensorFlow-centric |
| MCAP (Foxglove) | Robotics log container | No | No | No | Library | C++, Python, Rust, Go, TS | MIT | Active (2026-10-19) | Format only; Foxglove viewer is commercial (pricing not verified) |
| Rerun | Multimodal visualization/logging | Visual inspection | No | No | Yes (viewer) | Python, Rust, C++ | Apache-2.0 / MIT | Active (0.39.0, 2026-10-12) | Viewer, not annotation |

Commercial reference platforms (context only, positioning not verified from docs in this pass, no prices claimed): Scale AI (scale.com), Surge AI (surgehq.ai), Labelbox (labelbox.com), SuperAnnotate (superannotate.com), Toloka (toloka.ai), Prolific (prolific.com). These combine a managed workforce with tooling, which is the space Infollion would compete in; none is a dependency candidate.

OSS task-assignment / workforce tools: none found that are actively maintained and fit expert annotation. The relevant OSS options with built-in distribution are Argilla (dormant) and Potato (GPL-3.0); Label Studio and CVAT gate assignment features behind paid tiers. Treat workforce routing as build.

## 6. Recommended combination

### MVP (first 3 to 6 months)

| Layer | Choice | Why |
|---|---|---|
| Expert and customer app | Build: Next.js + FastAPI + Postgres | Core IP: projects, rubrics, tasks, assignments, reviews, payouts metadata |
| Task UI components | Build in React: rubric scorer, pairwise preference, ranking, text correction, chat/trace viewer. Use Argilla's field/question model and Label Studio's GenAI templates as design references | Avoid paid-tier gating and deprecated embed packages |
| Eval/trace backbone | Langfuse (Cloud Core/Pro for speed, or self-host OSS) behind an internal adapter | Ingest customer outputs, datasets, LLM-as-a-judge pre-scores, experiments; MIT core |
| Agentic tasks | Inspect AI (incl. `human_cli` for expert baselining) | MIT, active, same scorer for humans and models |
| Dataset delivery | Parquet/JSONL snapshots on S3 with manifest + checksum in Postgres; publish via HF `datasets` format | Apache-2.0, customer-friendly formats |
| Storage | AWS S3 directly (do not ship MinIO) | MinIO repo archived, AGPL-3.0 |

### Phase 2 (6 to 12 months)

- Self-host Langfuse on Kubernetes; decide on Enterprise license if Infollion needs audit logs, retention policies, project-level RBAC or SCIM inside Langfuse (or implement those in Infollion's own layer and keep Langfuse internal).
- Add Label Studio Community only if multimodal (image/audio/video region) annotation demand appears; wire assignment through Infollion's own workflow and the Label Studio API.
- Add promptfoo or Inspect-based red-team suites for structured red-teaming projects.
- Add OpenLineage events from dataset build jobs if customers ask for lineage.

### Phase 3 (12 months+)

- Agentic and coding evals: Harbor tasks, SWE-bench harness, tau2-bench environments with expert-authored tasks and rubrics.
- Robotics: LeRobot dataset format, MCAP ingestion, Rerun for expert review of episodes.
- Consider CVAT (MIT) for vision-heavy programs.

## 7. Capabilities Infollion must build itself

1. Expert profiles, onboarding, KYC and credential verification, domain/skill taxonomy.
2. Conflict-of-interest checks against customer, competitor and project metadata.
3. Qualification tests, gold/honeypot items, calibration rounds, expert scoring and tiering.
4. Task routing: overlap (N experts per item), expertise matching, quotas, time limits, item locking, reassignment.
5. Rubric builder with versioned rubrics, per-criterion rationales, pairwise and ranking tasks, corrections/rewrites, red-team task types.
6. QA and adjudication workflow: disagreement detection, senior-reviewer adjudication, consensus rules, audit trail.
7. IRR analytics: Cohen and Fleiss kappa, Krippendorff alpha, per-expert agreement and drift dashboards.
8. Time tracking, pay rates, payouts and invoicing (INR and multi-currency), tax documents.
9. Customer multi-tenant portal: project intake, upload of model outputs, progress, sample review, acceptance, SLAs.
10. Dataset versioning and delivery: immutable snapshots, manifests, datasheets, export formats (JSONL, Parquet, HF), checksums, delivery receipts.
11. Security and compliance: tenant isolation, RBAC down to item level, audit logs, data retention and deletion, PII handling, NDA tracking.
12. Adapters to Langfuse (and optionally Label Studio) so those tools stay replaceable.

## 8. Licensing and commercial risks

| Risk | Detail | Mitigation |
|---|---|---|
| Langfuse EE features | Project-level RBAC, audit logs, data retention, SCIM, org creators, UI customization, protected labels, data masking require a commercial license on self-host; price is custom and tied to a ClickHouse plan | Keep Langfuse internal; implement tenant RBAC, audit and retention in Infollion's layer; do not copy `ee/` code |
| Langfuse ownership change | Acquired by ClickHouse (2026-01-16); no licensing change announced | Pin versions; wrap behind an adapter; monitor LICENSE |
| Langfuse API churn | Legacy ingestion API sunset on Cloud 2026-11-16; trace-level evaluators deprecated in v4 | Use OTel ingestion and observation-level evaluators from day one |
| Label Studio paid gating | Assignment, overlap, agreement, RBAC, SSO not in Community | Build workflow in-house; use LS only as editor |
| Label Studio embed | Standalone frontend deprecated since 1.11.0; npm package last published 2023 | Vendor a pinned build or write own React components |
| Argilla dormancy | No release since 2025-03-11; no new features | Do not depend on it |
| Arize Phoenix ELv2 | Cannot be provided to third parties as a hosted/managed service | Internal use only, or choose Langfuse/Opik |
| lakeFS BSL 1.1 | Additional Use Grant limits production use to unmodified, internal business use; may not make functionality available to third parties | Avoid for customer-facing delivery; use S3 + Postgres manifests or DVC (Apache-2.0) |
| AGPL | MinIO is AGPL-3.0 and archived; Langfuse's default compose uses a MinIO image | Use AWS S3 in all environments beyond local dev |
| GPL-3.0 (Potato) | Copyleft; distributing modified versions requires GPL release | Use as a reference or isolated service; do not link into proprietary code shipped to customers |
| promptfoo ownership | Acquired by OpenAI (announced 2026-03-09); press reports commitment to OSS (not primary-verified) | Treat as replaceable; Inspect AI is an MIT alternative |
| Vendor SaaS (Braintrust, Label Studio Cloud, Langfuse Cloud) | Customer data residency and confidentiality; per-unit costs scale with volume | Prefer self-host for customer data; confirm DPA and region (Langfuse offers EU, US, JP, HIPAA regions) |

## 9. Sources

| # | URL | Title / description | Type | Accessed |
|---|---|---|---|---|
| 1 | https://langfuse.com/docs/open-source | Langfuse open source / licensing overview | Official docs | 2026-10-20 |
| 2 | https://langfuse.com/pricing | Langfuse Cloud pricing | Official pricing | 2026-10-20 |
| 3 | https://langfuse.com/pricing-self-host | Langfuse self-host pricing and feature table | Official pricing | 2026-10-20 |
| 4 | https://langfuse.com/self-hosting | Langfuse self-hosting architecture | Official docs | 2026-10-20 |
| 5 | https://langfuse.com/docs/evaluation/evaluation-methods/annotation-queues | Annotation queues | Official docs | 2026-10-20 |
| 6 | https://langfuse.com/docs/evaluation/scores/data-model | Scores data model | Official docs | 2026-10-20 |
| 7 | https://langfuse.com/docs/administration/rbac | RBAC | Official docs | 2026-10-20 |
| 8 | https://langfuse.com/docs/evaluation/experiments/datasets | Datasets | Official docs | 2026-10-20 |
| 9 | https://langfuse.com/docs/evaluation/evaluation-methods/llm-as-a-judge | LLM-as-a-judge | Official docs | 2026-10-20 |
| 10 | https://langfuse.com/docs/api-and-data-platform/features/public-api | Public API | Official docs | 2026-10-20 |
| 11 | https://github.com/langfuse/langfuse (LICENSE, ee/LICENSE, docker-compose.yml, web/src/ee/features) | Langfuse repo | Repo | 2026-10-20 |
| 12 | https://langfuse.com/blog/joining-clickhouse | Langfuse joins ClickHouse | Official blog | 2026-10-20 |
| 13 | https://www.infoworld.com/article/4118621/clickhouse-buys-langfuse-as-data-platforms-race-to-own-the-ai-feedback-loop.html | ClickHouse buys Langfuse | Independent | 2026-10-20 |
| 14 | https://labelstud.io/guide/label_studio_compare | Label Studio Community vs Enterprise | Official docs | 2026-10-20 |
| 15 | https://labelstud.io/guide/export | Label Studio export formats | Official docs | 2026-10-20 |
| 16 | https://labelstud.io/templates/gallery_generative_ai | Label Studio GenAI templates | Official docs | 2026-10-20 |
| 17 | https://labelstud.io/guide/frontend | Label Studio frontend embedding | Official docs | 2026-10-20 |
| 18 | https://humansignal.com/pricing/ | HumanSignal pricing | Official pricing | 2026-10-20 |
| 19 | https://github.com/HumanSignal/label-studio | Label Studio repo | Repo | 2026-10-20 |
| 20 | https://github.com/argilla-io/argilla (README, releases, develop commits, docker-compose) | Argilla repo | Repo | 2026-10-20 |
| 21 | https://docs.argilla.io/latest/how_to_guides/dataset/ | Argilla dataset settings | Official docs | 2026-10-20 |
| 22 | https://docs.argilla.io/latest/how_to_guides/distribution/ | Argilla task distribution | Official docs | 2026-10-20 |
| 23 | https://pypi.org/project/argilla/ | Argilla on PyPI | Package registry | 2026-10-20 |
| 24 | https://www.comet.com/docs/opik/evaluation/annotation_queues | Opik annotation queues | Official docs | 2026-10-20 |
| 25 | https://github.com/Arize-ai/phoenix/blob/main/LICENSE | Phoenix Elastic License 2.0 | Repo | 2026-10-20 |
| 26 | https://arize.com/docs/phoenix/tracing/llm-traces/how-to-annotate-traces | Phoenix annotations | Official docs | 2026-10-20 |
| 27 | https://www.braintrust.dev/pricing | Braintrust pricing | Official pricing | 2026-10-20 |
| 28 | https://prodi.gy/buy | Prodigy pricing | Official pricing | 2026-10-20 |
| 29 | https://www.cvat.ai/pricing/cloud | CVAT cloud pricing | Official pricing | 2026-10-20 |
| 30 | https://github.com/davidjurgens/potato | Potato repo | Repo | 2026-10-20 |
| 31 | https://inspect.aisi.org.uk/human-agent.html | Inspect human agent | Official docs | 2026-10-20 |
| 32 | https://harborframework.com/ | Harbor | Official site | 2026-10-20 |
| 33 | https://futurumgroup.com/?p=87434 | OpenAI acquires Promptfoo | Independent | 2026-10-20 |
| 34 | https://news.bgov.com/private-equity/openai-buying-ai-security-startup-promptfoo-to-safeguard-agents | OpenAI buying Promptfoo | Independent | 2026-10-20 |
| 35 | https://github.com/treeverse/lakeFS/blob/master/LICENSE | lakeFS BSL 1.1 | Repo | 2026-10-20 |
| 36 | https://github.com/minio/minio | MinIO repo (archived, AGPL-3.0) | Repo | 2026-10-20 |
| 37 | https://api.github.com/repos/{owner}/{repo} and https://github.com/{owner}/{repo}/releases.atom, /commits.atom for: comet-ml/opik, Arize-ai/phoenix, openai/evals, promptfoo/promptfoo, UKGovernmentBEIS/inspect_ai, EleutherAI/lm-evaluation-harness, confident-ai/deepeval, vibrantlabsai/ragas, stanford-crfm/helm, cvat-ai/cvat, doccano/doccano, treeverse/dvc, huggingface/datasets, OpenLineage/OpenLineage, MarquezProject/marquez, SWE-bench/SWE-bench, sierra-research/tau-bench, sierra-research/tau2-bench, harbor-framework/harbor, harbor-framework/terminal-bench-1, huggingface/lerobot, google-research/rlds, tensorflow/datasets, foxglove/mcap, rerun-io/rerun, mlflow/mlflow, wandb/weave, argilla-io/distilabel | Repo metadata (stars, license, releases, commits) | Repo | 2026-10-20 |
| 38 | https://pypi.org/pypi/{package}/json and https://registry.npmjs.org/{package} | Package versions and licenses | Package registry | 2026-10-20 |
