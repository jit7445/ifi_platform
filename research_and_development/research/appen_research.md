# Appen: Competitive Research Report for Infollion

- Subject: Appen Limited (ASX: APX), https://www.appen.com/
- Prepared for: Infollion, expert-powered AI training and evaluation platform
- Access date for all sources: 2026-10-20
- Raw working notes: `research_and_development/agents/appen_agent_findings.md`
- Evidence labels: **FP** = first-party claim (Appen-owned page), **IND** = independent (press, third party, labor research), **INF** = inferred by this analyst, **UNK** = unknown / not publicly documented. All Appen stats are company claims unless labelled IND.

---

## 1. Executive summary

- Appen has repositioned from a broad "AI training data" vendor into a **"human data for frontier AI"** supplier, with seven product lines: Frontier Alignment, Agentic AI, Multimodal and Speech AI, Physical AI, Model Integrity, Research Services, Coding Datasets, plus two data channels (off-the-shelf catalog, enterprise data licensing). [FP, homepage]
- The delivery model is a **combination**: managed services run on its own platform (ADAP) by a large crowd (claimed 1M+ contributors, 170+ countries) and a newer expert tier recruited via **CrowdGen** (pay up to $450/hr for medical clinicians). [FP, crowdgen.com, ai-research-services]
- Newer, frontier-lab-oriented offers mirror what Infollion wants to build: SME RLHF, CoT reasoning traces, red teaming, rubric design, LLM-as-a-judge as a managed service, golden agent trajectories, RL environments and verifiers, SWE-driven deep evaluation, and a private held-out coding repository corpus. [FP]
- **No public pricing** exists for any service, platform licence or dataset. Everything is "Talk to an expert" / NDA. The only explicit commercial terms are for enterprise data licensing (no upfront cost, payment to data owner on acceptance) and the OTS licence form (perpetual, non-exclusive). [FP]
- Financially, Appen lost Google (about US$82.8M FY23 revenue, terminated March 2024) [IND], and growth now comes mostly from **Appen China** LLM work (FY25 China +75%, Global -21%; H1 FY26 China +80.4%, Global -26.9%). [IND, ASX-derived reporting] Its Western business is shrinking while it pivots to expert data, which leaves an opening for specialised expert networks.

---

## 2. Company context

| Item | Finding | Label / source |
|---|---|---|
| Founded / listing | 1996; ASX-listed (APX) | FP: homepage, crowdgen.com |
| HQ | Sydney (1 Market Street); US HQ Kirkland, WA | FP: /contact-us |
| Scale claims | 30 years; 500+ locales; 235+ languages; 1M+ contributors in 170+ countries; 50M+ people hours; 20K+ projects; "80% of leading LLM builders" are customers | FP: /platform, /ai-research-services, crowdgen.com |
| FY25 (to 31 Dec 2025) | Revenue US$230.8M (+4.5%); Appen Global US$127.9M (-21%); Appen China US$102.9M (+75%, LLM projects); gross margin 40.3%; underlying EBITDA before FX US$12.2M | IND: search summaries of ASX release 25 Feb 2026 and Quartr; primary PDF unreadable |
| FY26 guidance | Revenue US$270-300M; underlying EBITDA margin 5-10%; reaffirmed July 2026 | IND (ASX-derived) |
| H1 FY26 | Revenue US$119.9M (+17.5%); China US$76.2M (+80.4%); Global US$43.7M (-26.9%) | IND (ASX-derived) |
| Concentration history | Google contract ended 19 Mar 2024 (US$82.8M FY23 at 26% GM, ~30% of revenue); historically five big tech customers ~80% of revenue | IND: Motley Fool AU, Capital Brief, Business News Australia |
| Contributor platform | CrowdGen replaced Appen Connect (Sept 2024) | FP: crowdgen.com; IND: seoulstart.com |

---

## 3. Service-by-service analysis

The ten fields are: (1) problem, (2) customer, (3) how it works, (4) customer provides, (5) worker/expert tasks, (6) quality measurement, (7) deliverables, (8) offering type, (9) pricing/commercial model, (10) Infollion comparable.

### 3.1 Frontier model alignment (umbrella programme)

