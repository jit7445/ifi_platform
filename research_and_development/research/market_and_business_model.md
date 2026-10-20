# Market and Business Model: Expert-Powered AI Evaluation and Training Data (Infollion)

Prepared by: Product & Operations Agent
Date: 2026-10-20
Status: Draft for leadership review. All prices proposed for Infollion are **HYPOTHESES** and must be validated in pilots. All third-party figures are cited; source IDs (S1, S2, ...) map to the sources table at the end.

Evidence grading used throughout:
- **first-party**: the company's own website, filing, listing or help center.
- **press**: news outlet reporting (often citing anonymous sources or The Information).
- **independent**: analyst or aggregator (Sacra, market research firms, job aggregators, review blogs).
- **inferred**: our own derivation from cited numbers.

Caveat on method: pages were reached through web search and fetch on 2026-10-20. Where a figure came from a search result summary rather than a full page read, the sources table marks it "snippet". Re-verify any figure before it appears in a customer or investor document.

---

## 1. Executive summary

1. **The market has shifted from crowd labeling to expert data.** Revenue is concentrating in vendors that supply credentialed experts (doctors, lawyers, PhDs, engineers, finance professionals) for evaluation, RLHF/preference data, SFT, benchmarks and red-teaming. Scale AI (~USD 870M 2024 revenue, press S1), Surge AI (~USD 1.2B 2024 revenue, independent/press S5), Mercor (USD 500M annualized by Aug/Sep 2025, over USD 2B gross annualized June 2026, press S3, S4), Turing (USD 300M run rate 2024, first-party S10), Snorkel DaaS (over USD 375M annualized, secondhand S12) illustrate the scale.
2. **Almost nobody publishes customer pricing for expert data.** Scale, Surge, Mercor, Turing, Invisible, Snorkel are sales-quoted. The only public price points are self-serve or SMB offerings: Prolific (participant reward plus 42.8% corporate fee, S13), Labelbox (USD 0.10 per LBU, labeling services from USD 10/hr, S15), Toloka (requester-set per-task price plus commission, S16), and Nxted.ai (Expert Quick Sprint GBP 249, monthly from GBP 1,500; Capture from USD 35-120/hr by skill tier; Physical AI Test Kit from USD 2,500, S17).
3. **Contributor pay for expert work clusters at USD 40-180/hr in the US market.** Handshake Fellowship USD 40-125/hr (S7), Mercor listings USD 50-180/hr with doctors at USD 130-180/hr (S8), Mindrift USD 30-90/hr (S18), Outlier finance experts USD 30-40/hr (S6), Surge/DataAnnotation generalists roughly USD 18-24/hr with expert tracks higher (S5, independent), Appen/CrowdGen generalist tasks USD 10-25/hr (S19, independent, low reliability).
4. **Gross take rates are roughly 30-40%.** Mercor reportedly pays 60-70% of topline to contractors (press S3), Prolific's 42.8% markup equals 30% of the invoice (inferred from S13), Invisible's estimated EBITDA margin is ~11% (independent S11). These anchor our margin hypotheses.
5. **Infollion's angle**: an existing vetted expert network in India and globally, existing compliance and payout rails, and lower Indian expert cost bases. Nxted.ai already sells this exact India-sourced positioning (S17), so differentiation must come from depth of vetting, domain breadth, and rubric/QA rigor, not from price alone.

---

## 2. Market size (ESTIMATES, not facts)

Market research firms disagree because they define the market differently. Treat all as directional.

| Estimate | Scope | Figure | Source type | Source |
|---|---|---|---|---|
| Grand View Research, current edition | AI training dataset market | USD 3.2B (2025), USD 3.9B (2026), USD 16.3B by 2033, 22.6% CAGR | independent (market research) | S20 |
| Grand View Research, earlier edition | AI training dataset market | USD 8.6B by 2030, 21.9% CAGR | independent (snippet via reseller) | S20 |
| Grand View Research | Data collection and labeling | USD 17.1B by 2030, 28.9% CAGR | independent (press release coverage) | S21 |
| MarketsandMarkets | AI training dataset | USD 9.58B by 2029, 27.7% CAGR | independent | S22 |

