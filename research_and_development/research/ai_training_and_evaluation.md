# AI Training Data and Human Evaluation: State of Practice for an Expert-Network Platform

Prepared for: Infollion (expert-powered evaluation and training-data platform for AI labs)
Date: 2026-10-20 (all sources accessed 2026-10-20)
Working notes and fetch log: `research_and_development/agents/ai_training_agent_findings.md`

Evidence tags: [P] paper, [D] official docs, [I] independent source, [Inf] inferred by us. Source IDs (S1, S2, ...) map to the sources table at the end. Items marked "unverified" were not re-confirmed against a primary source in this session.

---

## 1. Executive summary

1. **Labels are not interchangeable.** Each training method consumes a specific data shape. Pairwise preferences feed DPO/IPO/ORPO/SimPO and reward models; binary good/bad labels feed KTO; prompts with a verifier or rubric feed GRPO/RLVR-style online RL; demonstrations feed SFT. Converting between them loses information or introduces errors (TRL explicitly warns that "chosen" is not the same as "good") [D, S1].
2. **The highest-value expert work has moved toward verifiers, rubrics and hard evaluation sets**, not only demonstrations. Labs now train reasoning models with rule-based or verifiable rewards (DeepSeek-R1-Zero used only accuracy and format rewards and avoided neural reward models because of reward hacking [P, S20]; Tulu 3 formalized RLVR [P, S21]). For non-verifiable domains, expert rubrics are becoming the reward signal (Rubrics as Rewards [P, S9]; HealthBench's 48,562 physician-written criteria [P, S10]).
3. **Expert agreement is a precondition, not a nice-to-have.** OpenAI's RFT guidance says to confirm that independent qualified experts converge on the same answer before investing in RFT [D, S6]. This makes measured inter-rater reliability a sellable product feature.
4. **Agent benchmarks rely on humans for task specification, environment, reference solutions and test validation**, not for clicking through tasks. SWE-bench Verified used 93 developers to screen 1,699 samples down to 500 [D/I, S13, S14].
5. **LLM judges are useful but biased** (position, verbosity, self-enhancement) [P, S27] and need task-specific human calibration [P, S28]. Infollion can sell the calibration set.
6. **Infollion produces evaluations and datasets; the lab trains.** Deliverables must be in formats labs load directly (TRL, OpenAI JSONL, HF Datasets, LeRobot/RLDS) with rich metadata so labs can filter by agreement, expertise and provenance.

---

## 2. Three distinct activities (do not conflate them)

| Activity | What Infollion delivers | Who uses it and how | Example | Infollion role |
|---|---|---|---|---|
| **Human evaluation** | Scores, verdicts, pairwise judgments or rubric grades on a lab's model outputs; reports with agreement statistics | Lab uses results to decide releases, compare checkpoints, calibrate LLM judges. Data is usually not trained on (and should be contractually kept out of training if it is a held-out eval) | Physicians grading model answers against a rubric; experts doing blind A/B comparison | Core service |
| **Training-data creation** | New artifacts: demonstrations, preference pairs, binary labels, rubrics, verifiable problems with answers, step labels, red-team prompts, agent tasks with tests | Lab feeds into SFT, reward modeling, DPO-family, or RL pipelines | Expert-written SFT conversations; chosen/rejected pairs; math problems with checkable final answers | Core service |
| **Benchmark creation** | Held-out expert-authored items plus grading method and validation evidence | Lab or public uses as a fixed yardstick; contamination control matters | GPQA, HLE, HealthBench, FrontierMath | Core service, premium |
| **Model training** | Gradient updates (SFT, DPO, PPO/GRPO etc.) | Lab only | Running TRL `DPOTrainer` | **Not Infollion's business.** We must understand it only so our data fits it |

[Inf] A single item can cross categories (an eval rubric can later become an RL reward), so every item needs a `usage_rights` field stating whether it may be trained on.

---

## 3. Method landscape and what data each needs

### 3.1 Supervised fine-tuning (SFT)
- **Data:** conversations as a `messages` list of `{role, content}` (system/user/assistant, plus `tool` turns and `tool_calls` for agents). TRL accepts "language modeling" (`messages` or `text`) or "prompt-completion" types; tool use requires a `tools` column with JSON-schema function definitions [D, S1]. OpenAI SFT uses JSONL with `messages`, optional `tools` and `parallel_tool_calls`; minimum 10 examples, recommended start around 50, gains typically seen at 50 to 100 [D, S5].
- **Quality over quantity:** LIMA fine-tuned a 65B model on 1,000 curated examples with no RLHF and was judged equal or better than GPT-4 in 43% of comparisons [P, S22]. InstructGPT began with labeler-written demonstrations before RLHF [P, S23].
- **What makes SFT data usable** [Inf, grounded in S1, S5, S22]: correct and complete assistant turns (every token is imitated); a consistent style that matches the target deployment; realistic prompts (OpenAI recommends realistic, expert or logged data [D, S5]); exact role/format compliance with the chat template; dedup and contamination checks against public benchmarks; PII removed; explicit reasoning only if the lab wants it imitated; a held-out split for evaluation.

### 3.2 Reward modeling and RLHF
- InstructGPT: demonstrations then **rankings** of model outputs, used to train a reward model and then RL [P, S23]. (Ranking K = 4 to 9 outputs per prompt, expanded into pairwise comparisons: from the paper body, unverified in this session.)
- Llama 2: **binary comparisons plus a degree label** (significantly better, better, slightly better, negligibly better/unsure), helpfulness and safety collected separately with separate guidelines; safety pairs binned into "chosen safe, other unsafe" (18%), "both safe" (47%), "both unsafe" (35%); 1,418,091 Meta comparisons; collected weekly from the latest model to stay on-distribution [P, S24].
- TRL `RewardTrainer` expects the preference type (implicit prompt recommended) [D, S1].

### 3.3 Offline preference optimization (no separate RL loop)
| Method | Signal required | Notes | Source |
|---|---|---|---|
| **DPO** | Pairs: prompt, chosen, rejected | Needs reference model; TRL preference type; OpenAI DPO uses `input`, `preferred_output`, `non_preferred_output`, single-turn, text only | [P, S15], [D, S1, S7] |
| **IPO** | Pairs | Derived from Psi-PO written directly in pairwise preferences; avoids replacing preferences with pointwise rewards | [P, S16] |
| **KTO** | **Binary** desirable / undesirable per output, no pairing needed | Prospect-theory utility; matches or beats preference methods 1B to 30B. TRL accepts unpaired or paired | [P, S17], [D, S1] |
| **ORPO** | Pairs | Reference-free, combines SFT and preference in one stage via odds-ratio penalty | [P, S18] |
| **SimPO** | Pairs | Reference-free, length-normalized reward with target margin; up to +6.4 AlpacaEval 2 and +7.5 Arena-Hard over DPO | [P, S19] |
| **CPO** | Pairs | TRL experimental trainer, preference type | [D, S1] |

### 3.4 Online RL: GRPO, RLOO, PPO, RLVR
- **GRPO** introduced in DeepSeekMath as a PPO variant with lower memory [P, S25]. TRL `GRPOTrainer` requires only a `prompt` column; extra columns such as `ground_truth` are passed to reward functions; rewards come from Python functions, a reward model, or a weighted list [D, S2]. TRL `RLOOTrainer` and `OnlineDPOTrainer` also take prompt-only data [D, S1].
- **RLVR**: Tulu 3 names SFT, DPO and RLVR as its training algorithms [P, S21]. DeepSeek-R1-Zero used accuracy rewards (boxed answer check, code test cases) and format rewards, avoiding neural outcome or process reward models because they are "susceptible to reward hacking" [P, S20].
- **OpenAI RFT**: JSONL `messages` plus reference fields read by graders (`string_check`, `text_similarity`, `score_model`, `python`, `multi`); up to 50,000 training examples; "works best with unambiguous tasks"; confirm experts converge before investing [D, S6].
- **Implication** [Inf]: for online RL, the deliverable is not a response but a **prompt plus a way to score any response**: a verified final answer, unit tests, a checker script, or a rubric.

### 3.5 Rubric-based evaluation and rubrics as reward
- **HealthBench** [P, S10]: 5,000 multi-turn conversations; rubrics by 262 physicians with practice experience in 60 countries; 48,562 unique criteria; each criterion has a signed point value from -10 to 10 (negative for undesirable behavior); 7 themes; 5 axes (accuracy, completeness, communication quality, context awareness, instruction following); GPT-4.1 grader reached macro F1 0.709 against physician judgments in meta-evaluation; HealthBench Consensus (3,671 examples, 34 consensus criteria) and Hard (1,000) subsets.
- **Rubrics as Rewards (RaR)** [P, S9]: instance-specific rubrics aggregated into a reward for on-policy RL in medicine and science; best variant up to 31% relative improvement on HealthBench over Likert-style LLM-judge rewards and up to 7% on GPQA-Diamond; rubric rewards help smaller judges.
- **Design lesson** [Inf]: a rubric item is only reward-grade if each criterion is atomic, objectively checkable by a grader model, weighted, and validated by checking that the grader's verdicts agree with experts.

### 3.6 Reasoning data and process supervision
- **PRM800K / Let's Verify Step by Step** [P, S11]: 800,000 step-level human labels on model-generated solutions; process supervision significantly outperformed outcome supervision; process-supervised model solved 78% of a representative MATH test subset. (Per-step label values positive/negative/neutral: unverified this session.)
- **Counter-trend:** R1-Zero avoided PRMs at scale due to reward hacking [P, S20]. [Inf] Demand for step labels is strongest for evaluating reasoning faithfulness, training verifiers/critics, and research; demand for verifiable final answers is strongest for RL training.
- **Expert value** [Inf]: finding the first incorrect step in a long solution requires domain experts (math, physics, law, medicine), which matches Infollion's network.

### 3.7 Red-teaming and safety evaluation
- **MLCommons AILuminate v1.0** [P, S29]: 12 hazard categories: violent crimes, nonviolent crimes, sex-related crimes, child sexual exploitation, indiscriminate weapons, suicide and self-harm, intellectual property, privacy, defamation, hate, sexual content, specialized advice (election, financial, health, legal). Five-tier grade from Poor to Excellent; entropy-based response evaluation.
- **HarmBench** [P, S30; D, S31]: 510 behaviors (400 text, 110 multimodal); 7 semantic categories (cybercrime and unauthorized intrusion; chemical and biological weapons/drugs; copyright; misinformation and disinformation; harassment and bullying; illegal activities; general harm); 4 functional categories (standard 200, copyright 100, contextual 100, multimodal 110); fine-tuned Llama-2-13B classifier agreed with humans 93.19% on average vs 88.37% for GPT-4; compared 18 attack methods on 33 targets.
- **Labeling schema** [Inf]: hazard category (map to AILuminate or lab taxonomy), attack technique (direct request, role-play, multi-turn escalation, obfuscation/encoding, context injection, multimodal), target behavior, model response, verdict (full refusal, safe partial, unsafe compliance), severity, over-refusal flag for benign prompts, rationale. Red-team content is hazardous: restrict access, avoid producing actionable uplift in CBRN areas, and route those to vetted specialists only.

### 3.8 Agent evaluation and trajectory data
| Benchmark | Size and evaluation | Human contribution | Source |
|---|---|---|---|
| SWE-bench Verified | 500 instances, human-filtered from SWE-bench; graded by repository tests | 93 Python developers annotated 1,699 samples on 0-3 severity for issue underspecification and test validity; 3 annotators per sample | [D, S13]; [D via search, S14]; [I, S32] |
| tau-bench | Tool-agent-user conversations with LLM-simulated users; success = final database state matches annotated goal state; pass^k reliability metric; gpt-4o <50% success, pass^8 <25% in retail | Writing policies, tasks and goal states | [P, S33] |
| GAIA | 466 questions; answers for 300 withheld for leaderboard; humans 92% vs GPT-4 with plugins 15% | Question authoring with unambiguous answers; human baseline | [P, S34] |
| WebArena | 812 tasks on self-hosted sites across 4 domains; functional-correctness checks; GPT-4 agent 14.41% vs humans 78.24%; WebArena-Verified later re-reviewed every task and evaluator | Task, reference answer and evaluator writing; audits | [P, S35]; [I, S36] |
| OSWorld | 369 tasks on Ubuntu/Windows/macOS, each with an execution-based evaluation script; humans 72.36% vs best model 12.24% at release | Task setup, initial state, eval scripts, human baseline | [P, S37] |
| Terminal-Bench 2.0 | 89 terminal tasks, each with container, instructions, tests, human-written reference solution; manually verified by human reviewers; frontier <65% | Task authoring, reference solutions, review | [P via search, S38] |

[Inf] What humans contribute to agent work: (1) authoring realistic tasks, (2) building or configuring environments, (3) writing reference solutions and deterministic tests, (4) validating that tasks are well-specified and tests are fair (the SWE-bench Verified job), (5) human baselines, (6) grading trajectories for process quality (unsafe actions, wasted steps, policy violations) where outcome checks are insufficient, (7) demonstration trajectories for SFT.

### 3.9 Expert-authored benchmarks
| Benchmark | Creation and validation | Source |
|---|---|---|
| GPQA | 448 MCQs in biology, physics, chemistry written by domain experts; expert validators ~65% (~74% after discounting clear mistakes); skilled non-experts with web access ~34% after >30 min; GPT-4 baseline 39% | [P, S39] |
| Humanity's Last Exam | 2,500 multimodal questions, MCQ and short answer, unambiguous and auto-gradable, not quickly answerable via retrieval; about 1,178 authors | [P, S40] |
| HealthBench | See 3.5 | [P, S10] |
| FrontierMath | Hundreds of original unpublished problems crafted and vetted by expert mathematicians; automated verification; SOTA <2% at release | [P, S41] |
| LegalBench | 162 tasks over six legal reasoning types, hand-crafted by legal professionals | [P, S42] |
| GDPval | Tasks from 44 occupations across the top 9 GDP sectors; professionals averaging 14 years experience; 220-task gold subset open-sourced | [P, S43] |

[Inf] Common pattern: expert writer, then independent expert validator, then a check that non-experts or current models fail (difficulty), then automated or rubric grading. Contamination control (keep items private) is part of the value.

### 3.10 LLM-as-a-judge
- Strong judges reached over 80% agreement with human preferences, similar to human-human agreement, but exhibit **position, verbosity and self-enhancement bias** and limited reasoning on math [P, S27].
- **Criteria drift**: people refine criteria while grading outputs, so judge prompts must be iterated with human-graded samples [P, S28].
- Human and LLM judges are both vulnerable to perturbations (authority, misinformation, etc.) [P via search, S44].
- Reporting judge-based accuracy should correct for judge error using a human-labeled calibration set [P via search, S45].
- Specialized classifiers can beat general judges on narrow tasks (HarmBench classifier 93.19% vs GPT-4 88.37%) [P, S30]. HealthBench's best grader had macro F1 0.709 vs physicians [P, S10].
- [Inf] Product implication: sell "judge calibration packs": a stratified expert-labeled sample, agreement of the lab's judge vs experts per category, bias probes (swap order, length-padded variants).

---

## 4. Data type -> suitable methods -> unsuitable uses (matrix)

| Data type (deliverable) | Minimal shape | Suitable for | Unsuitable or risky uses | Why |
|---|---|---|---|---|
| Demonstration / SFT conversation | `messages` with final assistant turn | SFT; distillation; ORPO only if paired with a rejected response; as `chosen` side when a rejected exists | DPO/IPO/SimPO alone (no rejected); KTO "True" label without an absolute quality check; eval benchmark if it will also be trained on | Preference methods need a contrast; reuse of eval items in training contaminates [Inf, S1] |
| Pairwise preference (prompt, chosen, rejected) | TRL preference / OpenAI DPO | DPO, IPO, ORPO, SimPO, CPO; Bradley-Terry reward model; Online RL via the trained RM | SFT on `chosen` without checking chosen is actually good; KTO by unpairing (both may be bad); absolute quality claims | TRL warns chosen and rejected can both be good or both bad [D, S1] |
| Pairwise with degree / tie | pair + `strength` (Llama 2 style) + `tie` | RM with margin; filtering low-confidence pairs; agreement analysis | Treating "negligibly better/unsure" as strong pairs for DPO | Low-margin pairs are noisy [Inf, S24] |
| Ranking of K responses | ordered list | Expand to K(K-1)/2 pairs for RM or DPO; Kendall-based agreement | Treating rank gaps as equal-interval scores | Ranks are ordinal [Inf] |
| Binary good/bad label (unpaired) | prompt, completion, label | KTO; filtering SFT data (keep True); classifier training; eval pass rate | DPO/IPO/SimPO without constructing same-prompt pairs; reward magnitude | Only an absolute bit per output [P, S17; D, S1] |
| Likert / scalar rating | item + score | Regression RM; best-of-n filtering; ICC-based eval; can be converted to pairs when two responses share a prompt | Direct DPO input; comparing across raters without calibration | Scale use differs by rater [Inf] |
| Rubric-scored item | prompt + criteria (weight, type) + per-criterion verdicts | Eval (HealthBench style); RL reward (RaR, RFT `score_model`/`multi`); judge calibration | Holistic SFT target; reward use if criteria are vague or not grader-checkable | Reward quality depends on atomic, checkable criteria [P, S9, S10] |
| Verifiable problem (prompt + answer or tests) | prompt + `ground_truth` / tests | GRPO/RLOO/PPO with rule rewards (RLVR); RFT `string_check`/`python`; eval | SFT (no worked solution); preference methods (no contrast) | GRPO needs a reward function at generation time [D, S2; P, S20, S21] |
| Process / step labels | solution split into steps + per-step label | PRM training; reasoning eval; critique models; locate first error | Outcome-only RL as-is; SFT on flawed solutions | Step labels target verifiers [P, S11] |
| Red-team item | attack prompt + hazard + verdict | Safety eval; refusal/safety SFT (with safe target); safety RM pairs; classifier training | Releasing publicly when content gives uplift; training the policy to imitate unsafe output | Hazard taxonomies [P, S29, S30] |
| Agent task + tests | instruction, environment, checker | Agent eval; agentic RL environments | SFT without trajectories | Needs execution [P, S33, S37, S38] |
| Agent trajectory | sequence of actions/observations + outcome | SFT on successful trajectories; preference between trajectories; process grading | Using failed trajectories as SFT targets; eval reuse | Imitation copies mistakes [Inf] |
| Multimodal annotation | media ref + labels/regions/captions | VLM SFT (TRL vision format with `images`) [D, S1]; eval | Mixing without consent/licensing records | Rights and privacy [Inf] |
| Robotics episode | frames, state, action, task text | Imitation learning (LeRobot, RLDS consumers) | Language-only training; reuse without embodiment metadata | Action spaces differ by robot [D, S46, S47] |

---

## 5. Recommended JSON schemas (one record per line, JSONL)

Common envelope used by every deliverable [Inf]:

```json
{
  "id": "inf-<project>-<type>-<uuid>",
  "schema_version": "1.0",
  "type": "sft | preference_pair | ranking | binary_label | rubric_item | gold_qa | eval_item | redteam_item | agent_trajectory | multimodal_annotation | robot_episode_meta",
  "domain": "medicine.cardiology",
  "language": "en",
  "locale": "en-IN",
  "created_at": "2026-10-20T10:00:00Z",
  "provenance": {
    "author_ids": ["exp_123"],
    "author_credentials": ["MD", "10y clinical"],
    "reviewer_ids": ["exp_456"],
    "model_generated_parts": ["response_b"],
    "source_models": ["<lab model id or anonymized>"],
    "tools_used": []
  },
  "quality": {
    "num_annotators": 3,
    "agreement": {"metric": "krippendorff_alpha_nominal", "value": 0.82, "scope": "batch-17"},
    "adjudicated": true,
    "gold": false,
    "qa_status": "accepted"
  },
  "usage_rights": {"train_allowed": false, "eval_only": true, "license": "client-exclusive"},
  "pii_scrubbed": true,
  "split": "test"
}
```

### 5.1 Eval benchmark item

```json
{
  "id": "...", "type": "eval_item",
  "prompt": [{"role": "user", "content": "..."}],
  "answer_format": "short_answer | mcq | free_text | code",
  "choices": ["A ...", "B ..."],
  "reference_answer": "...",
  "grading": {"method": "exact_match | numeric_tolerance | rubric | unit_tests | llm_judge", "tolerance": 0.01, "rubric_id": null},
  "difficulty": {"expert_solve_rate": 0.67, "nonexpert_solve_rate": 0.2, "model_solve_rate": {"model_x": 0.0}},
  "validation": {"validator_ids": ["exp_2", "exp_3"], "validator_agree": [true, true], "objections": []},
  "contamination": {"public": false, "search_check_passed": true},
  "tags": ["subfield:..."]
}
```

### 5.2 Gold QA (for calibration and spot checks)

```json
{
  "id": "...", "type": "gold_qa",
  "task_ref": "preference_pair | rubric_item | ...",
  "item": {"...": "full copy of the item as shown to annotators"},
  "gold_label": {"...": "expected label"},
  "acceptable_labels": [],
  "explanation": "why this is the answer",
  "difficulty": "easy | medium | hard",
  "created_by": ["exp_lead_1"], "agreed_by": ["exp_lead_2"],
  "retire_after_uses": 50
}
```

### 5.3 SFT conversation (TRL and OpenAI compatible)

```json
{
  "id": "...", "type": "sft",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "tools": [],
  "rationale_included": false,
  "style_guide_version": "sg-1.3"
}
```
Export: drop the envelope and emit `{"messages": [...], "tools": [...]}` per line (OpenAI SFT [D, S5]; TRL language modeling type [D, S1]).

### 5.4 Preference pair

```json
{
  "id": "...", "type": "preference_pair",
  "prompt": [{"role": "user", "content": "..."}],
  "chosen": [{"role": "assistant", "content": "..."}],
  "rejected": [{"role": "assistant", "content": "..."}],
  "strength": "significantly_better | better | slightly_better | negligible",
  "tie": false,
  "both_unacceptable": false,
  "criteria": ["helpfulness"],
  "per_response_absolute": {"chosen": {"acceptable": true, "score": 6}, "rejected": {"acceptable": false, "score": 3}},
  "presentation_order": "chosen_first | rejected_first",
  "rationale": "..."
}
```
Exports: TRL `{"prompt","chosen","rejected"}` [D, S1]; OpenAI DPO `{"input":{"messages":...}, "preferred_output":[...], "non_preferred_output":[...]}` (single-turn) [D, S7]. `per_response_absolute` is what makes a safe KTO conversion possible.

### 5.5 Ranking

```json
{
  "id": "...", "type": "ranking",
  "prompt": [{"role": "user", "content": "..."}],
  "responses": [{"rid": "r1", "content": "..."}, {"rid": "r2", "content": "..."}, {"rid": "r3", "content": "..."}],
  "ranking": ["r2", "r1", "r3"],
  "ties": [["r1", "r3"]],
  "per_response_absolute": {"r1": 5, "r2": 7, "r3": 5},
  "criteria": ["accuracy", "safety"]
}
```

### 5.6 Binary label (KTO)

```json
{"id": "...", "type": "binary_label",
 "prompt": [{"role": "user", "content": "..."}],
 "completion": [{"role": "assistant", "content": "..."}],
 "label": true, "reason_codes": ["factual_error"]}
```

### 5.7 Rubric-scored item

```json
{
  "id": "...", "type": "rubric_item",
  "prompt": [{"role": "user", "content": "..."}],
  "rubric": [
    {"cid": "c1", "criterion": "Advises emergency care for chest pain with dyspnea", "points": 10, "axis": "accuracy", "kind": "required"},
    {"cid": "c2", "criterion": "Recommends a specific prescription dose without assessment", "points": -8, "axis": "accuracy", "kind": "penalty"}
  ],
  "responses": [
    {"rid": "r1", "content": "...", "verdicts": {"c1": true, "c2": false}, "grader": "human:exp_9", "score_normalized": 1.0}
  ],
  "rubric_validation": {"criterion_level_agreement": {"metric": "cohen_kappa", "value": 0.78}, "llm_grader_vs_expert_f1": 0.74}
}
```
Point convention mirrors HealthBench (signed weights -10 to 10) [P, S10].

### 5.8 Red-team item

```json
{
  "id": "...", "type": "redteam_item",
  "taxonomy": {"scheme": "ailuminate_v1", "hazard": "nonviolent_crimes", "subcategory": "fraud"},
  "attack": {"technique": "roleplay | multi_turn_escalation | obfuscation | prompt_injection | direct", "turns": 3, "language": "hi-Latn"},
  "conversation": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}],
  "target_model": "anon-model-A",
  "verdict": "refusal | safe_partial | unsafe_compliance | over_refusal",
  "severity": 0,
  "benign_control": false,
  "access_tier": "restricted",
  "rationale": "..."
}
```

### 5.9 Agent trajectory

```json
{
  "id": "...", "type": "agent_trajectory",
  "task": {"instruction": "...", "environment": {"image": "registry/env:sha256-...", "initial_state_ref": "s3://..."}, "success_check": {"type": "unit_tests | state_match | script", "ref": "tests/test_x.py"}},
  "steps": [
    {"t": 0, "thought": "optional", "action": {"type": "tool_call", "name": "bash", "arguments": {"cmd": "ls"}}, "observation": "...", "timestamp": "..."}
  ],
  "outcome": {"success": true, "checker_output": "...", "pass_at_k": {"k": 4, "successes": 3}},
  "process_grades": [{"step": 5, "label": "unsafe_action | wasted | correct", "note": "..."}],
  "task_validation": {"spec_clarity": 0, "test_validity": 0, "scale": "0-3 severity, as in SWE-bench Verified annotation"},
  "author_type": "human_demo | model_rollout"
}
```
Messages export: convert steps to `messages` with `tool_calls` and `tool` turns for SFT [D, S1].

### 5.10 Multimodal annotation

```json
{
  "id": "...", "type": "multimodal_annotation",
  "media": [{"uri": "s3://.../img_001.jpg", "mime": "image/jpeg", "sha256": "...", "width": 1920, "height": 1080, "duration_s": null}],
  "consent": {"subjects_consented": true, "faces_blurred": true, "license": "client-owned"},
  "annotations": [
    {"kind": "bbox", "label": "ecg_lead_II", "coords": [120, 80, 400, 60], "annotator": "exp_1"},
    {"kind": "caption", "text": "...", "annotator": "exp_2"},
    {"kind": "qa", "question": "...", "answer": "..."}
  ],
  "vlm_export": {"messages": [{"role": "user", "content": [{"type": "image"}, {"type": "text", "text": "..."}]}, {"role": "assistant", "content": [{"type": "text", "text": "..."}]}]}
}
```
VLM export follows TRL's vision convention with an `images` column [D, S1].

### 5.11 Robotics episode metadata

```json
{
  "id": "...", "type": "robot_episode_meta",
  "dataset_format": "lerobot_v3 | rlds | hdf5",
  "episode_index": 42,
  "task_text": "Pick up the red cup and place it on the tray",
  "embodiment": {"robot": "so101_follower", "dof": 6, "gripper": "parallel", "control_mode": "joint_position", "fps": 30},
  "sensors": [{"name": "observation.images.front", "type": "rgb", "resolution": [640, 480], "fps": 30}],
  "action_space": {"key": "action", "shape": [6], "units": "rad"},
  "length_frames": 412,
  "success": true,
  "operator": {"id": "op_7", "teleop_device": "leader_arm"},
  "quality_flags": ["no_frame_drops"],
  "segment_annotations": [{"start_s": 0.0, "end_s": 3.2, "label": "reach"}],
  "privacy": {"faces_present": false}
}
```
Maps to LeRobot v3 `meta/episodes` and `meta/tasks.jsonl` [D, S46] or RLDS episode metadata with `is_first`/`is_last` step flags [D, S47].

---

## 6. Export formats summary

| Target | Shape | Source |
|---|---|---|
| TRL SFT | `messages` (+ `tools`) or `prompt`/`completion` | [D, S1] |
| TRL preference (DPO, ORPO, CPO, RewardTrainer) | `prompt`, `chosen`, `rejected` (explicit prompt recommended for DPO; implicit for RewardTrainer) | [D, S1] |
| TRL unpaired (KTO) | `prompt`, `completion`, `label` | [D, S1] |
| TRL prompt-only (GRPO, RLOO, Online DPO) | `prompt` + reference columns such as `ground_truth` | [D, S1, S2] |
| OpenAI SFT | JSONL `messages`, optional `tools`, `parallel_tool_calls` | [D, S5] |
| OpenAI DPO | `input`, `preferred_output`, `non_preferred_output` | [D, S7] |
| OpenAI RFT | `messages` + grader reference fields | [D, S6] |
| HF Datasets | Parquet/JSONL on the Hub, loadable with `load_dataset`; `Json()` feature type for tool args in recent `datasets` | [D, S1] |
| LeRobot v3 | Parquet (state/action), MP4 per camera, `meta/info.json`, `meta/stats.json`, `meta/tasks.jsonl`, `meta/episodes/` | [D, S46] |
| RLDS | TFDS episodes of steps (`is_first`, `is_last`, observation, action, reward, discount, `is_terminal`) | [D, S47] |
| HDF5 | Common container for robot demos and hand-pose data (unverified in this session; ask the client for their loader) | [Inf] |

---

## 7. Quality metric guide (inter-rater reliability)

| Metric | Use when | Raters | Data type | Missing data | Commonly cited thresholds | Caveats |
|---|---|---|---|---|---|---|
| Percent agreement | Quick monitoring, well-trained raters, gold-match rate | Any | Nominal | Pairwise only | Often >= 80% recommended [P, S48] | Inflated by chance and skewed classes |
| Cohen's kappa (weighted for ordinal) | Two raters on the same items | 2 | Nominal (weighted: ordinal) | No | Landis-Koch style bands (0.41-0.60 moderate, 0.61-0.80 substantial, 0.81+ almost perfect); McHugh treats < 0.60 as inadequate for health research [P, S48] | Kappa paradox: low kappa despite high agreement when one label dominates (general literature, not fetched) |
| Fleiss' kappa | Fixed number of raters per item, raters may differ across items | 3+ | Nominal | No (equal raters per item) | Same bands as kappa, used by convention [Inf] | Not for ordinal without modification |
| Krippendorff's alpha | Default for crowd/expert pools with varying raters and gaps | Any | Nominal, ordinal, interval, ratio | Yes | >= 0.800 customary; >= 0.667 lowest for tentative conclusions [I, S49] | Choose distance metric matching the scale |
| ICC | Continuous or many-point scores (rubric totals, Likert treated as interval) | 2+ | Interval/ratio | Limited | < 0.5 poor; 0.5-0.75 moderate; 0.75-0.9 good; > 0.9 excellent; judge by 95% CI; state model, type (single vs mean of k), definition (absolute vs consistency); >= 30 subjects and >= 3 raters [P, S50] | Wrong ICC form gives misleading numbers |
| Kendall's W | Several raters each produce a full ranking of the same set | 3+ | Rankings | No | No universal threshold; report with significance test [Inf] | Ties need correction |
| Kendall's tau / Spearman rho | Compare two rankings (judge vs expert leaderboard; two rater rankings) | 2 | Ordinal | No | No universal threshold [Inf] | Correlation is not agreement on absolute level |
| Pairwise preference agreement | A/B judgments | 2+ | Binary choice (+ tie) | Yes | MT-bench: GPT-4 vs humans > 80%, similar to human-human [P, S27] | Report with ties excluded and included |
| Judge vs expert F1 / accuracy | LLM grader validation on rubric criteria | 1 judge vs expert gold | Binary per criterion | n/a | HealthBench best grader macro F1 0.709 [P, S10] | Per-category breakdown required |

Rules of thumb [Inf]:
- Choose the metric from the **data type** first, then **number of raters** and **missingness**. When in doubt, use Krippendorff's alpha with the right distance metric.
- Report the metric with a confidence interval, the number of items and raters, and prevalence of each label.
- Low agreement is information: subjective tasks (style preference) legitimately sit lower than factual tasks. Do not force consensus where the client wants distributional labels; deliver all raw votes.

---

## 8. Gold-standard, calibration and adjudication policy (recommendations)

All recommendations below are [Inf] unless a source is cited.

1. **Qualification**: each expert passes a domain screen plus a task-specific test of 20 to 50 gold items; pass mark set per project (for example >= 80% gold match and kappa vs lead >= 0.6, consistent with S48).
2. **Calibration round**: before production, all raters label the same 30 to 50 items (Koo & Li recommend >= 30 subjects, >= 3 raters for ICC studies [P, S50]); compute agreement; revise guidelines where disagreement clusters (criteria drift is expected [P, S28]).
3. **Gold insertion**: hidden gold items at 5 to 10% of each rater's queue, refreshed and retired after repeated exposure; track per-rater accuracy over a rolling window; auto-pause raters below threshold.
4. **Overlap**: 10 to 20% of production items multiply labeled for ongoing agreement statistics; 100% overlap with 3 raters for benchmark items and high-stakes evals (SWE-bench Verified used 3 annotators per sample [I, S32]).
5. **Adjudication**: disagreements go to a senior expert who sees all rationales; record original votes, final label, and reason; never overwrite raw votes. For benchmarks, follow GPQA-style independent validation by a second expert, plus a difficulty check against non-experts or models [P, S39].
6. **Expert convergence gate for RL data**: before delivering verifiable or rubric data for RL, demonstrate that independent experts reach the same answer (OpenAI RFT guidance [D, S6]).
7. **Judge calibration**: when an LLM judge pre-screens, measure judge vs expert agreement per category on a stratified sample; run order-swap and length-padding probes for position and verbosity bias [P, S27].
8. **Drift monitoring**: weekly agreement and gold accuracy dashboards; Llama 2 refreshed preference data weekly to stay on-distribution, which suggests labs will want recurring batches [P, S24].
9. **Contamination and leakage**: eval items never enter training deliverables; hash and register each item; keep held-out benchmarks private.

---

## 9. Implications for platform design

1. **Typed task templates** per deliverable in Section 5, with schema validation on submit and one-click export to TRL, OpenAI and HF formats. [Inf]
2. **Collect richer labels than the minimum**: always capture per-response absolute acceptability alongside pairwise choice, degree of preference, tie and both-bad flags. This lets one batch serve DPO, KTO, RM and SFT filtering safely (TRL's unpairing warning [D, S1]). [Inf]
3. **Verifier-first workflows** for RLVR demand: authoring a problem must include a checkable answer or tests, a second expert solve, and a model-difficulty check. [Inf, grounded in S2, S6, S20]
4. **Rubric builder** supporting atomic criteria, signed weights, axes and an LLM-grader dry run with expert-vs-grader agreement shown before release (HealthBench pattern [P, S10]; RaR [P, S9]).
5. **Built-in IRR engine**: Cohen, Fleiss, Krippendorff (all distance types), ICC (all forms), Kendall's W/tau, with CIs; per-rater gold accuracy; per-batch quality certificate shipped with every export. [Inf, S48 to S50]
6. **Sandboxed environments** for agent tasks (container images, deterministic test runners, trajectory recorder), modeled on SWE-bench, OSWorld and Terminal-Bench structure [P, S33, S37, S38].
7. **Safety tier**: restricted red-team workspace, taxonomy mapping to AILuminate/HarmBench, vetted specialists for CBRN, audit logs [P, S29, S30].
8. **Provenance and rights metadata** on every item (`usage_rights`, model-generated parts, expert credentials) to support lab compliance and contamination control. [Inf]
9. **Physical AI module (later)**: ingest and validate LeRobot v3 and RLDS episodes, annotate task text, segments and success; privacy handling for egocentric video (Ego4D used consent and de-identification [P, S53]). [Inf]
10. **India-specific advantage** [Inf]: multilingual and Indic-language experts (e.g. Hindi, code-mixed Hinglish prompts in red-teaming and evals) and domains under-represented in Western panels. Market demand is plausible but not measured in this research (unknown).

---

## 10. Physical AI data (brief)

- **LeRobotDataset v3** [D, S46]: tabular state/action/timestamps in Parquet; camera video in MP4 sharded per camera; metadata in `meta/info.json` (schema, FPS, path templates), `meta/stats.json` (normalization), `meta/tasks.jsonl` (natural-language tasks), `meta/episodes/` (chunked Parquet with offsets); many episodes per file; Hub streaming; must call `finalize()` before pushing.
- **RLDS** [D, S47]: dataset of episodes; each step has mandatory `is_first`, `is_last` and optional `observation`, `action`, `reward`, `discount`, `is_terminal`; loaded through TFDS.
- **Open X-Embodiment** [P, S51; D, S52]: 1M+ real robot trajectories, 22 embodiments, 60 datasets from 34 labs (21 institutions in the paper), 527 skills, 160,266 tasks; standardized formats (RLDS per project repo, unverified this session); RT-X models showed positive transfer.
- **Ego4D** [P, S53]: 3,670 hours, 931 camera wearers, 74 locations, 9 countries, consent and de-identification.
- **EgoDex** [P, S54]: 829 hours of egocentric video with full hand-joint tracking, 194 tabletop tasks, captured on Apple Vision Pro.
- **HDF5** [Inf]: frequently used for robot demonstration and pose data; format details vary by project, so require a client loader spec.
- Expert-network fit [Inf]: task description writing, success and segment annotation, failure taxonomy, quality review of teleoperated episodes; capturing new data needs hardware and operations beyond a pure expert network.

---

## 11. Sources

All accessed 2026-10-20.

| ID | Title | URL | Type |
|---|---|---|---|
| S1 | TRL: Dataset formats and types | https://huggingface.co/docs/trl/dataset_formats | official docs |
| S2 | TRL: GRPO Trainer | https://huggingface.co/docs/trl/grpo_trainer | official docs |
| S5 | OpenAI: Supervised fine-tuning | https://developers.openai.com/api/docs/guides/supervised-fine-tuning | official docs |
| S6 | OpenAI: Reinforcement fine-tuning | https://developers.openai.com/api/docs/guides/reinforcement-fine-tuning | official docs |
| S7 | OpenAI: Direct preference optimization | https://developers.openai.com/api/docs/guides/direct-preference-optimization | official docs |
| S9 | Rubrics as Rewards: Reinforcement Learning Beyond Verifiable Domains (Gunjal et al.) | https://arxiv.org/abs/2507.17746 | paper |
| S10 | HealthBench: Evaluating LLMs Towards Improved Human Health | https://arxiv.org/abs/2505.08775 | paper |
| S11 | Let's Verify Step by Step (PRM800K) | https://arxiv.org/abs/2305.20050 | paper |
| S13 | SWE-bench Verified | https://www.swebench.com/verified.html | official docs |
| S14 | Introducing SWE-bench Verified (OpenAI) | https://openai.com/index/introducing-swe-bench-verified/ | official (content via search snippet; direct fetch 403) |
| S15 | Direct Preference Optimization (Rafailov et al.) | https://arxiv.org/abs/2305.18290 | paper (cited for method identity; not re-fetched) |
| S16 | A General Theoretical Paradigm to Understand Learning from Human Preferences (IPO) | https://arxiv.org/abs/2310.12036 | paper |
| S17 | KTO: Model Alignment as Prospect Theoretic Optimization | https://arxiv.org/abs/2402.01306 | paper |
| S18 | ORPO: Monolithic Preference Optimization without Reference Model | https://arxiv.org/abs/2403.07691 | paper |
| S19 | SimPO: Simple Preference Optimization with a Reference-Free Reward | https://arxiv.org/abs/2405.14734 | paper |
| S20 | DeepSeek-R1 | https://arxiv.org/html/2501.12948v2 | paper |
| S21 | Tulu 3: Pushing Frontiers in Open Language Model Post-Training | https://arxiv.org/abs/2411.15124 | paper |
| S22 | LIMA: Less Is More for Alignment | https://arxiv.org/abs/2305.11206 | paper |
| S23 | Training language models to follow instructions with human feedback (InstructGPT) | https://arxiv.org/abs/2203.02155 | paper |
| S24 | Llama 2: Open Foundation and Fine-Tuned Chat Models | https://ar5iv.labs.arxiv.org/html/2307.09288 | paper |
| S25 | DeepSeekMath (introduces GRPO) | https://arxiv.org/abs/2402.03300 | paper |
| S27 | Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena | https://arxiv.org/abs/2306.05685 | paper |
| S28 | Who Validates the Validators? | https://arxiv.org/abs/2404.12272 | paper |
| S29 | AILuminate: Introducing v1.0 of the AI Risk and Reliability Benchmark from MLCommons | https://arxiv.org/abs/2503.05731 | paper |
| S30 | HarmBench: A Standardized Evaluation Framework for Automated Red Teaming and Robust Refusal | https://arxiv.org/html/2402.04249 | paper |
| S31 | HarmBench GitHub | https://github.com/centerforaisafety/HarmBench | official repo |
| S32 | Epoch AI: SWE-bench Verified | https://epoch.ai/benchmarks/swe-bench-verified | independent (via search snippet) |
| S33 | tau-bench | https://arxiv.org/abs/2406.12045 | paper |
| S34 | GAIA: a benchmark for General AI Assistants | https://arxiv.org/abs/2311.12983 | paper |
| S35 | WebArena | https://arxiv.org/abs/2307.13854 | paper |
| S36 | BenchLM: WebArena-Verified | https://www.benchlm.ai/benchmarks/webArenaVerified | independent (via search snippet) |
| S37 | OSWorld | https://arxiv.org/abs/2404.07972 | paper |
| S38 | Terminal-Bench: Benchmarking Agents on Hard, Realistic Tasks in Command Line Interfaces | https://arxiv.org/abs/2601.11868 | paper (via search snippet) |
| S39 | GPQA: A Graduate-Level Google-Proof Q&A Benchmark | https://arxiv.org/abs/2311.12022 | paper |
| S40 | Humanity's Last Exam | https://arxiv.org/abs/2501.14249 | paper |
| S41 | FrontierMath | https://arxiv.org/abs/2411.04872 | paper |
| S42 | LegalBench | https://arxiv.org/abs/2308.11462 | paper |
| S43 | GDPval | https://arxiv.org/abs/2510.04374 | paper |
| S44 | Humans or LLMs as the Judge? A Study on Judgement Biases | https://arxiv.org/abs/2402.10669 | paper (via search snippet) |
| S45 | How to Correctly Report LLM-as-a-Judge Evaluations | https://arxiv.org/html/2511.21140v3 | paper (via search snippet) |
| S46 | LeRobotDataset v3.0 | https://huggingface.co/docs/lerobot/lerobot-dataset-v3 | official docs |
| S47 | RLDS | https://github.com/google-research/rlds | official repo |
| S48 | McHugh (2012) Interrater reliability: the kappa statistic | https://pmc.ncbi.nlm.nih.gov/articles/PMC3900052/ | paper |
| S49 | Krippendorff's alpha (thresholds 0.667 / 0.800) | https://en.wikipedia.org/wiki/Krippendorff%27s_alpha | independent (original book not opened) |
| S50 | Koo & Li (2016) Guideline of Selecting and Reporting ICC | https://pmc.ncbi.nlm.nih.gov/articles/PMC4913118/ | paper |
| S51 | Open X-Embodiment | https://arxiv.org/abs/2310.08864 | paper |
| S52 | Open X-Embodiment project site | https://robotics-transformer-x.github.io/ | official site |
| S53 | Ego4D | https://arxiv.org/abs/2110.07058 | paper |
| S54 | EgoDex | https://arxiv.org/abs/2505.11709 | paper |

Unverified in this session (do not quote as fact without checking): InstructGPT K and labeler count; Llama 2 RM margin term; PRM800K per-step label values; HLE frontier-model filtering procedure; OXE RLDS packaging; EgoDex HDF5 packaging; kappa prevalence paradox citation. Market pricing for expert labeling: unknown.
