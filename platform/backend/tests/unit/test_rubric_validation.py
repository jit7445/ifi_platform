from Frontier_platform.platform.backend.app.modules.rubrics.validation import content_sha256, normalize_criterion, validate_criteria, validate_error_labels


def crit(**over):
    c = {"key": "accuracy", "label": "Accuracy", "scale_type": "likert", "scale_min": 1, "scale_max": 5,
         "anchors": {"1": "bad", "5": "good"}, "options": [], "weight": 1.0, "is_required": True,
         "explanation_required_below": 3}
    c.update(over)
    return c


def test_valid():
    assert validate_criteria([crit()]) == []


def test_weights_must_sum_to_one():
    errs = validate_criteria([crit(weight=0.5), crit(key="clarity", weight=0.4)])
    assert any(e["code"] == "weights_sum" for e in errs)
    assert validate_criteria([crit(weight=0.5), crit(key="clarity", weight=0.5005)]) == []


def test_key_and_duplicates():
    errs = validate_criteria([crit(key="Bad Key", weight=0.5), crit(key="Bad Key", weight=0.5)])
    assert {e["code"] for e in errs} >= {"invalid", "duplicate"}


def test_scale_rules():
    assert validate_criteria([crit(scale_min=5, scale_max=1)])
    assert validate_criteria([crit(anchors={"9": "x"})])
    assert validate_criteria([crit(scale_type="categorical", options=["one"], explanation_required_below=None)])
    assert validate_criteria([crit(scale_type="categorical", options=["a", "b"], explanation_required_below=1)])
    assert validate_criteria([crit(scale_type="categorical", options=["a", "b"], explanation_required_below=None)]) == []
    assert validate_criteria([crit(scale_type="binary", scale_min=1, scale_max=3)])


def test_publish_needs_criteria():
    assert validate_criteria([], for_publish=True)
    assert validate_criteria([]) == []


def test_error_labels():
    assert validate_error_labels([{"key": "x", "label": "X", "severity": "major"}]) == []
    errs = validate_error_labels([{"key": "x", "label": "X", "severity": "huge"}, {"key": "x", "label": "Y", "severity": "minor"}])
    assert {e["code"] for e in errs} == {"invalid", "duplicate"}


def test_normalize_and_hash_stable():
    b = normalize_criterion(crit(scale_type="binary", scale_min=None, scale_max=None, options=["x"]))
    assert (b["scale_min"], b["scale_max"], b["options"]) == (0, 1, [])
    v = {"instructions_md": "x", "criteria": [crit()], "error_labels": [], "require_correction": False,
         "require_overall_comment": False, "ignored": 1}
    assert content_sha256(v) == content_sha256({**v, "ignored": 2})
    assert content_sha256(v) != content_sha256({**v, "instructions_md": "y"})
