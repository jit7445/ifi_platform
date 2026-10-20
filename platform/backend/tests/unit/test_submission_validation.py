from Frontier_platform.platform.backend.app.modules.evaluation.validation import resolve, validate_submission

RUBRIC = {
    "id": "rv-1",
    "criteria": [
        {"key": "accuracy", "scale_type": "likert", "scale_min": 1, "scale_max": 5, "is_required": True,
         "explanation_required_below": 3},
        {"key": "tone", "scale_type": "categorical", "options": ["formal", "casual"], "is_required": True,
         "explanation_required_below": None},
        {"key": "notes_ok", "scale_type": "binary", "scale_min": 0, "scale_max": 1, "is_required": False,
         "explanation_required_below": None},
    ],
    "error_labels": [{"key": "factual_error", "label": "Factual", "severity": "major"}],
    "require_correction": False,
    "require_overall_comment": False,
}
RATIONALE = "Response A is correct while B is dangerously wrong."


def good(**over):
    b = {
        "rubric_version_id": "rv-1",
        "scores": [
            {"criterion_key": "accuracy", "output_slot": "A", "value": 5},
            {"criterion_key": "accuracy", "output_slot": "B", "value": 4},
            {"criterion_key": "tone", "output_slot": "A", "value": "formal"},
            {"criterion_key": "tone", "output_slot": "B", "value": "casual"},
        ],
        "error_labels": [],
        "corrected_output": None,
        "preference": {"chosen_slot": "A", "strength": 2, "is_tie": False, "both_bad": False, "rationale": RATIONALE},
        "confidence": 4,
        "time_spent_seconds": 120,
    }
    b.update(over)
    return b


def fields(errs):
    return {e["field"] for e in errs}


def test_valid_pairwise():
    errs, flags = validate_submission("pairwise_preference", RUBRIC, ["A", "B"], good())
    assert errs == [] and flags == []


def test_rubric_mismatch():
    errs, _ = validate_submission("pairwise_preference", RUBRIC, ["A", "B"], good(rubric_version_id="other"))
    assert "rubric_version_id" in fields(errs)


def test_missing_required_score():
    b = good()
    b["scores"] = b["scores"][1:]
    errs, _ = validate_submission("pairwise_preference", RUBRIC, ["A", "B"], b)
    assert any(e["code"] == "missing" and "accuracy" in e["message"] for e in errs)


def test_out_of_range_and_bad_option():
    b = good()
    b["scores"][0]["value"] = 6
    b["scores"][2]["value"] = "rude"
    errs, _ = validate_submission("pairwise_preference", RUBRIC, ["A", "B"], b)
    assert {"scores.0.value", "scores.2.value"} <= fields(errs)


def test_low_score_needs_explanation():
    b = good()
    b["scores"][1]["value"] = 2
    errs, _ = validate_submission("pairwise_preference", RUBRIC, ["A", "B"], b)
    assert "scores.1.explanation" in fields(errs)
    b["scores"][1]["explanation"] = "Misses the key contraindication entirely."
    errs, _ = validate_submission("pairwise_preference", RUBRIC, ["A", "B"], b)
    assert errs == []


def test_preference_rules():
    for pref, field in [
        (None, "preference"),
        ({"chosen_slot": None, "strength": 2, "is_tie": False, "both_bad": False, "rationale": RATIONALE}, "preference.chosen_slot"),
        ({"chosen_slot": "A", "strength": 2, "is_tie": True, "both_bad": False, "rationale": RATIONALE}, "preference.is_tie"),
        ({"chosen_slot": "A", "strength": 2, "is_tie": False, "both_bad": False, "rationale": "short"}, "preference.rationale"),
        ({"chosen_slot": "A", "strength": 4, "is_tie": False, "both_bad": False, "rationale": RATIONALE}, "preference.strength"),
    ]:
        errs, _ = validate_submission("pairwise_preference", RUBRIC, ["A", "B"], good(preference=pref))
        assert field in fields(errs), (pref, errs)


def test_both_bad_may_combine_with_choice_or_stand_alone():
    for chosen in ("A", None):
        p = {"chosen_slot": chosen, "strength": 1, "is_tie": False, "both_bad": True, "rationale": RATIONALE}
        errs, _ = validate_submission("pairwise_preference", RUBRIC, ["A", "B"], good(preference=p))
        assert errs == []


def test_sft_requires_correction():
    b = good(preference=None, scores=[s for s in good()["scores"] if s["output_slot"] == "A"])
    errs, _ = validate_submission("sft_correction", RUBRIC, ["A"], b)
    assert "corrected_output.text" in fields(errs)
    b["corrected_output"] = {"source_slot": "A", "text": "A corrected answer that is long enough."}
    errs, _ = validate_submission("sft_correction", RUBRIC, ["A"], b)
    assert errs == []


def test_unknown_label_and_slot():
    b = good(error_labels=[{"label_key": "nope", "output_slot": "C"}])
    errs, _ = validate_submission("pairwise_preference", RUBRIC, ["A", "B"], b)
    assert {"error_labels.0.label_key", "error_labels.0.output_slot"} <= fields(errs)


def test_too_fast_is_flagged_not_rejected():
    errs, flags = validate_submission("pairwise_preference", RUBRIC, ["A", "B"], good(time_spent_seconds=5))
    assert errs == [] and flags == ["too_fast"]


def test_single_output_rejects_slot_b_and_preference():
    b = good()
    errs, _ = validate_submission("rubric_scoring", RUBRIC, ["A"], b)
    assert "preference" in fields(errs)
    assert any(f.endswith("output_slot") for f in fields(errs))


def test_resolve_maps_slots_to_models():
    r = resolve(good(error_labels=[{"label_key": "factual_error", "output_slot": "B"}]),
                {"A": "o2", "B": "o1"}, {"o1": "m1", "o2": "m2"})
    assert {(s["criterion_key"], s["model"]) for s in r["scores"]} >= {("accuracy", "m2"), ("accuracy", "m1")}
    assert r["preference"]["chosen_model"] == "m2" and r["preference"]["rejected_model"] == "m1"
    assert r["error_labels"][0]["model"] == "m1"