| Field | Finding |
|---|---|
| 1. Problem | Moving models from text generation to reliable reasoning; generic crowds cannot judge clinical, legal or scientific correctness. [FP, /frontier-model-alignment] |
| 2. Customer | Frontier GenAI and reasoning model developers; Cohere cited. [FP] |
| 3. How it works | Bundle of six managed offers: CoT traces, SME RLHF, SFT demonstrations, red teaming, knowledge rubric design, multilingual LLM-as-a-judge managed service. Run on ADAP with crowd plus vetted experts. [FP] |
| 4. Customer provides | Not documented. [UNK] Inferred: model endpoint or outputs, task guidelines, risk taxonomy, target domains. [INF, consistent with Cohere case study] |
| 5. Tasks | Write traces and demonstrations, rank/compare responses, adversarial probing, design rubrics, adjudicate uncertain judge outputs. [FP] |
| 6. Quality | Weekly stratified human QA sampling of LLM-judge outputs; proprietary confidence scoring routing uncertain items to experts. No accuracy figures. [FP] |
| 7. Deliverables | Traces, rankings, demonstrations, red-team findings structured for safety training, rubrics, judge pipelines. Formats unspecified. OTS: 1,000 adversarial prompts (CSV). [FP] |
| 8. Type | Managed service plus data service (OTS), on proprietary platform. [FP/INF] |
| 9. Pricing | Not publicly documented. |
| 10. Infollion | Lead with credential-verified Indian and global SMEs (doctors, lawyers, CAs, engineers) packaged as an "alignment pod" with rubric design included; Infollion's existing expert-vetting pipeline is a direct advantage. |

### 3.2 SFT demonstrations

| Field | Finding |
|---|---|
| 1. Problem | Reduce reliance on synthetic data with human-written exemplars. [FP, /frontier-model-alignment] |
| 2. Customer | LLM developers fine-tuning for dialogue and instruction following. [FP] |
| 3. How it works | Contributors write multi-turn dialogue, instruction-task and creative-writing demonstrations; in Cohere programme also completion rewrites and prompt/preamble writing. [FP, Cohere case study] |
| 4. Customer provides | Not documented [UNK]; Cohere case: live model endpoint and preambles. [FP] |
| 5. Tasks | Author prompts, write ideal responses, rewrite model completions. [FP] |
| 6. Quality | Contributor training on usefulness, safety, tone, instruction adherence; consistent pool; pacing incentives tuned for fidelity over volume. No metrics published. [FP, Cohere] |
| 7. Deliverables | Demonstration datasets; daily live streams and weekly batch summaries (Cohere). [FP] |
| 8. Type | Managed service on ADAP. |
| 9. Pricing | Not publicly documented. |
| 10. Infollion | Straightforward to offer: domain-expert writers plus a reviewer tier; differentiate on Indic languages and regulated domains (Indian law, tax, medicine). |

### 3.3 Human feedback / RLHF

| Field | Finding |
|---|---|
| 1. Problem | Reward models need feedback from people who can actually judge domain correctness. [FP, /rlhf-ai] |
| 2. Customer | Frontier and enterprise LLM builders. [FP] |
| 3. How it works | Appen recruits, verifies and onboards PhDs, MDs, JDs and certified professionals across ~50 domains; vetting includes domain assessment beyond credentials; experts give preference and multi-turn feedback on ADAP or customised tools (e.g. "AI Chat Feedback Tool"). [FP] |
| 4. Customer provides | Model access or outputs, guidelines. [INF from Cohere case] |
| 5. Tasks | Pairwise preference with justification, multi-turn dialogue evaluation, edits. [FP] |
| 6. Quality | Domain assessment at onboarding; structured justifications; IAA (Krippendorff's alpha, Cohen's kappa) referenced on research services page. [FP] |
| 7. Deliverables | Preference rankings with rationales, dialogue reviews, reward-model training data. [FP] |
| 8. Type | Managed service (expert workforce plus platform). |
| 9. Pricing | Not publicly documented. Contributor-side rates visible on CrowdGen (domain maxima $90-$450/hr) [FP], which implies high client bill rates [INF]. |
| 10. Infollion | Core opportunity. Infollion already sources and verifies experts for consultations; reuse that KYC/credential verification and add a calibration test per domain. |

### 3.4 Preference ranking and response comparison

