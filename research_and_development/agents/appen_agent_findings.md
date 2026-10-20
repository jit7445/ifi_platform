# Appen Research Agent - Raw Working Findings

- Target: Appen Limited (ASX: APX), https://www.appen.com/
- Prepared for: Infollion (expert-powered AI training and evaluation platform)
- Access date for all sources: 2026-10-20
- Agent: Appen Research Agent

## 1. Method

1. Loaded WebFetch and WebSearch via ToolSearch. Attempted to load REA browser tools (`mcp__rea__inspect_web_page`, `mcp__rea__list_browser_targets`, `mcp__rea__capture_web_screenshot`).
2. Fetched the homepage to enumerate navigation ("Data products", "Perspectives", "About", footer links).
3. Fetched every product page in the "Data products" menu, plus platform, OTS catalog, enterprise data, data security, contact, investors, CrowdGen (contributor site), the developer portal, and selected blog posts / case studies.
4. Used WebSearch for: financial results (FY25, H1 FY26), the Cohere case study, Quality Flow / test-question documentation on the help centre, document annotation, contributor pay and working conditions, and the 2024 Google contract termination.
5. Each page was asked for a structured extraction (problem, customer, workflow, inputs, tasks, QA, deliverables, pricing) and explicitly checked for AI-directed instructions (prompt injection).
6. Labels used: first-party claim (Appen-owned page), independent (press, third-party, labor research), inferred (my reasoning from evidence), unknown.

## 2. Tool usage notes (REA vs WebFetch)

