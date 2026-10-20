# Competitive Analysis: Appen, Nxted.ai and the Expert Data Market

- Prepared for: Infollion, expert-powered AI evaluation and training-data platform
- Date: 2026-10-20. Every external source cited here was accessed 2026-10-20.
- Method: synthesis only. All facts come from the existing research files listed below, with their citations and evidence labels carried over. No new web research was done for this file.
  - `research/appen_research.md`
  - `research/nxted_research.md`
  - `research/tooling_and_frameworks.md`
  - `research/market_and_business_model.md`
  - `research/ai_training_and_evaluation.md`
  - `research/security_and_compliance.md` and `architecture/system_architecture.md` (internal design, cited as INT)
- Evidence labels:
  - **FP**: first-party claim, from the company's own page, filing or listing.
  - **IND**: independent, meaning press, a registry, an analyst, a review site or a paper.
  - **INF**: inferred by an Infollion analyst.
  - **UNK**: unknown or not publicly documented.
  - **INT**: Infollion internal design decision, not external evidence.
- Bracketed IDs such as [A3] or [N2] point to the sources table in Section 7. Competitor figures are the companies' own claims unless labelled IND.
- Infollion's own strengths are stated as hypotheses. Claims about Infollion's network (verified profiles, senior experts, KYC) come from the internal research files and have not been independently audited.

---

## 1. Competitor positioning

### 1.1 Appen (ASX: APX)

- **Positioning.** Appen has moved from broad "AI training data" to "human data for frontier AI". It runs seven product lines: Frontier Alignment, Agentic AI, Multimodal and Speech AI, Physical AI, Model Integrity, Research Services and Coding Datasets. It also sells data through an off-the-shelf catalog and enterprise data licensing. [FP, A1]
- **Scale claims.**
  - 30 years in the market, 235+ languages and 500+ locales.
  - 1M+ contributors in 170+ countries.
  - 20K+ projects.
  - "80% of leading LLM builders" are customers.
  - [FP, A9, A12, A20]
- **Workforce.** Appen uses three tiers:
  - a general crowd
  - domain experts recruited through CrowdGen (PhD, MD and JD holders across about 50 domains), with contributor pay shown up to USD 450/hr for medical clinicians
  - specialist teams for software engineering, security and enterprise practice
  - [FP, A3, A20]
- **Platform.** ADAP provides workflow routing, multi-stage review, gold test questions (Quality Flow), AI-assisted pre-labelling, APIs, webhooks and AWS and Azure integration. [FP, A12]
- **Commercial model.**
  - No public pricing for any service, platform licence or dataset. Every page leads to "Talk to an expert" and details sit behind an NDA. [FP, A19]
  - Off-the-shelf datasets come with a perpetual, non-exclusive licence. [FP, A11]
  - Enterprise data is sold through a two-sided model: the data owner is paid on acceptance. [FP, A10]
- **Financial trajectory.**
  - FY25 revenue was USD 230.8M. Appen Global fell 21% to USD 127.9M, while Appen China rose 75% to USD 102.9M. [IND, A21]
  - The Google contract (about USD 82.8M of FY23 revenue) ended in March 2024. [IND, A22]
  - FY24 operating revenue was USD 234.3M (down 14.2%). [FP, M14]
  - Read-across (INF): the Western business is shrinking while Appen pivots to expert data.

### 1.2 Nxted.ai (OFORO LTD, UK)

- **Entity.** OFORO LTD, England and Wales company 16787568, incorporated 15 Oct 2025. [IND, N16]
- **Launch.** Probably late May 2026, judging by the legal and article dates. [INF, N10]
- **Positioning.** "Human intelligence. Machine scale." Nxted uses India's skilled workforce to train AI for UK, EU and US labs, and sells text RLHF and physical AI from one vendor. [FP, N1]
- **Products.**
  - **Nxted Expert**: credentialed experts evaluate, correct and red-team model outputs. Reports name the reviewers' credentials and show inter-rater agreement. [FP, N2]
  - **Nxted Capture**: egocentric video of skilled manual work recorded in Indian workplaces, delivered as LeRobot, RLDS/TFDS, HDF5 or MP4 with sidecars. [FP, N3, N9]
- **Commercial model.** Nxted publishes its prices [FP, N4, N2]:
  - a free 20-output Test Kit
  - a GBP 249 Quick Sprint (50 outputs in 48h)
  - an Adversarial Sprint at GBP 499 to 2,000
  - retainers at GBP 1,500, 3,500 and 5,000 a month
  - Capture from USD 35 to 120 per hour by skill level
  - Inferred cost: about GBP 5 to 10 per evaluated output. [INF]
- **Governance.**
  - Data is hosted on AWS London. [FP, N12]
  - No certifications are held. SOC 2 Type II is targeted for Q4 2026 and ISO 27001 for 2027. [FP, N13]
  - ICO registration is "pending". [FP, N11]
  - Founders, team and funding are not published, and no independent coverage was found. [UNK]
  - Case studies are anonymous. [FP, N7]

