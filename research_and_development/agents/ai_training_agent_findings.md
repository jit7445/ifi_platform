# AI Training and Evaluation Research Agent: Working Notes

Agent: AI Training & Evaluation Research Agent (Infollion)
Date of research and access date for all sources: 2026-10-20
Companion report: `research_and_development/research/ai_training_and_evaluation.md`

Evidence types used: **paper** (arXiv or peer-reviewed), **official docs** (vendor or project documentation), **independent** (third-party summary), **inferred** (our reasoning, not directly stated by a source).

Rule followed: a number appears here only if it was read from a fetched source in this session, or it is flagged as "not re-verified".

---

## 1. Fetch log (what was actually read)

| # | URL | What was confirmed | Type |
|---|-----|--------------------|------|
| 1 | https://huggingface.co/docs/trl/dataset_formats | TRL formats (standard vs conversational), types (language modeling, prompt-only, prompt-completion, preference, unpaired preference), trainer to type table, tool-calling `tools` column, vision `images` key, warning on unpairing preference data | official docs |
| 2 | https://huggingface.co/docs/trl/grpo_trainer | GRPO needs only `prompt`; extra columns (e.g. `ground_truth`) passed to `reward_funcs`; reward funcs can be Python, reward model, or list with `reward_weights`; loss types `dapo` (default), `dr_grpo`, `sapo`; `beta` default 0.0 | official docs |
| 3 | https://developers.openai.com/api/docs/guides/supervised-fine-tuning | JSONL chat `messages`; minimum 10 examples; start ~50 well-crafted; improvements around 50-100; reserve holdout | official docs |
| 4 | https://developers.openai.com/api/docs/guides/direct-preference-optimization | DPO JSONL: `input` (messages, tools, parallel_tool_calls), `preferred_output`, `non_preferred_output`; single-turn, text-only | official docs |
| 5 | https://developers.openai.com/api/docs/guides/reinforcement-fine-tuning | RFT graders: string_check, text_similarity, score_model, python, multi; up to 50,000 train / 1,000 test; "works best with unambiguous tasks"; check that independent experts converge before RFT | official docs |
| 6 | https://arxiv.org/abs/2507.17746 | Rubrics as Rewards (Gunjal et al.): instance-specific rubrics as RL reward; medicine and science; up to 31% relative gain on HealthBench vs Likert LLM-judge rewards; up to 7% on GPQA-Diamond | paper |
| 7 | https://arxiv.org/abs/2505.08775 and https://arxiv.org/html/2505.08775 | HealthBench: 5,000 conversations; 262 physicians; 60 countries; 48,562 unique criteria; points -10 to 10; 7 themes; 5 axes; GPT-4.1 grader macro F1 0.709; Consensus 3,671 examples / 34 criteria; Hard 1,000 | paper |
| 8 | https://www.swebench.com/verified.html | SWE-bench Verified = 500 human-filtered instances; criteria: clear problem, correct tests, solvable | official docs |
| 9 | WebSearch results incl. https://openai.com/index/introducing-swe-bench-verified/ and https://epoch.ai/benchmarks/swe-bench-verified | 93 Python developers; 1,699 samples annotated; 0-3 severity labels; 3 annotators per sample (Epoch) | official (via search snippet) + independent. openai.com page returned HTTP 403 to direct fetch |
| 10 | https://arxiv.org/abs/2305.20050 | PRM800K: 800K step-level human labels; process supervision beats outcome supervision; 78% on representative MATH subset | paper |
| 11 | https://arxiv.org/abs/2503.05731 | AILuminate v1.0: 12 hazard categories (listed); five-tier grade Poor to Excellent; entropy-based response evaluation | paper |
| 12 | https://arxiv.org/html/2402.04249 | HarmBench: 510 behaviors (400 text, 110 multimodal); 7 semantic categories; 4 functional (standard 200, copyright 100, contextual 100, multimodal 110); classifier 93.19% avg agreement with humans vs GPT-4 88.37%; 18 methods, 33 targets | paper |
| 13 | https://github.com/centerforaisafety/HarmBench | Classifier models: HarmBench-Llama-2-13b-cls, multimodal variant, Mistral-7b val cls | official repo |
| 14 | https://arxiv.org/abs/2311.12022 | GPQA: 448 questions bio/phys/chem; experts ~65% (~74% excluding clear mistakes); non-experts ~34% with web, >30 min; GPT-4 39% | paper |
| 15 | https://arxiv.org/abs/2501.14249 | HLE: 2,500 questions; multimodal; MCQ + short answer; auto-gradable; not quickly answerable via retrieval; ~1,178 authors | paper |
| 16 | https://arxiv.org/abs/2411.04872 | FrontierMath: hundreds of original problems by expert mathematicians; automated verification; unpublished to limit contamination; SOTA <2% at release | paper |
| 17 | https://arxiv.org/abs/2308.11462 | LegalBench: 162 tasks, six types of legal reasoning, hand-crafted by legal professionals | paper |
| 18 | https://arxiv.org/abs/2510.04374 | GDPval: 44 occupations, top 9 GDP sectors, gold subset 220 tasks, experts avg 14 years experience | paper |
| 19 | https://arxiv.org/abs/2306.05685 | LLM-as-judge (Zheng et al.): position, verbosity, self-enhancement bias; limited reasoning; GPT-4 >80% agreement with humans, similar to human-human | paper |
| 20 | https://arxiv.org/abs/2404.12272 | Who Validates the Validators (Shankar et al.): EvalGen; "criteria drift"; criteria depend on observed outputs | paper |
| 21 | WebSearch: https://arxiv.org/abs/2402.10669 | Humans or LLMs as the Judge (Chen et al.): both human and LLM judges biased (misinformation oversight, gender, authority, beauty) | paper (via search) |
| 22 | WebSearch: https://arxiv.org/html/2511.21140v3 | How to Correctly Report LLM-as-a-Judge Evaluations: uses human-labeled calibration data to correct judge bias | paper (via search, not opened) |
| 23 | https://arxiv.org/abs/2402.01306 | KTO: binary desirable/undesirable signal; prospect theory; matches or exceeds preference methods 1B-30B | paper |
| 24 | https://arxiv.org/abs/2310.12036 | IPO / Psi-PO: RLHF/DPO approximation of pairwise prefs by pointwise rewards; IPO special case with identity Psi | paper |
| 25 | https://arxiv.org/abs/2403.07691 | ORPO: reference-free, single stage SFT + odds-ratio preference penalty; trained on UltraFeedback | paper |
| 26 | https://arxiv.org/abs/2405.14734 | SimPO: reference-free, length-normalized avg log prob reward, target margin; +6.4 AlpacaEval 2, +7.5 Arena-Hard over DPO | paper |
| 27 | https://arxiv.org/abs/2402.03300 | GRPO introduced in DeepSeekMath as PPO variant with lower memory | paper (abstract only; critic-free group baseline is from paper body, not re-verified here) |
| 28 | https://arxiv.org/html/2501.12948v2 | DeepSeek-R1-Zero: rule-based accuracy + format rewards; no neural ORM/PRM because of reward hacking at scale | paper |
| 29 | https://arxiv.org/abs/2411.15124 | Tulu 3: SFT, DPO, RLVR named as the three training algorithms | paper |
| 30 | https://arxiv.org/abs/2305.11206 | LIMA: 1,000 curated examples; preferred or equal to GPT-4 in 43% | paper |
| 31 | https://arxiv.org/abs/2203.02155 | InstructGPT: labeler demonstrations for SFT, then rankings for RLHF | paper (abstract only) |
| 32 | https://ar5iv.labs.arxiv.org/html/2307.09288 | Llama 2: binary comparisons + 4-level degree (significantly better, better, slightly better, negligibly better/unsure); helpfulness and safety separately; safety bins 18/47/35%; 1,418,091 Meta comparisons; weekly collection to stay on-distribution | paper |
| 33 | https://arxiv.org/abs/2406.12045 | tau-bench: tool-agent-user; DB end state vs annotated goal state; pass^k; gpt-4o <50%, pass^8 <25% retail | paper |
| 34 | https://arxiv.org/abs/2311.12983 | GAIA: 466 questions; answers withheld for 300; humans 92% vs GPT-4 plugins 15% | paper |
| 35 | https://arxiv.org/abs/2307.13854 + WebSearch | WebArena: 4 domains; functional correctness; GPT-4 14.41% vs human 78.24%; 812 tasks (paper PDF via search); WebArena-Verified re-reviewed all tasks | paper + independent |
| 36 | https://arxiv.org/abs/2404.07972 | OSWorld: 369 tasks; Ubuntu/Windows/macOS; per-task execution-based eval script; human 72.36% vs best model 12.24% at release | paper |
| 37 | WebSearch: https://arxiv.org/abs/2601.11868 | Terminal-Bench 2.0: 89 tasks, each with container, instructions, tests, human-written reference solution; verified by human reviewers; frontier <65% | paper (via search snippet) |
| 38 | https://pmc.ncbi.nlm.nih.gov/articles/PMC4913118/ | Koo & Li 2016 ICC: <0.5 poor, 0.5-0.75 moderate, 0.75-0.9 good, >0.9 excellent; judge by 95% CI; choose model/type/definition; >=30 subjects, >=3 raters | paper |
| 39 | https://pmc.ncbi.nlm.nih.gov/articles/PMC3900052/ | McHugh 2012: Cohen/Landis-Koch-style bands; McHugh stricter (kappa <0.60 inadequate); percent agreement >=80% often recommended; report both | paper |
| 40 | WebSearch (Krippendorff) incl. https://en.wikipedia.org/wiki/Krippendorff%27s_alpha | alpha >=0.800 customary, >=0.667 lowest for tentative conclusions | independent (primary book not opened) |
| 41 | https://huggingface.co/docs/lerobot/lerobot-dataset-v3 | LeRobotDataset v3: Parquet tabular, MP4 video per camera, meta/info.json, stats.json, tasks.jsonl, meta/episodes chunked Parquet; many episodes per file; `finalize()` before push | official docs |
| 42 | https://github.com/google-research/rlds | RLDS: dataset of episodes; step fields is_first, is_last (mandatory), observation, action, reward, discount, is_terminal (optional); TFDS loading | official repo |
| 43 | https://arxiv.org/abs/2310.08864 + https://robotics-transformer-x.github.io/ | Open X-Embodiment: 22 embodiments, 21 institutions, 527 skills, 160,266 tasks, 1M+ trajectories, 60 datasets from 34 labs | paper + official site |
| 44 | https://arxiv.org/abs/2110.07058 | Ego4D: 3,670 hours, 931 wearers, 74 locations, 9 countries; consent and de-identification | paper |
| 45 | https://arxiv.org/abs/2505.11709 | EgoDex: 829 hours, 194 tabletop tasks, Apple Vision Pro, full hand joint tracking | paper |

