# Research Sources Register

Prepared for: Infollion expert-powered AI evaluation and training-data platform
Compiled: 2026-10-20, from the Markdown files in `research/`, `agents/`, `architecture/`, `planning/` and `product/`. No new web research was done for this register.

---

## 1. Method and evidence labels

### 1.1 Method

1. Every Markdown file under `research/`, `agents/`, `architecture/`, `planning/` and `product/` was read. Every `http(s)://` URL was extracted, de-duplicated and matched to the title, type and status recorded by the agent that cited it.
2. Each unique source received a register ID (S-001 onward), grouped by topic. Where a research file used its own local ID (for example `S1` in the AI training report), that local ID is shown in brackets in the "Cited in" column so the original citation can be traced.
3. Access date: every file states that all of its sources were accessed on 2026-10-20. Where the fetch failed or returned partial content, the outcome is shown after the date.
4. Type: one of first-party claim, official docs, legal text, paper, repo, independent, press, snippet, inferred. "Snippet" is added when the agent read only a search-result summary rather than the page. Combined types are joined with "+".
5. Excluded as non-sources (they appear in the files but are examples, placeholders or local endpoints): `http://127.0.0.1:9222` (Chrome DevTools endpoint, see Blockers), `http://minio:9000` (local compose service), `https://api.infollion.ai/problems/validation-error` (example problem type), two example S3 presigned URLs in `architecture/api_design.md`, and the `'^https://'` regex in `architecture/database_design.md`.
6. URL templates in `research/tooling_and_frameworks.md` (GitHub API, Atom feeds, PyPI and npm registries) are recorded as single rows exactly as written, without expanding them into invented per-repo URLs.
7. `architecture/`, `planning/` and `product/` files contain no external source URLs of their own; they cite research files or research-local IDs (for example `[S8]` in `architecture/security_architecture.md`). Those indirect citations are marked "(by ID)".

### 1.2 Evidence labels used in this register

| Label | Meaning | Maps from file labels |
|---|---|---|
| **verified** | Read directly from a primary or authoritative source (official docs, legal text, paper, repo file, registry) in the 2026-10-20 session, and the content was confirmed. | [D], [P], OD, REPO, PKG, "legal text", "read in full", "Verified" |
| **first-party claim** | Stated by the company about itself (website, filing, listing, pricing page). Read, but not independently confirmed. | FP, "first-party" |
| **independent** | Third party: press, analyst, aggregator, law firm, tracker, review site, registry of another body. Includes "press". | IND, [I], "press", "independent" |
| **inferred** | Derived by the agent from cited evidence; not directly stated by any source. | INF, [Inf], "inferred" |
| **unknown** | Not publicly documented, not reachable, or not checked in the session. | UNK, "unknown", "not verified", "unverified" |

Confidence levels used in the decision map (section 3):

| Confidence | Rule |
|---|---|
| High | Rests mainly on verified primary sources (official docs, legal text, repo files, papers), with no conflicting evidence in the folder. |
| Medium | Rests on a mix of verified sources and inference, or on independent sources, or on engineering judgement that the files explain but no source tests. |
| Low | Rests mainly on snippets, first-party marketing claims, hypotheses, or has an unresolved conflict between files. |

### 1.3 File codes used in "Cited in"

| Code | File |
|---|---|
| R-APP | research/appen_research.md |
| R-NXT | research/nxted_research.md |
| R-AIT | research/ai_training_and_evaluation.md |
| R-TOOL | research/tooling_and_frameworks.md |
| R-SEC | research/security_and_compliance.md |
| R-MKT | research/market_and_business_model.md |
| A-APP | agents/appen_agent_findings.md |
| A-NXT | agents/nxted_agent_findings.md |
| A-AIT | agents/ai_training_agent_findings.md |
| A-TOOL | agents/tooling_agent_findings.md |
| A-SEC | agents/security_agent_findings.md |
| A-ARCH | agents/architecture_agent_findings.md |
| A-OPS | agents/operations_agent_findings.md (cites R-MKT IDs only) |
| ARCH-SEC | architecture/security_architecture.md (cites R-SEC IDs only) |
| P-WF | product/workflows.md (cites R-MKT S23 only) |

---

## 2. Master source table

All rows: accessed 2026-10-20 unless the Accessed column says otherwise.

### 2.1 Appen

| ID | Title | URL | Type | Accessed | Cited in |
|---|---|---|---|---|---|
| S-001 | Appen homepage (Human data for frontier AI) | https://www.appen.com/ | first-party claim | 2026-10-20 | R-APP, A-APP |
| S-002 | Frontier Model Alignment Services, Appen | https://www.appen.com/frontier-model-alignment | first-party claim | 2026-10-20 | R-APP, A-APP |
| S-003 | RLHF Services, Human Feedback for AI Models | https://www.appen.com/rlhf-ai | first-party claim | 2026-10-20 | R-APP, A-APP |
| S-004 | Agentic AI Training Data & Agent Evaluation, Appen | https://www.appen.com/agentic-ai | first-party claim | 2026-10-20 | R-APP, A-APP |
| S-005 | Coding datasets for LLMs: training, evals and RL, Appen | https://www.appen.com/coding-datasets | first-party claim | 2026-10-20 | R-APP, A-APP |
| S-006 | Multimodal AI & speech training data for frontier models, Appen | https://www.appen.com/multimodal-ai | first-party claim | 2026-10-20 | R-APP, A-APP |
| S-007 | AI Model Evaluation & Integrity Services, Appen | https://www.appen.com/model-evaluation-and-integrity | first-party claim | 2026-10-20 | R-APP, A-APP |
| S-008 | Physical AI training data for robotics and embodied AI, Appen | https://www.appen.com/physical-ai | first-party claim | 2026-10-20 | R-APP, A-APP |
| S-009 | AI Research Services for Frontier Model Teams, Appen | https://www.appen.com/ai-research-services | first-party claim | 2026-10-20 | R-APP, A-APP |
| S-010 | Enterprise Data for Frontier AI Models, Appen | https://www.appen.com/enterprise-data | first-party claim | 2026-10-20 | R-APP, A-APP |
| S-011 | AI training datasets: off-the-shelf data catalog, Appen | https://www.appen.com/data-catalog | first-party claim | 2026-10-20 | R-APP, A-APP |
| S-012 | ADAP, Appen Data Annotation Platform | https://www.appen.com/platform | first-party claim | 2026-10-20 | R-APP, A-APP |
| S-013 | Data Security, Appen | https://www.appen.com/data-security | first-party claim | 2026-10-20 | R-APP, A-APP |
| S-014 | Case Studies (index) | https://www.appen.com/case-studies | first-party claim (partial) | 2026-10-20 (JS-rendered list returned "Loading...") | R-APP, A-APP |
| S-015 | Cohere fine-tuning for enterprise (PANDA Plus case study) | https://www.appen.com/case-studies/cohere-fine-tuning-for-enterprise | first-party claim | 2026-10-20 | R-APP, A-APP |
| S-016 | Research (index) | https://www.appen.com/research | first-party claim (partial) | 2026-10-20 (JS-rendered list did not render) | R-APP, A-APP |
| S-017 | Human-in-the-loop blog (alpha 0.800/0.667, 5 to 10% gold, 85% removal bar) | https://www.appen.com/blog/human-in-the-loop | first-party claim | 2026-10-20 | R-APP, A-APP |
| S-018 | RLVR blog | https://www.appen.com/blog/rlvr | first-party claim | 2026-10-20 | R-APP, A-APP |
| S-019 | AI safety evaluation: tricategorical reasoning | https://www.appen.com/blog/ai-safety-evaluation-tricategorical-reasoning | first-party claim | 2026-10-20 | R-APP, A-APP |
| S-020 | ADAP Quality Flow test questions | https://www.appen.com/blog/adap-quality-flow-test-questions | first-party claim | 2026-10-20 | R-APP, A-APP |
| S-021 | Unlock insights with AI-powered document intelligence (Feb 2023) | https://www.appen.com/blog/unlock-insights-with-ai-powered-document-intelligence | first-party claim | 2026-10-20 | R-APP, A-APP |
| S-022 | Contact us | https://www.appen.com/contact-us | first-party claim | 2026-10-20 | R-APP, A-APP |
| S-023 | Investor Relations (announcement feed appears stale, Jan 2024) | https://www.appen.com/investors | first-party claim | 2026-10-20 | R-APP, A-APP |
| S-024 | Scam awareness | https://www.appen.com/legal-policies/scam-awareness | first-party claim | 2026-10-20 | R-APP, A-APP |
| S-025 | CrowdGen by Appen (contributor platform, pay ranges) | https://crowdgen.com/ | first-party claim | 2026-10-20 | R-APP, A-APP |
| S-026 | Quality Flow Public API Documentation | https://developer.appen.com/ | first-party claim (partial) | 2026-10-20 (only title rendered) | R-APP, A-APP |
| S-027 | Product Release Notes June 2024 | https://success.appen.com/hc/en-us/articles/28025562876557-Product-Release-Notes-June-2024 | first-party claim + snippet | 2026-10-20 (via search) | R-APP |
| S-028 | Appen Success Center | https://success.appen.com/hc/en-us | unknown | 2026-10-20 (HTTP 404) | R-APP, A-APP |
| S-029 | APX FY25 Investor Presentation (PDF) | https://cdn.prod.website-files.com/656a6f5ca4824808211181c5/699fbe15126c80d320e2323d_APX%20FY25%20Investor%20Presentation.pdf | first-party claim (not parseable) | 2026-10-20 (binary PDF, unreadable) | R-APP, A-APP (described, URL truncated) |
| S-030 | ASX announcement 25 Feb 2026 (FY25 results) | https://announcements.asx.com.au/asxpdf/20260225/pdf/06wq7ntr51bhgl.pdf | first-party claim (regulatory, not parseable) | 2026-10-20 (binary PDF; figures via search) | R-APP, A-APP |
| S-031 | ASX announcement July 2026 (guidance reaffirmed) | https://announcements.asx.com.au/asxpdf/20260729/pdf/07256cvzfxhdbd.pdf | first-party claim (regulatory) + snippet | 2026-10-20 (via search) | R-APP |
| S-032 | Appen FY24 results (ASX announcement 26 Feb 2025) | https://announcements.asx.com.au/asxpdf/20250226/pdf/06fyjdglv66466.pdf | first-party claim + snippet | 2026-10-20 | R-MKT (S14), A-OPS (by ID) |
| S-033 | Appen (APX) H2 2025 earnings summary (Quartr) | https://quartr.com/events/appen-ltd-apx-h2-2025_3s79tNbZ | independent + snippet | 2026-10-20 (search result) | R-APP |
| S-034 | Appen shares crash 37% on huge Google blow (Motley Fool AU) | https://fool.com.au/2024/01/22/appen-shares-crash-37-on-huge-google-blow | press | 2026-10-20 | R-APP |
| S-035 | Appen loses $126m Google contract (Capital Brief) | https://www.capitalbrief.com/briefing/appen-loses-126m-google-contract-ee72676a-c481-453a-8bd9-1854f83e6c1b/ | press | 2026-10-20 | R-APP |
| S-036 | Appen shares slump 41 per cent after Google terminates US$83m contract (Business News Australia) | https://www.businessnewsaus.com.au/articles/appen-shares-slump-41-per-cent-after-google-terminates--83m-contract.html | press | 2026-10-20 | R-APP |
| S-037 | Appen response re working conditions for content moderators (Business & Human Rights Resource Centre) | https://www.business-humanrights.org/zh-hans/最新消息/appen-non-response-re-working-conditions-for-content-moderators | independent | 2026-10-20 | R-APP |
| S-038 | Fairwork Report Appen 2025 (Oxford Internet Institute) | https://fairwork.oii.ox.ac.uk/wp-content/uploads/sites/17/2025/12/Fairwork-Report-Appen_2025.pdf | independent (findings not read) | 2026-10-20 (PDF body not read) | R-APP |
| S-039 | Crowd Appen reviews (Trustpilot) | https://www.trustpilot.com/review/crowd.appen.com | independent (anecdotal) | 2026-10-20 | R-APP |
| S-040 | Is CrowdGen Legit? (seoulstart.com) | https://seoulstart.com/guides/is-crowdgen-legit | independent (blog) | 2026-10-20 | R-APP |
| S-041 | UK G-Cloud Appen listing | https://www.applytosupply.digitalmarketplace.service.gov.uk/g-cloud/services/741201707731607 | unknown | 2026-10-20 (HTTP 404; licence range only in a snippet) | R-APP, A-APP |

