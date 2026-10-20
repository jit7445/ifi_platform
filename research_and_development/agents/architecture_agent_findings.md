# Architecture Agent Findings

Agent: Architecture Agent. Date: 2026-10-20.
Scope: platform architecture for Infollion's expert-powered AI evaluation and training-data platform (Track A MVP, Track B extension points). Security architecture is left to the security agent.

Outputs:
- `architecture/system_architecture.md`
- `architecture/component_design.md`
- `architecture/database_design.md`
- `architecture/api_design.md`
- `architecture/data_pipeline.md`
- `architecture/deployment_architecture.md`
- `architecture/diagrams/system_context.mmd`, `database_erd.mmd`, `workflow.mmd`

---

## 1. Framing

The product is a workflow system with strong data-integrity requirements, not a high-throughput data system. The hard problems are:

1. **Correctness of the evaluation workflow**: overlap, review sampling, agreement, adjudication, rework, gold and calibration, all with clean state transitions and no double counting.
2. **Provenance and immutability**: customers buy datasets and benchmarks; every label must be traceable to rubric version, dataset version, submissions and (pseudonymous) experts, and published artifacts must not change underneath them.
3. **Tenant isolation with a cross-tenant workforce**: experts and internal staff work across customer orgs, which breaks the naive "one user belongs to one tenant" model.
4. **Conflict of interest and trust**: expert matching must exclude conflicted experts and explain its choices to PMs.
5. **Small team operability** and Indian data residency.

Volume (year 1: millions of rows, tens of thousands of submissions/day) is well within a single PostgreSQL primary. That observation drives most decisions toward fewer moving parts.

---

## 2. Decisions, options and trade-offs

### 2.1 Architecture style: modular monolith (kept from brief)

- Options: microservices; modular monolith; serverless functions.
- Chosen: modular monolith (FastAPI) with module-owned tables, `interface.py` boundaries enforced by import-linter, and outbox events for side effects.
- Why: the submission path must atomically write submission + task counters + outbox; microservices would turn that into a saga. Team size and MVP timeline favour one deployable.
- Exit paths: `media` (Track B) and `metrics` are the first candidates to extract; both already communicate via events and object storage.

### 2.2 Job queue: Procrastinate on PostgreSQL + transactional outbox

| Option | Assessment |
|---|---|
| Celery + Redis | Mature but adds Redis, non-transactional enqueue, weak async, operational quirks (visibility timeout, prefetch). |
| RQ | Too simple (sync, Redis only). |
| Dramatiq | Clean, reliable; runner-up. Still needs Redis/RabbitMQ. |
| arq | asyncio and light, but Redis-only and small maintainer base. |
| Procrastinate | Postgres-backed; verified in docs: PostgreSQL 13+, Python 3.10+, async workers (`defer_async`, `run_worker_async`), retry strategies, periodic tasks, task locks/queueing locks. **Chosen.** |
| PgQueuer | Postgres, `FOR UPDATE SKIP LOCKED`, LISTEN/NOTIFY, cron schedules, batching; API changed across early versions. Fallback. |
| Temporal | Best for long-running, multi-step, timer-heavy workflows; heavy to run (or Temporal Cloud, which moves workflow data out of India unless self-hosted). Deferred to Track B media processing. |

Trade-off accepted: queue load on the primary DB and a lower throughput ceiling, in exchange for no extra datastore, jobs included in backups/PITR, and SQL-inspectable job state. A thin `core.jobs` facade keeps migration to Dramatiq/SQS/Temporal contained. I chose an explicit `outbox_events` table rather than relying on enqueueing jobs inside the domain transaction, so the design does not depend on sharing one DB connection between SQLAlchemy and the queue library.

### 2.3 Authentication: Better Auth (Next.js) + JWT/JWKS verification in FastAPI

Evidence checked:
- authjs.dev states "The Auth.js project is now part of Better Auth", so new projects should start on Better Auth.
- Better Auth JWT plugin exposes `/api/auth/jwks`, defaults to EdDSA (Ed25519), 15-minute expiry, optional key rotation with grace period; tokens obtainable server-side.
- Better Auth SSO plugin supports OIDC (discovery) and SAML 2.0 (SP with signed AuthnRequests, replay and timestamp validation), with organization provisioning; the self-service SSO admin dashboard is a paid infrastructure offering.

