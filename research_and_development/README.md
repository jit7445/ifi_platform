# Infollion Expert-Powered AI Training and Evaluation Platform: Research and Development

Date: 2026-10-20. Status: Phase 0 complete, Phase 1 build started in `../platform/`.

## Executive summary

**Recommendation: build the expert evaluation loop first, sold as a priced pilot, and defer physical AI.**

1. **What to build first.** A Track A Evaluation MVP: customers upload prompts and model outputs, Infollion's verified experts score them against versioned rubrics, correct answers and state pairwise preferences, a share of items is double-rated, disagreements are adjudicated by senior reviewers, and the customer receives a quality report (agreement, gold accuracy, error taxonomy) plus JSONL exports for evaluation results, SFT and preference pairs. See `planning/mvp_scope.md`.

2. **Why this first.**
   - It uses Infollion's actual asset, a vetted multi-domain expert network, and needs no hardware or model-training infrastructure.
   - Demand is visible: Appen now positions itself as "human data for frontier AI" with SME RLHF, reasoning traces, verifiers and agent trajectories (`research/appen_research.md`); Nxted.ai sells India-sourced expert evaluation to UK, EU and US labs with published entry pricing (free 20-output kit, GBP 249 sprint, retainers from GBP 1,500 per month, all company claims) (`research/nxted_research.md`).
   - Research on training methods shows expert value moving toward rubrics, verifiers and hard expert-written evaluation sets, where agreement between experts is itself a sellable quality signal (`research/ai_training_and_evaluation.md`).
   - Public expert pay benchmarks (USD 40 to 180 per hour on several platforms) and a worked example (about USD 19 cost and USD 35 price for a 15 minute medical item) suggest viable margins for India-based experts; all prices are hypotheses to validate (`research/market_and_business_model.md`).

3. **Build versus buy.** No evaluated open-source tool covers expert vetting, conflict checks, overlap assignment, adjudication, inter-rater reliability, payouts or multi-tenant delivery, so that layer is built in-house. Langfuse (MIT core) joins in Phase 3 behind an adapter for traces, experiments and opt-in LLM-as-a-judge. Label Studio Community is the candidate multimodal editor. Argilla is not used as a dependency because its maintainers state no new features will be added (`research/tooling_and_frameworks.md`, ADR-006 to ADR-008).

4. **Architecture.** Modular monolith (FastAPI, PostgreSQL, Postgres-backed job queue, S3), Next.js frontend, shared-schema tenancy with row-level security including assignment-scoped expert access, immutable rubric and dataset versions, AWS Mumbai with Hyderabad DR to keep data in India (`architecture/`, `planning/architecture_decisions.md`).

5. **Differentiators to test.** Verified senior experts with credential summaries, a published QA methodology (Krippendorff's alpha, gold items, adjudication logs), India data residency, Indic-language and India-domain expertise, and practitioner-led agent evaluation (`research/competitive_analysis.md`). All are hypotheses to validate with design partners.

6. **Biggest risks.** No design partner before build completes; consultants not yet calibrated as raters; expert IP assignment drafting; DPDP readiness (plan for 13 Nov 2026 in case the proposed earlier date is confirmed); cross-tenant leakage (`planning/risk_register.md`).

7. **Physical AI (Track B).** Not in the initial product. Optional partnered pilot after Phase 1 with no hardware spend; in-house capture only after paying Track A customers, a co-funded robotics pilot and counsel sign-off on biometric consent (ADR-015).

8. **Decisions needed from Infollion leadership.** Pilot domain and design partner (OQ-01), pilot pricing model (OQ-02), expert capacity (OQ-03), cloud provider (OQ-10), and engagement of counsel for OQ-20 to OQ-28 (`planning/open_questions.md`).

## Scope boundaries

- Human evaluation, training-data creation and model training are different capabilities. Infollion provides the first two. It does not train customer models.
- Data types are not interchangeable: preference pairs, SFT demonstrations, rubric scores and verifiable-reward prompts serve different methods (`research/ai_training_and_evaluation.md`).
- Legal points are research for counsel, not legal advice.

## How this folder was produced

Seven specialised research agents ran in parallel (Appen, Nxted, AI training, tooling, architecture, product and operations, security and governance), each saving its working notes to `agents/`. Three synthesis agents then produced the competitive analysis, product documents and source register. The lead architect resolved contradictions in `planning/architecture_decisions.md`:

| Contradiction | Resolution |
|---|---|
| Langfuse in Phase 2 (architecture agent) vs Phase 3 (tooling, roadmap) | Phase 3 (ADR-007) |
| MFA for privileged users only vs for all accounts | All accounts (ADR-005) |
| Better Auth in Next.js vs one auth surface | FastAPI-native for Phase 1, Better Auth or OIDC broker before enterprise SSO (ADR-005) |
| Tenant-only RLS vs assignment-scoped expert access | Assignment-scoped RLS added (ADR-017) |
| MinIO locally vs MinIO archived and AGPL | Local development only, pinned, vendor-neutral adapter (ADR-011) |

Research limitations: REA browser tools could not attach to a browser (no Chrome debugging port), so most pages were fetched with WebFetch, and JavaScript-only Appen pages were not read; Appen investor PDFs were unreadable without PDF tooling; some government and OpenAI pages returned 403. Details in `sources/research_sources.md`.

## Folder map

| Path | Contents |
|---|---|
| `research/` | Appen, Nxted, competitive analysis, AI training and evaluation, tooling, market and business model, security and compliance |
| `agents/` | Raw findings from each research agent |
| `product/` | PRD, personas and roles, user stories, workflows 1 to 5, feature prioritisation, acceptance criteria |
| `architecture/` | System, components, database, API, data pipeline, security, deployment, Mermaid diagrams |
| `planning/` | MVP scope, roadmap, risk register, open questions, ADRs |
| `sources/` | Source register and decision-to-evidence map |

## Deliverables checklist

| # | Deliverable | Location |
|---|---|---|
| 1 | Research report on Appen and Nxted.ai | `research/appen_research.md`, `research/nxted_research.md` |
| 2 | Competitive feature matrix | `research/competitive_analysis.md` |
| 3 | Tool and framework recommendation | `research/tooling_and_frameworks.md` |
| 4 | Product requirements document | `product/product_requirements.md` |
| 5 | End-to-end business and technical workflow | `product/workflows.md`, `architecture/diagrams/workflow.mmd` |
| 6 | System architecture with diagrams | `architecture/system_architecture.md`, `architecture/diagrams/` |
| 7 | PostgreSQL schema and ER diagram | `architecture/database_design.md`, `architecture/diagrams/database_erd.mmd` |
| 8 | MVP API contracts | `architecture/api_design.md`, `../platform/docs/mvp_api_contract.md` |
| 9 | Security and data-governance requirements | `architecture/security_architecture.md`, `research/security_and_compliance.md` |
| 10 | Phased roadmap | `planning/implementation_roadmap.md` |
| 11 | Open questions | `planning/open_questions.md` |
| 12 | Risk register | `planning/risk_register.md` |
| 13 | Architecture decision record | `planning/architecture_decisions.md` |
| 14 | Executive summary | this file |