### 2.2 Nxted (nxted.ai, OFORO LTD)

| ID | Title | URL | Type | Accessed | Cited in |
|---|---|---|---|---|---|
| S-042 | nxted.ai homepage ("Human Intelligence. Machine Scale.") | https://nxted.ai/ | first-party claim | 2026-10-20 | R-NXT, A-NXT, R-MKT (S17, as https://nxted.ai), A-OPS (by ID) |
| S-043 | robots.txt | https://nxted.ai/robots.txt | first-party claim | 2026-10-20 | R-NXT, A-NXT |
| S-044 | Sitemap (85 URLs) | https://nxted.ai/sitemap.xml | first-party claim | 2026-10-20 | R-NXT, A-NXT |
| S-045 | RLHF & Human Evaluation for AI, nxted.ai (Expert product) | https://nxted.ai/expert | first-party claim | 2026-10-20 | R-NXT, A-NXT |
| S-046 | Egocentric Data for Robotics, nxted.ai (Capture product) | https://nxted.ai/capture | first-party claim | 2026-10-20 | R-NXT, A-NXT |
| S-047 | Capture Skill Levels L1-L5, nxted.ai | https://nxted.ai/capture/levels | first-party claim | 2026-10-20 | R-NXT, A-NXT |
| S-048 | Robotics Training Data Pricing, nxted.ai | https://nxted.ai/pricing | first-party claim | 2026-10-20 | R-NXT, A-NXT |
| S-049 | How nxted Works: Evaluation & Capture | https://nxted.ai/how-it-works | first-party claim | 2026-10-20 (WebFetch + REA render of Capture tab) | R-NXT, A-NXT |
| S-050 | Consented, DPDP-Compliant AI Data (Data Trust Pack) | https://nxted.ai/trust | first-party claim | 2026-10-20 | R-NXT, A-NXT |
| S-051 | Physical AI & RLHF Case Studies (3 anonymous) | https://nxted.ai/case-studies | first-party claim | 2026-10-20 | R-NXT, A-NXT |
| S-052 | Apply as a Contributor (pay GBP 15 to 40/hr) | https://nxted.ai/apply | first-party claim | 2026-10-20 | R-NXT, A-NXT |
| S-053 | Contact nxted, Talk to the Team | https://nxted.ai/contact | first-party claim | 2026-10-20 | R-NXT, A-NXT |
| S-054 | Data Verticals: Industrial & Skilled-Work Datasets | https://nxted.ai/data | first-party claim | 2026-10-20 | R-NXT, A-NXT |
| S-055 | Robotics Dataset Formats: LeRobot, RLDS, HDF5 | https://nxted.ai/formats | first-party claim | 2026-10-20 | R-NXT, A-NXT |
| S-056 | LeRobot Dataset Format Explained | https://nxted.ai/formats/lerobot | first-party claim | 2026-10-20 | R-NXT, A-NXT |
| S-057 | Egocentric Data Providers for Robotics, Compared | https://nxted.ai/compare/egocentric-data-providers | first-party claim | 2026-10-20 | R-NXT, A-NXT |
| S-058 | Research & Insights: Physical AI & RLHF (listing) | https://nxted.ai/research | first-party claim | 2026-10-20 | R-NXT |
| S-059 | Blog (same listing as /research; 32 articles dated 29 to 30 May 2026) | https://nxted.ai/blog | first-party claim | 2026-10-20 | A-NXT |
| S-060 | Inside an egocentric capture rig | https://nxted.ai/research/inside-an-egocentric-capture-rig | first-party claim | 2026-10-20 | R-NXT, A-NXT |
| S-061 | Annotating Egocentric Data: Hand Pose, 6-DoF, and Action Segmentation | https://nxted.ai/research/annotating-egocentric-data | first-party claim | 2026-10-20 | R-NXT, A-NXT |
| S-062 | Red-teaming domain AI: why generalist crowds miss expert failures | https://nxted.ai/research/red-teaming-domain-ai-needs-experts | first-party claim | 2026-10-20 | R-NXT, A-NXT |
| S-063 | What Is RLHF and How Human Evaluation Improves AI | https://nxted.ai/research/what-is-rlhf-human-evaluation | first-party claim | 2026-10-20 | R-NXT, A-NXT |
| S-064 | Consent-First Robotics Data | https://nxted.ai/research/consent-first-robotics-data | first-party claim | 2026-10-20 | R-NXT, A-NXT |
| S-065 | From Tirupur to Tesla: the economics of capture in India | https://nxted.ai/research/the-economics-of-capture-in-india | first-party claim | 2026-10-20 | R-NXT, A-NXT |
| S-066 | Terms of Service, nxted.ai (effective 28 May 2026) | https://nxted.ai/legal/terms | first-party claim (legal) | 2026-10-20 | R-NXT, A-NXT |
| S-067 | Privacy Policy, nxted.ai | https://nxted.ai/legal/privacy | first-party claim (legal) | 2026-10-20 | R-NXT, A-NXT |
| S-068 | Data Processing Agreement (nxted.ai) | https://nxted.ai/legal/dpa | first-party claim (legal) | 2026-10-20 | R-NXT, A-NXT |
| S-069 | Security Whitepaper, nxted.ai (no certifications held) | https://nxted.ai/legal/security | first-party claim (legal) | 2026-10-20 | R-NXT, A-NXT |
| S-070 | Contributor Agreement, nxted.ai | https://nxted.ai/legal/contributor-agreement | first-party claim (legal) | 2026-10-20 | R-NXT, A-NXT |
| S-071 | EU AI Act Position Statement, nxted.ai | https://nxted.ai/legal/ai-act | first-party claim (legal) | 2026-10-20 | R-NXT, A-NXT |
| S-072 | Refund & Cancellation Policy, nxted.ai | https://nxted.ai/legal/refund | first-party claim (legal) | 2026-10-20 | R-NXT, A-NXT |
| S-073 | Acceptable Use Policy (Red-Team Addendum) | https://nxted.ai/legal/aup | first-party claim (legal) | 2026-10-20 | R-NXT, A-NXT |
| S-074 | Modern Slavery Statement, nxted.ai | https://nxted.ai/legal/modern-slavery | first-party claim (legal) | 2026-10-20 | R-NXT, A-NXT |
| S-075 | Cookie policy (footer path) | https://nxted.ai/legal/cookies | first-party claim | 2026-10-20 (HTTP 200, status only; not read) | A-NXT |
| S-076 | Cookie policy (banner path) | https://nxted.ai/privacy/cookies | first-party claim | 2026-10-20 (HTTP 200, status only; not read) | A-NXT |
| S-077 | Whistleblowing policy | https://nxted.ai/legal/whistleblowing | first-party claim | 2026-10-20 (HTTP 200, status only; not read) | A-NXT |
| S-078 | About page (also /careers, /docs, /faq, /team, /test-kits, /packages, /expert/test-kit) | https://nxted.ai/about | unknown | 2026-10-20 (HTTP 404 for all listed paths) | A-NXT |
| S-079 | OFORO LTD, Companies House (company 16787568) | https://find-and-update.company-information.service.gov.uk/company/16787568 | independent (registry) | 2026-10-20 (officers tab not fetched) | R-NXT, A-NXT |
| S-080 | OFORO, CB Insights | https://www.cbinsights.com/company/oforo | independent + snippet (entity match unconfirmed) | 2026-10-20 | R-NXT |

### 2.3 AI training and evaluation