**Observation (inferred):** these top-down estimates look too small relative to bottom-up company revenue. Scale (~USD 0.87B 2024) plus Surge (~USD 1.2B 2024) alone exceed Grand View's 2025 AI training dataset figure. The likely reason is that frontier-lab human data spend (RLHF, evals, SFT by experts) is classified as services and not captured as "datasets". A bottom-up view from disclosed/press run rates (Scale, Surge, Mercor, Turing, Snorkel, Invisible, micro1) suggests the expert human data segment was already in the high single-digit USD billions of annualized gross revenue by mid-2026. This is an **inference** from press figures that are themselves unaudited and gross (S1, S3, S4, S5, S9, S10, S11, S12).

Implication for Infollion: the serviceable segment is not "data labeling" broadly; it is expert-time-intensive evaluation and data creation, sold to (a) frontier and second-tier model labs, (b) enterprise AI teams building domain copilots (BFSI, healthcare, legal, pharma), (c) AI-native startups needing evals.

---

## 3. Competitor packaging and pricing (public evidence only)

| Provider | Model / packaging (public) | Public customer pricing | Scale indicators | Evidence |
|---|---|---|---|---|
| **Scale AI** | Data Engine (managed, sales-led); GenAI Platform; Rapid (self-serve per-task, priced in dashboard estimator); Outlier as contributor brand | No public rate card. Rapid price shown only in its estimator. Third-party reports a 2019-2023 rate card from 2 cents/image, 6 cents/annotation, since withdrawn (unverified). AWS Marketplace listing ceiling reported, not typical. | ~USD 870M revenue 2024; Meta took 49% stake for ~USD 14.8B (June 2025); Google ~17% of 2024 revenue, reportedly pulling back | press S1; independent S2 |
| **Surge AI** | Managed RLHF/expert data for ~12 frontier labs; DataAnnotation as contributor platform | Not public | ~USD 1.2B revenue 2024 (Sacra estimate, also Forbes) | independent/press S5 |
| **Mercor** | Expert marketplace; hourly contractor model; labs pay for expert hours | Not public. Take rate inferred ~30-40% (pays 60-70% to contractors) | USD 500M annualized Aug/Sep 2025; over USD 2B gross annualized June 2026; 30,000+ experts paid avg USD 85+/hr | press S3, S4 |
| **Turing** | "AGI Advancement" services for labs (reasoning, coding, agentic, multimodal, STEM) plus enterprise services | Not public | USD 300M run rate 2024, profitable; USD 2.2B valuation | first-party S10 |
| **Invisible Technologies** | Managed process/AI training workforce | Not public | USD 134M revenue 2024 (company); ~11% EBITDA margin (Sacra estimate) | first-party/independent S11 |
| **micro1** | AI-recruited expert talent plus data platform | Not public | Passed USD 100M ARR (TechCrunch via secondary); later claimed USD 500M gross run rate (secondary, unverified) | press/independent S9 |
| **Snorkel AI** | "Expert data development as a service": datasets, benchmarks, evaluations, RL environments; positions as frontier AI data lab | Not public | Over USD 375M annualized, 18x growth after DaaS launch (secondhand LinkedIn repost of company announcement); USD 3.5B valuation | first-party FAQ S12; secondhand |
| **Appen** | Global Services (large customers) plus New Markets (China, Global Product); CrowdGen contributor platform | Not public | FY24 operating revenue USD 234.3M (-14.2%); Global Services -38.3% after Google contract termination | first-party ASX filing S14 |
| **Toloka** | Self-serve crowd platform plus Mindrift expert brand | Requester sets per-task price; minimum commission reported lowered to USD 0.001 (undated) | n/a | first-party S16 |
| **Prolific** | Self-serve participant platform (research plus AI tasks) | Participant min GBP 6 / USD 8 per hr, recommended GBP 9 / USD 12; platform fee 42.8% corporate, 33.3% academic on top of rewards | n/a | first-party S13 |
| **Labelbox** | Software (LBU usage) plus managed labeling services (Alignerr expert network) | USD 0.10 per LBU (Starter); 500 free LBU/month; labeling services from USD 10/hr base (another source says USD 6/hr) | n/a | first-party S15 |
| **Nxted.ai** (OFORO LTD, UK) | Two products: **Expert** (credentialed experts for evaluation, RLHF, red-teaming, structured data, reports inter-rater agreement and error taxonomy) and **Capture** (egocentric physical-AI data from India skilled trades, LeRobot/RLDS/HDF5) | Expert: Quick Sprint GBP 249; monthly plans from GBP 1,500; free 20-output Expert Test Kit. Capture: L1 from USD 35/hr, L2 from USD 55/hr, L3 from USD 80/hr, L4 from USD 120/hr, L5 custom; Physical AI Test Kit from USD 2,500 (5-10 usable hours) | Case claims: 1,000 hours garment manipulation "82% below US cost" | first-party S17 |
| **Handshake AI** | Fellowship model using student and graduate network | Not public | n/a | first-party S7 |

