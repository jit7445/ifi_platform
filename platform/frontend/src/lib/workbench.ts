// Pure state and validation for the expert task workbench and the staff
// adjudication form. Rules mirror section 5 of platform/docs/mvp_api_contract.md
// so the expert sees problems before the server answers 422.

import type {
  AdjudicationResolveInput,
  Criterion,
  ScoreValue,
  Slot,
  Submission,
  SubmissionInput,
  TaskPayload,
  TaskType,
} from "./api";

export const MIN_EXPLANATION = 20;
export const MIN_PREFERENCE_RATIONALE = 20;
export const MIN_CORRECTION = 20;
export const MIN_ADJUDICATION_RATIONALE = 30;
export const TOO_FAST_SECONDS = 20;
export const DRAFT_VERSION = 1;

export type PreferenceChoice = Slot | "tie" | null;

export interface ScoreEntry {
  value: ScoreValue | null;
  explanation: string;
}

export interface WorkbenchState {
  /** Keyed by `scoreKey(criterion, slot)`. */
  scores: Record<string, ScoreEntry>;
  /** Keyed by `scoreKey(label, slot)`; presence means the label is applied. */
  labels: Record<string, { note: string }>;
  correction: { source_slot: Slot; text: string; rationale: string };
  preference: { choice: PreferenceChoice; strength: number; both_bad: boolean; rationale: string };
  overall_comment: string;
  confidence: number | null;
}

export interface StoredDraft {
  workbench: number;
  state: WorkbenchState;
  time_spent_seconds: number;
}

type TaskShape = Pick<TaskPayload, "task_type" | "outputs" | "rubric_version">;

export function scoreKey(key: string, slot: Slot): string {
  return `${key}|${slot}`;
}

export function slotsOf(task: Pick<TaskPayload, "outputs">): Slot[] {
  return task.outputs.map((o) => o.slot);
}

export function needsPreference(taskType: TaskType): boolean {
  return taskType === "pairwise_preference";
}

export function needsCorrection(task: TaskShape): boolean {
  return task.task_type === "sft_correction" || !!task.rubric_version.require_correction;
}

export interface ScaleChoice {
  value: ScoreValue;
  label: string;
  anchor?: string;
}

export function scaleChoices(c: Criterion): ScaleChoice[] {
  const anchors = c.anchors ?? {};
  if (c.scale_type === "categorical") {
    return (c.options ?? []).map((o) => ({ value: o, label: o, anchor: anchors[o] }));
  }
  if (c.scale_type === "binary") {
    return [
      { value: 0, label: "No", anchor: anchors["0"] },
      { value: 1, label: "Yes", anchor: anchors["1"] },
    ];
  }
  const out: ScaleChoice[] = [];
  for (let v = c.scale_min; v <= c.scale_max; v++) out.push({ value: v, label: String(v), anchor: anchors[String(v)] });
  return out;
}

export function isValidValue(c: Criterion, value: ScoreValue | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  return scaleChoices(c).some((ch) => ch.value === value);
}

export function needsExplanation(c: Criterion, value: ScoreValue | null | undefined): boolean {
  return c.explanation_required_below !== null && typeof value === "number" && value < c.explanation_required_below;
}