| ID | Title | URL | Type | Accessed | Cited in |
|---|---|---|---|---|---|
| S-081 | TRL: Dataset formats and types | https://huggingface.co/docs/trl/dataset_formats | official docs | 2026-10-20 | R-AIT (S1), A-AIT |
| S-082 | TRL: GRPO Trainer | https://huggingface.co/docs/trl/grpo_trainer | official docs | 2026-10-20 | R-AIT (S2), A-AIT |
| S-083 | OpenAI: Supervised fine-tuning | https://developers.openai.com/api/docs/guides/supervised-fine-tuning | official docs | 2026-10-20 | R-AIT (S5), A-AIT |
| S-084 | OpenAI: Reinforcement fine-tuning | https://developers.openai.com/api/docs/guides/reinforcement-fine-tuning | official docs | 2026-10-20 | R-AIT (S6), A-AIT |
| S-085 | OpenAI: Direct preference optimization | https://developers.openai.com/api/docs/guides/direct-preference-optimization | official docs | 2026-10-20 | R-AIT (S7), A-AIT |
| S-086 | Rubrics as Rewards: Reinforcement Learning Beyond Verifiable Domains (Gunjal et al.) | https://arxiv.org/abs/2507.17746 | paper | 2026-10-20 | R-AIT (S9), A-AIT |
| S-087 | HealthBench: Evaluating LLMs Towards Improved Human Health | https://arxiv.org/abs/2505.08775 (also https://arxiv.org/html/2505.08775) | paper | 2026-10-20 | R-AIT (S10), A-AIT |
| S-088 | OpenAI HealthBench announcement page | https://openai.com/index/healthbench/ | unknown | 2026-10-20 (HTTP 403) | A-AIT |
| S-089 | Let's Verify Step by Step (PRM800K) | https://arxiv.org/abs/2305.20050 | paper | 2026-10-20 | R-AIT (S11), A-AIT |
| S-090 | SWE-bench Verified | https://www.swebench.com/verified.html | official docs | 2026-10-20 | R-AIT (S13), A-AIT |
| S-091 | Introducing SWE-bench Verified (OpenAI) | https://openai.com/index/introducing-swe-bench-verified/ | official docs + snippet | 2026-10-20 (direct fetch HTTP 403; content via search snippet) | R-AIT (S14), A-AIT |
| S-092 | Epoch AI: SWE-bench Verified | https://epoch.ai/benchmarks/swe-bench-verified | independent + snippet | 2026-10-20 | R-AIT (S32), A-AIT |
| S-093 | Direct Preference Optimization (Rafailov et al.) | https://arxiv.org/abs/2305.18290 | paper (cited for method identity; not re-fetched) | 2026-10-20 | R-AIT (S15) |
| S-094 | A General Theoretical Paradigm to Understand Learning from Human Preferences (IPO) | https://arxiv.org/abs/2310.12036 | paper | 2026-10-20 | R-AIT (S16), A-AIT |
| S-095 | KTO: Model Alignment as Prospect Theoretic Optimization | https://arxiv.org/abs/2402.01306 | paper | 2026-10-20 | R-AIT (S17), A-AIT |
| S-096 | ORPO: Monolithic Preference Optimization without Reference Model | https://arxiv.org/abs/2403.07691 | paper | 2026-10-20 | R-AIT (S18), A-AIT |
| S-097 | SimPO: Simple Preference Optimization with a Reference-Free Reward | https://arxiv.org/abs/2405.14734 | paper | 2026-10-20 | R-AIT (S19), A-AIT |
| S-098 | DeepSeek-R1 | https://arxiv.org/html/2501.12948v2 | paper | 2026-10-20 | R-AIT (S20), A-AIT |
| S-099 | Tulu 3: Pushing Frontiers in Open Language Model Post-Training | https://arxiv.org/abs/2411.15124 | paper | 2026-10-20 | R-AIT (S21), A-AIT |
| S-100 | LIMA: Less Is More for Alignment | https://arxiv.org/abs/2305.11206 | paper | 2026-10-20 | R-AIT (S22), A-AIT |
| S-101 | Training language models to follow instructions with human feedback (InstructGPT) | https://arxiv.org/abs/2203.02155 | paper (abstract only) | 2026-10-20 | R-AIT (S23), A-AIT |
| S-102 | Llama 2: Open Foundation and Fine-Tuned Chat Models | https://ar5iv.labs.arxiv.org/html/2307.09288 | paper | 2026-10-20 | R-AIT (S24), A-AIT |
| S-103 | DeepSeekMath (introduces GRPO) | https://arxiv.org/abs/2402.03300 | paper (abstract only) | 2026-10-20 | R-AIT (S25), A-AIT |
| S-104 | Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena | https://arxiv.org/abs/2306.05685 | paper | 2026-10-20 | R-AIT (S27), A-AIT |
| S-105 | Who Validates the Validators? | https://arxiv.org/abs/2404.12272 | paper | 2026-10-20 | R-AIT (S28), A-AIT |
| S-106 | AILuminate: Introducing v1.0 of the AI Risk and Reliability Benchmark from MLCommons | https://arxiv.org/abs/2503.05731 | paper | 2026-10-20 | R-AIT (S29), A-AIT |
| S-107 | HarmBench: A Standardized Evaluation Framework for Automated Red Teaming and Robust Refusal | https://arxiv.org/html/2402.04249 | paper | 2026-10-20 | R-AIT (S30), A-AIT |
| S-108 | HarmBench GitHub | https://github.com/centerforaisafety/HarmBench | repo | 2026-10-20 | R-AIT (S31), A-AIT |
| S-109 | HarmBench site | https://www.harmbench.org/ | unknown | 2026-10-20 (no detail returned) | A-AIT |
| S-110 | tau-bench | https://arxiv.org/abs/2406.12045 | paper | 2026-10-20 | R-AIT (S33), A-AIT |
| S-111 | GAIA: a benchmark for General AI Assistants | https://arxiv.org/abs/2311.12983 | paper | 2026-10-20 | R-AIT (S34), A-AIT |
| S-112 | WebArena | https://arxiv.org/abs/2307.13854 | paper (812-task figure via search) | 2026-10-20 | R-AIT (S35), A-AIT |
| S-113 | BenchLM: WebArena-Verified | https://www.benchlm.ai/benchmarks/webArenaVerified | independent + snippet | 2026-10-20 | R-AIT (S36) |
| S-114 | OSWorld | https://arxiv.org/abs/2404.07972 | paper | 2026-10-20 | R-AIT (S37), A-AIT |
| S-115 | Terminal-Bench: Benchmarking Agents on Hard, Realistic Tasks in Command Line Interfaces | https://arxiv.org/abs/2601.11868 | paper + snippet | 2026-10-20 | R-AIT (S38), A-AIT |
| S-116 | GPQA: A Graduate-Level Google-Proof Q&A Benchmark | https://arxiv.org/abs/2311.12022 | paper | 2026-10-20 | R-AIT (S39), A-AIT |
| S-117 | Humanity's Last Exam | https://arxiv.org/abs/2501.14249 | paper | 2026-10-20 | R-AIT (S40), A-AIT |
| S-118 | FrontierMath | https://arxiv.org/abs/2411.04872 | paper | 2026-10-20 | R-AIT (S41), A-AIT |
| S-119 | LegalBench | https://arxiv.org/abs/2308.11462 | paper | 2026-10-20 | R-AIT (S42), A-AIT |
| S-120 | GDPval | https://arxiv.org/abs/2510.04374 | paper | 2026-10-20 | R-AIT (S43), A-AIT |
| S-121 | Humans or LLMs as the Judge? A Study on Judgement Biases | https://arxiv.org/abs/2402.10669 | paper + snippet | 2026-10-20 | R-AIT (S44), A-AIT |
| S-122 | How to Correctly Report LLM-as-a-Judge Evaluations | https://arxiv.org/html/2511.21140v3 | paper + snippet (not opened) | 2026-10-20 | R-AIT (S45), A-AIT |
| S-123 | LeRobotDataset v3.0 | https://huggingface.co/docs/lerobot/lerobot-dataset-v3 | official docs | 2026-10-20 | R-AIT (S46), A-AIT |
| S-124 | RLDS | https://github.com/google-research/rlds | repo (archived 2024-09-26 per tooling log) | 2026-10-20 | R-AIT (S47), A-AIT |
| S-125 | McHugh (2012) Interrater reliability: the kappa statistic | https://pmc.ncbi.nlm.nih.gov/articles/PMC3900052/ | paper | 2026-10-20 | R-AIT (S48), A-AIT |
| S-126 | Krippendorff's alpha (thresholds 0.667 / 0.800), Wikipedia | https://en.wikipedia.org/wiki/Krippendorff%27s_alpha | independent (original book not opened) | 2026-10-20 | R-AIT (S49), A-AIT |
| S-127 | Koo & Li (2016) Guideline of Selecting and Reporting ICC | https://pmc.ncbi.nlm.nih.gov/articles/PMC4913118/ | paper | 2026-10-20 | R-AIT (S50), A-AIT |
| S-128 | Open X-Embodiment | https://arxiv.org/abs/2310.08864 | paper | 2026-10-20 | R-AIT (S51), A-AIT |
| S-129 | Open X-Embodiment project site | https://robotics-transformer-x.github.io/ | official docs | 2026-10-20 | R-AIT (S52), A-AIT |
| S-130 | Ego4D | https://arxiv.org/abs/2110.07058 | paper | 2026-10-20 | R-AIT (S53), A-AIT |
| S-131 | EgoDex | https://arxiv.org/abs/2505.11709 | paper | 2026-10-20 | R-AIT (S54), A-AIT |

### 2.4 Tooling