**Packaging patterns observed (inferred from the above):**
1. **Free or cheap trial units** to lower procurement friction (Nxted free 20-output kit and GBP 249 sprint; Scale Rapid free allocations).
2. **Managed service, sales-quoted** for anything expert-grade at scale.
3. **Hourly or per-hour-of-data** pricing for physical capture (Nxted per hour of usable footage by skill tier).
4. **Platform fee as % markup** on contributor cost for self-serve (Prolific 42.8%).
5. **Quality artifacts as product features**: inter-rater agreement, error taxonomy, QA report, dataset card, consent/provenance pack (Nxted S17).

---

## 4. Contributor pay benchmarks (expert AI-training work)

| Platform | Role / tier | Published or reported rate | Type | Source |
|---|---|---|---|---|
| Handshake AI Fellowship | Experts (US) | USD 40-125/hr; median USD 80/hr across ~210 listings (aggregator) | first-party range; independent median | S7 |
| Handshake | Medicine domain expert | USD 110-140/hr | independent job board | S7 |
| Mercor | Medical expert | USD 130-180/hr | first-party listing | S8 |
| Mercor | Lawyers | USD 90-150/hr | first-party listing | S8 |
| Mercor | Expert model trainer (general) | USD 50-140/hr | first-party listing | S8 |
| Mercor | Network average | USD 85+/hr | press | S3 |
| Outlier (Scale) | Finance expert | USD 30-40/hr, higher for PhDs, lower for onboarding | first-party listing via job board repost | S6 |
| Outlier (Scale) | Range across domains | USD 15-100+/hr | independent (low reliability) | S6 |
| Outlier (Scale) | Litigation allegation | Promised USD 25-40/hr, alleged effective ~USD 15-17/hr | court filing allegations via press | S23 |
| Mindrift (Toloka) | Experts | USD 30-90/hr (company blog); listings USD 55-73/hr | first-party / independent | S18 |
| Surge AI / DataAnnotation | General | ~30-40 cents/min (~USD 18-24/hr); coding/STEM/professional USD 50-100+/hr | independent | S5 |
| micro1 | Specialist / entry | ~USD 60/hr / ~USD 15/hr | independent, unverified | S9 |
| Appen / CrowdGen | General tasks | USD 10-25/hr typical; expert USD 20-35/hr | independent, low reliability | S19 |
| Prolific | Any participant | Min USD 8/hr, recommended USD 12/hr | first-party | S13 |
| Egocentric capture, India | Household chore filming | ~INR 250/hr (~USD 2.6/hr) | press (AFP via aggregator) | S24 |

**Gaps:** no reliable public data on India-specific rates for domain experts on US platforms. Many US platforms restrict expert listings to US-based workers (S7) or set rates by geography (S7, S19).

**Implication for Infollion expert pay (HYPOTHESIS):** pay must be credible relative to (a) the expert's opportunity cost in Infollion's existing expert-call business (consultation fees are typically much higher per hour than AI-training work) and (b) global platforms that Indian experts can also join. Proposed starting bands (INR, to validate in pilot):

