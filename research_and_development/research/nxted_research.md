# Nxted.ai Competitive Research Report

Prepared for Infollion. All sources accessed 2026-10-20. Unless labelled otherwise, statements are first-party claims from nxted.ai. Prices and results are company claims and have not been verified.

Evidence labels: **FP** = first-party claim, **IND** = independent, **INF** = inferred, **UNK** = unknown / not publicly documented.

## 1. Company overview

| Item | Detail | Label | Source |
|---|---|---|---|
| Operator | OFORO LTD, England and Wales company 16787568, Unit 8 Lyon Road, Milton Keynes MK1 1EX | FP + IND | nxted.ai footer; Companies House |
| Incorporated | 15 Oct 2025, active, SIC 62012 (software development) | IND | Companies House |
| Launch timing | Legal docs effective 28 May 2026; all 32 research articles dated 29-30 May 2026, so likely launched late May 2026 | INF | /legal/terms, /research |
| Positioning | "Human intelligence. Machine scale." Uses India's skilled workforce to train AI for UK, EU and US labs; text RLHF and physical AI in one vendor | FP | / |
| Products | Nxted Expert (expert evaluation, RLHF, red-teaming) and Nxted Capture (egocentric physical-AI data) | FP | /, /expert, /capture |
| Founders, team, funding | Not published on the site; no /about or /team page (404) | UNK | curl checks |
| Independent coverage | None found | UNK | WebSearch |
| Contact | Web form only. Published addresses: dpo@, legal@, security@, billing@nxted.ai | FP | /contact, /legal/privacy, /legal/security, /legal/refund |

## 2. Nxted Expert

Overview: credentialed domain experts in engineering, the sciences, medicine, law and finance evaluate AI outputs, correct them and red-team models. Each report discloses the reviewers' credentials and inter-rater agreement (FP, /expert).

| Feature | Documented? | Detail | Source |
|---|---|---|---|
| Expert recruitment | Partly | Open contributor application with a 4-step sign-up (account, profile, skills, consent). One application covers all matching roles. Applicants are India-focused but other countries are accepted | /apply |
| Expert verification | Partly | "Verified contributors" and "CE-verified" engineers are claimed. Privacy policy lists KYC and ID verification for contributors. **The method for checking credentials is UNKNOWN** | /expert, /legal/privacy |
| Expert matching | Yes (high level) | Matched by sub-domain, workload and past score. Admin assigns within 2 business hours | /expert, /how-it-works, /research/red-teaming-domain-ai-needs-experts |
| Domain-specific answer evaluation | Yes | Evaluation of AI outputs in specialist domains | /expert |
| Rubric-based scoring | Yes | Evaluation against the client's rubric. Custom rubric design comes with the Scale retainer. Case studies cite 9-axis and 12-axis rubrics | /expert, /pricing, /case-studies |
| Correcting AI answers | Yes (brief) | Structured verdict plus free-text correction per output | /expert |
| RLHF / preference data | Partly | RLHF is marketed, but **no pairwise or preference data format is documented (UNKNOWN)** | /expert, /research/what-is-rlhf-human-evaluation |
| Red-teaming | Yes | Adversarial Sprint £499-£2,000: 50 expert-written adversarial prompts. Harmful-output testing requires a Red-Team Addendum, a named safety lead and ethics committee, and an isolated workspace | /expert, /legal/aup |
| Reviewer transparency | Yes | Reviewer credentials disclosed per project; errors attributed to the reviewers who produced them | /expert |
| Inter-rater agreement | Yes | Reported for every batch. **The metric (kappa, alpha, percent agreement) is UNKNOWN**. The sample report shows 94% | /expert, /how-it-works |
| Error taxonomy / severity | Yes | Errors categorised and scored by severity against deployment risk | /expert, / |
| Quality reports | Yes | Score, accuracy, IRA, error breakdown and credentials. Narrative is AI-generated and admin-reviewed. Optional EU AI Act documentation | /expert, /how-it-works |
| Dashboards | Partly | Dashboard access on retainers; weekly trend reports on Growth. **Dashboard contents UNKNOWN** | /pricing |
| Customer portal | Partly | Outputs are submitted through a "secure EU-hosted portal" (AWS London per DPA). Self-serve Stripe checkout for sprints. **Portal features UNKNOWN** | /expert, /legal/dpa, /legal/terms |
| EU AI Act documentation | Yes | Reports mapped to Article 10 and Annex IV. Compliance Package £2,000-£8,000 | /expert, /legal/ai-act |
| Turnaround | Yes | 48h for the Test Kit and Quick Sprint | /pricing |
| Evaluation interface details | No | "Structured interface" only. **UNKNOWN** | /how-it-works |
| Contributor QA / removal rules | No | **UNKNOWN** | /legal/contributor-agreement |

