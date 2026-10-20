# Feature Prioritization

Date: 2026-10-20
Related: `product_requirements.md` (FR IDs, phases), `user_stories.md`, `../planning/implementation_roadmap.md` (effort ranges), `../planning/architecture_decisions.md` (ADR-006, ADR-007, ADR-008, ADR-015 drive the build, integrate or postpone column).

## 1. Method

### 1.1 MoSCoW

MoSCoW is judged against one milestone: **the Track A commercial offering at the end of Phase 2** (evaluation pilots plus dataset delivery). Therefore:

- **Must**: required for the Phase 1 pilot or named in the Phase 1 or Phase 2 acceptance criteria of the roadmap.
- **Should**: Phase 2 scope that materially improves a package but can slip one release without breaking a contract; Phase 1 items that are conditional on a trigger.
- **Could**: Phase 2 nice-to-have, or Phase 3 and 4 work that starts only on customer demand.
- **Won't (now)**: Phase 4 items that need a specific trigger (enterprise contract, SSO request) and Phase 5 (Track B).

### 1.2 RICE

RICE = Reach x Impact x Confidence / Effort. It ranks features **within** a phase; it does not override phase gating or ADRs. Where MoSCoW and RICE disagree (for example F-28 is Must with a modest RICE score because the roadmap's Phase 2 acceptance criteria require loader-tested exports), MoSCoW and the roadmap win and the RICE score signals that the effort should be kept tight.

Assumptions:

| Factor | Definition | Assumption |
|---|---|---|
| Reach | Customer projects affected in the first 12 months of commercial operation | 12 projects across about 6 customers in year one (planning estimate, not a forecast). Core workflow features reach all 12. Package-specific features reach the projects expected to buy that package: preference about 5, benchmark and SFT authoring about 4, red-team about 2, monitoring about 3, agent and multimodal about 2 each. Staff-facing features use 12 because every project depends on them. |
| Impact | Effect on a project's ability to deliver and sell | 3 = blocks delivery or a contractual or security obligation; 2 = high (quality, trust or major time saving); 1 = medium; 0.5 = low; 0.25 = minimal. |
| Confidence | Confidence in reach, impact and effort | 100% = specified in ADRs or MVP scope with evidence; 80% = specified but estimates uncertain; 50% = demand or integration risk unvalidated. |
| Effort | Engineer-weeks (ew) | Feature-level split of the roadmap ranges: Phase 1 features sum to 24 ew (roadmap 17 to 28 ew; hardening milestone M1.6 not included), Phase 2 to 17.25 ew (roadmap 12 to 18), Phase 3 to 24 ew (16 to 26), Phase 4 to 23.5 ew (20 to 32 plus audit firm), Phase 5 placeholder 30 ew (20 to 40 plus hardware). |

### 1.3 Build, integrate or postpone

- **Build**: the expert workflow layer is Infollion's core product and is built in-house (ADR-006): onboarding, credentials, COI, assignment with overlap and leases, adjudication, IRR analytics, payout records, item-level RBAC, multi-tenant delivery. The Phase 1 text workbench is custom (ADR-008).
- **Integrate**: open-source or third-party components behind an adapter: Presidio (PII, self-hosted per ADR-014), Procrastinate (jobs, ADR-004), Langfuse in Phase 3 behind `eval_engine` (ADR-007), Label Studio Community for multimodal in Phase 3 (ADR-008), Inspect AI in Phase 3, transactional email, WebAuthn for passkeys.
- **Postpone**: Track B physical AI (ADR-015), enterprise SSO and SCIM until triggered (ADR-005), invoicing and payouts automation, e-signature, self-serve billing. "Postpone, then X" states how the item will be delivered once its trigger arrives.
- **Not adopted**: Argilla as a dependency (no new features per its README, ADR-008), hosting Arize Phoenix for third parties (Elastic 2.0), lakeFS for hosted or modified use (BSL 1.1), GPL-3.0 Potato in distributed code, MinIO in production (archived; local emulator only, ADR-011).

## 2. Prioritization table

| ID | Feature | FR | Phase | MoSCoW | Reach | Impact | Confidence | Effort (ew) | RICE | Build / Integrate / Postpone | Basis |
|---|---|---|---|---|---|---|---|---|---|---|---|
| F-01 | Orgs, users, roles, default-deny RBAC | FR-001 to FR-003, FR-012 | 1 | Must | 12 | 3 | 100% | 1.0 | 36.0 | Build | ADR-006 |
| F-02 | FastAPI-native auth, mandatory TOTP MFA, step-up, sessions | FR-004 to FR-007 | 1 | Must | 12 | 3 | 100% | 1.0 | 36.0 | Build | ADR-005 |
| F-03 | Tenant RLS plus assignment-scoped RLS and CI isolation suite | FR-117, NFR-003, NFR-004 | 1 | Must | 12 | 3 | 100% | 1.5 | 24.0 | Build | ADR-003, ADR-017 |
| F-04 | Projects, lifecycle, quality config, contract and launch gating | FR-020 to FR-030 | 1 | Must | 12 | 3 | 100% | 1.0 | 36.0 | Build | ADR-006 |
| F-05 | Versioned immutable rubrics with error taxonomy | FR-040 to FR-046 | 1 | Must | 12 | 3 | 100% | 1.0 | 36.0 | Build | ADR-010 |
| F-06 | JSONL/CSV ingestion via presigned upload, validation, content hashes | FR-060 to FR-063, FR-065 | 1 | Must | 12 | 3 | 100% | 1.5 | 24.0 | Build | ADR-011 |
| F-07 | In-house PII scan and redaction policy | FR-064, FR-222 | 1 | Must | 12 | 2 | 80% | 0.75 | 25.6 | Integrate | Presidio self-hosted; ADR-014 |
| F-08 | Expert profiles, credentials, COI, consent records, KYC status | FR-080 to FR-089 | 1 | Must | 12 | 3 | 100% | 1.0 | 36.0 | Build | ADR-006 |
| F-09 | Matching recommendations with reasons and hard exclusions | FR-100 to FR-103 | 1 | Must | 12 | 2 | 80% | 0.75 | 25.6 | Build | ADR-006 |
| F-10 | Task generation, overlap, leasing and allocation | FR-110 to FR-119 | 1 | Must | 12 | 3 | 100% | 1.5 | 24.0 | Build | ADR-006; Procrastinate behind jobs facade (ADR-004) |
| F-11 | Text workbench: rubric form, pairwise, corrections, autosave | FR-130 to FR-138, FR-140, FR-141 | 1 | Must | 12 | 3 | 100% | 2.5 | 14.4 | Build | ADR-008 custom text UI |
| F-12 | Workbench content protection (watermark, CSP, friction) | FR-135 | 1 | Must | 12 | 2 | 80% | 0.75 | 25.6 | Build | SEC-030 to SEC-034 |
| F-13 | Gold, overlap consensus, review, adjudication, rework, escalation | FR-150 to FR-162 | 1 | Must | 12 | 3 | 100% | 2.0 | 18.0 | Build | ADR-006 |
| F-14 | Agreement engine: Krippendorff alpha plus percent agreement with CIs | FR-180, FR-187 | 1 | Must | 12 | 3 | 80% | 0.75 | 38.4 | Build | ADR-009; wraps OSS statistics code |
| F-15 | Dashboards and downloadable quality report | FR-182 to FR-186 | 1 | Must | 12 | 2 | 100% | 1.25 | 19.2 | Build | MVP scope "Reports"; success criterion 5 |
| F-16 | Typed JSONL exports with manifest and signed URLs | FR-200 to FR-202, FR-215 to FR-221 | 1 | Must | 12 | 3 | 100% | 1.25 | 28.8 | Build | ADR-010, ADR-011, ADR-016 |
| F-17 | Hash-chained append-only audit log | FR-265 to FR-268 | 1 | Must | 12 | 2 | 100% | 0.75 | 32.0 | Build | SEC-060, SEC-061 |
| F-18 | Usage records, earnings ledger, budget cap, finance CSV | FR-250 to FR-254 | 1 | Must | 12 | 2 | 80% | 0.5 | 38.4 | Build | MVP scope "Billing" |
| F-19 | Retention engine and two-person deletion with certificates | FR-269 | 1 | Must | 12 | 1 | 80% | 0.75 | 12.8 | Build | SEC-110 to SEC-112 |
| F-20 | C3 proxy streaming with burned-in watermark | FR-139 | 1 | Should | 3 | 2 | 50% | 1.0 | 3.0 | Build | ADR-017; only for C3 projects that need it |
| F-21 | Customer API keys and ingestion API | FR-008, FR-066 | 1 | Should | 6 | 1 | 80% | 0.5 | 9.6 | Build | `api_design.md` section 1 |
| F-22 | Staff OIDC sign-in via company IdP | FR-009 | 1 | Should | 12 | 0.5 | 50% | 0.5 | 6.0 | Integrate | ADR-005; depends on OQ-11 |
| F-23 | Email and in-app notifications, ops alerts | FR-280 to FR-282 | 1 | Must | 12 | 1 | 100% | 0.5 | 24.0 | Integrate | Transactional email service; in-app built |
| F-24 | Dataset curation, freeze workflow and diff | FR-203, FR-204 | 2 | Should | 8 | 2 | 80% | 2.0 | 6.4 | Build | ADR-010 |
| F-25 | Ranking tasks (k > 2) | FR-121 | 2 | Should | 3 | 1 | 80% | 1.0 | 2.4 | Build | Roadmap Phase 2 |
| F-26 | Red-team task type, safety taxonomy, wellbeing controls | FR-122, FR-188, FR-091 | 2 | Should | 2 | 2 | 50% | 1.5 | 1.3 | Build | Roadmap Phase 2; package 5.5 |
| F-27 | SFT and benchmark authoring tasks and editors | FR-123, FR-142 | 2 | Should | 4 | 2 | 80% | 1.5 | 4.3 | Build | Packages 5.2, 5.3 |
| F-28 | Parquet, HF datasets, TRL and OpenAI exporters with CI loader tests | FR-223, FR-224, FR-226 | 2 | Must | 6 | 2 | 80% | 2.0 | 4.8 | Build | ADR-016; uses HF datasets and TRL only as test loaders |
| F-29 | Deliveries with acceptance, disputes and superseding versions | FR-225, FR-164 | 2 | Must | 10 | 2 | 80% | 2.0 | 8.0 | Build | Workflow 4 |
| F-30 | Datasheet, quality certificate, signed provenance manifest | FR-205, FR-190, FR-227 | 2 | Should | 10 | 1 | 80% | 1.0 | 8.0 | Build | SEC-132, SEC-133 |
| F-31 | Expert calibration program and tiering | FR-090 | 2 | Should | 12 | 1 | 80% | 1.5 | 6.4 | Build | ADR-006 |
| F-32 | Payout report with tax fields | FR-255, FR-092 | 2 | Should | 12 | 1 | 80% | 1.0 | 9.6 | Build | Roadmap Phase 2 |
| F-33 | Customer webhooks | FR-283, FR-284 | 2 | Should | 4 | 1 | 80% | 1.0 | 3.2 | Build | `api_design.md` section 6 |
| F-34 | Customer audit view and data-handling summary | FR-270, FR-271 | 2 | Should | 6 | 1 | 80% | 1.0 | 4.8 | Build | SEC-064 |
| F-35 | Companion IRR metrics (Cohen, Fleiss, ICC, Kendall W) | FR-181 | 2 | Should | 8 | 1 | 80% | 0.75 | 8.5 | Build | ADR-009 |
| F-36 | Reviewer audit sampling | FR-163 | 2 | Could | 12 | 0.5 | 80% | 0.5 | 9.6 | Build | PRD section 10.5 |
| F-37 | Passkeys | FR-011 | 2 | Could | 12 | 0.25 | 80% | 0.5 | 4.8 | Integrate | ADR-005 "later"; WebAuthn library |
| F-38 | Model endpoint connectors and regression comparison | FR-241, FR-192 | 3 | Could | 4 | 2 | 50% | 4.0 | 1.0 | Build | SEC-095; roadmap Phase 3 |
| F-39 | Langfuse adapter (traces in, scores out) | FR-242 | 3 | Could | 2 | 1 | 50% | 3.0 | 0.3 | Integrate | ADR-007 |
| F-40 | Opt-in LLM-as-a-judge pre-scoring and judge calibration | FR-244, FR-165, FR-166, FR-051 | 3 | Could | 3 | 2 | 50% | 3.0 | 1.0 | Integrate | ADR-014 gate; provider via `ai_egress` |
| F-41 | Inspect AI integration for agent tasks | FR-243 | 3 | Could | 1 | 1 | 50% | 2.0 | 0.2 | Integrate | Roadmap Phase 3 |
| F-42 | Label Studio for image, audio, video | FR-125, FR-070 | 3 | Could | 2 | 2 | 50% | 4.0 | 0.5 | Integrate | ADR-008 |
| F-43 | Agent trajectory task type, viewer and exporter | FR-124, FR-071, FR-143, FR-230 | 3 | Could | 2 | 2 | 50% | 3.0 | 0.7 | Build | Roadmap Phase 3; package 5.7 |
| F-44 | Ongoing evaluation programs (cycles, anchors, scorecards, alerts) | FR-235 to FR-240, FR-245, FR-285 | 3 | Could | 3 | 2 | 50% | 5.0 | 0.6 | Build | Workflow 5; package 5.6 |
| F-45 | Customer SSO and SCIM | FR-010 | 4 | Won't (now) | 2 | 1 | 80% | 3.0 | 0.5 | Postpone, then Integrate | ADR-005 revisit trigger OQ-04 |
| F-46 | Per-tenant KMS keys, crypto-shredding, customer retention | FR-274, NFR-008 | 4 | Could | 2 | 1 | 80% | 4.0 | 0.4 | Postpone, then Build | Pulled to Phase 1 only for a C3 pilot (SEC-040) |
| F-47 | GST invoicing, rate cards, payouts integration, SLA reporting | FR-256 to FR-258, FR-260 | 4 | Won't (now) | 12 | 1 | 80% | 6.0 | 1.6 | Postpone, then Integrate | Phases 1 to 3 use existing Infollion finance processes |
| F-48 | Audit log export and external anchoring | FR-273 | 4 | Could | 3 | 0.5 | 80% | 2.0 | 0.6 | Postpone, then Build | SEC-060 conflict noted in PRD section 11 |
| F-49 | Cross-region replica (RPO 5 min) and dedicated cell option | NFR-033, NFR-042 | 4 | Could | 2 | 1 | 80% | 3.0 | 0.5 | Postpone, then Integrate | ADR-012 |
| F-50 | E-signature integration for contracts | FR-024 (extension) | 4 | Could | 12 | 0.25 | 80% | 1.5 | 1.6 | Postpone, then Integrate | Manual contract recording in Phase 1 |
| F-51 | Customer self-serve billing and payments | FR-259 | 4 | Won't (now) | 2 | 0.5 | 50% | 4.0 | 0.1 | Postpone | MVP scope out-of-scope list |
| F-52 | Physical AI capture, media pipeline, LeRobot/RLDS/HDF5 exporters | FR-072, FR-231 | 5 | Won't (this horizon) | 1 | 3 | 50% | 30.0 | 0.1 | Postpone | ADR-015 gate |

## 3. Ranking by phase (RICE, descending)

| Phase | Order |
|---|---|
| 1 | F-18 (38.4), F-14 (38.4), F-01, F-02, F-04, F-05, F-08 (36.0), F-17 (32.0), F-16 (28.8), F-07, F-09, F-12 (25.6), F-03, F-06, F-10, F-23 (24.0), F-15 (19.2), F-13 (18.0), F-11 (14.4), F-19 (12.8), F-21 (9.6), F-22 (6.0), F-20 (3.0) |
| 2 | F-32, F-36 (9.6), F-35 (8.5), F-29, F-30 (8.0), F-24, F-31 (6.4), F-28, F-34, F-37 (4.8), F-27 (4.3), F-33 (3.2), F-25 (2.4), F-26 (1.3) |
| 3 | F-38, F-40 (1.0), F-43 (0.7), F-44 (0.6), F-42 (0.5), F-39 (0.3), F-41 (0.2) |
| 4 | F-47, F-50 (1.6), F-48 (0.6), F-45, F-49 (0.5), F-46 (0.4), F-51 (0.1) |
| 5 | F-52 (0.1) |

Reading the ranking:

1. **Phase 1** is all Must except F-20, F-21 and F-22, which are conditional: F-20 only if the pilot is classified C3 (ADR-017), F-22 only when OQ-11 is resolved, F-21 when the design partner wants API ingestion. Sequencing follows the roadmap milestones (M1.1 foundations: F-01 to F-03, F-17, F-23; M1.2: F-04 to F-07; M1.3: F-08 to F-12; M1.4: F-13, F-14; M1.5: F-15, F-16, F-18, F-19), not the RICE order, because later features depend on the foundations.
2. **Phase 2** order suggests shipping the low-effort trust features first (payout report, reviewer audit, companion IRR), then deliveries and certificates, then the Must loader-tested exporters (F-28) before any new task type. Red-team (F-26) ranks low on RICE because of small reach and unvalidated demand, but carries high per-project value (USD 15,000 to 75,000 per campaign hypothesis in the market report); build it when a customer signs.
3. **Phase 3** items all score low because reach and confidence are unvalidated; each should start only when a named customer asks, consistent with the roadmap dependency "customer demand for ongoing monitoring". Model connectors and judge calibration lead because they unlock both regression testing and monitoring.
4. **Phase 4** items are triggered by enterprise contracts or security questionnaires, not by score.
5. **Phase 5** is gated by ADR-015 regardless of score.

## 4. Sensitivity

| Change in assumption | Effect |
|---|---|
| A frontier lab signs for preference data in Phase 1 | Reach for F-25 (ranking) and F-28 (TRL/HF formats) rises to about 8; both move up within Phase 2. |
| Pilot customer is health or BFSI with C3 data | F-20 becomes Must; F-46 per-tenant keys pulled into Phase 1 (SEC-040); PII auto-raise (FR-067) pulled forward. |
| First customer requires SSO | F-45 moves to the next release regardless of RICE (ADR-005 revisit trigger). |
| Agreement in the pilot is low on subjective criteria | F-35 (companion metrics) and F-36 (reviewer audit) gain impact; rubric templates (FR-048) gain reach. |
| Robotics co-funded pilot and counsel sign-off land early | F-52 remains Phase 5 but planning starts; Phase 4 items do not need to finish first unless required by the robotics customer's security review. |