export function emptyState(task: TaskShape): WorkbenchState {
  return {
    scores: {},
    labels: {},
    correction: { source_slot: task.outputs[0]?.slot ?? "A", text: "", rationale: "" },
    preference: { choice: null, strength: 2, both_bad: false, rationale: "" },
    overall_comment: "",
    confidence: null,
  };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

/**
 * Restores a draft saved by this workbench. Anything that no longer matches the
 * task (a criterion removed, a value out of range) is dropped rather than trusted.
 */
export function restoreDraft(task: TaskShape, draft: unknown): { state: WorkbenchState; elapsed: number } {
  const base = emptyState(task);
  if (!isObj(draft) || draft.workbench !== DRAFT_VERSION || !isObj(draft.state)) return { state: base, elapsed: 0 };
  const s = draft.state;
  const slots = new Set(slotsOf(task));
  const criteria = new Map(task.rubric_version.criteria.map((c) => [c.key, c]));
  const labelKeys = new Set(task.rubric_version.error_labels.map((l) => l.key));

  const scores: Record<string, ScoreEntry> = {};
  if (isObj(s.scores)) {
    for (const [k, raw] of Object.entries(s.scores)) {
      const [ck, slot] = k.split("|");
      const c = criteria.get(ck);
      if (!c || !slots.has(slot as Slot) || !isObj(raw)) continue;
      const value = raw.value as ScoreValue | null;
      scores[k] = { value: isValidValue(c, value) ? value : null, explanation: str(raw.explanation) };
    }
  }
  const labels: Record<string, { note: string }> = {};
  if (isObj(s.labels)) {
    for (const [k, raw] of Object.entries(s.labels)) {
      const [lk, slot] = k.split("|");
      if (labelKeys.has(lk) && slots.has(slot as Slot)) labels[k] = { note: isObj(raw) ? str(raw.note) : "" };
    }
  }
  const c = isObj(s.correction) ? s.correction : {};
  const p = isObj(s.preference) ? s.preference : {};
  const choice = p.choice === "tie" || slots.has(p.choice as Slot) ? (p.choice as PreferenceChoice) : null;
  const strength = typeof p.strength === "number" && p.strength >= 1 && p.strength <= 3 ? Math.round(p.strength) : 2;
  const confidence =
    typeof s.confidence === "number" && s.confidence >= 1 && s.confidence <= 5 ? Math.round(s.confidence) : null;
  const elapsed = typeof draft.time_spent_seconds === "number" && draft.time_spent_seconds > 0 ? Math.floor(draft.time_spent_seconds) : 0;

  return {
    state: {
      scores,
      labels,
      correction: {
        source_slot: slots.has(c.source_slot as Slot) ? (c.source_slot as Slot) : base.correction.source_slot,
        text: str(c.text),
        rationale: str(c.rationale),
      },
      preference: { choice, strength, both_bad: p.both_bad === true, rationale: str(p.rationale) },
      overall_comment: str(s.overall_comment),
      confidence,
    },
    elapsed,
  };
}

export function toDraft(state: WorkbenchState, timeSpentSeconds: number): StoredDraft {
  return { workbench: DRAFT_VERSION, state, time_spent_seconds: Math.max(0, Math.floor(timeSpentSeconds)) };
}

/** Field errors keyed by workbench path; an empty object means the form can be submitted. */
export function validateWorkbench(task: TaskShape, state: WorkbenchState): Record<string, string> {
  const e: Record<string, string> = {};
  const rv = task.rubric_version;
  for (const c of rv.criteria) {
    for (const slot of slotsOf(task)) {
      const k = scoreKey(c.key, slot);
      const entry = state.scores[k];
      const has = entry && entry.value !== null && entry.value !== undefined;
      if (!has) {
        if (c.is_required) e[`scores.${k}`] = `Score "${c.label}" for response ${slot}`;
        continue;
      }
      if (!isValidValue(c, entry.value)) e[`scores.${k}`] = "Value is outside the scale";
      else if (needsExplanation(c, entry.value) && entry.explanation.trim().length < MIN_EXPLANATION) {
        e[`scores.${k}.explanation`] = `Explain scores below ${c.explanation_required_below} in at least ${MIN_EXPLANATION} characters`;
      }
    }
  }
  if (needsPreference(task.task_type)) {
    const p = state.preference;
    if (p.choice === null && !p.both_bad) e["preference.choice"] = "Choose the better response, a tie, or mark both as bad";
    if (p.choice === "tie" && p.both_bad) e["preference.choice"] = "A tie cannot also be marked as both bad";
    if (p.choice !== null && p.choice !== "tie" && (p.strength < 1 || p.strength > 3)) e["preference.strength"] = "Pick a strength";
    if (p.rationale.trim().length < MIN_PREFERENCE_RATIONALE) {
      e["preference.rationale"] = `Give a rationale of at least ${MIN_PREFERENCE_RATIONALE} characters`;
    }
  }
  if (needsCorrection(task) && state.correction.text.trim().length < MIN_CORRECTION) {
    e["corrected_output.text"] = `Write a corrected response of at least ${MIN_CORRECTION} characters`;
  }
  if (rv.require_overall_comment && !state.overall_comment.trim()) e.overall_comment = "An overall comment is required";
  if (state.confidence === null) e.confidence = "Rate your confidence";
  return e;
}

export function completion(task: TaskShape, state: WorkbenchState): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const c of task.rubric_version.criteria) {
    if (!c.is_required) continue;
    for (const slot of slotsOf(task)) {
      total++;
      const v = state.scores[scoreKey(c.key, slot)]?.value;
      if (v !== null && v !== undefined) done++;
    }
  }
  return { done, total };
}