Options compared: Better Auth, Auth.js, Keycloak, WorkOS, Clerk, FastAPI-native sessions (Authlib). Chosen Better Auth because it keeps identity data in our own Postgres in India, has no per-MAU fees (experts may number in the thousands), covers OAuth, 2FA and later SSO, and integrates natively with Next.js. FastAPI stays authoritative for authorization (memberships, staffing, assignments), so identity provider changes never touch permission logic. Keycloak remains the fallback if a customer needs SCIM or IdP brokering; WorkOS if residency is not a concern for a given enterprise.

Risk: two languages near auth. Mitigation: FastAPI only verifies JWTs (standard, small surface), plus a single user-sync hook.

### 2.4 Tenancy: shared schema, `org_id` everywhere, composite tenant FKs, RLS as defense in depth

- Options: database per tenant, schema per tenant, shared schema with RLS, shared schema app-only filtering.
- Chosen: shared schema; every tenant row has `org_id`; parents expose `UNIQUE (org_id, id)` and children use composite FKs so cross-tenant references are impossible at the DB level; Postgres RLS with `FORCE ROW LEVEL SECURITY` keyed on `SET LOCAL app.org_id`.
- Cross-tenant workforce handling: customer data rows carry the customer `org_id` even when written by experts; expert identity data lives in the platform org; experts read their own assignments across tenants via a dedicated policy, and the API then switches `app.org_id` to the assignment's org after verifying it. Staff do the same after checking `project_staff`. Operators use a separate `BYPASSRLS` pool on narrow, audited paths.
- Trade-offs: some planner overhead and test complexity; risk of forgetting RLS on new tables (CI check); context must be set in workers too (`tenant_session()` used everywhere). Benefits: one migration path, cross-tenant expert workflows remain simple, and a missing filter cannot leak data.
- Escape hatch: dedicated RDS or full regional cell for customers that require physical isolation or non-Indian residency.

### 2.5 Database: PostgreSQL 18 on RDS

- Evidence: postgresql.org lists 18 as current (18.6), EOL Nov 2030; PG14 EOL Nov 12, 2026, so nothing new should start below 16. AWS announced RDS for PostgreSQL 18 GA on Nov 14, 2025, with later minors (18.3, 18.4) available.
- PG18 gives native `uuidv7()` (time-ordered keys), B-tree skip scan (helps composite tenant indexes), parallel GIN builds. PG17 fallback is trivial (app-generated UUIDv7).
- Text + CHECK instead of ENUM types for state columns to keep migrations lock-light.

### 2.6 Data model choices

- **Content-addressed dataset items + immutable version membership**: versions share unchanged items; manifests with sha256 and provenance make deliveries reproducible and diffable.
- **Rubric versions immutable once published**, tasks pinned to a rubric version; submissions validated against that exact version. Cross-version comparisons only on criteria whose definition hash is unchanged.
- **Pool assignment with leases** as default (experts pull next task under `SKIP LOCKED`), direct assignment available. This scales PM effort: PMs approve experts per project/batch, not per task, which still satisfies "PM approves assignments".
- **Slot randomisation per assignment** for pairwise/ranking to measure and cancel position bias.
- **Agreement**: Krippendorff's alpha as primary (handles missing data and variable annotator sets, which pool assignment produces), with Fleiss/Cohen kappa and raw agreement reported alongside.
- **Gold items** serve both calibration (visible feedback) and hidden QA (indistinguishable from normal tasks).
- **Usage records with idempotency keys** derived from domain events, so billing is replay-safe.
- **Pseudonymous expert identity** toward customers and blind customer identity toward experts by default, reducing both poaching risk and bias.

### 2.7 Storage: S3 with DB-tracked metadata and presigned URLs

- All uploads and downloads go direct to S3 via presigned URLs; the API never proxies large bodies.
- `stored_objects` is the source of truth; keys are server-generated and prefixed by `orgs/{org_id}/`, enabling per-tenant lifecycle, deletion and optional per-org KMS keys (crypto-shredding).
- MinIO locally with identical code path (boto3 `endpoint_url`).

### 2.8 Deployment: AWS ap-south-1, ECS Fargate, RDS Multi-AZ, DR in ap-south-2

- Options: ECS Fargate, EKS, App Runner, EC2 + compose, other clouds (Azure Central India, GCP Mumbai).
- Chosen ECS Fargate (no cluster ops, ARM64 to save cost) with Terraform; ap-south-2 (Hyderabad) as DR keeps data in India.
- RPO/RTO: AZ failure RPO ~0, RTO minutes. Regional: RTO 4 h target; RPO 4 h during early MVP via cross-region snapshot copies, upgraded to 5 min with a cross-region read replica before the first enterprise contract. This staged approach is stated explicitly rather than over-promising.
- Indicative prod infra cost USD 900 to 1,400/month at MVP scale.