| Field | Finding |
|---|---|
| 1. Problem | Produce a preference signal for fine-tuning and model selection. [FP] |
| 2. Customer | Model developers; enterprises choosing between model versions. [FP, /model-evaluation-and-integrity] |
| 3. How it works | Side-by-side comparisons (A/B, pick-better, edit, justify); "A/B production arena testing" on production-representative prompts. [FP] |
| 4. Customer provides | Candidate models or outputs, prompt sets. [INF] |
| 5. Tasks | Choose, rank, optionally edit, write rationale; multi-turn continuation scoring. [FP, Cohere] |
| 6. Quality | Gold items, IAA, calibration; specific thresholds only in blog guidance (alpha >= 0.800). [FP, /blog/human-in-the-loop] |
| 7. Deliverables | Pairwise/ranked preference data, win rates (inferred), rationales. [FP/INF] |
| 8. Type | Managed service on platform. |
| 9. Pricing | Not publicly documented. |
| 10. Infollion | Build a pairwise comparison UI with rationale capture and per-rater gold tracking; low technical barrier, value comes from rater quality. |

### 3.5 Reasoning data (CoT traces, RLVR)

| Field | Finding |
|---|---|
| 1. Problem | Models need correct, structured reasoning paths and verifiable reward signals. [FP, /frontier-model-alignment, /blog/rlvr] |
| 2. Customer | Reasoning-model teams (math, logic, planning, code, text-to-SQL). [FP] |
| 3. How it works | Experts write step-by-step traces; for RLVR Appen builds verifier assets: prompts with reference answers, golden sets double-annotated and adjudicated, adversarial near-miss tests, checkpoint audits for reward hacking. [FP] |
| 4. Customer provides | Target task domains, possibly model checkpoints for audits. [INF] |
| 5. Tasks | Trace writing, reference answers, verifier stress tests, reward-hacking audits. [FP] |
| 6. Quality | Golden sets with Cohen's kappa >= 0.80; ADAP QC. [FP, /blog/rlvr] |
| 7. Deliverables | Versioned JSONL; 500 OTS coding RL tasks with automated verifiers. [FP] |
| 8. Type | Managed service plus data product. |
| 9. Pricing | Not publicly documented. |
| 10. Infollion | Strong fit: Indian STEM PhD/IIT/olympiad talent for math/physics traces and verifiers; build a verifier-harness template (pass/fail code checks) as reusable IP. |

### 3.6 Red teaming / adversarial testing

| Field | Finding |
|---|---|
| 1. Problem | Find safety, bias and jailbreak weaknesses before release. [FP] |
| 2. Customer | Frontier labs; enterprises needing pre-deployment assurance. [FP] |
| 3. How it works | Adversarial prompt engineers test against documented risk taxonomies across modalities; findings structured for safety training; ADAP lists red teaming as a supported use case. [FP, /frontier-model-alignment, /ai-research-services, /platform] |
| 4. Customer provides | Model access, risk taxonomy or policy. [INF] |
| 5. Tasks | Craft jailbreaks, fictional framing, injection; rate outputs (e.g. 1 / 0.5 / 0 tricategorical scale); OSWE specialists probe generated code for vulnerabilities. [FP] |
| 6. Quality | Published study: 726 prompts, ~3,000 outputs, IRR Krippendorff ~0.65, weighted kappa ~0.66, ICC(2,k) ~0.97; restraint index metric. [FP, /blog/ai-safety-evaluation-tricategorical-reasoning] |
| 7. Deliverables | Structured findings, adversarial prompt sets, safety training data; OTS 1,000-prompt CSV. [FP] |
| 8. Type | Managed service plus data product. |
| 9. Pricing | Not publicly documented. |
| 10. Infollion | Offer domain red teaming (medical, legal, financial misinformation, India-specific harms, Indic-language jailbreaks); note Appen's own published IRR (~0.65) shows the task is hard to make consistent, so invest in rubric calibration. |

### 3.7 AI agent evaluation and trajectory data

| Field | Finding |
|---|---|
| 1. Problem | Agents fail in planning, tool use and output in ways needing specialist judgment. [FP, /agentic-ai] |
| 2. Customer | AI research and engineering teams building agents for enterprise deployment. [FP] |
| 3. How it works | Golden trajectory authoring; failure-mode taxonomy; RL environment design (tools, context, tasks, verifiers) for coding, DevOps, ITSM, HR, sales, finance; task and verifier design; enterprise RAG evaluation. [FP] |
| 4. Customer provides | Not documented. [UNK] Inferred: agent harness, tool specs, access to traces. [INF] |
| 5. Tasks | Enterprise practitioners (accounting, HR, marketing, IT/DevOps) demonstrate tasks on ERP/ITSM/HRIS/CRM, evaluate outputs, annotate failures. [FP] |
| 6. Quality | Rubric-based scoring and verifiers; no QA workflow or metrics published. [FP/UNK] |
| 7. Deliverables | Golden trajectories, failure taxonomies, environments, rubrics, RAG evaluation results (790,000+ RAG evaluations claimed); catalog lists agent trajectories and tool-use logs. [FP] |
| 8. Type | Managed service plus data product; environments are a custom build. |
| 9. Pricing | Not publicly documented; custom environments "scoped separately". [FP] |
| 10. Infollion | Very strong fit: Infollion's network of enterprise practitioners (finance, HR, procurement, IT ops) is exactly the talent Appen advertises. Build a trajectory recorder plus mock enterprise sandboxes (CRM/ERP) as reusable environments. |