Failed fetches: https://openai.com/index/healthbench/ (403), https://openai.com/index/introducing-swe-bench-verified/ (403), https://www.harmbench.org/ (no detail). Facts were taken from arXiv versions instead where possible.

---

## 2. Working notes by topic

### 2.1 SFT / demonstration data
- Format: conversational `messages` list of `{role, content}`; TRL also accepts prompt-completion. Tool calling adds `tool_calls` in assistant turns and a dataset-level `tools` column (TRL docs). OpenAI SFT also JSONL `messages`, optional `tools`, `parallel_tool_calls`.
- Quality over quantity: LIMA 1,000 examples. OpenAI: minimum 10, start ~50.
- Usable SFT data (inferred from LIMA, OpenAI guidance, TRL): realistic prompts, correct and complete answers in the exact target style, consistent formatting, no leakage of eval items, dedup, PII scrubbed, system prompts consistent with deployment, holdout split.
- SFT data is "imitation": every token of the assistant turn is a target. A mediocre answer teaches mediocrity. Expert authoring is where Infollion value is highest.

### 2.2 Preference methods (key mapping)
- Pairwise prefs (prompt, chosen, rejected): DPO, IPO, ORPO, SimPO, CPO, reward model training (Bradley-Terry). TRL RewardTrainer uses preference type (implicit prompt recommended).
- Binary unpaired labels (prompt, completion, label True/False): KTO. TRL KTOTrainer accepts unpaired or paired.
- Rankings of K responses: InstructGPT-style reward models expand to pairwise comparisons (paper body; not re-verified in this session, abstract confirms rankings were collected). Convert to pairs for DPO.
- Degree of preference (Llama 2 4-level): can feed margin in RM loss (Llama 2 paper describes a margin term; not re-verified this session, flag).
- Prompts + verifier / reward function: GRPO, RLOO, PPO, Online DPO (TRL: prompt-only). RLVR (Tulu 3), R1-Zero rule-based rewards.
- Rubrics per prompt: RaR, HealthBench grading, OpenAI RFT score_model or multi graders.
- Warning from TRL: chosen/rejected cannot be blindly converted to good/bad labels; both could be bad.
- Not interchangeable: KTO binary labels cannot train DPO without pairing two labels on the same prompt with one True and one False (and even then only a weak pair); pairwise prefs do not give absolute quality for SFT filtering; a Likert score alone is not a pair until two responses to the same prompt are compared; GRPO cannot consume static chosen/rejected pairs (it needs a reward function at generation time), though a reward model trained on pairs can serve as that function.