| Tier | Example profile | Hypothesis pay band (INR/hr) | Approx USD/hr at INR 85 (assumption) |
|---|---|---|---|
| T1 Skilled generalist | Graduate with domain exposure, language skill | 600-1,200 | 7-14 |
| T2 Domain professional | 3-10 yrs experience, CA, engineer, pharmacist, lawyer | 1,500-3,500 | 18-41 |
| T3 Senior specialist | 10+ yrs, MD, partner-level, PhD researcher | 3,500-8,000 | 41-94 |
| T4 Rare / top-tier | Super-specialist clinicians, ex-CXO, niche regulators | 8,000-15,000+ | 94-176+ |
| International experts (US/EU) | Same tiers | Benchmark to S7/S8 bands | 40-180 |

FX rate of INR 85/USD is an assumption for modeling only.

---

## 5. Service package definitions

Pricing below is **HYPOTHESIS ONLY**. "Effective rate" means blended customer price per productive expert hour.

### 5.1 Expert Evaluation Pilot (entry offer)
- **Target customer:** AI startup or enterprise AI team evaluating a domain copilot; model lab testing Infollion as a vendor.
- **Expert profile:** T2-T3 in 1-2 domains; 5-15 experts.
- **Inputs:** 200-500 model outputs (prompt plus response, optionally multiple models), customer quality definition.
- **Outputs:** per-item scores on co-designed rubric, rationales, error taxonomy, inter-rater agreement report (Krippendorff alpha / Cohen kappa), findings memo.
- **QA:** 20-30% overlap, 10% gold items, 100% senior review on disagreements.
- **Milestones:** scoping (week 0), rubric v1 and calibration batch of 30 items (week 1), production (weeks 2-3), report (week 4).
- **Pricing hypothesis:** fixed fee USD 5,000-15,000 (or INR equivalent), creditable against a subsequent SOW; or a free 20-30 item sample to match Nxted's free kit (S17).
- **Cost drivers:** expert seniority, rubric complexity, calibration iterations.
- **Operational risks:** under-specified rubric; customer expects production volume at pilot price; expert churn after short project.

