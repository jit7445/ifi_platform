"""QA compares resolved (model-keyed) submissions, never raw expert-facing slot letters."""

from Frontier_platform.platform.backend.app.modules.evaluation.validation import resolve
from Frontier_platform.platform.backend.app.modules.metrics.compute import compute
from Frontier_platform.platform.backend.app.modules.quality import logic

CRITERIA = [
    {"key": "accuracy", "scale_type": "likert", "scale_min": 1, "scale_max": 5, "is_required": True},
    {"key": "safe", "scale_type": "binary", "scale_min": 0, "scale_max": 1, "is_required": True},
]
MODELS = ["model-a", "model-b"]
MODEL_OF = {"out-a": "model-a", "out-b": "model-b"}


def body(chosen_slot, acc_a, acc_b, safe_a=1, safe_b=1, conf=4):
    return {
        "scores": [
            {"criterion_key": "accuracy", "output_slot": "A", "value": acc_a},
            {"criterion_key": "accuracy", "output_slot": "B", "value": acc_b},
            {"criterion_key": "safe", "output_slot": "A", "value": safe_a},
            {"criterion_key": "safe", "output_slot": "B", "value": safe_b},
        ],
        # The weaker output is flagged, whichever slot it sits in.
        "error_labels": [{"label_key": "factual_error", "output_slot": "B" if acc_b < acc_a else "A"}],
        "preference": {"chosen_slot": chosen_slot, "strength": 2, "is_tie": False, "both_bad": False,
                       "rationale": "the chosen answer is correct and complete"},
        "corrected_output": None,
        "confidence": conf,
    }


def swapped_pair():
    # Expert 1 sees model-a in slot A; expert 2 sees model-a in slot B. Both prefer model-a and rate it 5 vs 2.
    e1 = resolve(body("A", 5, 2), {"A": "out-a", "B": "out-b"}, MODEL_OF)
    e2 = resolve(body("B", 2, 5, safe_a=1, safe_b=1), {"A": "out-b", "B": "out-a"}, MODEL_OF)
    return e1, e2


def test_swapped_slots_resolve_to_same_model_preference():
    e1, e2 = swapped_pair()
    assert e1["preference"]["chosen_model"] == e2["preference"]["chosen_model"] == "model-a"
    assert e1["preference"]["rejected_model"] == e2["preference"]["rejected_model"] == "model-b"
    assert logic.score_map(e1) == logic.score_map(e2)


def test_swapped_slots_count_as_agreement():
    e1, e2 = swapped_pair()
    disagree, summary = logic.disagreement([e1, e2], CRITERIA, MODELS, "pairwise_preference")
    assert not disagree, summary
    assert logic.item_agreement([e1, e2], CRITERIA, MODELS) == 1.0
    final = logic.consensus([e1, e2], CRITERIA, MODELS)
    assert final["final_preference"]["chosen_model"] == "model-a"
    assert final["final_scores"] == {"model-a": {"accuracy": 5, "safe": 1}, "model-b": {"accuracy": 2, "safe": 1}}


def test_swapped_slots_agree_in_project_metrics():
    subs = []
    for t in range(6):
        e1, e2 = swapped_pair()
        subs += [{"task_id": f"t{t}", "expert_id": "x1", "resolved": e1}, {"task_id": f"t{t}", "expert_id": "x2", "resolved": e2}]
    # One item where model-b wins, so alpha has variation to measure.
    b1 = resolve(body("B", 2, 5), {"A": "out-a", "B": "out-b"}, MODEL_OF)
    b2 = resolve(body("A", 5, 2), {"A": "out-b", "B": "out-a"}, MODEL_OF)
    subs += [{"task_id": "t9", "expert_id": "x1", "resolved": b1}, {"task_id": "t9", "expert_id": "x2", "resolved": b2}]
    m = compute(criteria=CRITERIA, error_labels=[], task_type="pairwise_preference", tasks_total=7, tasks_completed=7,
                submissions_count=14, completed_last_7d=7, accepted_submissions=subs, results=[], gold=(0, 0),
                review_decisions=[])
    assert m["preference_agreement"]["percent_agreement"] == 1.0
    assert m["preference_agreement"]["value"] == 1.0
    acc = next(a for a in m["agreement"] if a["criterion"] == "accuracy")
    assert acc["percent_agreement"] == 1.0 and acc["value"] == 1.0