| Tool | Result | Notes |
|---|---|---|
| `mcp__rea__list_browser_targets` (http://127.0.0.1:9222) | FAILED: `provider_unavailable`, `endpoint_unreachable` | No local Chrome with remote debugging was running. All REA browser tools (`inspect_web_page`, `capture_web_screenshot`, `capture_browser_scenario`) need a CDP endpoint plus target id, so they could not be used. |
| `mcp__rea__inspect_web_page` | Not callable in practice | Requires `cdp_endpoint` + `target_id`; blocked by the same missing endpoint. |
| WebFetch | Primary tool; worked for all HTML pages except those listed in Blockers | Returns model-summarized text, not raw HTML. JS-rendered listing pages (case studies, research) returned "Loading..." placeholders. |
| WebFetch on PDFs | FAILED to parse | FY25 investor presentation and ASX announcement PDFs came back as compressed binary; the local machine has no `pdftotext`, `pdftoppm` or `pypdf`, so the Read tool could not render them either. |
| WebSearch | Worked | Used to recover financial figures (from ASX-linked press/aggregators), help-centre QA documentation, independent coverage. |

Recommendation for future runs: start Chrome with `--remote-debugging-port=9222` so REA can inspect JS-rendered pages (case-study and research index pages), and install poppler (`brew install poppler`) to read investor PDFs.

## 3. Pages visited

| # | URL | Status | Notes |
|---|---|---|---|
| 1 | https://www.appen.com/ | OK | Title area: "Human data for frontier AI". Nav enumerated. |
| 2 | https://www.appen.com/frontier-model-alignment | OK | "Frontier Model Alignment Services, Appen" |
| 3 | https://www.appen.com/agentic-ai | OK | "Agentic AI Training Data & Agent Evaluation, Appen" |
| 4 | https://www.appen.com/coding-datasets | OK | "Coding datasets for LLMs: training, evals and RL, Appen" |
| 5 | https://www.appen.com/multimodal-ai | OK | "Multimodal AI & speech training data for frontier models, Appen" |
| 6 | https://www.appen.com/model-evaluation-and-integrity | OK | "AI Model Evaluation & Integrity Services, Appen" |
| 7 | https://www.appen.com/platform | OK | "ADAP, Appen Data Annotation Platform" |
| 8 | https://www.appen.com/physical-ai | OK | "Physical AI training data for robotics and embodied AI, Appen" |
| 9 | https://www.appen.com/ai-research-services | OK | "AI Research Services for Frontier Model Teams, Appen" |
| 10 | https://www.appen.com/enterprise-data | OK | "Enterprise Data for Frontier AI Models, Appen" |
| 11 | https://www.appen.com/data-catalog | OK | "AI training datasets: off-the-shelf data catalog, Appen" |
| 12 | https://www.appen.com/data-security | OK | Security/certification claims |
| 13 | https://www.appen.com/rlhf-ai | OK | "RLHF Services, Human Feedback for AI Models" (not in main nav; found via search) |
| 14 | https://www.appen.com/case-studies | PARTIAL | JS-rendered list returned "Loading..." only |
| 15 | https://www.appen.com/case-studies/cohere-fine-tuning-for-enterprise | OK | Cohere PANDA Plus case study |
| 16 | https://www.appen.com/research | PARTIAL | JS-rendered list returned "Loading resources..." only |
| 17 | https://www.appen.com/blog/human-in-the-loop | OK | HITL QA methodology |
| 18 | https://www.appen.com/blog/rlvr | OK | RLVR, verifiers, environments |
| 19 | https://www.appen.com/blog/ai-safety-evaluation-tricategorical-reasoning | OK | Red-team study and metrics |
| 20 | https://www.appen.com/blog/adap-quality-flow-test-questions | OK | Quality Flow test questions |
| 21 | https://www.appen.com/blog/unlock-insights-with-ai-powered-document-intelligence | OK | Document Intelligence (Feb 2023) |
| 22 | https://www.appen.com/contact-us | OK | Sales contact process, offices |
| 23 | https://www.appen.com/investors | OK | Results/presentation links; announcement feed appears stale (Jan 2024) |
| 24 | FY25 investor presentation PDF (cdn.prod.website-files.com/.../APX FY25 Investor Presentation.pdf) | FAILED (binary PDF not parseable) | Figures recovered via WebSearch instead |
| 25 | https://announcements.asx.com.au/asxpdf/20260225/pdf/06wq7ntr51bhgl.pdf | FAILED (binary PDF) | Same |
| 26 | https://www.appen.com/legal-policies/scam-awareness | OK | Official domains, payment practices |
| 27 | https://crowdgen.com/ | OK | Contributor platform, pay ranges |
| 28 | https://developer.appen.com/ | PARTIAL | Only title "Quality Flow Public API Documentation" returned (JS-rendered docs) |
| 29 | https://success.appen.com/hc/en-us | FAILED: HTTP 404 | Individual help-centre articles surfaced via search only |
| 30 | https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/741201707731607 | FAILED: HTTP 404 | Licence range cited only in search snippet (unverified) |

Not visited (time/priority): privacy statement, corporate governance, AI glossary, podcasts, webinars, careers, annual-reports subpage, Fairwork PDF body.

## 4. Notes per page (paraphrased)

### Homepage
- Positioning: human data for frontier AI; nav groups: Data products (Frontier Alignment, Agentic AI, Multimodal and Speech AI, Physical AI, Model Integrity, Research Services, Coding Datasets), "Why Appen" (OTS datasets, Enterprise data), Perspectives (blog, research, case studies, podcasts, webinars), About (Annotation Platform, About, Investors, News, Careers). CTA "Join our workforce" goes to crowdgen.com.
- Recurring trust strip on all pages: 30 years, SOC 2 and ISO 27001, 500+ locales, "independent model evaluation", ASX listed. Timeline claims RLHF work around 2022 (ChatGPT era). "Trusted by leading AI companies" with no names in text.

### Frontier model alignment
- Six offers: CoT reasoning traces; SME RLHF (PhD/MD/JD); SFT demonstrations (multi-turn, instruction, creative); adversarial red teaming against risk taxonomies; knowledge rubric design; multilingual LLM-as-a-judge managed service (Appen runs pipeline, confidence scoring routes uncertain items to experts; weekly stratified human QA sampling).
- Claims: Cohere 2,400+ expert hours over 12 weeks; multilingual SFT preference rankings across 70 dialects.
- OTS: 1,000 adversarial prompts (CSV).

### RLHF page (/rlhf-ai)
- Vetting described as beyond credential checks, with domain assessment; ~50 specialist domains; continuous recruitment. Tasks: side-by-side preference with structured justification, multi-turn conversation evaluation.

### Agentic AI
- Golden trajectory creation; trajectory analysis and failure-mode taxonomy (plan, tool use, output); RL environment design (coding, DevOps, ITSM, HR, sales, finance); task and verifier design; SWE-driven deep evaluation (no-LLM-assisted); enterprise RAG evaluation.
- Talent: software engineers, OSWE-certified offensive security specialists (OWASP-aligned secure/insecure RLHF pairs), enterprise practitioners on ERP/ITSM/HRIS/CRM.
- Claim: 790,000+ RAG evaluations (white paper). ReflexAI case study referenced without metrics.

### Coding datasets
- Private, held-out repos: 60+ environments, 400+ repositories, 110K+ PRs, 50+ languages; 543 private repos across 133 environments built by in-house engineering teams, 66 qualify at 100+ PRs (406 repos). 35M+ LOC headline vs 37.1M in table (internal inconsistency noted).
- Executable test suites, contamination checks against public benchmarks, 500 coding RL tasks with automated verifiers, PR before/after pairs with reviewer comments. Metadata under NDA. 58.8% average test coverage (10 environments). Provenance and license review.

### Multimodal and speech
- Speech: ASR, conversational (diarization), medical speech, code-switched, multi-speaker with IAA, acoustic scene/emotion, paralinguistics, expressive TTS.
- Multimodal: dense captioning, video action/intent, voice-agent UX evaluation, low-latency dialogue, translation evaluation, medical imaging, in-cabin automotive.
- QA: multi-pass, IAA thresholds, gold audits, native-speaker review, quality "reported per deliverable".
- Case studies cited: Dialpad (88% labeler accuracy in weeks), Onfido (on-prem labeling tool, "tenfold" fraud detection), Nearmap (5 to 180+ specialists, 180,000-hour annual commitment), multilingual image generation in 24 languages.

### Model evaluation and integrity
- Hallucination/factuality benchmarking; regulatory and ethics audits (EU AI Act, NIST AI RMF); A/B production arena; bias detection and cultural mitigation (includes remediation dataset design); continuous performance monitoring; LLM-as-a-judge rubric design with human-model agreement scoring.
- Case studies listed: TrustLab, children's video platform safety, Johns Hopkins, Allen Institute for AI.

### Physical AI
- Egocentric capture (stereo, wrist pose, gripper state), robotics demonstrations in Appen-run kitchen/workshop/assembly/logistics facilities, sensor fusion, LiDAR, AV, world-model data. "Sub-millisecond" alignment claim. QA: IAA, multi-pass review, gold validation.

### Research services
- Embedded research capacity: enterprise context engineering, LLM-as-a-judge deployment, synthetic data generation, custom benchmarks/harnesses, red teaming and safety evaluation, expert-in-the-loop evaluation. Reusable pipelines owned by customer.
- QA: Krippendorff's alpha, Cohen's kappa; judges validated against human ground truth; ISO/IEC 42001, NIST AI RMF, GDPR/CCPA alignment (stated as "aligned", not certified). 1M+ contributors, 170+ countries, 235+ languages.
- Timeline: weeks for a focused eval to months for programmes.

### Enterprise data
- Two-sided: enterprises license operational data (docs, decision/escalation records, systems of record); labs license it. Appen does extraction, anonymisation, transfer at its cost; payment to enterprise on acceptance; no setup fees; mutual NDA; response in two business days; wind-down companies prioritised. Pricing factors: uniqueness, structural depth, volume/longevity, complexity, quality.

### Data catalog (OTS)
- 597 datasets, nine categories (RL tasks/verifiers, speech/audio, code, enterprise data, VLM, LiDAR, robotics, agent trajectories, tool-use logs). Perpetual, non-exclusive commercial training licence; spec sheet per dataset; samples under NDA; formats WAV, FLAC, JSON, JSONL, COCO; delivery in days; no prices or self-serve checkout.

### Platform (ADAP)
- Title expands ADAP as "Appen Data Annotation Platform"; body says "AI Data Platform". Modalities: text, image, audio, video, geospatial, 3D point cloud, 4D. Workflow routing, multi-stage review, templates, gold test questions, smart validators, contributor performance monitoring, mixing internal experts with Appen crowd, AI-assisted annotation, LLM integration, APIs, webhooks, AWS/Azure. Scale claims: 50M+ people hours, 20K+ projects, 100M LLM data elements, 10B data units, "80% of leading LLM builders".
- Quality Flow (blog + help-centre via search): test questions in quiz mode (pre-qualification) and work mode (ongoing accuracy); thresholds; manager notified below threshold; Levenshtein minimum matching accuracy for text answers; trust score in classic ADAP jobs. Developer portal titled "Quality Flow Public API Documentation".

### HITL blog
- Score/route/review/learn loop; 5-10% hidden gold per batch; keep individual labels; Krippendorff's alpha >= 0.800 pass, 0.667-0.800 tentative, < 0.667 fail; 85% gold accuracy as common starting removal bar; audit 1% of auto-accepts; ECE < 0.05 target. Presented as guidance, not guaranteed SLAs.

### RLVR blog
- Golden sets double-annotated and adjudicated (Cohen's kappa >= 0.80), adversarial near-miss tests, checkpoint audits for reward hacking, versioned JSONL deliverables, 80+ languages.

### Tricategorical safety blog
- 726 adversarial prompts (text and text+image), ~3,000 outputs rated; scale 1 (reasoned refusal), 0.5 (mechanical refusal), 0 (harmful); restraint index; IRR Krippendorff ~0.65, Gwet AC1 ~0.67, weighted kappa ~0.66, ICC(2,k) ~0.97; 47,408 annotated responses referenced. Presented at NeurIPS (per page).

### Cohere case study
- PANDA Plus programme; 200 vetted US-English contributors with LLM/RLHF experience; adapted "AI Chat Feedback Tool" on custom ADAP deployment; live integration with Command inference endpoint; pairwise choose/edit/justify; also multi-turn scoring, prompt/preamble writing, SFT rewrites; daily live streams and weekly batch summaries; 2,400+ hours, 12 weeks; no quantitative model gains published.

### Document intelligence blog (Feb 2023)
- Transcription, localization, key-value and table annotation with AI-assisted tooling; >99% accuracy claim on a receipt project; customers anonymised (large hardware/software company, multinational tech company).

### Data security
- SOC 2 Type II; ISO 27001:2013 (TUV Rheinland); HIPAA environment; GDPR; UK facilities ISO 9001 and Cyber Essentials; Philippines (Cavite) ISO 27001 and Data Privacy Act; China (Wuxi) ISO 27001; Secure Workspaces for remote sensitive work. No detail on encryption, retention, background checks, VPC/on-prem.

### CrowdGen
- "Contributor platform of Appen"; replaced Appen Connect in Sept 2024 (independent blog). Domains: accounting, FP&A, healthcare admin, investment management, legal, linguistics, medicine, software engineering. Experience review on signup, per-project qualification, rates shown up front, domain maximums $90/hr to $450/hr (medical clinicians), payouts via bank, PayPal, Payoneer, Airtm; quality score and project history; code of ethics; 500,000+ contributors paid.

### Investors and financials (via search; PDF unreadable)
- FY25 (to 31 Dec 2025, released 25 Feb 2026): revenue US$230.8M (+4.5%); Appen Global US$127.9M (-21%); Appen China US$102.9M (+75%, LLM projects); gross margin 40.3%; underlying EBITDA before FX US$12.2M. FY26 guidance US$270-300M revenue, 5-10% underlying EBITDA margin.
- H1 FY26: revenue US$119.9M (+17.5%); China US$76.2M (+80.4%); Global US$43.7M (-26.9%); guidance reaffirmed July 2026.
- 2024: Google terminated contract effective 19 March 2024; FY23 Google revenue US$82.8M of ~US$273M total.

## 5. Prompt-injection check

No AI-directed instructions or prompt-injection attempts were found on any fetched page. All CTAs were addressed to human readers.

## 6. Blockers and gaps

- REA browser tools unusable: no CDP endpoint at 127.0.0.1:9222.
- PDFs (investor presentation, ASX results) not parseable with the available tools; financial figures are from search summaries of ASX-linked sources, not verified against the primary PDF.
- JS-rendered index pages (case studies, research, developer docs) did not render; individual articles reached only via search.
- success.appen.com root and G-Cloud listing returned 404.
- No public pricing for any service, platform licence, or OTS dataset.
- No public description of contributor vetting steps (ID checks, background checks), expert verification method, or SLA terms.
- Fairwork 2025 Appen report findings not read (PDF).
