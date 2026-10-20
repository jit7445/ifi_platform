# Architecture Decision Records

Date: 2026-10-20. Status values: Accepted, Proposed (needs stakeholder confirmation), Superseded.

Each ADR names the evidence it rests on. Detailed option analysis lives in `agents/architecture_agent_findings.md` and `research/tooling_and_frameworks.md`.

## Index

| ID | Decision | Status |
|---|---|---|
| ADR-001 | Modular monolith (FastAPI) with module boundaries and an outbox | Accepted |
| ADR-002 | PostgreSQL as system of record, version 17+ (18 preferred) | Accepted |
| ADR-003 | Shared schema multi-tenancy with `org_id`, composite tenant FKs and RLS | Accepted |
| ADR-004 | Postgres-backed job queue (Procrastinate) behind a `jobs` facade, no Redis in MVP | Accepted |
| ADR-005 | Authentication: FastAPI-native for Phase 1, Better Auth or OIDC broker before enterprise SSO | Accepted (revises agent proposal) |
| ADR-006 | Build the expert workflow layer in-house | Accepted |
| ADR-007 | Langfuse as optional evaluation engine behind an adapter, Phase 3 | Accepted |
| ADR-008 | Label Studio Community as optional multimodal editor; no dependency on Argilla | Accepted |
| ADR-009 | Krippendorff's alpha as primary agreement metric, with per-type companions | Accepted |
| ADR-010 | Immutable rubric versions and frozen, content-addressed dataset versions | Accepted |
| ADR-011 | Object storage via presigned URLs, metadata in Postgres; S3 in prod, S3-compatible emulator locally | Accepted |
| ADR-012 | AWS ap-south-1 primary, ap-south-2 DR, ECS Fargate | Proposed |
| ADR-013 | Pseudonymous experts toward customers by default | Proposed |
| ADR-014 | No customer data to third-party AI services without explicit per-project opt-in | Accepted |
| ADR-015 | Track B (physical AI) deferred; extension points only | Accepted |
| ADR-016 | Typed deliverable exporters; no implicit conversion between data types | Accepted |
| ADR-017 | Assignment-scoped RLS for experts and classification-driven content delivery | Accepted |

---

## ADR-001 Modular monolith

- **Context:** The critical write path (submission + task counters + quality events) must be atomic. Year-one volume (millions of rows, tens of thousands of submissions per day) fits a single Postgres primary. The team is small.
- **Decision:** One FastAPI codebase deployed as two process types (`api`, `worker`) plus a Next.js frontend. Modules (`identity`, `orgs`, `experts`, `projects`, `rubrics`, `ingestion`, `tasks`, `evaluation`, `quality`, `datasets`, `exports`, `billing`, `audit`) own their tables and expose a public interface; import-linter enforces boundaries in CI. Side effects flow through an `outbox_events` table.
- **Consequences:** Simple deploys and transactions. Extraction candidates later: `metrics` and Track B `media`.
- **Evidence:** architecture_agent_findings.md section 2.1.

## ADR-002 PostgreSQL

- **Decision:** PostgreSQL 18 where available (RDS GA Nov 2025), 17 acceptable. UUIDv7 keys (app-generated so 17 works). Text + CHECK for states instead of ENUM types.
- **Evidence:** postgresql.org versioning page; AWS RDS PG18 announcement (see sources register).

## ADR-003 Tenancy

- **Decision:** Shared schema. Every tenant row carries `org_id`. Parents expose `UNIQUE (org_id, id)` and children reference `(org_id, parent_id)`. RLS with `FORCE ROW LEVEL SECURITY` keyed on `SET LOCAL app.org_id` as defense in depth behind application checks. Experts and staff are cross-tenant: the API verifies assignment or staffing, then sets the tenant context. Operators use a separate audited bypass role.
- **Trade-offs:** More test complexity and a CI check for RLS on every new table, in exchange for a missing filter not leaking data. Dedicated database or regional cell remains an escape hatch for regulated customers.
- **Evidence:** architecture_agent_findings.md 2.4; security_architecture.md RLS examples.

## ADR-004 Job queue