| ID | Title | URL | Type | Accessed | Cited in |
|---|---|---|---|---|---|
| S-132 | Langfuse open source / licensing overview | https://langfuse.com/docs/open-source | official docs | 2026-10-20 | R-TOOL (1), A-TOOL |
| S-133 | Langfuse Cloud pricing | https://langfuse.com/pricing | official docs (pricing) | 2026-10-20 | R-TOOL (2), A-TOOL |
| S-134 | Langfuse self-host pricing and feature table | https://langfuse.com/pricing-self-host | official docs (pricing) | 2026-10-20 | R-TOOL (3), A-TOOL |
| S-135 | Langfuse self-hosting architecture | https://langfuse.com/self-hosting | official docs | 2026-10-20 | R-TOOL (4), A-TOOL |
| S-136 | Langfuse annotation queues | https://langfuse.com/docs/evaluation/evaluation-methods/annotation-queues | official docs | 2026-10-20 | R-TOOL (5), A-TOOL |
| S-137 | Langfuse scores data model | https://langfuse.com/docs/evaluation/scores/data-model | official docs | 2026-10-20 | R-TOOL (6), A-TOOL |
| S-138 | Langfuse RBAC | https://langfuse.com/docs/administration/rbac | official docs | 2026-10-20 | R-TOOL (7), A-TOOL |
| S-139 | Langfuse datasets | https://langfuse.com/docs/evaluation/experiments/datasets | official docs | 2026-10-20 | R-TOOL (8), A-TOOL |
| S-140 | Langfuse LLM-as-a-judge | https://langfuse.com/docs/evaluation/evaluation-methods/llm-as-a-judge | official docs | 2026-10-20 | R-TOOL (9), A-TOOL |
| S-141 | Langfuse public API | https://langfuse.com/docs/api-and-data-platform/features/public-api | official docs | 2026-10-20 | R-TOOL (10), A-TOOL |
| S-142 | Langfuse repo | https://github.com/langfuse/langfuse | repo | 2026-10-20 | R-TOOL (11) |
| S-143 | Langfuse LICENSE (MIT core, ee/ licence; copyright ClickHouse, Inc.) | https://github.com/langfuse/langfuse/blob/main/LICENSE | repo | 2026-10-20 | A-TOOL (L1, L2) |
| S-144 | Langfuse docker-compose.yml (MinIO image in default compose) | https://github.com/langfuse/langfuse/blob/main/docker-compose.yml | repo | 2026-10-20 | A-TOOL (L12) |
| S-145 | Langfuse web/src/ee/features | https://github.com/langfuse/langfuse/tree/main/web/src/ee/features | repo | 2026-10-20 | A-TOOL (L4) |
| S-146 | Langfuse joins ClickHouse | https://langfuse.com/blog/joining-clickhouse | first-party claim (official blog) | 2026-10-20 | R-TOOL (12), A-TOOL |
| S-147 | ClickHouse buys Langfuse (InfoWorld) | https://www.infoworld.com/article/4118621/clickhouse-buys-langfuse-as-data-platforms-race-to-own-the-ai-feedback-loop.html | press | 2026-10-20 | R-TOOL (13), A-TOOL |
| S-148 | Label Studio Community vs Enterprise | https://labelstud.io/guide/label_studio_compare | official docs | 2026-10-20 | R-TOOL (14), A-TOOL |
| S-149 | Label Studio export formats | https://labelstud.io/guide/export | official docs | 2026-10-20 | R-TOOL (15), A-TOOL |
| S-150 | Label Studio GenAI templates | https://labelstud.io/templates/gallery_generative_ai | official docs | 2026-10-20 | R-TOOL (16), A-TOOL |
| S-151 | Label Studio frontend embedding | https://labelstud.io/guide/frontend | official docs | 2026-10-20 | R-TOOL (17), A-TOOL |
| S-152 | HumanSignal pricing | https://humansignal.com/pricing/ | official docs (pricing) | 2026-10-20 | R-TOOL (18), A-TOOL |
| S-153 | Label Studio repo | https://github.com/HumanSignal/label-studio | repo | 2026-10-20 | R-TOOL (19) |
| S-154 | Label Studio LICENSE (Apache-2.0) | https://github.com/HumanSignal/label-studio/blob/develop/LICENSE | repo | 2026-10-20 | A-TOOL (S1) |
| S-155 | Argilla repo | https://github.com/argilla-io/argilla | repo | 2026-10-20 | R-TOOL (20) |
| S-156 | Argilla README (no new features statement) | https://github.com/argilla-io/argilla/blob/develop/README.md | repo | 2026-10-20 | A-TOOL (A3) |
| S-157 | Argilla releases (v2.8.0, 2025-03-11) | https://github.com/argilla-io/argilla/releases | repo | 2026-10-20 | A-TOOL (A1) |
| S-158 | Argilla develop commits (last 2025-08-05) | https://github.com/argilla-io/argilla/commits/develop | repo | 2026-10-20 | A-TOOL (A2) |
| S-159 | Argilla docker-compose | https://github.com/argilla-io/argilla/blob/develop/examples/deployments/docker/docker-compose.yaml | repo | 2026-10-20 | A-TOOL (A7) |
| S-160 | Argilla dataset settings | https://docs.argilla.io/latest/how_to_guides/dataset/ | official docs | 2026-10-20 | R-TOOL (21), A-TOOL |
| S-161 | Argilla task distribution | https://docs.argilla.io/latest/how_to_guides/distribution/ | official docs | 2026-10-20 | R-TOOL (22), A-TOOL |
| S-162 | Argilla on PyPI | https://pypi.org/project/argilla/ | repo (package registry) | 2026-10-20 | R-TOOL (23), A-TOOL |
| S-163 | Opik annotation queues | https://www.comet.com/docs/opik/evaluation/annotation_queues | official docs | 2026-10-20 | R-TOOL (24), A-TOOL |
| S-164 | Phoenix LICENSE (Elastic License 2.0) | https://github.com/Arize-ai/phoenix/blob/main/LICENSE | repo | 2026-10-20 | R-TOOL (25), A-TOOL |
| S-165 | Phoenix annotations | https://arize.com/docs/phoenix/tracing/llm-traces/how-to-annotate-traces | official docs | 2026-10-20 | R-TOOL (26), A-TOOL |
| S-166 | Braintrust pricing | https://www.braintrust.dev/pricing | official docs (pricing) | 2026-10-20 | R-TOOL (27), A-TOOL |
| S-167 | Prodigy pricing | https://prodi.gy/buy | official docs (pricing) | 2026-10-20 | R-TOOL (28), A-TOOL |
| S-168 | CVAT cloud pricing | https://www.cvat.ai/pricing/cloud | official docs (pricing) | 2026-10-20 | R-TOOL (29), A-TOOL |
| S-169 | Potato repo (GPL-3.0) | https://github.com/davidjurgens/potato | repo | 2026-10-20 | R-TOOL (30), A-TOOL |
| S-170 | Inspect human agent | https://inspect.aisi.org.uk/human-agent.html | official docs | 2026-10-20 | R-TOOL (31), A-TOOL |
| S-171 | Harbor | https://harborframework.com/ | official docs | 2026-10-20 | R-TOOL (32), A-TOOL |
| S-172 | OpenAI acquires Promptfoo (Futurum) | https://futurumgroup.com/?p=87434 | independent | 2026-10-20 | R-TOOL (33), A-TOOL |
| S-173 | OpenAI buying Promptfoo (Bloomberg Government) | https://news.bgov.com/private-equity/openai-buying-ai-security-startup-promptfoo-to-safeguard-agents | press | 2026-10-20 | R-TOOL (34), A-TOOL |
| S-174 | lakeFS LICENSE (BSL 1.1) | https://github.com/treeverse/lakeFS/blob/master/LICENSE | repo | 2026-10-20 | R-TOOL (35), A-TOOL |
| S-175 | MinIO repo (archived, AGPL-3.0) | https://github.com/minio/minio | repo | 2026-10-20 | R-TOOL (36), A-TOOL |
| S-176 | GitHub repo metadata and feeds for 28 repos (opik, phoenix, openai/evals, promptfoo, inspect_ai, lm-evaluation-harness, deepeval, ragas, helm, cvat, doccano, dvc, datasets, OpenLineage, marquez, SWE-bench, tau-bench, tau2-bench, harbor, terminal-bench-1, lerobot, rlds, tensorflow/datasets, mcap, rerun, mlflow, weave, distilabel) | https://api.github.com/repos/{owner}/{repo} and https://github.com/{owner}/{repo}/releases.atom (URL templates as written) | repo | 2026-10-20 (point-in-time snapshot) | R-TOOL (37), A-TOOL |
| S-177 | Package registries | https://pypi.org/pypi/{package}/json and https://registry.npmjs.org/{package} (URL templates as written) | repo (package registry) | 2026-10-20 | R-TOOL (38), A-TOOL |

### 2.5 Architecture technology

| ID | Title | URL | Type | Accessed | Cited in |
|---|---|---|---|---|---|
| S-178 | Procrastinate documentation | https://procrastinate.readthedocs.io/en/stable/ | official docs | 2026-10-20 | A-ARCH |
| S-179 | PgQueuer on PyPI | https://pypi.org/project/PgQueuer/ | repo (package registry) | 2026-10-20 | A-ARCH |
| S-180 | Auth.js homepage (merger notice: part of Better Auth) | https://authjs.dev/ | official docs | 2026-10-20 | A-ARCH |
| S-181 | Better Auth JWT plugin | https://www.better-auth.com/docs/plugins/jwt | official docs | 2026-10-20 | A-ARCH |
| S-182 | Better Auth SSO plugin | https://www.better-auth.com/docs/plugins/sso | official docs | 2026-10-20 | A-ARCH |
| S-183 | PostgreSQL versioning policy | https://www.postgresql.org/support/versioning/ | official docs | 2026-10-20 | A-ARCH |
| S-184 | AWS What's New, RDS for PostgreSQL 18 | https://aws.amazon.com/about-aws/whats-new/2025/11/amazon-rds-postgresql-major-version-18 | official docs | 2026-10-20 | A-ARCH |
| S-185 | AWS RDS PostgreSQL release notes | https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html | official docs | 2026-10-20 | A-ARCH |
| S-186 | PostgreSQL documentation, Row Security Policies | https://www.postgresql.org/docs/current/ddl-rowsecurity.html | official docs | 2026-10-20 | R-SEC (S26), A-SEC, ARCH-SEC (by ID) |
| S-187 | AWS, Sharing objects with presigned URLs | https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html | official docs | 2026-10-20 | R-SEC (S27), A-SEC, ARCH-SEC (by ID) |
| S-188 | AWS, S3 Object Lock | https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html | official docs | 2026-10-20 | R-SEC (S28), A-SEC, ARCH-SEC (by ID) |
| S-189 | AWS KMS, ABAC for AWS KMS | https://docs.aws.amazon.com/kms/latest/developerguide/abac.html | official docs | 2026-10-20 | R-SEC (S29) |
| S-190 | Presidio documentation | https://presidio.dataprivacystack.org/ | official docs (project) | 2026-10-20 | R-SEC (S30), A-SEC, ARCH-SEC (by ID) |

### 2.6 Market and pricing

