import { describe, expect, it } from "vitest";
import type { Criterion, Submission, TaskPayload } from "./api";
import {
  buildSubmission,
  completion,
  consensusFinalResult,
  disagreements,
  emptyState,
  finalResultFromSubmission,
  needsExplanation,
  restoreDraft,
  scaleChoices,
  toDraft,
  validateResolution,
  validateWorkbench,
  type WorkbenchState,
} from "./workbench";

const likert = (key: string, extra: Partial<Criterion> = {}): Criterion => ({
  key,
  label: key,
  description: "",
  scale_type: "likert",
  scale_min: 1,
  scale_max: 5,
  anchors: { "1": "bad", "5": "great" },
  options: [],
  weight: 0.5,
  is_required: true,
  explanation_required_below: null,
  ...extra,
});

function task(over: Partial<TaskPayload> = {}, rv: Partial<TaskPayload["rubric_version"]> = {}): TaskPayload {
  return {
    assignment_id: "as-1",
    task_id: "t-1",
    status: "in_progress",
    task_type: "rubric_scoring",
    project: { id: "p", name: "P", customer_display: "Customer #A1" },
    item: { prompt: "Q", context: null, reference_answer_visible: false },
    outputs: [
      { slot: "A", text: "answer a" },
      { slot: "B", text: "answer b" },
    ],
    rubric_version: {
      id: "rv-1",
      version: 1,
      instructions_md: "",
      criteria: [likert("accuracy", { explanation_required_below: 3 }), likert("clarity", { is_required: false })],
      error_labels: [{ key: "hallucination", label: "Hallucination", severity: "critical" }],
      require_correction: false,
      require_overall_comment: false,
      ...rv,
    },
    draft: null,
    feedback: [],
    lease_expires_at: null,
    ...over,
  };
}

function filled(t: TaskPayload): WorkbenchState {
  const s = emptyState(t);
  s.scores["accuracy|A"] = { value: 4, explanation: "" };
  s.scores["accuracy|B"] = { value: 5, explanation: "" };
  s.confidence = 4;
  return s;
}

const long = "x".repeat(25);

describe("scaleChoices", () => {
  it("expands likert ranges with anchors", () => {
    const ch = scaleChoices(likert("a"));
    expect(ch.map((c) => c.value)).toEqual([1, 2, 3, 4, 5]);
    expect(ch[0].anchor).toBe("bad");
  });
  it("uses 0/1 for binary and option strings for categorical", () => {
    expect(scaleChoices(likert("b", { scale_type: "binary", scale_min: 0, scale_max: 1 })).map((c) => c.value)).toEqual([0, 1]);
    expect(scaleChoices(likert("c", { scale_type: "categorical", options: ["x", "y"] })).map((c) => c.value)).toEqual(["x", "y"]);
  });
});

describe("validateWorkbench", () => {
  it("requires every required criterion for every slot and confidence", () => {
    const t = task();
    const e = validateWorkbench(t, emptyState(t));
    expect(Object.keys(e).sort()).toEqual(["confidence", "scores.accuracy|A", "scores.accuracy|B"]);
  });

  it("accepts a complete rubric submission", () => {
    const t = task();
    expect(validateWorkbench(t, filled(t))).toEqual({});
  });

  it("demands a 20 character explanation below the threshold", () => {
    const t = task();
    const s = filled(t);
    s.scores["accuracy|A"] = { value: 2, explanation: "too short" };
    expect(needsExplanation(t.rubric_version.criteria[0], 2)).toBe(true);
    expect(validateWorkbench(t, s)).toHaveProperty(["scores.accuracy|A.explanation"]);
    s.scores["accuracy|A"].explanation = long;
    expect(validateWorkbench(t, s)).toEqual({});
  });

  it("rejects out-of-scale values", () => {
    const t = task();
    const s = filled(t);
    s.scores["accuracy|A"] = { value: 9, explanation: "" };
    expect(validateWorkbench(t, s)["scores.accuracy|A"]).toMatch(/outside/);
  });

  it("enforces pairwise preference semantics", () => {
    const t = task({ task_type: "pairwise_preference" });
    const s = filled(t);
    expect(validateWorkbench(t, s)).toHaveProperty(["preference.choice"]);
    s.preference = { choice: "tie", strength: 1, both_bad: true, rationale: long };
    expect(validateWorkbench(t, s)["preference.choice"]).toMatch(/tie/i);
    s.preference = { choice: null, strength: 1, both_bad: true, rationale: long };
    expect(validateWorkbench(t, s)).toEqual({});
    s.preference = { choice: "A", strength: 3, both_bad: true, rationale: "short" };
    expect(validateWorkbench(t, s)).toHaveProperty(["preference.rationale"]);
  });

  it("requires a correction for sft_correction or require_correction", () => {
    for (const t of [task({ task_type: "sft_correction" }), task({}, { require_correction: true })]) {
      const s = filled(t);
      expect(validateWorkbench(t, s)).toHaveProperty(["corrected_output.text"]);
      s.correction.text = long;
      expect(validateWorkbench(t, s)).toEqual({});
    }
  });

  it("requires an overall comment when the rubric says so", () => {
    const t = task({}, { require_overall_comment: true });
    const s = filled(t);
    expect(validateWorkbench(t, s)).toHaveProperty(["overall_comment"]);
  });
});