## 3. Nxted Capture

Overview: first-person (egocentric) video of skilled manual work, recorded in real Indian workplaces with consent and delivered in robotics-ready formats (FP, /capture).

| Feature | Documented? | Detail | Source |
|---|---|---|---|
| Skilled human demonstrations | Yes | Five levels: L1 Foundation, L2 Skilled Trades, L3 Technical/Industrial, L4 Professional/Medical, L5 Rare/Specialist | /capture/levels |
| Verticals | Yes | Electrical assembly, CNC and machine tending, garment manipulation, warehouse handling, electronics assembly | /data |
| Egocentric video | Yes | Head-mounted 4K or Aria-class glasses (RGB up to 1408x1408 at 30 fps per the rig article) | /capture, /research/inside-an-egocentric-capture-rig |
| Depth | Yes (Robotics-ready tier) | RealSense or ZED | /capture |
| Hand pose | Yes | Aria hand tracking, mocap gloves, or UMI-style gripper | /capture |
| Motion / IMU / 6-DoF | Yes | IMU plus SLAM-derived 6-DoF trajectories | /capture |
| Eye gaze | Yes (higher tiers) | Aria eye tracking | /capture |
| Exocentric / third-person | Yes (optional) | Multi-view reference footage | /capture, / |
| Worker skill verification | Claimed | "Source and verify workers"; skill verification records are in the Data Trust Pack. **Method UNKNOWN** | /capture, /trust |
| Task segmentation | Yes | Sub-actions with start and end times | /research/annotating-egocentric-data |
| Action annotation | Yes | Action labels, object grasp/release contact labels, narration, success/failure flags, skill-level metadata (Ego4D / Ego-Exo4D-style) | /capture, /research/annotating-egocentric-data |
| Annotation tooling | No | **UNKNOWN** | /research/annotating-egocentric-data |
| QA | Yes (high level) | Expert review of every batch, IAA report, labelled edge cases, check against a written annotation guide | /capture, /research/annotating-egocentric-data |
| Consent | Yes | Signed releases from contributors and locations; consent notice in English and the regional language; withdrawable for future processing (shipped datasets unaffected) | /trust, /legal/contributor-agreement |
| Privacy / redaction | Yes | Faces, plates, screens and PII redacted; biometric footage treated as special category data; separate VPC and KMS | /trust, /legal/privacy, /legal/security |
| Provenance | Yes | Provenance log traces each clip to contributor and session; dataset card; consent manifest | /trust |
| Data Trust Pack | Yes | Eight items: consent records, fair-pay confirmation, skill and reviewer credentials, no-minors and redaction record, dataset card and provenance log, DPA (SCCs/IDTA), safety/PPE record, QA report | /trust |
| Output formats | Yes | LeRobot (Parquet + MP4 + JSON), RLDS/TFDS, HDF5, MP4 with sidecars | /formats, /formats/lerobot |
| Exact schema / folder layout | No | A "sample folder structure" is mentioned on /capture, but the field-level schema is **UNKNOWN** | /formats/lerobot |
| Sync / calibration method | No | Calibration metadata is a listed deliverable; the method is **UNKNOWN** | /, /research/inside-an-egocentric-capture-rig |
| Collection workflow | Yes | Source and verify, fit rig, record in real environments, annotate, quality and consent review, deliver | /capture |
| Site safety | Yes | Safety/PPE record for industrial capture; filming sites vetted on-site before first use | /trust, /legal/modern-slavery |
| Contributor pay | Claimed | Above local market rate; weekly payouts | /trust, /apply |

## 4. Customer journey and project administration

**Expert track** (FP, /how-it-works, /expert):
1. Client submits a brief: the domain, and what counts as "correct".
2. Admin assigns contributors within 2 business hours.
3. Contributors evaluate in Nxted's interface.
4. IRA and accuracy are computed.
5. An AI-drafted narrative is reviewed by an admin.
6. Report delivered with credentials, recommendations and optional EU AI Act docs.