- **Decision:** Procrastinate (PostgreSQL 13+, async workers, retries, periodic tasks, locks per its docs) behind a thin `jobs` facade. Explicit transactional outbox. No Redis in MVP; Valkey only when measured load requires it.
- **Alternatives:** Celery+Redis (extra datastore, non-transactional enqueue), Dramatiq (runner-up), PgQueuer (fallback), Temporal (deferred to Track B media workflows).
- **Risk:** Queue load on the primary. Mitigation: load test before launch; facade allows swap.

## ADR-005 Authentication (revised)

- **Agent proposal:** Better Auth in Next.js issuing JWTs verified by FastAPI via JWKS.
- **Decision for Phase 1:** FastAPI-native authentication: Argon2id password hashes, short-lived access JWT (15 min), rotating refresh token in an httpOnly Secure SameSite cookie, TOTP MFA mandatory for every account (passkeys later), behind an `identity` interface. Infollion staff sign in through the company IdP via OIDC once its details are confirmed (OQ-11); until then staff use password plus TOTP.
- **Contradiction resolved:** The architecture agent's draft required MFA only for privileged users; the security agent requires it for all accounts (SEC requirements, `architecture/security_architecture.md`). The stricter rule wins because experts can read confidential customer content. All authorization (memberships, staffing, assignments) is already in FastAPI per the agent's design, so this keeps every security-relevant decision in one language and one service.
- **Why revised:** The agent's own risk note was "two languages near auth". For an MVP with a handful of customers and no SSO requirement yet, one auth surface is simpler to test and audit. The interface keeps Better Auth, Keycloak or WorkOS as drop-in options.
- **Revisit trigger:** First customer requiring SAML/OIDC SSO or SCIM (open question OQ-04).

## ADR-006 Build the expert workflow in-house

- **Context:** No evaluated open-source tool provides expert onboarding and credential checks, conflict-of-interest checks, assignment with overlap and leases, adjudication, human IRR analytics, payouts, item-level RBAC or multi-tenant customer delivery (tooling_and_frameworks.md "must build" list). Langfuse and Label Studio gate assignment, reviewer workflows, project RBAC and audit logs behind paid Enterprise editions.
- **Decision:** These capabilities are Infollion's core product and are built in-house.

## ADR-007 Langfuse

- **Decision:** Not in the Phase 1 critical path. In Phase 3, integrate self-hosted Langfuse (MIT core) behind an `eval_engine` adapter for customer trace ingestion, dataset experiments, LLM-as-a-judge evaluators and score export. Infollion's database stays the system of record for human judgments.
- **Contradiction resolved:** The architecture agent suggested a Phase 2 connector; the tooling agent and the requested roadmap place integrations in Phase 3. Phase 3 wins because Phase 1 and 2 value comes from the human workflow, and Langfuse self-hosting adds ClickHouse, Redis and S3 to operate.
- **Watch items:** Enterprise-only features on self-host (project RBAC, audit logs, retention), legacy ingestion API sunset on Cloud (2026-11-16), ownership change (ClickHouse acquisition, 2026-01-16).

## ADR-008 Annotation tools

- **Decision:** The Phase 1 text evaluation UI is custom (rubric forms, pairwise, ranking, corrections). Label Studio Community (Apache-2.0) is the candidate editor for image, audio and video in Phase 3, embedded via its frontend or used as a separate service with our own assignment layer. Argilla is used only as a data-model reference because its README states no new features will be added (last release v2.8.0, 2025-03-11).
- **Licensing guardrails:** Avoid hosting Arize Phoenix for third parties (Elastic 2.0), avoid lakeFS for modified/hosted use (BSL 1.1), avoid GPL-3.0 Potato in distributed code.

## ADR-009 Agreement metrics

- **Decision:** Krippendorff's alpha (nominal, ordinal or interval as appropriate) as primary since pool assignment produces variable rater sets and missing data. Report Cohen's kappa for fixed pairs, Fleiss' kappa for fixed rater counts, ICC for continuous scores, Kendall's W for rankings, and raw percent agreement always alongside. Default thresholds: alpha >= 0.800 reliable, 0.667 to 0.800 tentative, below 0.667 triggers adjudication or rubric revision. Thresholds are per-project configurable and revisited after three projects.
- **Evidence:** ai_training_and_evaluation.md quality metric guide (Krippendorff, McHugh, Koo and Li citations).