export function buildSubmission(task: TaskShape & { rubric_version: { id: string } }, state: WorkbenchState, timeSpentSeconds: number): SubmissionInput {
  const slots = slotsOf(task);
  const scores: SubmissionInput["scores"] = [];
  for (const c of task.rubric_version.criteria) {
    for (const slot of slots) {
      const entry = state.scores[scoreKey(c.key, slot)];
      if (!entry || entry.value === null) continue;
      const explanation = entry.explanation.trim();
      scores.push({
        criterion_key: c.key,
        output_slot: slot,
        value: entry.value,
        ...(explanation ? { explanation } : {}),
      });
    }
  }
  const error_labels: SubmissionInput["error_labels"] = [];
  for (const [k, v] of Object.entries(state.labels)) {
    const [label_key, slot] = k.split("|") as [string, Slot];
    const note = v.note.trim();
    error_labels.push({ label_key, output_slot: slot, ...(note ? { note } : {}) });
  }
  error_labels.sort((a, b) => a.label_key.localeCompare(b.label_key) || a.output_slot.localeCompare(b.output_slot));

  let preference: SubmissionInput["preference"] = null;
  if (needsPreference(task.task_type)) {
    const p = state.preference;
    const isTie = p.choice === "tie";
    preference = {
      chosen_slot: p.choice === "A" || p.choice === "B" ? p.choice : null,
      strength: isTie || p.choice === null ? 1 : p.strength,
      is_tie: isTie,
      both_bad: p.both_bad,
      rationale: p.rationale.trim(),
    };
  }

  const correctionText = state.correction.text.trim();
  const corrected_output =
    needsCorrection(task) || correctionText
      ? {
          source_slot: state.correction.source_slot,
          text: correctionText,
          ...(state.correction.rationale.trim() ? { rationale: state.correction.rationale.trim() } : {}),
        }
      : null;

  const comment = state.overall_comment.trim();
  return {
    rubric_version_id: task.rubric_version.id,
    scores,
    error_labels,
    corrected_output,
    preference,
    ...(comment ? { overall_comment: comment } : {}),
    confidence: state.confidence ?? 0,
    time_spent_seconds: Math.max(0, Math.round(timeSpentSeconds)),
  };
}

/* ------------------------------------------------------------------ */
/* Adjudication                                                        */
/* ------------------------------------------------------------------ */

export type FinalResult = AdjudicationResolveInput["final_result"];

export function finalResultFromSubmission(sub: Submission): FinalResult {
  const scores: Record<string, ScoreValue> = {};
  for (const s of sub.scores) scores[scoreKey(s.criterion_key, s.output_slot)] = s.value;
  const out: FinalResult = { scores };
  if (sub.preference) {
    const { chosen_slot, is_tie, both_bad, strength } = sub.preference;
    out.preference = { chosen_slot, is_tie, both_bad, strength };
  }
  if (sub.corrected_output?.text) out.corrected_text = sub.corrected_output.text;
  return out;
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function majority<T>(values: T[]): T {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0];
  let bestN = 0;
  for (const [v, n] of counts) {
    if (n > bestN) {
      best = v;
      bestN = n;
    }
  }
  return best;
}