### 3.8 Software engineering / coding-agent evaluation

| Field | Finding |
|---|---|
| 1. Problem | Public benchmarks leak into training data and do not predict real codebase performance. [FP, /coding-datasets] |
| 2. Customer | LLM and coding-agent research/eval teams. [FP] |
| 3. How it works | Private held-out repos built by in-house engineering teams: 60+ environments, 400+ repos, 110K+ PRs, 50+ languages; executable test suites; contamination checks; PR before/after pairs as agent tasks; SWE-led no-LLM-assisted deep evaluation. [FP] |
| 4. Customer provides | Model/agent to evaluate; NDA for repository metadata. [FP/INF] |
| 5. Tasks | Long-form trajectory review, bug localisation, failure annotation, secure/insecure code RLHF pairs (OWASP). [FP, /agentic-ai] |
| 6. Quality | Execution-based scoring with project test suites; average test coverage 58.8% (10 environments); 100+ PR qualification threshold; provenance and licence review. Note: page states 35M+ LOC headline vs 37.1M in table. [FP] |
| 7. Deliverables | Repo-level data, PR datasets, RL tasks with verifiers, evaluation reports. Formats unspecified. [FP] |
| 8. Type | Data product (licensed corpus) plus managed evaluation service. |
| 9. Pricing | Not publicly documented; metadata under NDA. |
| 10. Infollion | Partner rather than build the corpus initially: source private repos from Indian SaaS/IT firms (similar to Appen's enterprise-data licensing model), and offer senior-engineer review of agent trajectories, where India's engineer supply is a cost and scale advantage. |

### 3.9 Multimodal data

| Field | Finding |
|---|---|
| 1. Problem | Models that see, hear and speak need human-validated audio, image and video labels. [FP, /multimodal-ai] |
| 2. Customer | Speech, VLM, voice-agent, healthcare, automotive teams. [FP] |
| 3. How it works | Custom collection and annotation by crowd vetted for native fluency and domain fit; consent-based collection with provenance. [FP] |
| 4. Customer provides | Scope (modality, locale, volume); timelines "scope-dependent". [FP] |
| 5. Tasks | Dense captioning, object-relationship mapping, video action/intent labelling, voice-agent UX rating, translation evaluation, medical imaging annotation, in-cabin capture. [FP] |
| 6. Quality | Multi-pass validation with IAA thresholds, gold audits, native-speaker review, quality reported per deliverable. [FP] |
| 7. Deliverables | 48kHz audio, up to 4K video, bounding boxes, metadata, TTS lexicons; OTS sets (e.g. 30,000 hours US call-centre audio). [FP] |
| 8. Type | Managed data service plus OTS data products. |
| 9. Pricing | Not publicly documented. |
| 10. Infollion | Postpone general multimodal collection (commodity, crowd-scale); selectively offer expert multimodal evaluation (radiology images, medical reports, Indic speech) where experts matter. |

### 3.10 Speech, audio, image, document and video annotation

| Field | Finding |
|---|---|
| 1. Problem | Accurate labelled data for ASR, TTS, vision and document understanding. [FP] |
| 2. Customer | Speech/vision/IDP developers; Dialpad, Onfido, Nearmap cited. [FP] |
| 3. How it works | ADAP tooling for text, audio, image, video, geospatial, 3D point cloud, 4D; AI-assisted pre-labelling; Document Intelligence pairs AI tooling with workforce for transcription, key-value and table annotation (2023 post). [FP] |
| 4. Customer provides | Raw data or collection spec; for sensitive data, on-prem tool option (Onfido). [FP] |
| 5. Tasks | Transcription to word-error protocol, diarization, paralinguistic tags, bounding boxes, LiDAR 3D boxes, key-value pairs, tables. [FP] |
| 6. Quality | IAA, gold, multi-pass; Dialpad labeller accuracy 88% within weeks; >99% key-value/table accuracy on a receipt project. [FP] |
| 7. Deliverables | Annotated datasets in WAV/FLAC/JSON/JSONL/COCO. [FP, /data-catalog] |
| 8. Type | Platform plus managed service. |
| 9. Pricing | Not publicly documented. A search snippet attributed a £30,000 to £3,000,000/year licence range to a UK G-Cloud listing, but the page returned 404 and could not be verified. [UNK] |
| 10. Infollion | Integrate rather than build: use an open-source or commercial labelling tool (e.g. Label Studio, CVAT) for basic modalities; only build custom UIs for expert evaluation. Document annotation in Indian financial/legal documents is a niche worth testing. |

### 3.11 Data collection and labelling (incl. OTS, enterprise data, physical AI)

| Field | Finding |
|---|---|
| 1. Problem | Teams need data that does not exist publicly: enterprise workflows, embodied demonstrations, niche locales. [FP, /enterprise-data, /physical-ai, /data-catalog] |
| 2. Customer | Labs (buyers) and enterprises (data sellers); robotics/AV teams. [FP] |
| 3. How it works | (a) OTS catalog: 597 datasets, nine categories, spec sheet per dataset. (b) Enterprise data: Appen extracts, anonymises and licenses operational records (docs, ITSM/CRM decisions, ERP) with enterprise approval. (c) Physical AI: capture in Appen-run kitchen/workshop/assembly/logistics facilities with synchronized sensors. [FP] |
| 4. Customer provides | Buyers: modality, locale, volume. Enterprise sellers: data access via read-only, per-engagement credentials; scope and exclusions. [FP] |
| 5. Tasks | Recording speech, task demonstrations, frame-level annotation, practitioner annotation of licensed enterprise data. [FP] |
| 6. Quality | Spec sheets (source, consent, method, limitations); samples under NDA; IAA and gold for physical data; enterprise sample-pack approval. [FP] |
| 7. Deliverables | Licensed datasets delivered "in days" for OTS; calibrated sensor streams; enterprise datasets within approved scope. [FP] |
| 8. Type | Data service / data marketplace plus managed collection. |
| 9. Pricing | OTS: perpetual, non-exclusive commercial training licence; no prices. Enterprise data: quoted individually, payment to data owner on acceptance, no setup fees, Appen bears extraction costs; price factors uniqueness, depth, volume, complexity, quality. [FP] |
| 10. Infollion | Enterprise-data brokerage is a notable idea Infollion could replicate using its corporate relationships (Indian enterprises, wind-down companies), but it carries legal/privacy risk under India's DPDP Act; postpone until legal framework is set. |

### 3.12 Model evaluation, safety and QA

| Field | Finding |
|---|---|
| 1. Problem | Confirm a model is "ready, not just capable": accuracy, bias, compliance before and after release. [FP, /model-evaluation-and-integrity] |
| 2. Customer | AI developers, deploying enterprises, procurement and compliance teams. [FP] |
| 3. How it works | Hallucination/factuality benchmarking by domain-verified contributors; regulatory/ethics audits (EU AI Act, NIST AI RMF); A/B arena; bias detection with remediation dataset design; continuous monitoring; LLM-as-a-judge rubric design and calibration; custom benchmarks and harnesses. [FP, also /ai-research-services] |
| 4. Customer provides | Model access, production-representative prompts, policies. [INF] |
| 5. Tasks | Compare outputs to ground truth, flag confabulation and misattribution, audit against frameworks, score with rubrics. [FP] |
| 6. Quality | Human-model agreement scoring for judges; Krippendorff's alpha and Cohen's kappa; judges validated against human ground truth before scaling. [FP] |
| 7. Deliverables | Benchmark results, audit trails, preference signals, bias reports plus remediation datasets, calibrated judges with agreement scores, independent benchmark scores. [FP] |
| 8. Type | Managed service; recurring (monitoring) and project (audit) forms. |
| 9. Pricing | Not publicly documented; timelines weeks to months. [FP] |
| 10. Infollion | Build early: a calibrated "expert panel plus LLM judge" evaluation product, sold as recurring monitoring, is the most software-leverageable service and suits Infollion's domain experts. |

### 3.13 Enterprise project delivery and workforce (crowd) management

| Field | Finding |
|---|---|
| 1. Problem | Run large, quality-controlled human data programmes at scale and on time. [FP] |
| 2. Customer | All of the above; e.g. Nearmap grew from 5 to 180+ specialists against a 180,000-hour annual commitment. [FP] |
| 3. How it works | ADAP workflows (routing, multi-stage review, templates), mixing customer's internal experts with Appen crowd; CrowdGen for contributor recruitment, matching and payouts; HITL score/route/review/learn loop with confidence-based routing to auto-accept, single review or multi-reviewer adjudication. [FP, /platform, crowdgen.com, /blog/human-in-the-loop] |
| 4. Customer provides | Guidelines, gold answers, thresholds (gold accuracy bar "set by customer or task"). [FP] |
| 5. Tasks | Contributors sign up, pass an experience review, take per-project qualification; work tracked in hours; quality score and project history. [FP, crowdgen.com] |
| 6. Quality | Quality Flow test questions in quiz mode (entry gate) and work mode (ongoing accuracy); Levenshtein matching for text answers; manager notified below threshold and may remove contributor and their work; guidance of 5-10% hidden gold per batch, alpha thresholds 0.800/0.667, 85% gold accuracy removal bar, 1% audit of auto-accepts. [FP, help-centre via search, blogs] |
| 7. Deliverables | Per-batch agreement scores, gold accuracy by contributor, adjudication logs. [FP] |
| 8. Type | Platform plus managed workforce. ADAP is also offered to customers (APIs, webhooks, AWS/Azure); on-prem/private cloud only evidenced by a case study and an unverified G-Cloud snippet. |
| 9. Pricing | Not publicly documented for clients. Contributor pay: rates shown before work, domain maxima $90-$450/hr; payouts via bank, PayPal, Payoneer, Airtm. [FP] Independent reviews report low or delayed pay on general tasks. [IND] |
| 10. Infollion | Build: expert onboarding, credential verification, per-domain qualification tests, gold seeding, IAA dashboards and payouts in INR/USD. This is the core moat and should be first-party software. |

---

## 4. Platform and tooling observations

- **ADAP** is named both "Appen Data Annotation Platform" (page title) and "AI Data Platform" (body). [FP, /platform]
- Capabilities: multi-modal tooling (incl. 3D/4D, geospatial), workflow routing and multi-stage review, gold test questions, "smart validators", contributor analytics, AI-assisted pre-labelling, LLM integration, APIs, webhooks, AWS and Azure integration. [FP]
- **Quality Flow** is the current QC module; the public developer portal is titled "Quality Flow Public API Documentation" (content did not render). [FP]
- Custom tools on ADAP: "AI Chat Feedback Tool" with live model endpoint integration, dynamic preambles, prompt routing. [FP, Cohere case]
- No self-serve signup, plan tiers or pricing for ADAP were found. [UNK]
- Inferred: ADAP descends from the Figure Eight (CrowdFlower) platform Appen acquired; terminology (jobs, test questions, quiz/work mode, trust score) matches. [INF]

## 5. Quality and workforce model

- Three-tier workforce: general crowd (1M+ claimed), domain experts via CrowdGen (PhD/MD/JD, ~50 domains), specialist teams (SWE, OSWE security, enterprise practitioners, in-house engineering teams for code corpus). [FP]
- Vetting: experience review at signup, domain assessment beyond credentials, per-project qualification quizzes. Specific ID or background check procedures are not public. [FP/UNK]
- Metrics publicly referenced: gold accuracy, Krippendorff's alpha, Cohen's kappa, Gwet's AC1, ICC, human-model agreement, ECE for confidence routing. [FP]
- Independent signal: contributor reviews (Trustpilot) and affiliate blogs cite opaque removals and low or delayed pay; Fairwork (Oxford Internet Institute) published a 2025 Appen assessment whose findings were not read here. [IND]

## 6. Security and compliance claims

| Claim | Label / source |
|---|---|
| SOC 2 Type II, annual | FP: /data-security, /coding-datasets |
| ISO 27001:2013 (TUV Rheinland) | FP: /data-security, /platform |
| HIPAA environment | FP: /data-security |
| GDPR adherence | FP |
| UK facilities ISO 9001, Cyber Essentials; Philippines (Cavite) ISO 27001, Data Privacy Act 2012, PEZA; China (Wuxi) ISO 27001 | FP |
| Secure Workspaces (remote secure work) | FP |
| ISO/IEC 42001, NIST AI RMF "alignment" (not stated as certification) | FP: /ai-research-services |
| Enterprise data: read-only encrypted-in-transit per-engagement credentials, PII removal by default, time-bound access roster, audit trail | FP: /enterprise-data |
| Not addressed: encryption at rest, retention/deletion, contributor background checks, VPC deployment | UNK |

## 7. Commercial model

- All services: enterprise sales, "Talk to an expert", one-business-day response, NDA-gated details. No public rate cards. [FP, /contact-us]
- Engagement forms: project-based (weeks to months), ongoing programmes and annual hour commitments (Nearmap 180,000 hours), recurring monitoring, dataset licensing. [FP]
- OTS licence: perpetual, non-exclusive commercial training rights. [FP]
- Enterprise data: two-sided marketplace; Appen funds extraction; data owner paid on acceptance. [FP]
- Billing unit (per hour, per task, per dataset) is not public. [UNK] Inferred: hours-based for expert programmes given contributor-hour reporting. [INF]
- Revenue mix shifting to China LLM work; Western "Appen Global" shrinking. [IND]

## 8. Infollion takeaways

### Build (core, differentiating)
1. **Expert supply layer**: credential verification, domain assessment tests, qualification quizzes, per-expert quality score, payouts. Appen's CrowdGen shows clients and experts expect this, and Infollion already has expert vetting.
2. **QC engine**: gold seeding (5-10%), quiz/work mode gating, IAA (Krippendorff's alpha) per batch, adjudication logs, confidence-based routing. Ship quality reports with every deliverable, since Appen markets "measurable quality evidence".
3. **Evaluation product**: expert rubric design plus calibrated LLM judge with human-model agreement scores, offered as recurring monitoring.
4. **Agentic/enterprise workflow data**: golden trajectories and failure taxonomies by real finance/HR/IT practitioners from Infollion's network.

### Integrate (buy or use open source)
- Labelling UIs for image/audio/video/doc (Label Studio, CVAT), sandboxed code execution for verifiers, LLM provider APIs for judges.

### Postpone
- Large-scale commodity multimodal collection, physical AI capture facilities, OTS catalog, enterprise data brokerage (pending DPDP Act and contract framework).
- Exception: start SOC 2 Type II and ISO 27001 work early, since every Appen page leads with them and lab procurement will expect them.

### Positioning against Appen
- Appen's Western revenue is shrinking and contributor sentiment is mixed; a premium, transparent-pay expert network with published QC metrics and India-specific domains (Indic languages, Indian law/tax/medicine) is a credible wedge.
- Publish methodology (as Appen does with its tricategorical study) to earn lab credibility.

## 9. Unknowns

- Client pricing and billing unit for every service and ADAP.
- What customers must supply for most services.
- Exact expert verification method (ID, licence registry checks, background checks).
- Delivery file formats for alignment, agentic and evaluation outputs.
- Named frontier-lab customers beyond Cohere; case-study index did not render.
- Contents of FY25 investor presentation (PDF not parseable); segment details beyond search summaries.
- Fairwork 2025 Appen findings.
- Whether ADAP is sold standalone today and its deployment options.

## 10. Sources

| URL | Title | Accessed | Type |
|---|---|---|---|
| https://www.appen.com/ | Appen homepage (Human data for frontier AI) | 2026-10-20 | First-party |
| https://www.appen.com/frontier-model-alignment | Frontier Model Alignment Services, Appen | 2026-10-20 | First-party |
| https://www.appen.com/rlhf-ai | RLHF Services, Human Feedback for AI Models | 2026-10-20 | First-party |
| https://www.appen.com/agentic-ai | Agentic AI Training Data & Agent Evaluation, Appen | 2026-10-20 | First-party |
| https://www.appen.com/coding-datasets | Coding datasets for LLMs: training, evals and RL, Appen | 2026-10-20 | First-party |
| https://www.appen.com/multimodal-ai | Multimodal AI & speech training data for frontier models, Appen | 2026-10-20 | First-party |
| https://www.appen.com/model-evaluation-and-integrity | AI Model Evaluation & Integrity Services, Appen | 2026-10-20 | First-party |
| https://www.appen.com/physical-ai | Physical AI training data for robotics and embodied AI, Appen | 2026-10-20 | First-party |
| https://www.appen.com/ai-research-services | AI Research Services for Frontier Model Teams, Appen | 2026-10-20 | First-party |
| https://www.appen.com/enterprise-data | Enterprise Data for Frontier AI Models, Appen | 2026-10-20 | First-party |
| https://www.appen.com/data-catalog | AI training datasets: off-the-shelf data catalog, Appen | 2026-10-20 | First-party |
| https://www.appen.com/platform | ADAP, Appen Data Annotation Platform | 2026-10-20 | First-party |
| https://www.appen.com/data-security | Data Security, Appen | 2026-10-20 | First-party |
| https://www.appen.com/case-studies | Case Studies (list did not render) | 2026-10-20 | First-party (partial) |
| https://www.appen.com/case-studies/cohere-fine-tuning-for-enterprise | Cohere fine-tuning for enterprise | 2026-10-20 | First-party |
| https://www.appen.com/research | Research (list did not render) | 2026-10-20 | First-party (partial) |
| https://www.appen.com/blog/human-in-the-loop | Human-in-the-loop blog | 2026-10-20 | First-party |
| https://www.appen.com/blog/rlvr | RLVR blog | 2026-10-20 | First-party |
| https://www.appen.com/blog/ai-safety-evaluation-tricategorical-reasoning | AI safety evaluation: tricategorical reasoning | 2026-10-20 | First-party |
| https://www.appen.com/blog/adap-quality-flow-test-questions | ADAP Quality Flow test questions | 2026-10-20 | First-party |
| https://www.appen.com/blog/unlock-insights-with-ai-powered-document-intelligence | Unlock insights with AI-powered document intelligence (Feb 2023) | 2026-10-20 | First-party |
| https://www.appen.com/contact-us | Contact us | 2026-10-20 | First-party |
| https://www.appen.com/investors | Investor Relations | 2026-10-20 | First-party |
| https://www.appen.com/legal-policies/scam-awareness | Scam awareness | 2026-10-20 | First-party |
| https://crowdgen.com/ | CrowdGen by Appen | 2026-10-20 | First-party |
| https://developer.appen.com/ | Quality Flow Public API Documentation (content did not render) | 2026-10-20 | First-party (partial) |
| https://success.appen.com/hc/en-us/articles/28025562876557-Product-Release-Notes-June-2024 | Product Release Notes June 2024 (via search snippet) | 2026-10-20 | First-party (search) |
| https://success.appen.com/hc/en-us | Appen Success Center | 2026-10-20 | Unavailable (HTTP 404) |
| https://cdn.prod.website-files.com/656a6f5ca4824808211181c5/699fbe15126c80d320e2323d_APX%20FY25%20Investor%20Presentation.pdf | APX FY25 Investor Presentation | 2026-10-20 | First-party (PDF not parseable) |
| https://announcements.asx.com.au/asxpdf/20260225/pdf/06wq7ntr51bhgl.pdf | ASX announcement 25 Feb 2026 | 2026-10-20 | First-party regulatory (PDF not parseable; figures via search) |
| https://quartr.com/events/appen-ltd-apx-h2-2025_3s79tNbZ | Appen (APX) H2 2025 earnings summary | 2026-10-20 | Independent (search result) |
| https://announcements.asx.com.au/asxpdf/20260729/pdf/07256cvzfxhdbd.pdf | ASX announcement July 2026 (guidance reaffirmed) | 2026-10-20 | First-party regulatory (via search) |
| https://fool.com.au/2024/01/22/appen-shares-crash-37-on-huge-google-blow | Appen shares crash 37% on huge Google blow | 2026-10-20 | Independent |
| https://www.capitalbrief.com/briefing/appen-loses-126m-google-contract-ee72676a-c481-453a-8bd9-1854f83e6c1b/ | Appen loses $126m Google contract | 2026-10-20 | Independent |
| https://www.businessnewsaus.com.au/articles/appen-shares-slump-41-per-cent-after-google-terminates--83m-contract.html | Appen shares slump 41 per cent after Google terminates US$83m contract | 2026-10-20 | Independent |
| https://www.business-humanrights.org/zh-hans/最新消息/appen-non-response-re-working-conditions-for-content-moderators | Appen response re working conditions | 2026-10-20 | Independent (contains company statement) |
| https://fairwork.oii.ox.ac.uk/wp-content/uploads/sites/17/2025/12/Fairwork-Report-Appen_2025.pdf | Fairwork Report Appen 2025 | 2026-10-20 | Independent (findings not read) |
| https://www.trustpilot.com/review/crowd.appen.com | Crowd Appen reviews | 2026-10-20 | Independent (anecdotal) |
| https://seoulstart.com/guides/is-crowdgen-legit | Is CrowdGen Legit? | 2026-10-20 | Independent (blog) |
| https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/741201707731607 | UK G-Cloud Appen listing | 2026-10-20 | Unavailable (HTTP 404) |