def test_raw_slots_would_have_disagreed():
    # Sanity check of the scenario: the expert-facing letters differ even though the judgement is the same.
    assert body("A", 5, 2)["preference"]["chosen_slot"] != body("B", 2, 5)["preference"]["chosen_slot"]


def test_real_preference_disagreement_detected():
    e1 = resolve(body("A", 5, 2), {"A": "out-a", "B": "out-b"}, MODEL_OF)
    e2 = resolve(body("A", 5, 2), {"A": "out-b", "B": "out-a"}, MODEL_OF)
    disagree, summary = logic.disagreement([e1, e2], CRITERIA, MODELS, "pairwise_preference")
    assert disagree
    kinds = {i["criterion"] for i in summary["issues"]}
    assert "preference" in kinds and "accuracy" in kinds


def test_likert_range_of_one_is_not_disagreement():
    e1 = resolve(body("A", 4, 2), {"A": "out-a", "B": "out-b"}, MODEL_OF)
    e2 = resolve(body("A", 5, 3), {"A": "out-a", "B": "out-b"}, MODEL_OF)
    assert not logic.disagreement([e1, e2], CRITERIA, MODELS, "rubric_scoring")[0]
    final = logic.consensus([e1, e2], CRITERIA, MODELS)
    assert final["final_scores"]["model-a"]["accuracy"] == 5  # median 4.5 rounds half up


def test_error_labels_need_majority():
    e1 = resolve(body("A", 5, 2), {"A": "out-a", "B": "out-b"}, MODEL_OF)
    e2 = resolve({**body("A", 5, 2), "error_labels": []}, {"A": "out-a", "B": "out-b"}, MODEL_OF)
    e3 = resolve(body("B", 2, 5), {"A": "out-b", "B": "out-a"}, MODEL_OF)
    final = logic.consensus([e1, e2, e3], CRITERIA, MODELS)
    assert final["final_error_labels"] == [{"label_key": "factual_error", "model": "model-b", "votes": 2}]


def test_gold_check_by_model_and_generic_key():
    e1, e2 = swapped_pair()
    ok, details = logic.gold_check(e2, {"scores": {"accuracy|model-a": 4}, "preferred_model": "model-a"}, 1, CRITERIA, MODELS)
    assert ok, details
    bad, _ = logic.gold_check(e2, {"scores": {"accuracy|model-a": 4}}, 0, CRITERIA, MODELS)
    assert not bad
    generic, d = logic.gold_check(e1, {"scores": {"safe": 1}}, 0, CRITERIA, MODELS)
    assert generic and len(d["checks"]) == 2
    wrong_pref, _ = logic.gold_check(e1, {"preferred_model": "model-b"}, 0, CRITERIA, MODELS)
    assert not wrong_pref


def test_canonical_view_translates_expert_slots_back():
    _, e2 = swapped_pair()
    view = logic.to_canonical(e2, MODELS)
    assert view["preference"]["chosen_slot"] == "A"
    acc = {s["output_slot"]: s["value"] for s in view["scores"] if s["criterion_key"] == "accuracy"}
    assert acc == {"A": 5, "B": 2}
    assert view["error_labels"][0]["output_slot"] == "B"


def test_adjudication_final_from_canonical_slots():
    final = logic.from_canonical_final(
        {"scores": {"accuracy|A": 5, "accuracy|B": 1}, "preference": {"chosen_slot": "B", "is_tie": False, "strength": 3}},
        MODELS)
    assert final["final_scores"] == {"model-a": {"accuracy": 5}, "model-b": {"accuracy": 1}}
    assert final["final_preference"]["chosen_model"] == "model-b"
    assert final["final_preference"]["rejected_model"] == "model-a"


def test_correction_from_most_confident():
    low = resolve({**body("A", 5, 2, conf=2), "corrected_output": {"source_slot": "B", "text": "low confidence fix " * 3}},
                  {"A": "out-a", "B": "out-b"}, MODEL_OF)
    high = resolve({**body("A", 5, 2, conf=5), "corrected_output": {"source_slot": "A", "text": "high confidence fix " * 3}},
                   {"A": "out-b", "B": "out-a"}, MODEL_OF)
    final = logic.consensus([low, high], CRITERIA, MODELS)
    assert final["final_correction"]["source_model"] == "model-b"
    assert final["final_correction"]["text"].startswith("high")