Entry options: the free Test Kit (no card), or a self-serve Quick Sprint via Stripe.

**Capture track** (FP, /how-it-works, rendered with REA because the content sits behind a tab):
1. Specify the dataset (skill, level, hours, environment, format).
2. Quote within 24h.
3. 50% deposit.
4. Nxted coordinates recording in India.
5. Every batch is quality-reviewed.
6. Delivery in the chosen format plus consent documentation.

Test Kits are requested via `/portal/capture/new`. That page requires login and was not inspected.

**Administration**: an internal admin role assigns experts and reviews reports (FP). Retainers add a dedicated coordinator on Scale (FP). The design of the admin tooling, the assignment algorithm and the project-management features are **UNKNOWN**.

Case studies (FP, anonymous, unverifiable, /case-studies):
- UK industrial AI: accuracy 68% to 91% in 8 weeks, 50 engineers, 500 outputs.
- US humanoid company: 1,000 hours of garment footage, 200 tailors, "82% below US cost", 6 weeks.
- EU medical lab: 15 doctors and 300 outputs, plus 35 nurses and 150 hours of footage under one DPA, 10 weeks.

## 5. Pricing and packages (company claims, /pricing and /expert)

| Product | Package | Price | Inclusions |
|---|---|---|---|
| Expert | Free Expert Test Kit | £0 | 20 outputs, 48h, quality report, 2 contributors, no card |
| Expert | Quick Sprint | £249 | 50 outputs, 48h, full report, IRA, credentials |
| Expert | Adversarial Sprint | £499-£2,000 | 50 adversarial prompts (on /expert only) |
| Expert | EU AI Act Compliance Package | £2,000-£8,000 | Compliance narrative (on /expert only) |
| Expert | Starter retainer | £1,500/mo | 50-200 outputs/mo, dashboard |
| Expert | Growth retainer | £3,500/mo | 200-500 outputs/mo, weekly trends, priority |
| Expert | Scale retainer | £5,000/mo | 500+ outputs/mo, custom rubric, EU AI Act docs, coordinator |
| Capture | Physical AI Test Kit | from $2,500 | 5-10 usable hours of one task, consent pack, metadata, basic labels, format sample, 7-10 days |
| Capture | L1 Foundation | from $35/hr | 500h minimum, 4K MP4, basic annotation |
| Capture | L2 Skilled Trades | from $55/hr | Minimum not stated (from /capture/levels) |
| Capture | L3 Technical | from $80/hr | 200h minimum, robotics-ready annotation, optional pose and depth |
| Capture | L4 Professional | from $120/hr | 100h minimum, full annotation |
| Capture | L5 Specialist / custom | Quote within 24h | Any spec or format |

Billing (FP, /pricing, /legal/terms, /legal/refund):
- Currencies: GBP, USD or EUR.
- Prices exclude VAT.
- Capture is billed 50% up front and 50% on delivery. The deposit is refundable until contributor coordination begins.
- Retainers are described as "cancellable monthly", but the Terms require 30 days' written notice (inconsistency).

Effective expert cost (INF): the Quick Sprint works out to about £5 per evaluated output, and the Scale retainer to about £10 per output or less.

## 6. Governance and legal

| Area | Commitment | Label | Source |
|---|---|---|---|
| Governing law | England and Wales; LCIA arbitration option for non-UK clients | FP | /legal/terms |
| IP | Deliverables assigned to the client on full payment; Nxted keeps background IP under licence; contributors irrevocably assign IP to OFORO | FP | /legal/terms, /legal/contributor-agreement |
| Liability | Capped at 12 months of fees | FP | /legal/terms |
| Data roles | Processor for client uploads; controller for contributor and capture data | FP | /legal/dpa, /legal/privacy |
| Hosting | AWS London (eu-west-2), backups to a separate region | FP | /legal/dpa, /legal/security |
| Sub-processors | AWS, Stripe, Resend (US), OFORO contributor network (India); 30 days' notice of changes | FP | /legal/dpa |
| Transfers | UK IDTA, EU SCCs (Module 2), Transfer Risk Assessment on request | FP | /legal/dpa, /legal/privacy |
| Breach notice | Within 48h to clients; ICO within 72h | FP | /legal/dpa, /legal/security |
| Security | AES-256, TLS 1.3, per-tenant envelope keys, MFA, JIT access, quarterly CREST pen tests | FP | /legal/security |
| Certifications | **None held.** SOC 2 Type II targeted Q4 2026, ISO 27001 targeted 2027 | FP | /legal/security |
| Regulator status | ICO registration "pending"; EU representative "pending" | FP | /legal/privacy |
| Retention | Raw footage kept for licence term plus 90 days; client data for term plus 6 years; rejected applicants 90 days | FP | /legal/privacy |
| EU AI Act | Not an AI provider; supports Articles 10, 14, 15, 53, 55 and Annex IV | FP | /legal/ai-act |
| Contributor welfare | Independent contractors, pay above market, no minors, on-site checks of filming sites | FP | /legal/modern-slavery, /trust |