| ID | Title | URL | Type | Accessed | Cited in |
|---|---|---|---|---|---|
| S-191 | Meta to pay nearly $15 billion for Scale AI stake, The Information reports (Reuters via Yahoo Finance) | https://finance.yahoo.com/news/meta-pay-nearly-15-billion-171801208.html | press + snippet | 2026-10-20 | R-MKT (S1), A-OPS (by ID) |
| S-192 | Scale AI pricing index (Flexprice) | https://flexprice.io/pricing-index/scale-ai | independent + snippet | 2026-10-20 | R-MKT (S2) |
| S-193 | Scale Rapid pricing (aitoolsatlas) | https://aitoolsatlas.ai/tools/scale-rapid/free-vs-paid | independent + snippet | 2026-10-20 | R-MKT (S2) |
| S-194 | Mercor (Sacra company page) | https://sacra.com/c/mercor/ | independent + snippet | 2026-10-20 | R-MKT (S3), A-OPS (by ID) |
| S-195 | As Amazon lets Mechanical Turk fade, Mercor hits a $2 billion gross run rate (RuntimeWire) | https://runtimewire.com/article/as-amazon-lets-mechanical-turk-fade-mercor-hits-a-2-billion-gross-run-rate | press + snippet | 2026-10-20 | R-MKT (S4) |
| S-196 | Surge AI (Sacra) | https://sacra.com/c/surge-ai | independent + snippet | 2026-10-20 | R-MKT (S5), A-OPS (by ID) |
| S-197 | Surge AI (remowork.life) | https://remowork.life/companies/surge-ai | independent + snippet | 2026-10-20 | R-MKT (S5) |
| S-198 | Finance Expert listing (Outlier, reposted on terra.do) | https://www.terra.do/climate-jobs/job-board/finance-expert-8321542 | first-party claim (repost) + snippet | 2026-10-20 | R-MKT (S6) |
| S-199 | Outlier (remowork.life) | https://remowork.life/companies/outlier | independent + snippet (low reliability) | 2026-10-20 | R-MKT (S6) |
| S-200 | Handshake AI fellowship guide (aitrainer.work) | https://aitrainer.work/guides/handshake-ai-fellowship-guide | independent + snippet | 2026-10-20 | R-MKT (S7), A-OPS (by ID) |
| S-201 | Medicine Domain Expert listing (Handshake, via Reach Capital job board) | https://jobs.reachcapital.com/companies/joinhandshake-com/jobs/56438292-medicine-domain-expert-ai-research-contract | first-party claim (repost) + snippet | 2026-10-20 | R-MKT (S7) |
| S-202 | Mercor job listing: Medical Expert | https://work.mercor.com/jobs/list_AAABoKOPjbVqcleYq1NNjKxo/medical-expert | first-party claim + snippet | 2026-10-20 | R-MKT (S8), A-OPS (by ID) |
| S-203 | Mercor job listing: Lawyers | https://work.mercor.com/jobs/list_AAABnF8XasqEjktZgOdNLr45/lawyers | first-party claim + snippet | 2026-10-20 | R-MKT (S8) |
| S-204 | Mercor job listing: Expert Model Trainer | https://work.mercor.com/jobs/list_AAABlRvLjyMZ_QjpNyhB6r5E/expert-model-trainer | first-party claim + snippet | 2026-10-20 | R-MKT (S8) |
| S-205 | Micro1 Reaches a $500 Million Annualized Revenue Run Rate (mezha.net) | https://mezha.net/eng/news/723fb65e_micro1_reaches_a/ | press (secondary), unverified | 2026-10-20 | R-MKT (S9) |
| S-206 | Micro1 touts crossing $100M ARR (benzatine) | https://benzatine.com/news-room/micro1-surges-past-100-million-in-arr-aiming-for-ai-data-dominance | press (secondary), unverified | 2026-10-20 | R-MKT (S9) |
| S-207 | afterquery vs micro1 (aitrainer.work) | https://aitrainer.work/compare/afterquery-vs-micro1 | independent, unverified | 2026-10-20 | R-MKT (S9) |
| S-208 | Turing annual revenue run rate nearly triples to $300M (Business Wire) | https://www.businesswire.com/news/home/20250128158063/en | first-party claim + snippet | 2026-10-20 | R-MKT (S10) |
| S-209 | Turing raises $111M (Turing blog) | https://www.turing.com/blog/turing-raises-111m-to-accelerate-the-future-of-agi | first-party claim + snippet | 2026-10-20 | R-MKT (S10) |
| S-210 | Invisible at $134M in revenue (Sacra) | https://sacra.com/research/invisible-at-134m-in-revenue/ | independent + snippet | 2026-10-20 | R-MKT (S11) |
| S-211 | Snorkel AI Frequently Asked Questions | https://snorkel.ai/faq/ | first-party claim + snippet (ARR figure secondhand via LinkedIn) | 2026-10-20 | R-MKT (S12) |
| S-212 | Prolific researcher help: study cost | https://researcher-help.prolific.com/en/articles/445129-study-cost | first-party claim + snippet | 2026-10-20 | R-MKT (S13), A-OPS (by ID) |
| S-213 | Prolific researcher help: participant rewards | https://researcher-help.prolific.com/en/article/9cd998 | first-party claim + snippet | 2026-10-20 | R-MKT (S13) |
| S-214 | Labelbox pricing calculator | https://labelbox.com/pricing/calculator | first-party claim + snippet | 2026-10-20 | R-MKT (S15), A-OPS (by ID) |
| S-215 | Toloka: cost calculator and price precision | https://toloka.ai/blog/cost-calculator | first-party claim + snippet (undated) | 2026-10-20 | R-MKT (S16), A-OPS (by ID) |
| S-216 | Toloka: save money guide | https://toloka.ai/docs/guide/save-money/ | first-party claim + snippet (undated) | 2026-10-20 | R-MKT (S16) |
| S-217 | Is Mindrift legit? (Mindrift blog) | https://mindrift.ai/blog/legit-mindrift | first-party claim + snippet | 2026-10-20 | R-MKT (S18) |
| S-218 | Mindrift listings (aitrainer.work) | https://aitrainer.work/jobs/mindrift/freelance-finance-expert-ai-trainer | independent + snippet | 2026-10-20 | R-MKT (S18) |
| S-219 | Appen (CrowdGen) Review 2026 (aitrainingjobs.it) | https://www.aitrainingjobs.it/appen-crowdgen-review-2026-ai-training-jobs-pay-tasks-reality/ | independent (low reliability) | 2026-10-20 | R-MKT (S19) |
| S-220 | AI Training Dataset Market (Grand View Research) | https://www.grandviewresearch.com/industry-analysis/ai-training-dataset-market | independent (market estimate) | 2026-10-20 | R-MKT (S20) |
| S-221 | Data collection and labeling market worth $17.10B by 2030 (CMSWire) | https://www.cmswire.com/the-wire/data-collection-and-labeling-market-worth-1710b-by-2030/ | press (press release, estimate) | 2026-10-20 | R-MKT (S21) |
| S-222 | AI training dataset / data labeling market (MarketsandMarkets) | https://www.marketsandmarkets.com/Market-Reports/data-labeling-annotation-market-253276522.html | independent (market estimate) | 2026-10-20 | R-MKT (S22) |
| S-223 | Scale AI hit by its second employee wage lawsuit in less than a month (TechCrunch) | https://techcrunch.com/2025/01/09/scale-ai-hit-by-its-second-employee-wage-lawsuit-in-less-than-a-month | press (allegations only) | 2026-10-20 | R-MKT (S23), A-OPS (by ID), P-WF (by ID) |
| S-224 | Indian workers train AI robots with headcam footage (letsdatascience, AFP) | https://letsdatascience.com/news/indian-workers-train-ai-robots-with-headcam-footage-463a3761 | press + snippet | 2026-10-20 | R-MKT (S24), R-NXT, A-OPS (by ID) |
| S-225 | India trains the world's robots, but at what cost? (Inc42) | https://inc42.com/features/india-trains-the-worlds-robots-but-at-what-cost/ | press + snippet | 2026-10-20 | R-MKT (S24) |
| S-226 | Section 194J TDS (ClearTax) | https://cleartax.in/s/section-194j | independent (flag for counsel) | 2026-10-20 | R-MKT (S26), A-OPS (by ID) |
| S-227 | Section 16 Zero rated supply, IGST Act (knowyourgst) | https://knowyourgst.com/gstlaw/igst-act/16-zero-rated-supply-190 | independent (statute reproduction; flag for counsel) | 2026-10-20 | R-MKT (S27), A-OPS (by ID) |

### 2.7 Security and legal