## ADR-010 Immutability and provenance

- **Decision:** Published rubric versions and frozen dataset versions are immutable (DB triggers). Dataset items are content-addressed (sha256). Each export carries a manifest with item hashes, rubric version, submission IDs, pseudonymous expert IDs and QA status. Tasks are pinned to a rubric version.

## ADR-011 Storage

- **Decision:** Direct-to-S3 presigned uploads and downloads (download URL TTL 5 minutes, every issuance audited). Server-generated keys under `orgs/{org_id}/...`. Postgres `stored_objects` holds metadata. Local development uses an S3-compatible emulator through the same boto3 code path.
- **Contradiction resolved:** The architecture uses MinIO locally; the tooling agent reports MinIO is archived and AGPL. AGPL is not triggered by unmodified local development use, but an archived image will not receive fixes. Decision: local only, pinned image, no production use, and the adapter stays vendor-neutral so the emulator can be swapped.

## ADR-012 Deployment (Proposed)

- **Decision:** AWS ap-south-1 (Mumbai), ECS Fargate ARM64, RDS Multi-AZ, S3 with SSE-KMS, Terraform. DR in ap-south-2 (Hyderabad) to keep data in India. RPO 4h / RTO 4h for regional failure in early MVP, moving to RPO 5 min with a cross-region replica before the first enterprise contract. Indicative cost USD 900 to 1,400 per month (estimate, to confirm with AWS calculator).
- **Proposed because:** Cloud provider choice depends on Infollion's existing contracts (OQ-10).

## ADR-013 Expert identity disclosure (Proposed)

- **Decision:** Customers see pseudonymous expert IDs plus verified credential summaries (for example "Board-certified cardiologist, 12 years") by default. Named disclosure is a per-project setting requiring expert consent. Experts see a blinded customer alias by default.
- **Why:** Reduces poaching risk and rater bias, while Nxted's public reports show credential transparency is a selling point (nxted_research.md).

## ADR-014 Third-party AI usage

- **Decision:** No customer data is sent to any external model provider (including LLM judges, PII detectors hosted by third parties) unless the project has an explicit, recorded opt-in naming the provider. Default PII detection runs in-house (Presidio). Enforced in code by an `ai_egress` gate that checks the project setting and writes an audit event.

## ADR-015 Track B deferred

- **Decision:** No physical AI capture in Phases 1 to 4. Reserve extension points (item schema registry, media storage kind, consent records, exporter registry for LeRobot, RLDS, HDF5). Re-evaluate after paying Track A customers and a co-funded robotics pilot (market_and_business_model.md).

## ADR-016 Typed deliverables

- **Decision:** Each deliverable type (benchmark, gold QA, SFT, preference pair, ranking, rubric-scored item, red-team item, agent trajectory) has its own schema and exporter. The platform never auto-converts, for example, rubric scores into preference pairs, because methods need different data and a "chosen" response is not necessarily a good response (TRL docs, ai_training_and_evaluation.md). Preference tasks always capture absolute acceptability, preference strength, and tie / both-bad flags.

## ADR-017 Assignment-scoped RLS and classification-driven delivery

- **Context:** The security agent found that the draft RLS in `database_design.md` scoped rows by tenant only, so an expert working inside a tenant context could in principle read any item of that tenant. Experts must see only items behind their own active assignments.
- **Decision:** Add an expert policy: for users acting as `expert`, `evaluation_tasks`, `dataset_items` and related payload rows are visible only when an active or submitted `task_assignments` row exists for that user (`app.user_id` session setting). Application checks remain the first line. Content is classified C1 to C4 (public, internal, confidential, restricted/biometric). C1 and C2 objects use presigned URLs (TTL 5 to 15 minutes). C3 and C4 content is streamed through an authenticated proxy with a per-viewer watermark and is never handed to the browser as a raw object URL; this proxy is Phase 1 for C3 projects that require it and mandatory before any C4 (Track B) data.
- **Evidence:** `architecture/security_architecture.md`, `research/security_and_compliance.md`.