## 7. Infollion takeaways

### Build (core, near term)
1. **Expert evaluation workflow**: brief, then expert matching by sub-domain, then rubric evaluation with structured verdict and correction, then IRA, then report. Nxted's publicly visible product is this loop plus reporting. Infollion's vetted expert network and KYC'd experts map directly onto it.
2. **Reviewer-transparent quality reports**: per-batch score, IRA with a named metric, severity-weighted error taxonomy, and the experts' credentials. Differentiate by naming the IRA metric and showing how credentials were verified, both of which Nxted leaves undocumented.
3. **Low-friction entry offers**: a free pilot (about 20 outputs) and a fixed-price sprint (about 50 outputs in 48h). Nxted's pricing is a useful benchmark: roughly £5-£10 per output, retainers from £1,500 to £5,000 a month.
4. **Compliance pack**: DPA, sub-processor list, EU AI Act Article 10 and Annex IV mapping, and DPDP alignment. For Nxted this is a headline selling point.

### Integrate or partner
- Pairwise preference and RLHF data export (formats Nxted does not document), plus red-team engagements under an explicit addendum with ethics controls, modelled on the Nxted AUP pattern.
- A client dashboard, which Nxted only lists as a retainer feature.

### Postpone
- **Physical AI / egocentric capture**: it needs hardware (Aria, RealSense, gloves), site safety vetting, biometric consent, redaction pipelines and LeRobot/RLDS/HDF5 export. That is a separate operational business. Revisit after the expert product has traction, possibly through a capture partner.

### Differentiation opportunities for Infollion
- **Verifiable credibility**: Nxted is under a year old (incorporated Oct 2025), names no founders, has no certifications and no ICO registration yet, and its case studies are anonymous. Infollion can lead with an established track record, named leadership and verifiable expert vetting.
- **Senior-expert depth**: Infollion's existing network of senior professionals and consultants could support higher-stakes evaluation (clinical, legal, financial, industrial) than Nxted's quoted contributor pay of £15-£40/hr implies.
- **India-native entity**: DPDP compliance with local contracting, possibly paired with a UK or EU contracting entity to match Nxted's main selling point for European buyers.
- **Methodological transparency**: publish the IRA metric, calibration process, gold-question checks and credential-verification steps.

## 8. Unknowns (not publicly documented)
- Founders, directors, team size, funding and investors.
- How expert credentials are actually verified.
- How worker skill is verified for Capture.
- The inter-rater agreement metric and the adjudication process.
- Preference/RLHF data formats (pairwise, ranking, SFT corrections).
- Features of the evaluation interface, customer portal and dashboard.
- Expert assignment algorithm and admin tooling.
- Contributor quality controls, scoring, removal rules and training.
- Annotation tooling; sync and calibration method.
- Field-level dataset schema and folder layout.
- Actual dataset volumes held and sample availability.
- Real customer identities or any independent validation of case-study results.
- Whether the "1M hours in 2026" figure refers to Nxted or the industry.
- Acceptance and rework procedures beyond the rubric-shortfall refund clause.

## 9. Sources

