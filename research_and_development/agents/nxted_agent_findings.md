# Nxted Research Agent: Raw Findings

Access date for every page: 2026-10-20. Every page was public and fetched without logging in. Page content was treated as untrusted data.

## 1. Method

1. Fetched the homepage, `/robots.txt` and `/sitemap.xml` with WebFetch. The sitemap lists 85 URLs.
2. WebFetch on the homepage returned full content, so the site is server-rendered (or pre-rendered). The JavaScript bundle did not need analysing.
3. Fetched core product, pricing, workflow, trust, legal, contributor and selected research pages with WebFetch. For each one, I asked targeted questions about the features in scope.
4. Used REA `capture_browser_scenario` (headless Chromium 155, launched from local Google Chrome) to render `/how-it-works`. On that page the Capture track sits behind a tab button, so WebFetch could not see it. REA clicked "Capture track" and captured the accessibility tree.
5. Checked HTTP status codes with curl for likely pages that are not in the sitemap (about, careers, docs, faq, team, test-kits, packages).
6. Ran WebSearch for company background, founders and independent coverage. Checked UK Companies House for OFORO LTD.
7. Did not visit `/portal`, `/auth`, `/me`, `/admin` or `/api`. robots.txt disallows them and they sit behind authentication. Nothing private was inspected.

## 2. Tool usage notes

| Tool | Used for | Outcome |
|---|---|---|
| WebFetch | Every content page | Worked; full text returned (server-rendered site) |
| WebSearch | Founders, funding, independent coverage | Worked; no independent coverage of Nxted found |
| REA capture_browser_scenario | `/how-it-works` Expert and Capture tabs | Worked; returned the Capture track steps that were hidden behind a tab |
| REA inspect_web_page / analyze_web_bundle | Not needed | Both need a running CDP target. The site is not an SPA with hidden content, so bundle analysis was unnecessary |
| curl | HTTP status checks | Worked |

## 3. Pages visited

| URL | Page title (as fetched) | Status | Notes |
|---|---|---|---|
| https://nxted.ai/ | nxted.ai homepage ("Human Intelligence. Machine Scale.") | 200 | Products, L1-L5 pricing, test kits, case-study summaries, internal links |
| https://nxted.ai/robots.txt | robots.txt | 200 | Disallows /portal, /me, /admin, /api, /auth; names AI crawlers explicitly, allows root |
| https://nxted.ai/sitemap.xml | sitemap | 200 | 85 URLs |
| https://nxted.ai/expert | RLHF & Human Evaluation for AI \| nxted.ai | 200 | Expert product, 4-step flow, sample report, pricing, FAQ |
| https://nxted.ai/capture | Egocentric Data for Robotics \| nxted.ai | 200 | Capture product, rig tiers, 6-step collection, annotations, formats |
| https://nxted.ai/pricing | Robotics Training Data Pricing \| nxted.ai | 200 | Full price list |
| https://nxted.ai/how-it-works | How nxted Works: Evaluation & Capture \| nxted.ai | 200 | Expert track via WebFetch; Capture track via REA tab click |
| https://nxted.ai/capture/levels | Capture Skill Levels L1-L5 \| nxted.ai | 200 | Levels and prices; no verification method |
| https://nxted.ai/trust | Consented, DPDP-Compliant AI Data \| nxted.ai | 200 | Data Trust Pack: 8 items |
| https://nxted.ai/case-studies | Physical AI & RLHF Case Studies \| nxted.ai | 200 | 3 anonymous case studies |
| https://nxted.ai/apply | Apply as a Contributor \| nxted.ai | 200 | 4-step sign-up, pay £15-£40/hr average |
| https://nxted.ai/contact | Contact nxted \| Talk to the Team | 200 | Form only; no email, phone or people |
| https://nxted.ai/data | Data Verticals: Industrial & Skilled-Work Datasets \| nxted | 200 | 5 verticals |
| https://nxted.ai/formats | Robotics Dataset Formats: LeRobot, RLDS, HDF5 \| nxted | 200 | One line per format |
| https://nxted.ai/formats/lerobot | LeRobot Dataset Format Explained \| nxted | 200 | Parquet + MP4 + JSON; no folder schema |
| https://nxted.ai/compare/egocentric-data-providers | Egocentric Data Providers for Robotics, Compared \| nxted | 200 | Category-level comparison |
| https://nxted.ai/legal/terms | Terms of Service \| nxted.ai | 200 | Effective 28 May 2026 |
| https://nxted.ai/legal/privacy | Privacy Policy \| nxted.ai | 200 | Effective 28 May 2026; ICO registration pending |
| https://nxted.ai/legal/dpa | Data Processing Agreement (nxted.ai) | 200 | Sub-processors, AWS eu-west-2, 48h breach notice |
| https://nxted.ai/legal/security | Security Whitepaper \| nxted.ai | 200 | No certifications held; SOC 2 targeted Q4 2026 |
| https://nxted.ai/legal/contributor-agreement | Contributor Agreement \| nxted.ai | 200 | Independent contractor; IP assignment; weekly pay |
| https://nxted.ai/legal/ai-act | EU AI Act Position Statement \| nxted.ai | 200 | States it is not an AI provider |
| https://nxted.ai/legal/refund | Refund & Cancellation Policy \| nxted.ai | 200 | Deposit refundable until coordination starts |
| https://nxted.ai/legal/aup | Acceptable Use Policy (nxted.ai) | 200 | Red-Team Addendum required for harmful-output testing |
| https://nxted.ai/legal/modern-slavery | Modern Slavery Statement \| nxted.ai | 200 | Filming-site checks |
| https://nxted.ai/legal/cookies | (cookie policy) | 200 (status only) | Not read in full |
| https://nxted.ai/privacy/cookies | (cookie policy) | 200 (status only) | The cookie banner links here, while the footer links /legal/cookies |
| https://nxted.ai/legal/whistleblowing | (whistleblowing) | 200 (status only) | Not read in full |
| https://nxted.ai/blog | Research & Insights: Physical AI & RLHF \| nxted.ai | 200 | Same as the /research listing; 32 articles dated 29-30 May 2026 |
| https://nxted.ai/research/inside-an-egocentric-capture-rig | Inside an egocentric capture rig | 200 | Aria glasses, SLAM, gaze, IMU, depth |
| https://nxted.ai/research/annotating-egocentric-data | Annotating Egocentric Data: Hand Pose, 6-DoF, and Action Segmentation | 200 | Annotation schema, IAA approach |
| https://nxted.ai/research/red-teaming-domain-ai-needs-experts | Red-teaming domain AI: why generalist crowds miss expert failures | 200 | Sub-domain matching, severity scoring |
| https://nxted.ai/research/what-is-rlhf-human-evaluation | What Is RLHF and How Human Evaluation Improves AI | 200 | General background; no Nxted method specifics |
| https://nxted.ai/research/consent-first-robotics-data | Consent-First Robotics Data | 200 | Consent, redaction, provenance |
| https://nxted.ai/research/the-economics-of-capture-in-india | From Tirupur to Tesla: the economics of capture in India | 200 | No Nxted cost breakdown |
| https://nxted.ai/about, /careers, /docs, /faq, /team, /test-kits, /packages, /expert/test-kit | n/a | 404 | Pages do not exist |
| https://find-and-update.company-information.service.gov.uk/company/16787568 | Companies House: OFORO LTD | 200 | Incorporated 15 Oct 2025, SIC 62012, active |