### 1.3 Market context (only where the market file has cited facts)

| Provider | Model (public) | Scale indicator | Public pricing | Label / source |
|---|---|---|---|---|
| Scale AI | Data Engine (managed), GenAI Platform, Rapid (self-serve), Outlier contributor brand | About USD 870M revenue in 2024. Meta took a 49% stake for about USD 14.8B (June 2025). | No public rate card | press, M1 |
| Surge AI | Managed RLHF and expert data for about 12 frontier labs. DataAnnotation is its contributor platform. | About USD 1.2B revenue in 2024 (Sacra estimate) | Not public | IND, M5 |
| Mercor | Expert marketplace. Labs pay for expert hours. | USD 500M annualized (Aug/Sep 2025). Over USD 2B gross annualized (June 2026). 30,000+ experts paid an average of USD 85+/hr. Pays 60-70% of topline to contractors. | Not public | press, M3, M4 |
| Turing | "AGI Advancement" services for labs (reasoning, coding, agentic, multimodal, STEM) | USD 300M run rate in 2024 | Not public | FP, M10 |
| Invisible | Managed AI training workforce | USD 134M revenue in 2024. About 11% EBITDA margin (estimate). | Not public | FP/IND, M11 |
| Snorkel AI | Expert data development as a service | Over USD 375M annualized (secondhand) | Not public | FP/secondhand, M12 |
| micro1 | AI-recruited expert talent | Passed USD 100M ARR (secondary, unverified) | Not public | press/IND, M9 |
| Prolific | Self-serve participant platform | n/a | 42.8% corporate fee on top of participant rewards | FP, M13 |
| Labelbox | Software plus managed labelling (Alignerr) | n/a | USD 0.10 per LBU. Labelling services from USD 10/hr. | FP, M15 |

Two observations from the market file [INF, from M1 to M15]:

- Almost no expert-data vendor publishes customer pricing. Nxted is the exception in this segment.
- Gross take rates sit at roughly 30-40%.

---

## 2. Comparison matrix