### 2.3 Rubrics
- HealthBench: conversation-specific criteria with signed points -10..10, axes accuracy, completeness, communication quality, context awareness, instruction following; grader GPT-4.1 macro F1 0.709 vs physicians.
- RaR: instance-specific rubrics as reward; aggregation strategies compared; better for smaller judges.
- OpenAI RFT: multi-grader with weighted formula; recommends verifying expert convergence.

### 2.4 Reasoning / process supervision
- PRM800K: step-level labels (the dataset uses positive / negative / neutral per step: not re-verified this session; flag as from memory).
- R1-Zero avoided neural PRMs due to reward hacking. Implication: PRM labels are valuable for evaluation and verifier research but RL-at-scale labs may prefer verifiable outcome rewards; demand for step labels exists mostly for evaluation, PRM research, and critique data (inferred).
- TRL has a stepwise supervision type for PRMTrainer in older versions (not in current table fetched; flag as uncertain).

### 2.5 Safety
- AILuminate 12 hazards; five-tier grade. HarmBench 7 semantic, 4 functional categories, classifier with ~93% human agreement.
- Labeling schema should capture hazard category, attack technique, harm severity, response verdict (refusal, safe-complete, partial, unsafe), over-refusal flag.

### 2.6 Agents
- Human contributions: task authoring, environment setup, reference solutions, test writing, validation of task specification and tests (SWE-bench Verified 0-3 severity, 3 annotators), goal-state annotation (tau-bench), eval scripts (OSWorld), human baselines (GAIA 92%, WebArena 78.24%, OSWorld 72.36%), re-verification (WebArena-Verified).
- pass^k metric for reliability.