| ID | Title | URL | Type | Accessed | Cited in |
|---|---|---|---|---|---|
| S-228 | The Digital Personal Data Protection Act, 2023 (No. 22 of 2023), Gazette of India | https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf | legal text (read in full) | 2026-10-20 | R-SEC (S1), A-SEC, ARCH-SEC (by ID) |
| S-229 | Digital Personal Data Protection Rules, 2025, G.S.R. 846(E), 13 Nov 2025 | https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf | legal text (Rules 1 to 23 read) | 2026-10-20 | R-SEC (S2), A-SEC, ARCH-SEC (by ID) |
| S-230 | PIB Backgrounder "DPDP Rules, 2025 Notified", 17 Nov 2025 | https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf | official docs (government); snippet per R-MKT | 2026-10-20 | R-SEC (S3), A-SEC, R-MKT (S25), A-OPS (by ID) |
| S-231 | PIB press release "Government notifies DPDP Rules..." (PRID 2190014) | https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190014 | official docs + snippet | 2026-10-20 (HTTP 403; content via search snippet) | R-SEC (S4) |
| S-232 | G.S.R. 843(E) commencement schedule (tracker) | https://dpdp.myndsolution.com/wiki/notifications/gsr-843e-2025-commencement/ | independent | 2026-10-20 | R-SEC (S5) |
| S-233 | Govt notifies commencement dates for DPDP Act (Taxmann; conflicts on s.44(1)/(3)) | https://www.taxmann.com/post/blog/govt-notifies-commencement-dates-for-dpdp-act/ | independent | 2026-10-20 | R-SEC (S5) |
| S-234 | MeitY considers reducing DPDPA compliance timelines (Takshashila, 26 Jan 2026) | https://takshashila.org.in/content/blogs/20260126-meity-considers-reducing-dpdpa-compliance-timelines.html | independent | 2026-10-20 | R-SEC (S6) |
| S-235 | DPDP Rules 2025 compliance timeline (MirvoLegal) | https://www.mirvolegal.com/insights/dpdp-rules-2025-compliance-timeline/ | independent | 2026-10-20 | R-SEC (S6) |
| S-236 | DPDP (Removal of Difficulties) Order 2026 (India Briefing) | https://www.india-briefing.com/news/dpdp-removal-of-difficulties-order-2026-consent-data-audit-47274.html | independent (unverified against Gazette) | 2026-10-20 | R-SEC (S7) |
| S-237 | CERT-In Directions under s.70B(6) IT Act, No. 20(3)/2022-CERT-In, 28 Apr 2022 | https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf | official docs (read in full) | 2026-10-20 | R-SEC (S8), A-SEC, ARCH-SEC (by ID) |
| S-238 | SPDI Rules 2011 summary (S.S. Rana) | https://ssrana.in/articles/information-technology-reasonable-security-practices-and-procedures-and-sensitive-personal-data-or-information/ | independent (primary text not fetched) | 2026-10-20 | R-SEC (S9) |
| S-239 | Copyright Act 1957 (India Code PDF) | https://www.indiacode.nic.in/bitstream/123456789/1367/1/a195714.pdf | legal text (not retrievable) | 2026-10-20 (host refused fetch) | R-SEC (S10), ARCH-SEC (by ID) |
| S-240 | Sec 17 to 21, Chapter IV, Copyright Act 1957 (Vidhi Judicial summary) | https://vidhijudicial.com/sec-17-to-21-chapter-iv-(ownership-of-copyright-and-the-rights-of-the-owner)-the-copyright-act,-1957.html | independent | 2026-10-20 | R-SEC (S10) |
| S-241 | Pine Labs v Gemalto summary (Khurana & Khurana) | https://www.khuranaandkhurana.com/2011/05/25/pine-labs-pvt-ltd-vs-gemalto-terminals-india-pvt-ltd-others | independent | 2026-10-20 | R-SEC (S10) |
| S-242 | Regulation (EU) 2016/679 (GDPR) | https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679 | legal text (Arts. 4(14), 9, 28, 33, 46 read) | 2026-10-20 | R-SEC (S11), A-SEC, ARCH-SEC (by ID) |
| S-243 | Regulation (EU) 2024/1689 (AI Act) | https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32024R1689 | legal text (Arts. 10, 53, 113 read) | 2026-10-20 | R-SEC (S12), A-SEC, ARCH-SEC (by ID) |
| S-244 | Regulation (EU) 2026/1744 (Digital Omnibus on AI) | https://eur-lex.europa.eu/eli/reg/2026/1744/oj/eng | legal text (recitals 38, 40, 46 read; operative text not fully read) | 2026-10-20 | R-SEC (S13), A-SEC |
| S-245 | European Commission, General-Purpose AI Code of Practice | https://digital-strategy.ec.europa.eu/en/policies/ai-code-practice | official docs + snippet | 2026-10-20 | R-SEC (S14) |
| S-246 | European Commission, Standard Contractual Clauses (SCC) | https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/standard-contractual-clauses-scc_en | official docs | 2026-10-20 | R-SEC (S15), ARCH-SEC (by ID) |
| S-247 | Latombe v Commission appeal (C-703/25 P) (Digital Policy Alert) | https://digitalpolicyalert.org/event/35459-latombe-filed-appeal-against-general-court-dismissal-of-challenge-to-european-unionunited-states-data-protection-framework-adequacy-decision-in-latombe-v-commission | independent | 2026-10-20 | R-SEC (S16) |
| S-248 | General Court Latombe judgment analysis (Kyprianou) | https://www.kyprianou.com/?p=19190 | independent | 2026-10-20 | R-SEC (S37) |
| S-249 | The Data (Use and Access) Act 2025: key implications (Burges Salmon) | https://www.burges-salmon.com/articles/102mh1d/the-data-use-and-access-act-2025-key-implications-for-businesses-as-the-new-in/ | independent | 2026-10-20 | R-SEC (S17) |
| S-250 | Major provisions of the UK Data (Use and Access) Act 2025 take effect (MFMac) | https://www.mfmac.com/insights/manufacturing-media-technology/major-provisions-of-the-uk-data-use-and-access-act-2025-take-effect/ | independent | 2026-10-20 | R-SEC (S17) |
| S-251 | ICO, International data transfer agreement and guidance | https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/international-data-transfer-agreement-and-guidance/ | official docs | 2026-10-20 | R-SEC (S17) |
| S-252 | EU Digital Omnibus: where simplification is likely (Hogan Lovells) | https://hlc.com/en/publications/eu-digital-omnibus-where-simplification-is-likely-and-what-businesses-should-plan-for | independent | 2026-10-20 | R-SEC (S24b) |
| S-253 | California AG, CCPA | https://oag.ca.gov/privacy/ccpa | official docs | 2026-10-20 | R-SEC (S18), ARCH-SEC (by ID) |
| S-254 | CCPA 2025 updated regulations (DLA Piper, Sept 2025) | https://www.dlapiper.com/en/insights/publications/2025/09/ccpa-2025-updated-regulations | independent | 2026-10-20 | R-SEC (S19) |
| S-255 | Illinois BIPA amended for damages (Davis Wright Tremaine, Aug 2024) | https://dwt.com/blogs/privacy--security-law-blog/2024/08/illinois-bipa-biometrics-law-amended-for-damages | independent | 2026-10-20 | R-SEC (S20), ARCH-SEC (by ID) |
| S-256 | BIPA statute page (ILGA) | https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004&ChapterID=57 | legal text (not retrievable) | 2026-10-20 (HTTP 403 or refused) | R-SEC (S20), ARCH-SEC (by ID) |
| S-257 | Texas AG, Capture or Use of Biometric Identifier Act | https://www.texasattorneygeneral.gov/consumer-protection/file-consumer-complaint/consumer-privacy-rights/biometric-identifier-act | official docs | 2026-10-20 | R-SEC (S21), ARCH-SEC (by ID) |
| S-258 | Texas CUBI compliance guide (TRAIGA carve-outs) (itecsonline) | https://itecsonline.com/post/texas-biometric-identifier-act-cubi-a-compliance-guide-for-businesses-capturing-fingerprints-faces-or-voices | independent (vendor blog, unverified) | 2026-10-20 | R-SEC (S36) |
| S-259 | HHS, Business Associates | https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/business-associates/index.html | official docs (not retrievable) | 2026-10-20 (host refused fetch) | R-SEC (S22), ARCH-SEC (by ID) |
| S-260 | HHS, Sample Business Associate Agreement provisions | https://www.hhs.gov/hipaa/for-professionals/covered-entities/sample-business-associate-agreement-provisions/index.html | official docs (not retrievable) | 2026-10-20 (host refused fetch) | R-SEC (S22), ARCH-SEC (by ID) |
| S-261 | Feds push back HIPAA security rule overhaul to July 2027 (Fierce Healthcare) | https://www.fiercehealthcare.com/health-tech/feds-push-back-hipaa-security-rule-overhaul-july-2027 | press | 2026-10-20 | R-SEC (S23) |
| S-262 | 17 U.S.C. 101 (Cornell LII) | https://www.law.cornell.edu/uscode/text/17/101 | legal text (downloaded, section not parsed) | 2026-10-20 | R-SEC (S24), ARCH-SEC (by ID) |
| S-263 | US Copyright Office, Copyright and Artificial Intelligence | https://www.copyright.gov/ai/ | official docs | 2026-10-20 | R-SEC (S25) |
| S-264 | OWASP ASVS project page | https://owasp.org/www-project-application-security-verification-standard/ | official docs | 2026-10-20 | R-SEC (S31), A-SEC, ARCH-SEC (by ID) |
| S-265 | OWASP ASVS releases (v5.0.0) | https://github.com/OWASP/ASVS/releases | repo | 2026-10-20 | R-SEC (S31), ARCH-SEC (by ID) |
| S-266 | OWASP API Security Top 10 2023 | https://owasp.org/API-Security/editions/2023/en/0x11-t10/ | official docs | 2026-10-20 | R-SEC (S32), A-SEC, ARCH-SEC (by ID) |
| S-267 | OWASP Top 10 for LLM Applications 2025 | https://genai.owasp.org/llm-top-10/ | official docs | 2026-10-20 | R-SEC (S33), A-SEC, ARCH-SEC (by ID) |
| S-268 | NIST SP 800-88 Rev. 2, Guidelines for Media Sanitization | https://csrc.nist.gov/pubs/sp/800/88/r2/final | official docs | 2026-10-20 | R-SEC (S34), ARCH-SEC (by ID) |
| S-269 | ISO/IEC 27001:2022 transition guide (BSI) | https://www.bsigroup.com/globalassets/localfiles/en-au/ISO%2027001/documents/iso-iec-27001-transition-guide.pdf | independent | 2026-10-20 | R-SEC (S38), ARCH-SEC (by ID) |
| S-270 | What's new with SOC 2 (Barr Advisory) | https://www.barradvisory.com/blog/whats-new-with-soc-2 | independent | 2026-10-20 | R-SEC (S38), ARCH-SEC (by ID) |
| S-271 | Indian Contract Act 1872 s.27 | none (not fetched) | inferred | not accessed | R-SEC (S35) |

Sources named without a URL in the files (not given register IDs): GoTrust (DPDP timeline, A-SEC F5); GT Law and Paul Hastings (BIPA, A-SEC F26); JD Supra (CPPA, A-SEC F28); GDPR Local (Digital Omnibus, A-SEC F24); AFP, Al Jazeera and NDTV via aggregators (Indian capture pay, A-NXT); Feinstein and Cicchetti 1990 (kappa paradox, A-AIT, not fetched); CIS AWS Foundations Benchmark and AWS Security Hub FSBP (R-SEC, not fetched); commercial references Scale AI, Surge AI, Labelbox, SuperAnnotate, Toloka, Prolific (R-TOOL, positioning not verified from docs).

**Count:** 270 URL-bearing sources (S-001 to S-270) plus 1 inferred source without URL (S-271).

---

## 3. Decision-to-evidence map

### 3.1 Architecture decision records (planning/architecture_decisions.md)