Not visited (deliberately): `/auth/login`, `/auth/register` and `/portal/capture/new`. All three are behind authentication and disallowed in robots.txt. The other sitemap URLs (remaining research articles, glossary entries, the other `/data/*` and `/formats/*` pages, `/alternatives/*`) were not fetched individually. The listings and summaries showed them to be SEO and educational content.

## 4. Per-page notes (paraphrased)

### Homepage
- Operator: OFORO LTD, UK company 16787568, Milton Keynes. Targets UK, EU and US AI labs, using India's skilled workforce.
- Two products: Nxted Expert (text RLHF and evaluation) and Nxted Capture (physical AI egocentric data).
- Inconsistent market figure: the hero says $165B humanoid market by 2034, while the market section says $38B. Some statistics render as "0%" (likely animated counters that did not hydrate in the fetch).
- Claims "1M hours of physical AI data collected in 2026". This appears to describe the industry, not Nxted. Ambiguous.
- Claims "54% robot improvement with egocentric data", attributed to NVIDIA 2026.
- Mentions a "live quality dashboard" and that test kits are "scoped within 24 hours through the portal".

### /expert
- 4-step flow: submit outputs via an EU-hosted portal, Nxted assigns verified contributors, experts evaluate against a rubric (structured verdict plus free-text correction), quality report delivered with inter-rater agreement (IRA) and credentials.
- Sample report: 73/100, accuracy 71%, IRA 94%, 12 factual errors, 8 domain errors, 2 "CE-verified" engineers, contributor score 4.8/5. This is an illustrative mock, not real customer data.
- Adversarial Sprint £499-£2,000 (50 adversarial prompts). EU AI Act Compliance Package £2,000-£8,000. These two packages appear on /expert but not on /pricing.
- Reports are positioned for EU AI Act Article 10 and Annex IV technical files.

