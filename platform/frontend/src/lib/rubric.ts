import type { Criterion, RubricVersionInput, ScaleType } from "./api";

export const SNAKE = /^[a-z][a-z0-9_]*$/;
export const WEIGHT_TOLERANCE = 0.001;

export function newCriterion(index: number, scale: ScaleType = "likert"): Criterion {
  return {
    key: `criterion_${index + 1}`,
    label: "",
    description: "",
    scale_type: scale,
    scale_min: scale === "likert" ? 1 : 0,
    scale_max: scale === "likert" ? 5 : 1,
    anchors: {},
    options: [],
    weight: 0,
    is_required: true,
    explanation_required_below: null,
  };
}

export function emptyRubricInput(): RubricVersionInput {
  return {
    instructions_md: "",
    criteria: [{ ...newCriterion(0), weight: 1 }],
    error_labels: [],
    require_correction: false,
    require_overall_comment: false,
  };
}

export function weightSum(criteria: Criterion[]): number {
  return criteria.reduce((s, c) => s + (Number.isFinite(c.weight) ? c.weight : 0), 0);
}

export function normaliseWeights(criteria: Criterion[]): Criterion[] {
  const sum = weightSum(criteria);
  if (criteria.length === 0) return criteria;
  if (sum <= 0) return criteria.map((c) => ({ ...c, weight: Math.round((1 / criteria.length) * 1000) / 1000 }));
  const scaled = criteria.map((c) => ({ ...c, weight: Math.round((c.weight / sum) * 1000) / 1000 }));
  const drift = Math.round((1 - weightSum(scaled)) * 1000) / 1000;
  if (drift !== 0) scaled[0] = { ...scaled[0], weight: Math.round((scaled[0].weight + drift) * 1000) / 1000 };
  return scaled;
}

/** Applies scale-type defaults so stored ranges stay consistent with the chosen type. */
export function withScaleType(c: Criterion, scale: ScaleType): Criterion {
  if (scale === "binary") return { ...c, scale_type: scale, scale_min: 0, scale_max: 1, options: [] };
  if (scale === "categorical") {
    const options = c.options.length ? c.options : ["option_a", "option_b"];
    return { ...c, scale_type: scale, options, scale_min: 0, scale_max: options.length - 1, explanation_required_below: null };
  }
  return { ...c, scale_type: scale, scale_min: c.scale_type === "likert" ? c.scale_min : 1, scale_max: c.scale_type === "likert" ? c.scale_max : 5, options: [] };
}

export function validateRubric(r: RubricVersionInput): Record<string, string> {
  const e: Record<string, string> = {};
  if (r.criteria.length === 0) e.criteria = "Add at least one criterion";
  const seen = new Set<string>();
  r.criteria.forEach((c, i) => {
    const p = `criteria.${i}`;
    if (!SNAKE.test(c.key)) e[`${p}.key`] = "Use snake_case, starting with a letter";
    else if (seen.has(c.key)) e[`${p}.key`] = "Keys must be unique";
    seen.add(c.key);
    if (!c.label.trim()) e[`${p}.label`] = "Label is required";
    if (!Number.isFinite(c.weight) || c.weight < 0) e[`${p}.weight`] = "Weight must be 0 or more";
    if (c.scale_type === "likert") {
      if (!Number.isInteger(c.scale_min) || !Number.isInteger(c.scale_max) || c.scale_min >= c.scale_max) {
        e[`${p}.scale_max`] = "Max must be a whole number above min";
      } else if (c.scale_max - c.scale_min > 10) {
        e[`${p}.scale_max`] = "Use at most 11 scale points";
      }
    }
    if (c.scale_type === "categorical") {
      const opts = c.options.map((o) => o.trim()).filter(Boolean);
      if (opts.length < 2) e[`${p}.options`] = "Add at least two options";
      else if (new Set(opts).size !== opts.length) e[`${p}.options`] = "Options must be unique";
    }
    if (c.explanation_required_below !== null && !Number.isFinite(c.explanation_required_below)) {
      e[`${p}.explanation_required_below`] = "Enter a number or leave empty";
    }
  });
  if (r.criteria.length > 0 && Math.abs(weightSum(r.criteria) - 1) > WEIGHT_TOLERANCE) {
    e.weights = `Weights must sum to 1 (currently ${weightSum(r.criteria).toFixed(3)})`;
  }
  const labelKeys = new Set<string>();
  r.error_labels.forEach((l, i) => {
    if (!SNAKE.test(l.key)) e[`error_labels.${i}.key`] = "Use snake_case, starting with a letter";
    else if (labelKeys.has(l.key)) e[`error_labels.${i}.key`] = "Keys must be unique";
    labelKeys.add(l.key);
    if (!l.label.trim()) e[`error_labels.${i}.label`] = "Label is required";
  });
  return e;
}

export function toRubricInput(v: RubricVersionInput): RubricVersionInput {
  return {
    instructions_md: v.instructions_md,
    criteria: v.criteria.map((c) => ({
      ...c,
      options: c.scale_type === "categorical" ? c.options.map((o) => o.trim()).filter(Boolean) : [],
      anchors: Object.fromEntries(Object.entries(c.anchors).filter(([, t]) => t.trim() !== "")),
    })),
    error_labels: v.error_labels,
    require_correction: v.require_correction,
    require_overall_comment: v.require_overall_comment,
  };
}