| ADR | Decision | Supporting sources | Other basis in files | Confidence |
|---|---|---|---|---|
| ADR-001 | Modular monolith (FastAPI) with outbox | None external | A-ARCH 2.1: atomic submission path, year-one volume fits one Postgres primary, small team (inferred engineering judgement) | Medium |
| ADR-002 | PostgreSQL 17+, 18 preferred | S-183, S-184, S-185 | A-ARCH 2.5: PG14 EOL Nov 2026, PG18 `uuidv7()` | High |
| ADR-003 | Shared schema, `org_id`, composite FKs, RLS | S-186, S-266 (API1 BOLA) | A-ARCH 2.4; ARCH-SEC RLS design | High (mechanism); Medium (performance at scale untested) |
| ADR-004 | Procrastinate queue, no Redis in MVP | S-178, S-179 (fallback) | A-ARCH 2.2 option table; load test pending | Medium |
| ADR-005 | FastAPI-native auth in Phase 1; MFA for every account | S-180, S-181, S-182 (Better Auth option kept); S-264, S-266 | R-SEC threat T4 (account takeover, inferred); ARCH-SEC section on authentication; revision of agent proposal is planning judgement | Medium |
| ADR-006 | Build expert workflow in-house | S-136, S-138, S-134, S-148, S-152, S-156, S-161, S-163, S-168, S-169 | R-TOOL section 7 "must build" list; absence of a fitting OSS tool is an inferred negative finding | Medium-High |
| ADR-007 | Langfuse as optional engine behind adapter, Phase 3 | S-132 to S-147 | Phasing is planning judgement; conflicts with architecture files that say phase 2 (see section 5.9) | Medium (facts High; timing Medium) |
| ADR-008 | Label Studio optional editor; no Argilla dependency; licence guardrails | S-148, S-149, S-151, S-153, S-154, S-155 to S-162, S-164, S-169, S-174 | A-TOOL A1 to A7, S1 to S7 | High |
| ADR-009 | Krippendorff's alpha primary, companions per type | S-126, S-125, S-127, S-104; S-017 (Appen uses same 0.800/0.667 bands, first-party) | R-AIT section 7; thresholds rest on Wikipedia, primary book not opened | Medium |
| ADR-010 | Immutable rubric and dataset versions, content-addressed items | S-243 (AI Act Art. 10 data governance), S-139 (Langfuse item versioning as reference) | A-ARCH 2.6; R-AIT section 8 item 9 (contamination control, inferred) | Medium |
| ADR-011 | Presigned S3 URLs, metadata in Postgres, local emulator only | S-187, S-175, S-144 | ARCH-SEC TTL rules; A-SEC F33 | High |
| ADR-012 | AWS ap-south-1, DR ap-south-2, ECS Fargate (Proposed) | S-237 (logs in India), S-184 | Cost USD 900 to 1,400/month is an estimate; ap-south-2 service availability unverified (A-SEC section 5) | Medium |
| ADR-013 | Pseudonymous experts by default (Proposed) | S-045, S-051 (Nxted discloses credentials, first-party) | Poaching and bias rationale inferred | Low-Medium |
| ADR-014 | No customer data to third-party AI without per-project opt-in | S-267, S-190, S-242 (Art. 28 sub-processors), S-266 (API10) | R-SEC section 6 and threat T10 (inferred policy); A-SEC reasoning note 7 | Medium |
| ADR-015 | Track B deferred, extension points only | S-046, S-047, S-048, S-069, S-224, S-225, S-242 (Art. 9), S-255, S-256, S-257, S-228 (s.9) | A-OPS section 6.1; R-SEC section 7 | Medium-High |
| ADR-016 | Typed deliverable exporters, no implicit conversion | S-081, S-085, S-095, S-082, S-083, S-084 | R-AIT sections 3 to 6 | High |
| ADR-017 | Assignment-scoped RLS; classification-driven delivery | S-186, S-266, S-187 | A-SEC reasoning note 5; R-SEC threats T1, T2, T6 | High (mechanism); Medium (watermark proxy is deterrence only, per R-SEC 5.3) |

### 3.2 Major product decisions

| Decision | Where stated | Supporting sources | Notes | Confidence |
|---|---|---|---|---|
| Track B (physical AI) deferral | A-OPS 6.1; ADR-015; implementation_roadmap Phase 5; R-SEC section 7 | S-046 to S-048, S-050, S-069, S-224, S-225, S-228, S-242, S-255, S-256, S-257, S-258 | Nxted pricing is first-party; labour-practice risk from press snippets; legal risk from verified legal text plus independent BIPA summaries (ILGA not retrievable). Timing differs across files (section 5.9). | Medium-High |
| Build expert workflow in-house | ADR-006; R-TOOL section 1 and 7 | Same as ADR-006 | | Medium-High |
| Langfuse in Phase 3 | ADR-007; implementation_roadmap Phase 3; mvp_scope out-of-scope list | S-133, S-134, S-135, S-136, S-138, S-140, S-141, S-143, S-146, S-147 | R-TOOL MVP table proposes Langfuse in MVP; A-ARCH, data_pipeline and component_design say phase 2. ADR-007 records the resolution. | Medium |
| Argilla not used | ADR-008; R-TOOL section 4 | S-155, S-156, S-157, S-158, S-159, S-160, S-161, S-162 | README statement verified verbatim; data model kept as design reference | High |
| Krippendorff's alpha primary | ADR-009; mvp_scope success criterion 3; data_pipeline metrics table | S-126, S-125, S-127, S-017 | Threshold source is Wikipedia (independent); P-WF uses alpha 0.67 as example project target | Medium |
| India data residency by default | ADR-012; system_architecture section 9; ARCH-SEC principle 3 | S-237, S-228, S-229, S-184 | CERT-In requires logs in India (verified). DPDP Rule 15 permits cross-border transfer subject to government orders (verified), so content residency is a design choice, not a legal mandate. | Medium |
| MFA for all accounts | ADR-005; ARCH-SEC authentication table | S-264, S-266; S-069 (Nxted claims MFA, first-party) | Rests on threat model T4 (inferred). Conflicts with mvp_scope.md "MFA for staff and reviewers" (section 5.9). | Medium |
| No third-party AI on customer data by default | ADR-014; ARCH-SEC principle 4; R-SEC section 6 | S-267, S-190, S-242, S-266 | Policy judgement grounded in legal text and OWASP; customer demand for it is inferred | Medium |
| Pricing hypotheses (packages, pay bands, margins) | R-MKT sections 4 to 6; A-OPS 3.7 | S-042, S-045, S-048, S-191 to S-219, S-032 | All Infollion prices labelled HYPOTHESIS. Most competitor figures are snippets or first-party claims; FX INR 85/USD is an assumption; no customer validation yet. | Low |
| Service package choice (Phase 1: Expert Evaluation Pilot, Evaluation and Preference Data, SFT Dataset Creation, Domain Benchmark Creation) | A-OPS section 8; R-MKT section 5; mvp_scope | S-002, S-003, S-007, S-009 (Appen offers), S-045, S-048 (Nxted entry offers), S-083, S-085, S-087, S-116, S-117, S-086, S-191, S-194, S-196 | Shows the offers exist and labs buy them; no demand validation for Infollion specifically (India-specific demand marked unknown in R-AIT 9.10) | Medium-Low |

---

## 4. Blockers and unavailable sources

Compiled only from what the files state.

### 4.1 Tooling and environment

| Blocker | Effect | Source file |
|---|---|---|
| REA browser tools unavailable: `mcp__rea__list_browser_targets` against http://127.0.0.1:9222 failed with `provider_unavailable`, `endpoint_unreachable`; no local Chrome with remote debugging was running. `inspect_web_page`, `capture_web_screenshot`, `capture_browser_scenario` need a CDP endpoint plus target id. | JS-rendered Appen pages could not be inspected. | A-APP section 2 and 6 |
| REA `inspect_web_page` and `analyze_web_bundle` need a running CDP target; not needed for Nxted. REA `capture_browser_scenario` (headless Chromium launched from local Chrome) did work for nxted.ai/how-it-works. | None for Nxted. | A-NXT sections 1, 2, 7 |
| No PDF tooling: `pdftotext`, `pdftoppm` and `pypdf` absent; WebFetch returned compressed binary for PDFs. | Appen FY25 investor presentation (S-029) and ASX announcement 25 Feb 2026 (S-030) unreadable; financials taken from search summaries. Recommendation in file: `brew install poppler`. | A-APP section 2 and 6 |
| WebFetch returns model-summarised text, not raw HTML; where a page did not state something it is recorded as "not stated on page". | Absence claims are weaker. | A-APP section 2; A-TOOL caveats |
| GitHub `pushed_at` reflects any branch; star counts are point-in-time. | Maintenance signals taken from default-branch Atom feeds instead. | A-TOOL caveats |

### 4.2 Unreachable or partial pages

