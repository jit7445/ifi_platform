import json

from Frontier_platform.platform.backend.app.modules.exports import formats


def snap(pref=None, corr=None, item="i1"):
    return {
        "item_id": item, "external_id": "q-1", "prompt": "Question?", "context": None,
        "outputs": [{"model": "model-a", "text": "good"}, {"model": "model-b", "text": "bad"}],
        "result": {"final_scores": {"model-a": {"accuracy": 5}, "model-b": {"accuracy": 2}}, "final_preference": pref,
                   "final_correction": corr, "final_error_labels": [], "final_source": "consensus", "agreement": 1.0},
        "rubric_version": {"id": "rv", "version": 3, "content_sha256": "abc"}, "expert_pseudonyms": ["Expert-1"],
    }


WIN = {"chosen_model": "model-a", "rejected_model": "model-b", "is_tie": False, "both_bad": False, "strength": 2}


def test_preference_pairs_trl_shape():
    rows = formats.build("preference_pairs_jsonl", [snap(WIN)], {"drop_ties": True})
    assert rows == [{"prompt": [{"role": "user", "content": "Question?"}],
                     "chosen": [{"role": "assistant", "content": "good"}],
                     "rejected": [{"role": "assistant", "content": "bad"}],
                     "metadata": {"item_id": "i1", "chosen_model": "model-a", "rejected_model": "model-b",
                                  "strength": 2, "both_bad": False}}]


def test_ties_and_both_bad_excluded_by_default():
    tie = {**WIN, "chosen_model": None, "rejected_model": None, "is_tie": True}
    bad = {**WIN, "both_bad": True}
    assert formats.build("preference_pairs_jsonl", [snap(tie), snap(bad)], {"drop_ties": True}) == []
    assert len(formats.build("preference_pairs_jsonl", [snap(bad)], {"include_both_bad": True})) == 1


def test_sft_only_items_with_corrections():
    corr = {"source_model": "model-b", "text": "a better answer", "rationale": "fixed"}
    rows = formats.build("sft_jsonl", [snap(corr=corr), snap(item="i2")], {})
    assert len(rows) == 1
    assert rows[0]["messages"][1] == {"role": "assistant", "content": "a better answer"}
    assert rows[0]["metadata"] == {"item_id": "i1", "source_model": "model-b", "rubric_version": 3}


def test_evaluation_results_rationales_optional():
    plain = formats.build("evaluation_results_jsonl", [snap(WIN)], {})[0]
    assert "expert_pseudonyms" not in plain and plain["preference"]["chosen_model"] == "model-a"
    full = formats.build("evaluation_results_jsonl", [snap(WIN)], {"include_rationales": True})[0]
    assert full["expert_pseudonyms"] == ["Expert-1"]


def test_jsonl_and_manifest():
    rows = formats.build("evaluation_results_jsonl", [snap(WIN), snap(WIN, item="i2")], {})
    data = formats.to_jsonl(rows)
    assert [json.loads(x)["item_id"] for x in data.decode().splitlines()] == ["i1", "i2"]
    m = formats.manifest(project_code="P", dataset_version=1, dataset_manifest_sha256="d", rubric_content_sha256="r",
                         fmt="evaluation_results_jsonl", filename="f.jsonl", data=data, row_count=2, created_at="t")
    assert m["row_count"] == 2 and m["size_bytes"] == len(data) and len(m["sha256"]) == 64


def test_compatibility():
    assert formats.compatible("preference_pairs_jsonl", "rubric_scoring", False)
    assert formats.compatible("preference_pairs_jsonl", "pairwise_preference", False) is None
    assert formats.compatible("sft_jsonl", "rubric_scoring", False)
    assert formats.compatible("sft_jsonl", "rubric_scoring", True) is None
    assert formats.compatible("sft_jsonl", "sft_correction", False) is None