| URL | Title | Accessed | Type |
|---|---|---|---|
| https://nxted.ai/ | nxted.ai homepage | 2026-10-20 | First-party |
| https://nxted.ai/robots.txt | robots.txt | 2026-10-20 | First-party |
| https://nxted.ai/sitemap.xml | Sitemap | 2026-10-20 | First-party |
| https://nxted.ai/expert | RLHF & Human Evaluation for AI \| nxted.ai | 2026-10-20 | First-party |
| https://nxted.ai/capture | Egocentric Data for Robotics \| nxted.ai | 2026-10-20 | First-party |
| https://nxted.ai/capture/levels | Capture Skill Levels L1-L5 \| nxted.ai | 2026-10-20 | First-party |
| https://nxted.ai/pricing | Robotics Training Data Pricing \| nxted.ai | 2026-10-20 | First-party |
| https://nxted.ai/how-it-works | How nxted Works: Evaluation & Capture \| nxted.ai | 2026-10-20 | First-party (WebFetch + REA render) |
| https://nxted.ai/trust | Consented, DPDP-Compliant AI Data \| nxted.ai | 2026-10-20 | First-party |
| https://nxted.ai/case-studies | Physical AI & RLHF Case Studies \| nxted.ai | 2026-10-20 | First-party |
| https://nxted.ai/apply | Apply as a Contributor \| nxted.ai | 2026-10-20 | First-party |
| https://nxted.ai/contact | Contact nxted \| Talk to the Team | 2026-10-20 | First-party |
| https://nxted.ai/data | Data Verticals: Industrial & Skilled-Work Datasets \| nxted | 2026-10-20 | First-party |
| https://nxted.ai/formats | Robotics Dataset Formats: LeRobot, RLDS, HDF5 \| nxted | 2026-10-20 | First-party |
| https://nxted.ai/formats/lerobot | LeRobot Dataset Format Explained \| nxted | 2026-10-20 | First-party |
| https://nxted.ai/compare/egocentric-data-providers | Egocentric Data Providers for Robotics, Compared \| nxted | 2026-10-20 | First-party |
| https://nxted.ai/research | Research & Insights: Physical AI & RLHF \| nxted.ai | 2026-10-20 | First-party |
| https://nxted.ai/research/inside-an-egocentric-capture-rig | Inside an egocentric capture rig | 2026-10-20 | First-party |
| https://nxted.ai/research/annotating-egocentric-data | Annotating Egocentric Data: Hand Pose, 6-DoF, and Action Segmentation | 2026-10-20 | First-party |
| https://nxted.ai/research/red-teaming-domain-ai-needs-experts | Red-teaming domain AI: why generalist crowds miss expert failures | 2026-10-20 | First-party |
| https://nxted.ai/research/what-is-rlhf-human-evaluation | What Is RLHF and How Human Evaluation Improves AI | 2026-10-20 | First-party |
| https://nxted.ai/research/consent-first-robotics-data | Consent-First Robotics Data | 2026-10-20 | First-party |
| https://nxted.ai/research/the-economics-of-capture-in-india | From Tirupur to Tesla: the economics of capture in India | 2026-10-20 | First-party |
| https://nxted.ai/legal/terms | Terms of Service \| nxted.ai | 2026-10-20 | First-party (legal) |
| https://nxted.ai/legal/privacy | Privacy Policy \| nxted.ai | 2026-10-20 | First-party (legal) |
| https://nxted.ai/legal/dpa | Data Processing Agreement | 2026-10-20 | First-party (legal) |
| https://nxted.ai/legal/security | Security Whitepaper \| nxted.ai | 2026-10-20 | First-party (legal) |
| https://nxted.ai/legal/contributor-agreement | Contributor Agreement \| nxted.ai | 2026-10-20 | First-party (legal) |
| https://nxted.ai/legal/ai-act | EU AI Act Position Statement \| nxted.ai | 2026-10-20 | First-party (legal) |
| https://nxted.ai/legal/refund | Refund & Cancellation Policy \| nxted.ai | 2026-10-20 | First-party (legal) |
| https://nxted.ai/legal/aup | Acceptable Use Policy | 2026-10-20 | First-party (legal) |
| https://nxted.ai/legal/modern-slavery | Modern Slavery Statement \| nxted.ai | 2026-10-20 | First-party (legal) |
| https://find-and-update.company-information.service.gov.uk/company/16787568 | OFORO LTD, Companies House | 2026-10-20 | Independent (registry) |
| https://www.cbinsights.com/company/oforo | OFORO, CB Insights (search snippet only; entity match unconfirmed) | 2026-10-20 | Independent (unconfirmed) |
| https://letsdatascience.com/news/indian-workers-train-ai-robots-with-headcam-footage-463a3761 | Indian workers train AI robots with headcam footage (market context only; not about Nxted) | 2026-10-20 | Independent |