| Source | Problem | File |
|---|---|---|
| S-014 appen.com/case-studies, S-016 appen.com/research | JS-rendered lists returned "Loading..." placeholders | A-APP |
| S-026 developer.appen.com | Only the title "Quality Flow Public API Documentation" rendered | A-APP |
| S-028 success.appen.com/hc/en-us | HTTP 404; help-centre articles reached only via search | A-APP |
| S-041 UK G-Cloud Appen listing | HTTP 404; licence range only in a search snippet | A-APP, R-APP |
| S-038 Fairwork Appen 2025 PDF | Findings not read | R-APP, A-APP |
| Appen pages not visited (time/priority): privacy statement, corporate governance, AI glossary, podcasts, webinars, careers, annual-reports subpage | Not covered | A-APP |
| S-023 appen.com/investors | Announcement feed appears stale (Jan 2024) | A-APP |
| S-078 nxted.ai/about, /careers, /docs, /faq, /team, /test-kits, /packages, /expert/test-kit | HTTP 404 (pages do not exist) | A-NXT |
| nxted.ai /portal, /auth, /me, /admin, /api, /auth/login, /auth/register, /portal/capture/new | Deliberately not visited: authenticated and disallowed in robots.txt | A-NXT |
| Remaining nxted.ai sitemap URLs (other research articles, glossary, /data/*, /formats/*, /alternatives/*) | Not fetched individually | A-NXT |
| S-075, S-076, S-077 nxted cookie and whistleblowing pages | Status checked only, not read | A-NXT |
| S-079 Companies House officers tab | Not fetched, so directors not confirmed | A-NXT |
| nxted.ai homepage statistics | Some rendered as "0%" (animated counters did not hydrate) | A-NXT |
| S-088 openai.com/index/healthbench | HTTP 403 | A-AIT |
| S-091 openai.com/index/introducing-swe-bench-verified | HTTP 403; content via search snippet | A-AIT, R-AIT |
| S-109 harmbench.org | No detail returned | A-AIT |
| S-101 InstructGPT, S-103 DeepSeekMath | Abstract only | A-AIT |
| S-122 arXiv 2511.21140v3 | Via search, not opened | A-AIT |
| S-239 indiacode.nic.in | Host refused fetch; relied on summaries | R-SEC, A-SEC |
| S-231 pib.gov.in press release pages | HTTP 403; content via search snippet | R-SEC, A-SEC |
| S-259, S-260 hhs.gov | Host refused fetch; BAA rule references from prior knowledge of 45 CFR | R-SEC, A-SEC |
| S-256 ilga.gov | 403 or connection refused; independent summaries used | R-SEC, A-SEC |
| S-262 Cornell LII 17 U.S.C. 101 | Downloaded but section not parsed due to quote encoding; content from prior knowledge | A-SEC F30 |
| S-243, S-244 AI Act Art. 113 as amended by Reg 2026/1744 | Operative text not fully read; only recitals | R-SEC, A-SEC |
| S-238 SPDI Rules primary text; S-271 Indian Contract Act s.27; CIS AWS Foundations Benchmark | Not fetched | R-SEC |
| Many market figures (S-191 to S-218, S-032, S-230) | Reached via search result summary, not full page read | R-MKT method note |
| Handshake page | Read via aggregator (S-200), not first-party | A-OPS |

---

## 5. Claims flagged unverified across files

### 5.1 Appen (R-APP, A-APP)

1. FY25, H1 FY26 and FY26 guidance figures come from search summaries of ASX-linked sources and Quartr, not from the primary PDFs (S-029, S-030, S-031, S-033).
2. A GBP 30,000 to 3,000,000/year ADAP licence range attributed to a UK G-Cloud listing; page 404, unverified (S-041).
3. ADAP descends from Figure Eight (CrowdFlower): inferred from terminology.
4. On-prem/private-cloud ADAP evidenced only by one case study and the unverified G-Cloud snippet.
5. Coding datasets page states 35M+ LOC headline vs 37.1M in its own table (internal inconsistency, S-005).
6. Fairwork 2025 findings not read (S-038). Contributor pay complaints are anecdotal (S-039, S-040).
7. Unknowns: client pricing and billing unit, customer inputs, expert verification method, delivery formats, named customers beyond Cohere, whether ADAP is sold standalone.

### 5.2 Nxted (R-NXT, A-NXT)

1. All prices and results are company claims; case studies are anonymous and unverifiable (S-051).
2. Credential verification method, IRA metric (sample shows 94%), dashboard contents, portal features, assignment algorithm, annotation tooling, sync method, dataset schema: unknown.
3. CB Insights "OFORO" entity match unconfirmed (S-080).
4. Launch in late May 2026 is inferred from document dates.
5. "1M hours of physical AI data collected in 2026" may describe the industry, not Nxted (ambiguous).
6. Homepage market size contradicts itself (USD 165B vs USD 38B humanoid market).
7. "54% robot improvement with egocentric data" attributed to NVIDIA 2026; not checked.
8. "Cancellable monthly" (S-048) vs 30 days' written notice (S-066).
9. Effective cost per output (about GBP 5 to 10) is inferred.

### 5.3 AI training and evaluation (R-AIT, A-AIT)

1. InstructGPT K = 4 to 9 ranked outputs and about 40 labelers: from memory.
2. Llama 2 margin term in the reward-model loss: from memory.
3. PRM800K per-step label values (positive / negative / neutral): from memory.
4. HLE adversarial filtering against frontier models and review rounds: from memory.
5. Open X-Embodiment packaged in RLDS; EgoDex HDF5 annotations; HDF5 use in robomimic/ALOHA: not re-verified.
6. Kappa prevalence paradox (Feinstein and Cicchetti 1990): not fetched.
7. TRL stepwise supervision type for PRMTrainer in older versions: uncertain.
8. GRPO critic-free group baseline detail: from paper body, not re-verified (S-103 abstract only).
9. Krippendorff thresholds rely on Wikipedia, original book not opened (S-126).
10. SWE-bench Verified annotation details (93 developers, 1,699 samples) via search snippet (S-091, S-092); Terminal-Bench 2.0, judge-bias and judge-reporting papers via snippet (S-115, S-121, S-122).
11. Market pricing for expert labeling and India-specific demand: unknown.

### 5.4 Tooling (R-TOOL, A-TOOL)

1. Langfuse minimum CPU/RAM; annotation-queue per-role permissions: not stated.
2. Langfuse queues lack overlap, adjudication and human-human IRR: treated as unsupported because not documented (inferred).
3. Label Studio Enterprise price and Community database requirements: not fetched. HumanSignal page shows both "$99 per month" and "$99/users/mo" (ambiguity).
4. Argilla HF Hub import/export guide: not fetched.
5. promptfoo: OpenAI commitment to maintain OSS is press-reported only, not primary-verified (S-172, S-173).
6. lakeFS date of switch from Apache-2.0 to BSL: unknown.
7. MLflow and W&B Weave human feedback features: marked "not verified".
8. Commercial references (Scale AI, Surge AI, Labelbox, SuperAnnotate, Toloka, Prolific): positioning not verified from docs.
9. OpenAI hosted Evals, Foxglove pricing, Rerun commercial offering, DeepEval cloud pricing, HumanSignal Adala release: not fetched.
10. Harbor as successor runtime to Terminal-Bench: inferred.

### 5.5 Security and legal (R-SEC, A-SEC, ARCH-SEC)

1. DPDP (Removal of Difficulties) Order 2026: reported, unverified against the Gazette; confidence low (S-236).
2. MeitY January 2026 proposal to compress the 18-month window: no amending notification found (S-234, S-235).
3. G.S.R. 843(E) commencement schedule from a tracker; Taxmann conflicts on s.44(1)/(3) (S-232, S-233).
4. Computed DPDP dates may shift by a day (PIB says notified 14 November 2025).
5. SPDI Rules Rule 8 wording on ISO/IEC 27001 as deemed reasonable practice: not verified.
6. Indian Contract Act s.27 restraint-of-trade rule: not fetched (S-271).
7. HIPAA BAA rule references (45 CFR 164.502(e), 164.504(e), 164.308(b)): prior knowledge, HHS unreachable.
8. 17 U.S.C. 101 work-for-hire categories: prior knowledge, page not parsed.
9. Texas TRAIGA (HB 149) carve-outs for AI training: single vendor blog (S-258).
10. India has no EU adequacy decision: inferred from the EC list.
11. Exact operative text of amended AI Act Art. 113: not read.
12. Whether MeitY has notified an SDF list or Rule 15 restricted-country order: unknown.
13. ap-south-2 support for every needed service (KMS multi-Region, Object Lock): unverified.
14. Amazon Time Sync acceptability for CERT-In NIC/NPL traceability: to confirm with counsel.
15. CERT-In FAQ reportedly says reporting overrides contractual confidentiality: "reportedly".
16. All rows marked "Counsel: Yes" or "Confirm" are not settled legal positions.

### 5.6 Market and pricing (R-MKT, A-OPS)

1. Scale AI 2019 to 2023 rate card (2 cents/image, 6 cents/annotation): unverified, since withdrawn (S-192, S-193).
2. micro1 USD 500M gross run rate: secondary and unverified (S-205 to S-207).
3. Snorkel over USD 375M annualized: secondhand LinkedIn repost (S-211).
4. Outlier pay litigation: allegations only (S-223).
5. Appen/CrowdGen pay USD 10 to 25/hr: low reliability (S-219).
6. Labelbox labeling services USD 10/hr base vs another source USD 6/hr (conflict, S-214).
7. Toloka minimum commission USD 0.001: undated (S-215, S-216).
8. Market size estimates disagree and are directional only; bottom-up "high single-digit USD billions" is inferred (S-220 to S-222).
9. Take rate 30 to 40% partly inferred (Prolific 42.8% markup equals 30% of invoice).
10. TDS s.194J threshold INR 50,000 from FY2025-26 and renumbering under Income Tax Act 2025: secondary, unconfirmed (S-226).
11. FX INR 85/USD: modelling assumption.
12. All Infollion prices, pay bands, margins, SLAs and KPI targets: hypotheses.
13. Any figure from a snippet must be re-verified before customer or investor use (R-MKT method note).

### 5.7 Architecture and planning

1. Indicative production cost USD 900 to 1,400/month: on-demand estimate, to confirm with AWS Pricing Calculator.
2. Procrastinate throughput: load test (50 jobs/s) still to run.
3. RLS performance on large scans: to benchmark on 10M-row fixtures.
4. Agreement thresholds per task type: defaults to be revisited after three projects.
5. Track B equipment list and raw footage size ("multi-GB per hour per stream"): indicative estimates.

### 5.8 Product

1. Expert pay bands, SLAs, quality thresholds and KPI targets in A-OPS and P-WF are initial hypotheses to tune per project; pay bands to be validated with a survey of 50 to 100 existing experts.

### 5.9 Cross-file inconsistencies to resolve

1. **MFA scope:** ADR-005 and ARCH-SEC require MFA for every account; `planning/mvp_scope.md` says "MFA for staff and reviewers"; `architecture/deployment_architecture.md` lists "MFA for staff" as optional in the local environment.
2. **Langfuse timing:** ADR-007 and the roadmap say Phase 3; `architecture/data_pipeline.md` and `architecture/component_design.md` say phase 2; R-TOOL MVP table places Langfuse in the MVP.
3. **Auth choice and ADR numbering:** `architecture/system_architecture.md` lists its own ADR-001 to ADR-013 (for example ADR-002 = Better Auth), which differ in numbering and, for auth, in substance from `planning/architecture_decisions.md` (ADR-002 = PostgreSQL; ADR-005 = FastAPI-native auth).
4. **Track B timing:** A-OPS proposes Phase 3 (months 9 to 18) with a Phase 2 partnered pilot; ADR-015 says no capture in Phases 1 to 4; the roadmap gates it as Phase 5; `architecture/data_pipeline.md` lists Track B exporters as "phase 2".
5. **Model endpoint connectors:** `architecture/component_design.md` says phase 2; roadmap and mvp_scope say Phase 3.