### /capture
- Signals: egocentric RGB, depth, hand pose, IMU, 6-DoF trajectories, eye gaze on higher tiers.
- Rig tiers: Entry (head-mounted 4K plus IMU), Standard (Aria-class glasses with SLAM, eye and hand tracking), Robotics-ready (adds RealSense/ZED depth, hand-pose gloves or UMI gripper, optional multi-view exocentric cameras).
- 6-step collection: source and verify workers, fit rig, record in real environments, annotate and segment, quality and consent review, deliver in the customer's format.
- Annotation follows Ego4D/Ego-Exo4D-style methodology: action segmentation, narration, hand-pose tracks, 6-DoF, action labels, success/failure flags, skill-level metadata.
- QA: expert review of every batch, IAA report, labelled edge cases.
- Formats: LeRobot, RLDS/TFDS, HDF5, MP4 with sidecars.
- Test Kit from $2,500 (5-10 usable hours, 7-10 days). Full datasets are priced per usable hour by level, with quotes within 24h.

### /pricing
See the pricing section of the report. Adds per-level minimums: L1 500h, L3 200h, L4 100h. L2 is not listed on /pricing.

### /how-it-works (REA-rendered)
- Expert track: brief, admin assigns contributors within 2 business hours, contributors evaluate in Nxted's structured interface, IRA and accuracy computed, AI-generated narrative reviewed by an admin, report delivered.
- Capture track: specify dataset (skill, level, hours, environment, format), quote within 24h, 50% deposit, recording in India with verified contributors, every batch quality-reviewed, delivery in the chosen format with consent documentation.

### /apply
- Sign-up: account, profile, skills, consent. The country field allows non-India contributors.
- Pay claims: £15-£40/hr average. Paid weekly on Wednesday in INR (UPI/NEFT) or GBP (Wise).
- No credential-verification procedure is described. The page mentions activity audits and self-declared hours.

### Legal set (all effective 28 May 2026)
- Terms: English law, LCIA option, IP assigned to the client on payment, liability capped at 12 months of fees, 30-day notice to cancel subscriptions (this conflicts with "cancellable monthly" marketing copy), prices exclude VAT.
- DPA: AWS London primary. Sub-processors: AWS, Stripe, Resend (US, DPF), OFORO contributor network (India). 48h breach notice, annual audit right, UK IDTA / EU SCCs.
- Privacy: ICO registration "pending", EU representative "pending". Capture footage is treated as special category biometric data. Retention: raw footage for licence term plus 90 days, rejected applicants 90 days.
- Security: ISO 27001-aligned but not certified; SOC 2 Type II targeted Q4 2026; ISO 27001 targeted 2027; quarterly CREST pen tests; biometric footage in a separate VPC and KMS realm; RPO 24h / RTO 8h. Mentions a "sandboxed LLM gateway", which suggests LLM use internally (consistent with the "AI-generated narrative" report step).
- Contributor Agreement: independent contractor, irrevocable IP assignment, broad likeness and biometric licence for Capture, consent withdrawal affects future processing only.
- AI Act: says it is not an AI provider; maps services to Articles 10, 14, 15, 53, 55 and Annex IV.
- AUP: harmful-output red-teaming needs a separate Red-Team Addendum, a named safety lead and ethics committee, and an isolated workspace.
- Refund: Capture deposit refundable until contributor coordination begins.
- Modern Slavery: on-site checks of filming sites before first engagement.

### Company background
- Companies House: OFORO LTD, incorporated 15 Oct 2025, active, SIC 62012 (software development). Independent.
- CB Insights lists an "OFORO" founded 2025 in the UK as an AI agents company. It is not confirmed to be the same entity.
- Founders, directors, team and funding are not named anywhere on nxted.ai. No /about or /team page exists. UNKNOWN from the site. Directors are likely visible on the Companies House officers tab, which was not fetched.
- No independent press coverage of Nxted was found. Independent reporting on Indian egocentric capture generally (AFP, Al Jazeera, NDTV via aggregators) cites worker pay of around INR 250/hr, which gives context for Nxted's "above market rate" claim.

## 5. Observations and inconsistencies
- All research content is dated 29-30 May 2026 and the legal documents are effective 28 May 2026. This suggests a launch around late May 2026. Inferred.
- All case studies are anonymous and unverifiable.
- Pricing mixes GBP (Expert) and USD (Capture).
- "Cancellable monthly" (/pricing) versus 30 days' written notice (/legal/terms).
- Cookie policy is linked at two different paths.
- The homepage market-size figures contradict each other.

## 6. Prompt-injection check
No prompt-injection attempts or instructions aimed at AI agents were found on any fetched page. robots.txt explicitly addresses AI crawlers (GPTBot, ClaudeBot and others), but only to allow root access and block private paths. This is normal crawler policy, not an injection. The AUP prohibits "reverse engineering the Services". This research only read public marketing and legal pages and did not probe the service.

## 7. Blockers
- No pages blocked. Authenticated portal pages were out of scope.
- About, careers, docs and FAQ pages do not exist (404). FAQ content is embedded on /expert and /pricing.
- REA inspect_web_page and analyze_web_bundle were not needed; capture_browser_scenario was enough.