### 2.9 No Redis in MVP

Rate-limit buckets, idempotency keys, job queue and caches are in Postgres. Valkey (ElastiCache) is added when request volume or dashboard caching needs it. This removes one stateful service from day-one operations.

### 2.10 Observability and audit

- OpenTelemetry traces spanning request -> outbox -> job; structured logs without payloads or PII.
- Audit log append-only (triggers + revoked privileges), monthly partitions, optional hash chain written by a single writer and anchored nightly to an S3 Object Lock bucket. Every signed download URL issuance is audited.

---

## 3. Risks and open questions

| Risk / question | Impact | Proposed handling |
|---|---|---|
| Procrastinate maintenance or performance surprises | queue stalls | `core.jobs` facade; PgQueuer/Dramatiq fallbacks; load test 50 jobs/s on staging before launch |
| Better Auth maturity for enterprise SSO at scale | enterprise deals | SSO plugin supports OIDC and SAML; Keycloak broker as fallback; decide when first SSO customer signs |
| RLS performance on large scans (metrics, exports) | slow jobs | indexes lead with `org_id`/`project_id`; metrics read via project-scoped queries; benchmark on 10M-row fixtures |
| Agreement thresholds per task type need calibration | quality and cost | start with configurable defaults; measure first projects; ADR-007 revisited after 3 projects |
| Expert pool matching quality with little history | quality | conservative priors, mandatory calibration, PM override with explanation |
| Legal: DPDP Act obligations, cross-border transfers, expert contracts, data retention | compliance | security/legal agents; residency default India; consent_records table ready |
| GST and invoicing correctness | finance | finance review before first invoice; invoices issued manually in MVP |
| Customer requirement to keep data in their own cloud | sales | regional cell and BYO bucket options documented; on-prem not in MVP |
| Track B media volume and processing complexity | later phase | separate media workers, Temporal ADR, storage tiering; schema extension points already reserved |

Open questions for product/business:
1. Pricing model: per completed task, per expert hour, or per project? Schema supports all via meters and rate cards.
2. Should customers ever see expert identities (e.g. for regulated domains requiring named sign-off)? Currently a per-project setting.
3. Expected largest single upload (rows and GB)? MVP cap is 2 GiB per file.
4. Do any launch customers require SSO or non-Indian residency in the first 6 months?
5. Is AI-assisted pre-scoring (LLM judge) in scope for MVP? If yes, Langfuse self-hosted for tracing becomes relevant.

---

## 4. Suggested build order (architecture view)

1. Foundations: repo layout, compose stack, Alembic baseline with RLS helper, Better Auth + JWKS verification, orgs/memberships/roles, audit and outbox plumbing, CI with RLS test.
2. Projects, rubrics (versioning, publish), uploads + ingestion, datasets/versions, model runs.
3. Experts (profiles, skills, credentials, availability, conflicts), matching, assignments (pool mode), expert workbench, submissions.
4. QA: gold/calibration, review sampling, agreement check, adjudication, rework.
5. Metrics and customer dashboards; dataset curation and freeze; exports (benchmark, SFT, preference pairs, red-team).
6. Usage metering and invoice drafts; webhooks; staging hardening, load tests, DR drill; production launch.
7. Phase 2: enterprise SSO, Langfuse connector, model endpoint connector for automated regression runs, payouts, Track B.

---

## 5. Sources consulted (fetched 2026-10-20, treated as data)

- Procrastinate documentation: https://procrastinate.readthedocs.io/en/stable/
- PgQueuer on PyPI: https://pypi.org/project/PgQueuer/
- Auth.js homepage (merger notice): https://authjs.dev/
- Better Auth JWT plugin: https://www.better-auth.com/docs/plugins/jwt
- Better Auth SSO plugin: https://www.better-auth.com/docs/plugins/sso
- PostgreSQL versioning policy: https://www.postgresql.org/support/versioning/
- AWS What's New, RDS for PostgreSQL 18: https://aws.amazon.com/about-aws/whats-new/2025/11/amazon-rds-postgresql-major-version-18
- AWS RDS PostgreSQL release notes: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html

Cost figures are rounded on-demand estimates for planning and should be confirmed with the AWS Pricing Calculator for ap-south-1.