describe("buildSubmission", () => {
  it("maps state to the contract body", () => {
    const t = task({ task_type: "pairwise_preference" });
    const s = filled(t);
    s.scores["clarity|A"] = { value: 3, explanation: "  fine  " };
    s.labels["hallucination|B"] = { note: "" };
    s.preference = { choice: "A", strength: 2, both_bad: false, rationale: ` ${long} ` };
    s.overall_comment = "  ";
    const body = buildSubmission(t, s, 61.6);
    expect(body).toEqual({
      rubric_version_id: "rv-1",
      scores: [
        { criterion_key: "accuracy", output_slot: "A", value: 4 },
        { criterion_key: "accuracy", output_slot: "B", value: 5 },
        { criterion_key: "clarity", output_slot: "A", value: 3, explanation: "fine" },
      ],
      error_labels: [{ label_key: "hallucination", output_slot: "B" }],
      corrected_output: null,
      preference: { chosen_slot: "A", strength: 2, is_tie: false, both_bad: false, rationale: long },
      confidence: 4,
      time_spent_seconds: 62,
    });
  });

  it("sends tie and both_bad without a chosen slot", () => {
    const t = task({ task_type: "pairwise_preference" });
    const s = filled(t);
    s.preference = { choice: "tie", strength: 3, both_bad: false, rationale: long };
    expect(buildSubmission(t, s, 30).preference).toEqual({ chosen_slot: null, strength: 1, is_tie: true, both_bad: false, rationale: long });
  });

  it("includes the correction when required", () => {
    const t = task({ task_type: "sft_correction", outputs: [{ slot: "A", text: "orig" }] });
    const s = emptyState(t);
    s.correction.text = long;
    expect(buildSubmission(t, s, 30).corrected_output).toEqual({ source_slot: "A", text: long });
  });
});

describe("drafts", () => {
  it("round-trips through toDraft and restoreDraft", () => {
    const t = task();
    const s = filled(t);
    s.labels["hallucination|A"] = { note: "made up a citation" };
    const draft = JSON.parse(JSON.stringify(toDraft(s, 95.4)));
    const { state, elapsed } = restoreDraft(t, draft);
    expect(state).toEqual(s);
    expect(elapsed).toBe(95);
  });

  it("drops stale or foreign draft content", () => {
    const t = task();
    const draft = {
      workbench: 1,
      time_spent_seconds: -4,
      state: {
        scores: { "accuracy|A": { value: 99, explanation: "e" }, "removed|A": { value: 3 }, "accuracy|C": { value: 3 } },
        labels: { "hallucination|A": {}, "gone|A": {} },
        preference: { choice: "Z", strength: 9 },
        confidence: 7,
      },
    };
    const { state, elapsed } = restoreDraft(t, draft);
    expect(state.scores).toEqual({ "accuracy|A": { value: null, explanation: "e" } });
    expect(state.labels).toEqual({ "hallucination|A": { note: "" } });
    expect(state.preference).toEqual({ choice: null, strength: 2, both_bad: false, rationale: "" });
    expect(state.confidence).toBeNull();
    expect(elapsed).toBe(0);
  });

  it("ignores drafts that this workbench did not write", () => {
    const t = task();
    expect(restoreDraft(t, { scores: {} }).state).toEqual(emptyState(t));
    expect(restoreDraft(t, null).state).toEqual(emptyState(t));
  });

  it("counts required score completion", () => {
    const t = task();
    expect(completion(t, filled(t))).toEqual({ done: 2, total: 2 });
  });
});

describe("adjudication helpers", () => {
  const criteria = [likert("accuracy"), likert("tone", { scale_type: "categorical", options: ["formal", "casual"] })];
  const sub = (id: string, acc: number, tone: string, confidence: number, chosen: "A" | "B" | null = "A"): Submission => ({
    id,
    scores: [
      { criterion_key: "accuracy", output_slot: "A", value: acc },
      { criterion_key: "tone", output_slot: "A", value: tone },
    ],
    error_labels: [],
    corrected_output: { source_slot: "A", text: `fix by ${id}` },
    preference: { chosen_slot: chosen, strength: 2, is_tie: false, both_bad: false, rationale: long },
    confidence,
    time_spent_seconds: 100,
  });

  it("flags likert ranges over 1 and categorical mismatches", () => {
    const d = disagreements(criteria, [sub("1", 2, "formal", 3), sub("2", 3, "casual", 3)]);
    expect([...d]).toEqual(["tone|A"]);
    expect([...disagreements(criteria, [sub("1", 1, "formal", 3), sub("2", 4, "formal", 3)])]).toEqual(["accuracy|A"]);
  });

  it("builds a consensus starting point", () => {
    const r = consensusFinalResult(criteria, [sub("1", 2, "formal", 2), sub("2", 4, "formal", 5, "B"), sub("3", 5, "casual", 3)]);
    expect(r.scores).toEqual({ "accuracy|A": 4, "tone|A": "formal" });
    expect(r.preference).toEqual({ chosen_slot: "A", is_tie: false, both_bad: false, strength: 2 });
    expect(r.corrected_text).toBe("fix by 2");
  });

  it("copies a single submission into a final result", () => {
    expect(finalResultFromSubmission(sub("9", 3, "casual", 4))).toEqual({
      scores: { "accuracy|A": 3, "tone|A": "casual" },
      preference: { chosen_slot: "A", is_tie: false, both_bad: false, strength: 2 },
      corrected_text: "fix by 9",
    });
  });

  it("validates a resolution", () => {
    const e = validateResolution({ resolution: "select_submission", final_result: { scores: {} }, rationale: "short" }, criteria, ["A"]);
    expect(Object.keys(e).sort()).toEqual(["final_result.scores.accuracy|A", "final_result.scores.tone|A", "rationale", "selected_submission_id"]);
    expect(
      validateResolution({ resolution: "merge", final_result: { scores: { "accuracy|A": 4, "tone|A": "formal" } }, rationale: "y".repeat(30) }, criteria, ["A"]),
    ).toEqual({});
  });
});