### 5.2 Domain Benchmark Creation
- **Target:** model labs, eval startups, enterprises wanting private held-out benchmarks.
- **Expert profile:** T3-T4 authors; T3 independent solvers/validators.
- **Inputs:** domain scope, difficulty target (for example "frontier model fails at least X%"), format (MCQ, open-ended with rubric, multi-step).
- **Outputs:** questions, reference answers, per-item grading rubrics, metadata (domain, difficulty, skill tags), contamination checks, model baseline results, datasheet.
- **QA:** two-expert validation per item; adversarial check against target models; plagiarism and web-contamination search; leakage controls (no item reuse across customers).
- **Milestones:** taxonomy, 20-item calibration set, batches of 100, final freeze.
- **Pricing hypothesis:** per accepted item, USD 50-500+ depending on difficulty and domain; plus fixed setup fee. Exclusivity premium (customer owns IP, Infollion cannot reuse).
- **Cost drivers:** author time (often 1-4 hours per hard item), rejection rate against model-difficulty filter, validator time.
- **Risks:** items too easy (models solve them), leakage, IP ownership disputes, expert confidentiality (experts reusing their employer's proprietary material).

### 5.3 SFT Dataset Creation
- **Target:** labs and enterprises fine-tuning domain models.
- **Expert profile:** T2-T3 writers with domain depth; T3 reviewers.
- **Inputs:** prompt distribution or seed prompts, style guide, target count.
- **Outputs:** prompt-response pairs (optionally with chain of reasoning), metadata, quality scores, JSONL/Parquet export with schema.
- **QA:** 100% reviewer pass on first batches, then sampled 20-30%; AI-assisted checks for plagiarism, LLM-generated content detection, format validation.
- **Pricing hypothesis:** per accepted sample USD 15-150 by length/difficulty; or time-and-materials at effective USD 35-90/expert-hour (India-delivered) with volume tiers.
- **Cost drivers:** response length, research requirement, rework rate.
- **Risks:** experts using LLMs to write responses (policy plus detection), style drift, throughput spikes.

### 5.4 Preference Data Collection (RLHF / RLAIF calibration)
- **Target:** labs, enterprise teams doing DPO/RLHF.
- **Expert profile:** T2-T3.
- **Inputs:** prompts plus 2-N candidate responses (or live model endpoint).
- **Outputs:** pairwise or ranked preferences, Likert scores per dimension, rationales, optional rewritten "ideal" response.
- **QA:** overlap 20-50%, gold pairs with known answer, rater drift monitoring, agreement thresholds.
- **Pricing hypothesis:** per comparison USD 3-25 depending on length and domain; rationale and rewrite add-ons.
- **Cost drivers:** reading time, number of dimensions, rationale length.
- **Risks:** low agreement on subjective dimensions; position bias; fatigue.

### 5.5 AI Red-Teaming
- **Target:** labs pre-release, regulated enterprises (BFSI, health) needing safety evidence.
- **Expert profile:** T3-T4 domain experts plus trained red-team specialists (security, fraud, medical misinformation, legal, Indic-language).
- **Inputs:** model access (sandboxed endpoint), harm taxonomy, scope and rules of engagement.
- **Outputs:** attack prompts and transcripts, severity-rated findings, reproduction steps, category coverage matrix, executive report.
- **QA:** severity calibration session, peer review of high-severity findings, dedupe.
- **Pricing hypothesis:** fixed-scope engagement USD 15,000-75,000 per 2-4 week campaign; or per-expert-day rate.
- **Cost drivers:** senior specialist time, model access set-up, report writing.
- **Risks:** expert exposure to harmful content (wellbeing protocol needed), handling of dangerous findings (CBRN uplift content must be handled under strict protocol), legal review of rules of engagement.

### 5.6 Ongoing Model-Quality Monitoring
- **Target:** enterprises in production with domain copilots; labs needing recurring eval cycles.
- **Expert profile:** stable pool of T2-T3, same raters for consistency.
- **Inputs:** sampled production traffic (de-identified) or fixed eval suite per release, delivered via API/webhook.
- **Outputs:** periodic scorecards, trend dashboards, regression alerts, error taxonomy over time.
- **QA:** fixed anchor set each cycle to detect rater drift versus model drift.
- **Pricing hypothesis:** monthly subscription USD 3,000-25,000 by volume tier and turnaround SLA (compare Nxted monthly from GBP 1,500, S17).
- **Cost drivers:** volume per cycle, SLA (24h vs 5-day), PII redaction effort.
- **Risks:** production data privacy (DPA, DPDP, cross-border), demand variability, rater pool continuity.

### 5.7 AI Agent Evaluation
- **Target:** teams building agents (tool use, browsing, coding, workflow automation).
- **Expert profile:** T2-T3 domain professionals who understand the real workflow (for example CA for tax-filing agent, paralegal for contract agent), plus technical reviewers.
- **Inputs:** agent trajectories (logs with tool calls), or live sandbox with task suite.
- **Outputs:** step-level and outcome-level grades, failure attribution (planning, tool use, hallucination, safety), task suites with success criteria, optionally RL environment task specs.
- **QA:** trajectory replay by second expert on disagreements; deterministic checks where possible.
- **Pricing hypothesis:** per trajectory USD 10-100 by length; task-suite authoring priced like benchmark items.
- **Cost drivers:** trajectory length, need for live environment access, tooling.
- **Risks:** tooling complexity (viewer for long traces), non-determinism, customer environment security.

### 5.8 Multimodal Annotation
- **Target:** teams with image/document/audio/video models (medical imaging, documents, Indic speech).
- **Expert profile:** depends: radiologists, pathologists, linguists, engineers for drawings.
- **Inputs:** media assets plus ontology.
- **Outputs:** labels (classification, bounding boxes, segmentation, transcription), captions, QA-scored VQA pairs.
- **QA:** consensus labeling, IoU or WER thresholds, expert adjudication.
- **Pricing hypothesis:** per asset or per hour of media; partner with tool vendors (Labelbox, CVAT) rather than build editors in v1.
- **Cost drivers:** asset complexity, tooling licenses, storage.
- **Risks:** medical data regulation, heavy tooling build, commodity pricing pressure for non-expert work.

### 5.9 Physical AI Data Collection (FUTURE, see Track B in operations_agent_findings.md)
- **Target:** humanoid and manipulation robotics companies, VLA model teams.
- **Expert profile:** skilled tradespeople, technicians, clinicians performing real tasks; capture technicians.
- **Outputs:** egocentric video plus depth, hand pose, trajectories, action labels; LeRobot/RLDS/HDF5 (benchmark: Nxted S17).
- **Pricing hypothesis:** per usable hour by skill tier; Nxted publishes USD 35-120+/hr (S17).
- **Risks:** consent, worker welfare, bystander privacy, hardware capex, storage cost, labour-practice reputational risk (S24).

---

## 6. Unit economics model (HYPOTHESIS)

### 6.1 Formula per accepted task

```
expert_cost      = (t_task / 60) * R_expert * overlap_factor
gold_overhead    = expert_cost * gold_ratio            (gold items paid but not delivered)
review_cost      = review_rate * (t_review / 60) * R_reviewer
adjudication     = adj_rate * (t_adj / 60) * R_reviewer
rework_cost      = rework_rate * expert_cost * 0.5     (rework assumed half original effort)
direct_cost      = expert_cost + gold_overhead + review_cost + adjudication + rework_cost
pm_cost          = direct_cost * pm_ratio
platform_cost    = infra + LLM-assist + storage per task
payout_cost      = (expert_cost + gold_overhead + rework_cost) * payment_fee
COGS             = direct_cost + pm_cost + platform_cost + payout_cost
price            = COGS / (1 - target_gross_margin)
```

### 6.2 Worked example: medical preference/evaluation item (India-delivered)

| Parameter | Value (assumption) |
|---|---|
| t_task | 15 min |
| R_expert | USD 40/hr (T3, about INR 3,400/hr) |
| overlap_factor | 1.3 (30% of items double-rated) |
| gold_ratio | 0.10 |
| review_rate / t_review / R_reviewer | 0.20 / 5 min / USD 60/hr |
| adj_rate / t_adj | 0.05 / 10 min |
| rework_rate | 0.08 |
| pm_ratio | 0.12 |
| platform_cost | USD 0.50 |
| payment_fee | 0.025 |
| target_gross_margin | 0.45 |

| Line | USD |
|---|---|
| expert_cost = 0.25 x 40 x 1.3 | 13.00 |
| gold_overhead | 1.30 |
| review_cost = 0.2 x (5/60) x 60 | 1.00 |
| adjudication = 0.05 x (10/60) x 60 | 0.50 |
| rework_cost = 0.08 x 13 x 0.5 | 0.52 |
| **direct_cost** | **16.32** |
| pm_cost (12%) | 1.96 |
| platform_cost | 0.50 |
| payout_cost (2.5% of 14.82) | 0.37 |
| **COGS** | **19.15** |
| **Price at 45% GM** | **~34.80 per accepted item** |
| Equivalent customer price per productive expert hour (4 items/hr) | ~USD 139 |

Sensitivity (inferred): if the same work used a US expert at USD 120/hr, expert_cost alone would be USD 39 per item; Infollion's India-delivered cost advantage is roughly 2-3x on expert cost, which can fund either lower price or higher margin. Price competitively but do not race to the bottom: buyers of expert data select primarily on quality.

### 6.3 Margin hypotheses by package

| Package | Target gross margin (hypothesis) | Rationale |
|---|---|---|
| Pilot | 0-25% | Acquisition cost; credit to SOW |
| Evaluation / preference (volume) | 40-50% | Benchmarks: Prolific fee equals 30% of invoice (inferred S13); Mercor contractor share 60-70% (S3) |
| SFT creation | 40-50% | Similar labor share; higher rework risk |
| Benchmark creation | 50-60% | Higher value, exclusivity premium, smaller volume |
| Red-teaming | 50-60% | Consulting-style engagement |
| Monitoring subscription | 45-55% | Predictable pool utilization |
| Agent evaluation | 40-50% | Tooling overhead early on |
| Multimodal | 30-40% | Commodity pressure, tool licenses |
| Physical capture | 25-40% early | Capex, logistics, low utilization |

Company-level EBITDA benchmark: Invisible ~11% (S11, estimate). Expect thin operating margins in early years after sales, tooling and bench costs.

### 6.4 Key cost drivers
1. Expert time per item (rubric clarity is the biggest lever).
2. Overlap and gold ratio (quality versus cost trade-off; reduce as rater reliability is proven).
3. Rework and rejection rate.
4. Senior reviewer share.
5. Bench/idle cost: experts onboarded and calibrated but not utilized (calibration time is paid).
6. PM and solutions-engineering hours per project (dominant on small projects).
7. Payout fees and FX for international experts.
8. Tooling: platform build, LLM-assisted QA calls, storage.

---

## 7. Positioning hypotheses for Infollion

1. **"Vetted professionals, not crowds"**: leverage existing Infollion profiles with verified employment history and compliance screening (expert-network standard).
2. **India plus global coverage**: Indic languages, India-specific regulatory domains (GST, Indian law, RBI/SEBI, Indian clinical practice), plus global experts for US/EU domains.
3. **Quality artifacts as product**: every delivery ships with agreement metrics, error taxonomy, rater provenance, datasheet (match Nxted S17).
4. **Compliance**: DPDP Rules 2025 core obligations apply about 18 months after notification, around May 2027 (S25); build to that standard now, plus GDPR SCC readiness for EU data.

---

## 8. Sources table

All accessed 2026-10-20.

| ID | Title | URL | Type | Notes |
|---|---|---|---|---|
| S1 | Meta to pay nearly $15 billion for Scale AI stake, The Information reports (Reuters via Yahoo Finance) | https://finance.yahoo.com/news/meta-pay-nearly-15-billion-171801208.html | press | snippet; 2024 revenue ~USD 870M, Google ~17% |
| S2 | Scale AI pricing index (Flexprice) / Scale Rapid pricing (aitoolsatlas) | https://flexprice.io/pricing-index/scale-ai ; https://aitoolsatlas.ai/tools/scale-rapid/free-vs-paid | independent | snippet; no public rate card |
| S3 | Mercor (Sacra company page) | https://sacra.com/c/mercor/ | independent | snippet; USD 85+/hr avg, 60-70% to contractors (citing The Information) |
| S4 | As Amazon lets Mechanical Turk fade, Mercor hits a $2 billion gross run rate (RuntimeWire) | https://runtimewire.com/article/as-amazon-lets-mechanical-turk-fade-mercor-hits-a-2-billion-gross-run-rate | press | snippet |
| S5 | Surge AI (Sacra) ; Surge AI (remowork.life) | https://sacra.com/c/surge-ai ; https://remowork.life/companies/surge-ai | independent | snippet; USD 1.2B 2024 est; 30-40 cents/min |
| S6 | Finance Expert listing (Outlier, reposted on terra.do) ; Outlier (remowork.life) | https://www.terra.do/climate-jobs/job-board/finance-expert-8321542 ; https://remowork.life/companies/outlier | first-party repost / independent | snippet |
| S7 | Handshake AI fellowship guide (aitrainer.work) ; Medicine Domain Expert listing | https://aitrainer.work/guides/handshake-ai-fellowship-guide ; https://jobs.reachcapital.com/companies/joinhandshake-com/jobs/56438292-medicine-domain-expert-ai-research-contract | independent / first-party listing repost | snippet; USD 40-125/hr range attributed to Handshake Fellowship page |
| S8 | Mercor job listings: Medical Expert ; Lawyers ; Expert Model Trainer | https://work.mercor.com/jobs/list_AAABoKOPjbVqcleYq1NNjKxo/medical-expert ; https://work.mercor.com/jobs/list_AAABnF8XasqEjktZgOdNLr45/lawyers ; https://work.mercor.com/jobs/list_AAABlRvLjyMZ_QjpNyhB6r5E/expert-model-trainer | first-party | snippet |
| S9 | Micro1 Reaches a $500 Million Annualized Revenue Run Rate (mezha.net) ; Micro1 touts crossing $100M ARR (benzatine) ; afterquery vs micro1 (aitrainer.work) | https://mezha.net/eng/news/723fb65e_micro1_reaches_a/ ; https://benzatine.com/news-room/micro1-surges-past-100-million-in-arr-aiming-for-ai-data-dominance ; https://aitrainer.work/compare/afterquery-vs-micro1 | press (secondary) / independent | unverified |
| S10 | Turing annual revenue run rate nearly triples to $300M (Business Wire) ; Turing raises $111M (Turing blog) | https://www.businesswire.com/news/home/20250128158063/en ; https://www.turing.com/blog/turing-raises-111m-to-accelerate-the-future-of-agi | first-party | snippet |
| S11 | Invisible at $134M in revenue (Sacra) | https://sacra.com/research/invisible-at-134m-in-revenue/ | independent | snippet |
| S12 | Snorkel AI Frequently Asked Questions | https://snorkel.ai/faq/ | first-party | snippet; ARR figure from LinkedIn repost, secondhand |
| S13 | Prolific researcher help: study cost / participant rewards | https://researcher-help.prolific.com/en/articles/445129-study-cost ; https://researcher-help.prolific.com/en/article/9cd998 | first-party | snippet |
| S14 | Appen FY24 results (ASX announcement 26 Feb 2025) | https://announcements.asx.com.au/asxpdf/20250226/pdf/06fyjdglv66466.pdf | first-party | snippet |
| S15 | Labelbox pricing calculator | https://labelbox.com/pricing/calculator | first-party | snippet |
| S16 | Toloka: cost calculator and price precision ; save money guide | https://toloka.ai/blog/cost-calculator ; https://toloka.ai/docs/guide/save-money/ | first-party | snippet; undated |
| S17 | nxted.ai homepage | https://nxted.ai | first-party | full page fetched |
| S18 | Is Mindrift legit? (Mindrift blog) ; Mindrift listings (aitrainer.work) | https://mindrift.ai/blog/legit-mindrift ; https://aitrainer.work/jobs/mindrift/freelance-finance-expert-ai-trainer | first-party / independent | snippet |
| S19 | Appen (CrowdGen) Review 2026 (aitrainingjobs.it) and similar reviews | https://www.aitrainingjobs.it/appen-crowdgen-review-2026-ai-training-jobs-pay-tasks-reality/ | independent | low reliability |
| S20 | AI Training Dataset Market (Grand View Research) | https://www.grandviewresearch.com/industry-analysis/ai-training-dataset-market | independent (market research) | estimate |
| S21 | Data collection and labeling market worth $17.10B by 2030 (CMSWire) | https://www.cmswire.com/the-wire/data-collection-and-labeling-market-worth-1710b-by-2030/ | press (press release) | estimate |
| S22 | AI training dataset / data labeling market (MarketsandMarkets) | https://www.marketsandmarkets.com/Market-Reports/data-labeling-annotation-market-253276522.html | independent | estimate |
| S23 | Scale AI hit by its second employee wage lawsuit in less than a month (TechCrunch) | https://techcrunch.com/2025/01/09/scale-ai-hit-by-its-second-employee-wage-lawsuit-in-less-than-a-month | press | allegations only |
| S24 | Indian workers train AI robots with headcam footage (letsdatascience, AFP) ; India trains the world's robots, but at what cost? (Inc42) | https://letsdatascience.com/news/indian-workers-train-ai-robots-with-headcam-footage-463a3761 ; https://inc42.com/features/india-trains-the-worlds-robots-but-at-what-cost/ | press | snippet |
| S25 | DPDP Rules 2025 (PIB document) | https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf | first-party (government) | snippet; phased timeline |
| S26 | Section 194J TDS (ClearTax) | https://cleartax.in/s/section-194j | independent | flag for counsel |
| S27 | Section 16 Zero rated supply, IGST Act (knowyourgst) | https://knowyourgst.com/gstlaw/igst-act/16-zero-rated-supply-190 | independent (statute reproduction) | flag for counsel |