### 2.7 Expert benchmarks
- GPQA: expert writer -> expert validator -> non-expert validators to confirm "Google-proof".
- HLE: auto-gradable, not retrievable; adversarially filtered against frontier models (paper body; this specific filtering detail not confirmed in abstract fetch, flag).
- FrontierMath: unpublished, auto-verifiable answers.
- GDPval: occupational experts avg 14 years.
- LegalBench: legal professionals designed tasks.

### 2.8 IRR notes
- Percent agreement: simple, inflated by chance.
- Cohen's kappa: 2 raters, nominal; weighted kappa for ordinal.
- Fleiss' kappa: >2 raters, nominal, raters can differ per item but fixed number per item.
- Krippendorff's alpha: any number of raters, missing data, nominal/ordinal/interval/ratio.
- ICC: continuous / interval scores; pick model/type/definition (Koo & Li).
- Kendall's W: agreement among m raters ranking n items; Kendall's tau / Spearman: correlation between two rankings (e.g. model leaderboard vs human leaderboard).
- Thresholds: kappa McHugh >=0.60 minimum; Landis-Koch bands; alpha 0.667/0.800; ICC 0.5/0.75/0.9.
- Caveat: kappa paradox with skewed prevalence (well known, standard statistics literature; not fetched here, flagged as general knowledge).

### 2.9 Physical AI
- LeRobot v3: Parquet + MP4 + JSON meta.
- RLDS: episode/step with is_first/is_last; TFDS.
- OXE: 1M+ trajectories, 22 embodiments. OXE published in RLDS (general knowledge from project repo; not re-fetched, flag).
- HDF5: widely used for robot demos (e.g. robomimic, ALOHA) and EgoDex distributes HDF5 annotations (not re-verified this session, flag as unverified).
- Ego4D, EgoDex numbers confirmed.

---

## 3. Open questions / unverified items
1. Exact InstructGPT K (4 to 9 outputs ranked) and labeler count (about 40): from memory, not re-verified.
2. Llama 2 margin term in RM loss: from memory.
3. PRM800K per-step label values: from memory.
4. HLE adversarial filtering against frontier LLMs and expert review rounds: from memory; abstract fetch did not show it.
5. OXE RLDS format and EgoDex HDF5 format: from memory.
6. Kappa prevalence paradox: standard literature (Feinstein & Cicchetti 1990), not fetched.
7. Pricing / market rates for expert annotation: out of scope here, unknown.