/**
 * Starting point for a merge: rounded median for likert, majority otherwise,
 * matching the consensus rule the backend uses when it finalises without adjudication.
 */
export function consensusFinalResult(criteria: Criterion[], subs: Submission[]): FinalResult {
  const byKey = new Map<string, ScoreValue[]>();
  for (const sub of subs) {
    for (const s of sub.scores) {
      const k = scoreKey(s.criterion_key, s.output_slot);
      byKey.set(k, [...(byKey.get(k) ?? []), s.value]);
    }
  }
  const scale = new Map(criteria.map((c) => [c.key, c.scale_type]));
  const scores: Record<string, ScoreValue> = {};
  for (const [k, values] of byKey) {
    const type = scale.get(k.split("|")[0]);
    const numeric = values.filter((v): v is number => typeof v === "number");
    scores[k] = type === "likert" && numeric.length === values.length ? Math.round(median(numeric)) : majority(values);
  }
  const out: FinalResult = { scores };
  const prefs = subs.map((s) => s.preference).filter((p): p is NonNullable<Submission["preference"]> => !!p);
  if (prefs.length) {
    const pick = majority(prefs.map((p) => (p.is_tie ? "tie" : (p.chosen_slot ?? "none"))));
    const matching = prefs.filter((p) => (p.is_tie ? "tie" : (p.chosen_slot ?? "none")) === pick);
    out.preference = {
      chosen_slot: pick === "A" || pick === "B" ? pick : null,
      is_tie: pick === "tie",
      both_bad: majority(matching.map((p) => p.both_bad)),
      strength: Math.round(median(matching.map((p) => p.strength))),
    };
  }
  const withCorrection = subs.filter((s) => s.corrected_output?.text);
  if (withCorrection.length) {
    const best = withCorrection.reduce((a, b) => (b.confidence > a.confidence ? b : a));
    out.corrected_text = best.corrected_output!.text;
  }
  return out;
}

/** Per score key, true when submissions disagree (likert range > 1, any mismatch otherwise). */
export function disagreements(criteria: Criterion[], subs: Submission[]): Set<string> {
  const scale = new Map(criteria.map((c) => [c.key, c.scale_type]));
  const byKey = new Map<string, ScoreValue[]>();
  for (const sub of subs) {
    for (const s of sub.scores) {
      const k = scoreKey(s.criterion_key, s.output_slot);
      byKey.set(k, [...(byKey.get(k) ?? []), s.value]);
    }
  }
  const out = new Set<string>();
  for (const [k, values] of byKey) {
    if (values.length < 2) continue;
    const type = scale.get(k.split("|")[0]);
    if (type === "likert" && values.every((v) => typeof v === "number")) {
      const nums = values as number[];
      if (Math.max(...nums) - Math.min(...nums) > 1) out.add(k);
    } else if (new Set(values).size > 1) {
      out.add(k);
    }
  }
  return out;
}

export function validateResolution(input: AdjudicationResolveInput, criteria: Criterion[], slots: Slot[]): Record<string, string> {
  const e: Record<string, string> = {};
  if (input.resolution === "select_submission" && !input.selected_submission_id) {
    e.selected_submission_id = "Select the submission to adopt";
  }
  for (const c of criteria) {
    if (!c.is_required) continue;
    for (const slot of slots) {
      const k = scoreKey(c.key, slot);
      if (!isValidValue(c, input.final_result.scores[k])) e[`final_result.scores.${k}`] = `Set "${c.label}" for response ${slot}`;
    }
  }
  if (input.rationale.trim().length < MIN_ADJUDICATION_RATIONALE) {
    e.rationale = `Explain the resolution in at least ${MIN_ADJUDICATION_RATIONALE} characters`;
  }
  return e;
}