| Dimension | Appen | Nxted.ai | Infollion opportunity |
|---|---|---|---|
| Target markets | Frontier GenAI and reasoning-model developers, enterprises deploying AI, procurement and compliance teams, robotics and AV teams. Customers named: Cohere, Dialpad, Onfido, Nearmap. [FP, A2, A7, A14] | AI labs in the UK, EU and US. Case studies are anonymous: UK industrial AI, a US humanoid company and an EU medical lab. [FP, N1, N7] | Domain copilot teams (BFSI, healthcare, legal, pharma), second-tier labs and eval startups. [INF, market file section 2] Indian enterprises are a segment neither competitor targets explicitly. [INF] |
| Service portfolio | Broad offer: SFT, RLHF, CoT and RLVR, red teaming, rubric design, managed LLM-as-a-judge, agent trajectories and RL environments, a coding corpus, multimodal, physical AI, an off-the-shelf catalog and enterprise data licensing. [FP, A1 to A11] | Narrow offer: expert evaluation, correction, red teaming and a compliance pack, plus egocentric physical-AI capture. [FP, N2, N3] | Start narrow and expert-heavy: evaluation pilots, preference data, red teaming, benchmarks, agent evaluation. Leave commodity labelling out. [INF, market file section 5] |
| Expert sourcing and qualification | CrowdGen recruitment, experience review, domain assessment "beyond credentials" and per-project qualification quizzes. ID and background-check procedures: UNK. [FP/UNK, A3, A20] | Open 4-step application, India-focused. "Verified contributors" and KYC/ID are claimed, but the credential-check method is **UNK**. Matching by sub-domain, workload and past score. [FP/UNK, N8, N11, N2] | Reuse Infollion's existing expert vetting, profiles and compliance screening, and publish the verification steps. [INF, internal claim to validate] |
| Project and task management | ADAP workflows with routing, multi-stage review and templates. Confidence-based routing to auto-accept, single review or adjudication. [FP, A12, A15] | Brief, then an admin assigns within 2 business hours, then evaluation, then IRA, then a report. Admin tooling and the assignment algorithm are **UNK**. [FP/UNK, N5] | Build routing in-house (overlap N, expertise matching, locking, reassignment). No open-source tool covers this. [IND, T-matrix; INF] |
| Human evaluation interfaces | ADAP tools plus custom tools such as the "AI Chat Feedback Tool" with a live model endpoint. [FP, A12, A14] | Only "structured interface" is stated. Details **UNK**. [FP/UNK, N5] | Build React components for rubric scoring, pairwise, ranking, correction and trace viewing. [INF, T-rec] |
| Dataset creation | SFT demonstrations, CoT traces, RLVR verifier assets, golden trajectories, 597 off-the-shelf datasets. [FP, A2, A16, A4, A11] | Expert corrections and adversarial prompts. Capture datasets with action, hand-pose and 6-DoF annotation. [FP, N2, N3] | SFT, preference, rubric and benchmark items in lab-ready schemas with `usage_rights` metadata. [INF, AI-training file section 9] |
| Evaluation metrics | Krippendorff's alpha, Cohen's kappa, Gwet's AC1, ICC, human-model agreement and ECE for routing. Published red-team study: alpha about 0.65. [FP, A9, A17] | IRA is reported for every batch, but the metric is **UNK**. The sample shows 94%. Severity-weighted error taxonomy. [FP/UNK, N2, N5] | Name the metric and report it with a confidence interval. Krippendorff's alpha >= 0.800 is customary and 0.667 is the floor for tentative conclusions. [IND, R49] |
| Quality assurance | 5-10% hidden gold per batch, alpha thresholds of 0.800 and 0.667, an 85% gold-accuracy removal bar, a 1% audit of auto-accepts, quiz and work modes. [FP, A15, A18] | Expert review of every batch, IAA report and an AI-drafted, admin-reviewed narrative. Contributor QA and removal rules are **UNK**. [FP/UNK, N5, N17] | Publish a QA policy: qualification on 20-50 gold items, a calibration round, 5-10% hidden gold, 10-20% overlap, senior adjudication without overwriting raw votes. [INF, AI-training file section 8] |
| AI model integrations | LLM integration, live model endpoints, APIs, webhooks, AWS and Azure. [FP, A12, A14] | Self-serve Stripe checkout and a client portal. Model integrations **UNK**. [FP/UNK, N10, N2] | Phase 3: trace ingestion, experiments and LLM judge through Langfuse behind an adapter. [IND, T1, T5] |
| Data export formats | WAV, FLAC, JSON, JSONL and COCO in the catalog. Versioned JSONL for RLVR. Formats for alignment, agent and evaluation outputs are **UNK**. [FP/UNK, A11, A16] | Capture: LeRobot (Parquet + MP4 + JSON), RLDS/TFDS, HDF5, MP4 with sidecars. Expert and preference formats are **UNK**. [FP/UNK, N9] | Ship TRL, OpenAI SFT/DPO and HF Datasets (Parquet/JSONL) exports with manifests and checksums. [IND, R1, R5, R7; INF] |
| Security and privacy | SOC 2 Type II, ISO 27001, a HIPAA environment, GDPR, Secure Workspaces. Encryption at rest, retention and contributor background checks are **UNK**. [FP/UNK, A13] | AES-256, TLS 1.3, per-tenant keys, MFA, JIT access, quarterly CREST pen tests, AWS London. **No certifications held.** [FP, N13, N12] | Default India hosting (ap-south-1, DR in ap-south-2) and DPDP readiness. Begin SOC 2 and ISO 27001 work early. [INT, system_architecture.md; FP, M25] |
| Customer dashboards | Contributor analytics, per-batch agreement scores and gold accuracy by contributor. A client-facing dashboard is not described. [FP/UNK, A12, A15] | Dashboard access on retainers and weekly trends on Growth. Contents **UNK**. [FP/UNK, N4] | A dashboard of agreement, gold accuracy, error taxonomy over time and rater drift. [INF] |
| Commercial model | Sales-quoted with no rate cards. Engagements are project-based, annual-hour commitments (Nearmap 180,000 hours) or dataset licensing. The billing unit is **UNK**. [FP/UNK, A19, A12] | Published prices in GBP, USD and EUR. Free kit, sprints and retainers. Capture billed 50% up front. [FP, N4, N10] | A published pilot price with credit against an SOW. Pilot pricing (USD 5,000 to 15,000) is a **HYPOTHESIS**. [INF, market file section 5.1] |
| Automation and AI-assisted review | AI-assisted pre-labelling, "smart validators", confidence routing, LLM-judge outputs QA'd by weekly stratified human sampling. [FP, A12, A2] | AI-drafted report narrative reviewed by an admin. [FP, N5] | LLM pre-scoring with judge-vs-expert agreement per category, plus position and verbosity bias probes. [IND, R27; INF] |
| Operational scalability | 1M+ contributors claimed. Nearmap grew from 5 to 180+ specialists. Facilities in the UK, the Philippines and China. [FP, A20, A12, A13] | Admin assignment within 2h and 48h turnaround on small sprints. Capacity at volume **UNK**. [FP/UNK, N4, N5] | Expert supply depth is the constraint. Bench and idle cost and pool continuity are known cost drivers. [INF, market file section 6.4] |

T-matrix and T-rec refer to the tool matrix and recommended combination in `tooling_and_frameworks.md` (sources T1 to T10 below).

---

## 3. Feature decision matrix

Phases:

1. Evaluation MVP
2. Dataset delivery
3. Integrations and advanced evaluation
4. Enterprise
5. Physical AI

Tool decisions follow `tooling_and_frameworks.md`:

- **Build** the expert workflow in-house (FastAPI, Postgres, Next.js).
- **Langfuse** sits behind an internal adapter from Phase 3, for traces, experiments and LLM-as-a-judge. Phases 1 and 2 store scores natively in Postgres. The tooling file listed Langfuse as an MVP option. This plan delays it to Phase 3, which is consistent with its advice to keep Langfuse internal and replaceable.
- **Label Studio Community** is only an optional multimodal editor. Its assignment, overlap, agreement metrics, RBAC and SSO are paid features, and the standalone frontend has been deprecated since 1.11.0. [T6, T8]
- **Argilla** is not a dependency (no release since 2025-03-11) and serves only as a design reference. [T9]
- **Inspect AI** handles agent evaluations, with Harbor and SWE-bench for task environments.

| Feature | Appen | Nxted | Decision | Phase | Rationale |
|---|---|---|---|---|---|
| Expert onboarding, KYC, credential verification | Domain assessment, experience review [FP, A3, A20] | KYC/ID claimed; method UNK [FP/UNK, N11] | Build | 1 | Core moat. No OSS tool covers it [IND, T-matrix]. Uses Infollion's existing vetting [INF]. |
| Conflict-of-interest checks | UNK | UNK | Build | 1 | Expert-network practice. Not offered by any tool reviewed [INF, T-rec]. |
| Qualification tests, hidden gold, calibration rounds | Quality Flow quiz and work modes, 5-10% gold [FP, A18, A15] | UNK [N17] | Build | 1 | Langfuse has no gold or honeypot concept [IND, T5]. |
| Routing with overlap N and expertise matching | ADAP routing, confidence routing [FP, A12, A15] | Sub-domain, workload, past score; admin assigns [FP, N2, N5] | Build | 1 | Langfuse queues are single-pass and Label Studio Community has no assignment [IND, T5, T6]. Argilla's `min_submitted` is a design reference only [IND, T9]. |
| Versioned rubric builder | Rubric design service [FP, A2] | Client rubric; custom rubric on the Scale retainer [FP, N2, N4] | Build | 1 | Rubrics are the product. Add an LLM-grader dry run in Phase 3 [INF, R10 pattern in AI-training file]. |
| Rubric scoring UI with rationale and correction | Yes [FP, A3] | Structured verdict plus correction [FP, N2] | Build | 1 | Own React components avoid paid gating and deprecated embeds [IND, T8]. |
| Pairwise preference and ranking UI | A/B, pick-better, edit, justify [FP, A7, A14] | RLHF marketed; format UNK [FP/UNK, N2] | Build | 1 | Langfuse cannot model A vs B natively [INF, T-matrix]. Capture ties and both-bad flags [INF, R1]. |
| IRR engine (Krippendorff's alpha, Cohen and Fleiss kappa, ICC) | Metrics referenced [FP, A9] | Metric UNK [N2] | Build | 1 | Langfuse only gives human-vs-judge agreement. Label Studio agreement is paid [IND, T5, T6]. |
| Adjudication with raw votes kept | Multi-reviewer adjudication [FP, A15] | UNK | Build | 1 | Not documented in Langfuse [IND, T5]. |
| Per-batch quality report with credentials and error taxonomy | Quality reported per deliverable [FP, A6] | Score, accuracy, IRA, errors, credentials [FP, N2] | Build | 1 | Table stakes against Nxted. Naming the metric is the differentiator [INF]. |
| Customer portal: intake, upload, progress, acceptance | Not described; sales-led [UNK] | "Secure EU-hosted portal"; features UNK [FP/UNK, N2] | Build | 1 | Multi-tenant portal must be built. Langfuse org creators and UI customization are Enterprise features [IND, T4]. |
| Self-serve online checkout | None [FP, A19] | Stripe for sprints [FP, N10] | Postpone (invoice the pilot manually) | 4 | A published price matters more than checkout at pilot volume [INF]. |
| Expert time tracking and payouts (INR, USD) | CrowdGen payouts via bank, PayPal, Payoneer, Airtm [FP, A20] | Weekly payouts claimed [FP, N8] | Build (rates and metadata in Phase 1, automated payouts in Phase 2) | 1-2 | Langfuse cannot do payments [INF, T-matrix]. |
| Dataset snapshots, manifests, checksums, delivery receipts | Versioned JSONL for RLVR [FP, A16] | Dataset card and provenance log (Capture) [FP, N6] | Build | 2 | S3 plus Postgres manifests. Avoid lakeFS (BSL limits third-party use) [IND, T-risk]. |
| Exports to TRL, OpenAI SFT/DPO and HF Datasets | Formats mostly UNK [A11] | Expert formats UNK [N9] | Build, using the HF `datasets` format | 2 | Labs load these formats directly [IND, R1, R5, R7]. |
| SFT and demonstration authoring tasks | Yes [FP, A2] | Not offered | Build | 2 | Same task engine, new template [INF]. |
| Red-team task type and restricted workspace | Risk-taxonomy testing [FP, A2, A17] | Adversarial Sprint, addendum, isolated workspace [FP, N2, N14] | Build | 2 | Expert-written attacks fit the core workflow. Automated suites come in Phase 3 [INF]. |
| Customer dashboard with trends and drift | Contributor analytics [FP, A12] | Retainer dashboard; contents UNK [N4] | Build | 2 | Supports a monitoring subscription [INF, market file section 5.6]. |
| Trace ingestion, datasets, experiments | Live endpoint tools [FP, A14] | UNK | Integrate via Langfuse behind an adapter | 3 | MIT core, OTel ingestion. Use OTel from day one because legacy ingestion is sunset on Cloud on 2026-11-16 [IND, T1, T2]. |
| LLM-as-a-judge pre-scoring and judge calibration | Managed LLM-judge service, human-model agreement [FP, A2, A7] | Not offered | Integrate via Langfuse; build the expert calibration set in-house | 3 | Langfuse supports judges and human-vs-judge analytics [IND, T3]. Judges show position and verbosity bias [IND, R27]. |
| AI-drafted report narrative with human review | Not described | Yes [FP, N5] | Build (thin LLM call) | 3 | Low effort. Keep human sign-off [INF]. |
| Agent trajectory evaluation and task environments | Golden trajectories, RL environments, failure taxonomy [FP, A4] | Not offered | Integrate via Inspect AI (including `human_cli`), Harbor and SWE-bench; build the trajectory viewer | 3 | Inspect AI is MIT and active, and uses the same scorer for humans and models [IND, T7, T10]. |
| Automated red-team suites | Not described as a tool | Not offered | Integrate via Inspect AI | 3 | promptfoo is now owned by OpenAI, so treat it as replaceable [IND, T-risk]. |
| Recurring monitoring via API and webhooks | Continuous monitoring [FP, A7] | Retainers [FP, N4] | Build | 3 | Fixed anchor set per cycle separates rater drift from model drift [INF, market file section 5.6]. |
| Multimodal region annotation (image, audio, video) | Extensive ADAP tooling [FP, A12] | Capture annotation tooling UNK | Integrate Label Studio Community as an optional editor | 3 | Workflow stays in Infollion. Vendor a pinned frontend build [IND, T6, T8]. |
| Coding-agent evaluation on private repos | 400+ repos, 60+ environments [FP, A5] | Not offered | Postpone the corpus and partner instead; run the harness via SWE-bench and Harbor | 3 | Corpus build is capital-heavy [INF, appen_research.md section 3.8]. |
| Enterprise SSO, SCIM, item-level RBAC, audit logs | SOC 2, ISO 27001 [FP, A13] | MFA, JIT [FP, N13] | Build (audit log from Phase 1; SSO and SCIM in Phase 4) | 4 | Langfuse audit logs and SCIM are Enterprise features, so these belong in Infollion's own layer [IND, T4]. |
| SOC 2 Type II, ISO 27001 | Held [FP, A13] | Targeted Q4 2026 and 2027 [FP, N13] | Build programme (start preparation early) | 4 | Lab procurement expects them [INF, A13]. |
| Compliance pack (DPA, sub-processors, EU AI Act mapping, DPDP) | EU AI Act and NIST audits [FP, A7] | GBP 2,000 to 8,000 package [FP, N2, N15] | Build templates | 4 | Nxted's headline feature. DPDP core obligations land around May 2027 [FP, M25]. |
| Customer-region cells and BYO bucket | AWS and Azure integration [FP, A12] | AWS London only [FP, N12] | Build | 4 | India by default. EU or US cells per contract [INT]. |
| Off-the-shelf dataset catalog | 597 datasets [FP, A11] | None | Postpone | 4+ | Commodity. Needs a licensing framework first [INF]. |
| Enterprise data brokerage | Yes; owner paid on acceptance [FP, A10] | None | Postpone | 4+ | Legal and privacy risk under DPDP [INF, appen_research.md section 3.11]. |
| Egocentric capture, LeRobot/RLDS export, episode review | Physical AI facilities [FP, A8] | Core product, USD 35 to 120/hr [FP, N3, N4] | Postpone; later LeRobot format, MCAP and Rerun, possibly through a capture partner | 5 | A separate operational business. RLDS is archived, so prefer LeRobot [IND, T-matrix]. |
| General crowd-scale labelling | 1M+ contributors [FP, A20] | Not offered | Do not pursue | n/a | Commodity pricing pressure [INF, market file section 5.8]. |

---

## 4. Differentiation opportunities for Infollion

Every item below is a **hypothesis that needs validation** in pilots or customer interviews.

1. **Verified senior experts from an existing network, with named credentials.**
   - Evidence:
     - Nxted does not document its credential-check method [UNK, N2, N11].
     - Appen does not publish its ID or background-check procedures [UNK, A3].
     - Nxted's quoted contributor pay of GBP 15 to 40/hr suggests a less senior pool [FP/INF, nxted_research.md section 7].
   - Infollion's claimed edge: existing profiles with verified employment history and compliance screening [INF, market file section 7].
   - Validation: confirm what share of the network is willing to do AI work at the hypothesised INR pay bands (market file section 4).
2. **Published QA methodology (Krippendorff's alpha, gold items, adjudication).**
   - Evidence:
     - Nxted reports IRA with no named metric [UNK, N2].
     - Appen publishes thresholds in blogs but no client-level metrics [FP, A15].
     - Agreement thresholds are documented: alpha >= 0.800 customary, 0.667 tentative [IND, R49].
     - OpenAI's RFT guidance says experts should converge before RFT investment [IND, R6].
   - Validation: test whether lab buyers weight a published methodology in vendor selection.
3. **India-hosted data residency with DPDP readiness.**
   - Evidence:
     - Nxted hosts in AWS London [FP, N12].
     - Infollion's design defaults to ap-south-1 with DR in ap-south-2 [INT, system_architecture.md].
     - DPDP substantive obligations apply around May 2027 [FP, M25].
   - Validation: confirm demand from Indian BFSI, health and government-adjacent buyers. For foreign customers, residency may matter less than SCCs and a DPA [INF, security_and_compliance.md].
4. **Indic-language and India-domain expertise.**
   - Candidate domains: GST, Indian law, RBI/SEBI, Indian clinical practice, and Hindi or Hinglish red teaming [INF, market file section 7; AI-training file section 9].
   - The AI-training research explicitly marks market demand as **unknown** [UNK, AI-training file section 9 item 10].
   - Validation: priority interviews with labs and Indian enterprises.
5. **Practitioner-led agent evaluation.**
   - Appen advertises enterprise practitioners (accounting, HR, IT/DevOps) for agent tasks [FP, A4]. Nxted offers no agent evaluation [FP, N2].
   - Human contribution to agent benchmarks is task specification, reference solutions and test validation. For example, SWE-bench Verified used 93 developers [IND, R13].
   - Infollion's network of finance, HR, procurement and IT practitioners maps onto this [INF, appen_research.md section 3.7].
   - Validation: one paid trajectory-grading pilot.
6. **Transparent pilot pricing from a credible, established entity.**
   - Evidence:
     - Appen publishes no prices [FP, A19].
     - Nxted publishes prices but is under a year old, names no founders, holds no certifications and has anonymous case studies [IND/FP/UNK, N16, N13, N7].
     - A free or cheap trial unit is a common packaging pattern [INF, market file section 3].
   - Validation: test whether a fixed-fee pilot (USD 5,000 to 15,000 hypothesis) converts against Nxted's GBP 249 sprint and free kit.

---

## 5. Threats and where competitors are stronger

| Threat | Who is stronger | Evidence | Implication |
|---|---|---|---|
| Breadth and scale of supply | Appen, and Mercor and Surge in the wider market | Appen: 1M+ contributors and about 50 expert domains [FP, A20, A3]. Mercor: 30,000+ experts [press, M3]. | Compete on depth in chosen domains, not breadth. |
| Certifications and procurement readiness | Appen | SOC 2 Type II, ISO 27001, HIPAA environment [FP, A13] | Without them, frontier-lab procurement may stall. Nxted shares this gap [FP, N13]. |
| Same India-sourced positioning, already live | Nxted | Sells India's skilled workforce to UK, EU and US labs with published prices [FP, N1, N4] | Price alone will not differentiate [INF, market file section 1]. |
| Low published entry price | Nxted | Free 20-output kit, GBP 249 sprint, about GBP 5 to 10 per output [FP/INF, N4] | Infollion's modelled price of about USD 34.80 per medical item [INF, market file section 6.2] needs a quality story. |
| EU-facing compliance packaging | Nxted | EU AI Act Article 10 and Annex IV mapping, a GBP 2,000 to 8,000 package, UK IDTA and EU SCCs [FP, N15, N12] | Infollion needs an equivalent pack and possibly a UK or EU contracting entity [INF, N section 7]. |
| Physical AI | Nxted, Appen | Nxted Capture tiers and formats [FP, N3, N9]. Appen facilities [FP, A8]. | Infollion postpones this (Phase 5), so these competitors hold the early-mover position. |
| Proprietary data assets | Appen | Coding corpus (400+ repos, 110K+ PRs) and 597 off-the-shelf datasets [FP, A5, A11] | Infollion has no comparable data assets. Partner first. |
| Platform maturity and integrations | Appen | ADAP APIs, webhooks, AWS and Azure, live endpoint tools [FP, A12, A14] | Infollion's platform is unbuilt. Rely on Langfuse and Inspect AI to close gaps faster [IND, T1, T7]. |
| Contributor pay competition | Mercor, Handshake | US expert rates of USD 40 to 180/hr [FP/IND, M7, M8] | Indian experts can join global platforms. Pay must be credible [INF, market file section 4]. |
| Tool-vendor risk | n/a | Langfuse acquired by ClickHouse. promptfoo acquired by OpenAI. Argilla dormant. [IND, T2, T-risk, T9] | Keep adapters and pinned versions. |
| Where competitors are weaker (for balance) | n/a | Appen: Western revenue down 21% [IND, A21] and mixed contributor sentiment [IND, A23]. Nxted: no certifications, ICO registration pending, no independent coverage [FP/UNK, N13, N11]. | These are openings, not guarantees [INF]. |

---

## 6. Open questions carried from the source files

- Client pricing and billing units for Appen [UNK].
- Nxted's IRA metric, credential checks, and its interface and dashboard features [UNK].
- Demand for Indic-language evaluation [UNK].
- India-specific expert pay rates on global platforms [UNK, market file section 4].
- Fairwork's 2025 Appen findings, which were not read [IND, A24].

---

## 7. Sources

All accessed 2026-10-20.

| ID | Title | URL | Type |
|---|---|---|---|
| A1 | Appen homepage | https://www.appen.com/ | First-party |
| A2 | Frontier Model Alignment Services, Appen | https://www.appen.com/frontier-model-alignment | First-party |
| A3 | RLHF Services, Appen | https://www.appen.com/rlhf-ai | First-party |
| A4 | Agentic AI Training Data and Agent Evaluation, Appen | https://www.appen.com/agentic-ai | First-party |
| A5 | Coding datasets for LLMs, Appen | https://www.appen.com/coding-datasets | First-party |
| A6 | Multimodal AI and speech training data, Appen | https://www.appen.com/multimodal-ai | First-party |
| A7 | AI Model Evaluation and Integrity Services, Appen | https://www.appen.com/model-evaluation-and-integrity | First-party |
| A8 | Physical AI training data, Appen | https://www.appen.com/physical-ai | First-party |
| A9 | AI Research Services, Appen | https://www.appen.com/ai-research-services | First-party |
| A10 | Enterprise Data, Appen | https://www.appen.com/enterprise-data | First-party |
| A11 | Off-the-shelf data catalog, Appen | https://www.appen.com/data-catalog | First-party |
| A12 | ADAP, Appen Data Annotation Platform | https://www.appen.com/platform | First-party |
| A13 | Data Security, Appen | https://www.appen.com/data-security | First-party |
| A14 | Cohere fine-tuning for enterprise (case study) | https://www.appen.com/case-studies/cohere-fine-tuning-for-enterprise | First-party |
| A15 | Human-in-the-loop blog | https://www.appen.com/blog/human-in-the-loop | First-party |
| A16 | RLVR blog | https://www.appen.com/blog/rlvr | First-party |
| A17 | AI safety evaluation: tricategorical reasoning | https://www.appen.com/blog/ai-safety-evaluation-tricategorical-reasoning | First-party |
| A18 | ADAP Quality Flow test questions | https://www.appen.com/blog/adap-quality-flow-test-questions | First-party |
| A19 | Contact us, Appen | https://www.appen.com/contact-us | First-party |
| A20 | CrowdGen by Appen | https://crowdgen.com/ | First-party |
| A21 | Appen (APX) H2 2025 earnings summary (FY25 figures; primary ASX PDF unparseable) | https://quartr.com/events/appen-ltd-apx-h2-2025_3s79tNbZ | Independent (search result) |
| A22 | Appen shares crash 37% on huge Google blow | https://fool.com.au/2024/01/22/appen-shares-crash-37-on-huge-google-blow | Independent |
| A23 | Crowd Appen reviews (Trustpilot) | https://www.trustpilot.com/review/crowd.appen.com | Independent (anecdotal) |
| A24 | Fairwork Report Appen 2025 (findings not read) | https://fairwork.oii.ox.ac.uk/wp-content/uploads/sites/17/2025/12/Fairwork-Report-Appen_2025.pdf | Independent |
| N1 | nxted.ai homepage | https://nxted.ai/ | First-party |
| N2 | RLHF and Human Evaluation for AI, nxted.ai | https://nxted.ai/expert | First-party |
| N3 | Egocentric Data for Robotics, nxted.ai | https://nxted.ai/capture | First-party |
| N4 | Pricing, nxted.ai | https://nxted.ai/pricing | First-party |
| N5 | How nxted Works | https://nxted.ai/how-it-works | First-party |
| N6 | Trust (consent, DPDP), nxted.ai | https://nxted.ai/trust | First-party |
| N7 | Case Studies, nxted.ai | https://nxted.ai/case-studies | First-party |
| N8 | Apply as a Contributor, nxted.ai | https://nxted.ai/apply | First-party |
| N9 | Robotics Dataset Formats, nxted.ai | https://nxted.ai/formats | First-party |
| N10 | Terms of Service, nxted.ai | https://nxted.ai/legal/terms | First-party (legal) |
| N11 | Privacy Policy, nxted.ai | https://nxted.ai/legal/privacy | First-party (legal) |
| N12 | Data Processing Agreement, nxted.ai | https://nxted.ai/legal/dpa | First-party (legal) |
| N13 | Security Whitepaper, nxted.ai | https://nxted.ai/legal/security | First-party (legal) |
| N14 | Acceptable Use Policy, nxted.ai | https://nxted.ai/legal/aup | First-party (legal) |
| N15 | EU AI Act Position Statement, nxted.ai | https://nxted.ai/legal/ai-act | First-party (legal) |
| N16 | OFORO LTD, Companies House | https://find-and-update.company-information.service.gov.uk/company/16787568 | Independent (registry) |
| N17 | Contributor Agreement, nxted.ai | https://nxted.ai/legal/contributor-agreement | First-party (legal) |
| M1 | Meta to pay nearly $15 billion for Scale AI stake (Reuters via Yahoo Finance) | https://finance.yahoo.com/news/meta-pay-nearly-15-billion-171801208.html | Press (snippet) |
| M3 | Mercor (Sacra) | https://sacra.com/c/mercor/ | Independent (snippet) |
| M4 | Mercor hits a $2 billion gross run rate (RuntimeWire) | https://runtimewire.com/article/as-amazon-lets-mechanical-turk-fade-mercor-hits-a-2-billion-gross-run-rate | Press (snippet) |
| M5 | Surge AI (Sacra) | https://sacra.com/c/surge-ai | Independent (snippet) |
| M7 | Handshake AI fellowship guide | https://aitrainer.work/guides/handshake-ai-fellowship-guide | Independent (snippet) |
| M8 | Mercor job listing: Medical Expert | https://work.mercor.com/jobs/list_AAABoKOPjbVqcleYq1NNjKxo/medical-expert | First-party (snippet) |
| M9 | Micro1 touts crossing $100M ARR (benzatine) | https://benzatine.com/news-room/micro1-surges-past-100-million-in-arr-aiming-for-ai-data-dominance | Press (secondary, unverified) |
| M10 | Turing annual revenue run rate nearly triples to $300M (Business Wire) | https://www.businesswire.com/news/home/20250128158063/en | First-party (snippet) |
| M11 | Invisible at $134M in revenue (Sacra) | https://sacra.com/research/invisible-at-134m-in-revenue/ | Independent (snippet) |
| M12 | Snorkel AI FAQ | https://snorkel.ai/faq/ | First-party (snippet; ARR secondhand) |
| M13 | Prolific study cost | https://researcher-help.prolific.com/en/articles/445129-study-cost | First-party (snippet) |
| M14 | Appen FY24 results (ASX, 26 Feb 2025) | https://announcements.asx.com.au/asxpdf/20250226/pdf/06fyjdglv66466.pdf | First-party (snippet) |
| M15 | Labelbox pricing calculator | https://labelbox.com/pricing/calculator | First-party (snippet) |
| M25 | DPDP Rules 2025 (PIB document) | https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf | First-party (government, snippet) |
| T1 | Langfuse open source and licensing | https://langfuse.com/docs/open-source | Official docs |
| T2 | Langfuse joins ClickHouse | https://langfuse.com/blog/joining-clickhouse | Official blog |
| T3 | Langfuse LLM-as-a-judge | https://langfuse.com/docs/evaluation/evaluation-methods/llm-as-a-judge | Official docs |
| T4 | Langfuse self-host pricing and feature table | https://langfuse.com/pricing-self-host | Official pricing |
| T5 | Langfuse annotation queues | https://langfuse.com/docs/evaluation/evaluation-methods/annotation-queues | Official docs |
| T6 | Label Studio Community vs Enterprise | https://labelstud.io/guide/label_studio_compare | Official docs |
| T7 | Inspect AI human agent | https://inspect.aisi.org.uk/human-agent.html | Official docs |
| T8 | Label Studio frontend embedding | https://labelstud.io/guide/frontend | Official docs |
| T9 | Argilla repository (README, releases) | https://github.com/argilla-io/argilla | Repo |
| T10 | Harbor | https://harborframework.com/ | Official site |
| R1 | TRL dataset formats | https://huggingface.co/docs/trl/dataset_formats | Official docs |
| R5 | OpenAI supervised fine-tuning | https://developers.openai.com/api/docs/guides/supervised-fine-tuning | Official docs |
| R6 | OpenAI reinforcement fine-tuning | https://developers.openai.com/api/docs/guides/reinforcement-fine-tuning | Official docs |
| R7 | OpenAI direct preference optimization | https://developers.openai.com/api/docs/guides/direct-preference-optimization | Official docs |
| R10 | HealthBench | https://arxiv.org/abs/2505.08775 | Paper |
| R13 | SWE-bench Verified | https://www.swebench.com/verified.html | Official docs |
| R27 | Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena | https://arxiv.org/abs/2306.05685 | Paper |
| R49 | Krippendorff's alpha (thresholds 0.667 / 0.800) | https://en.wikipedia.org/wiki/Krippendorff%27s_alpha | Independent |

Shorthand references:

- **T-matrix, T-rec and T-risk** refer to sections 5, 6 and 8 of `research/tooling_and_frameworks.md`. Each underlying claim there carries its own source.
- **INT** refers to `architecture/system_architecture.md` and `research/security_and_compliance.md`.
- **"market file"** is `research/market_and_business_model.md`.
- **"AI-training file"** is `research/ai_training_and_evaluation.md`.
