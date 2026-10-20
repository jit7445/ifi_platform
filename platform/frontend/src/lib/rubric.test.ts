import { describe, expect, it } from "vitest";
import { allowedExportFormats } from "./exports";
import { emptyRubricInput, newCriterion, normaliseWeights, toRubricInput, validateRubric, weightSum, withScaleType } from "./rubric";
import { homePath } from "./roles";
import type { Me, Role } from "./api";

describe("rubric helpers", () => {
  it("starts valid", () => {
    const r = emptyRubricInput();
    r.criteria[0].label = "Accuracy";
    expect(validateRubric(r)).toEqual({});
  });

  it("requires weights that sum to 1 within 0.001", () => {
    const r = emptyRubricInput();
    r.criteria = [
      { ...newCriterion(0), label: "a", weight: 0.5 },
      { ...newCriterion(1), label: "b", weight: 0.4 },
    ];
    expect(validateRubric(r).weights).toMatch(/sum to 1/);
    r.criteria = normaliseWeights(r.criteria);
    expect(Math.abs(weightSum(r.criteria) - 1)).toBeLessThanOrEqual(0.001);
    expect(validateRubric(r)).toEqual({});
  });

  it("flags bad keys, duplicates and categorical options", () => {
    const r = emptyRubricInput();
    r.criteria = [
      { ...newCriterion(0), key: "Bad Key", label: "x", weight: 0.5 },
      { ...withScaleType({ ...newCriterion(1), label: "y", weight: 0.5 }, "categorical"), options: ["one"] },
    ];
    const e = validateRubric(r);
    expect(e["criteria.0.key"]).toBeDefined();
    expect(e["criteria.1.options"]).toBeDefined();
  });

  it("strips empty anchors and non-categorical options on save", () => {
    const r = emptyRubricInput();
    r.criteria[0] = { ...r.criteria[0], anchors: { "1": "bad", "2": " " }, options: ["stale"] };
    const out = toRubricInput(r);
    expect(out.criteria[0].anchors).toEqual({ "1": "bad" });
    expect(out.criteria[0].options).toEqual([]);
  });
});

describe("export formats", () => {
  it("matches task type compatibility", () => {
    expect(allowedExportFormats("rubric_scoring", false)).toEqual(["evaluation_results_jsonl"]);
    expect(allowedExportFormats("rubric_scoring", true)).toContain("sft_jsonl");
    expect(allowedExportFormats("pairwise_preference", false)).toContain("preference_pairs_jsonl");
  });
});

describe("homePath", () => {
  const me = (kind: "platform" | "customer", roles: Role[], expert: string | null = null): Me => ({
    user: { id: "u", email: "e", full_name: "n", mfa_enabled: false },
    memberships: [{ org_id: "o1", org_name: "Org", org_kind: kind, roles }],
    expert_profile_id: expert,
    mfa_required_but_missing: false,
  });
  it("sends each role to its landing page", () => {
    expect(homePath(null)).toBe("/login");
    expect(homePath(me("platform", ["project_manager"]))).toBe("/staff/projects");
    expect(homePath(me("platform", ["reviewer"]))).toBe("/staff/reviews");
    expect(homePath(me("customer", ["customer_member"]))).toBe("/app/orgs/o1/projects");
    expect(homePath(me("platform", ["expert"]))).toBe("/expert");
  });
});
