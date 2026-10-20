import math

import pytest

from Frontier_platform.platform.backend.app.modules.metrics.alpha import bootstrap_mean_ci, interpret, krippendorff_alpha, percent_agreement

N = None
# Krippendorff (2011), "Computing Krippendorff's Alpha-Reliability", worked example: 4 coders x 12 units.
CODERS = [
    [1, 2, 3, 3, 2, 1, 4, 1, 2, N, N, N],
    [1, 2, 3, 3, 2, 2, 4, 1, 2, 5, N, 3],
    [N, 3, 3, 3, 2, 3, 4, 2, 2, 5, 1, N],
    [1, 2, 3, 3, 2, 4, 4, 1, 2, 5, 1, N],
]
UNITS = [[v for v in col if v is not None] for col in zip(*CODERS)]


@pytest.mark.parametrize("level,expected", [("nominal", 0.743), ("ordinal", 0.815), ("interval", 0.849), ("ratio", 0.797)])
def test_matches_published_values(level, expected):
    assert krippendorff_alpha(UNITS, level) == pytest.approx(expected, abs=0.0006)


def test_perfect_agreement_is_one():
    assert krippendorff_alpha([[1, 1], [2, 2], [3, 3, 3]], "ordinal") == pytest.approx(1.0)


def test_systematic_disagreement_is_negative():
    assert krippendorff_alpha([[1, 2], [2, 1], [1, 2], [2, 1]], "nominal") < 0


def test_undefined_without_variation_or_pairs():
    assert krippendorff_alpha([[3, 3], [3, 3]], "interval") is None
    assert krippendorff_alpha([[1], [2]], "nominal") is None
    assert krippendorff_alpha([], "nominal") is None


def test_nominal_accepts_strings():
    a = krippendorff_alpha([["model:x", "model:x"], ["tie", "tie"], ["model:y", "model:x"]], "nominal")
    assert a is not None and -1 <= a <= 1


def test_unknown_level():
    with pytest.raises(ValueError):
        krippendorff_alpha(UNITS, "fuzzy")


def test_interpretation_bands():
    assert interpret(0.9, 10) == "reliable"
    assert interpret(0.7, 10) == "tentative"
    assert interpret(0.5, 10) == "unreliable"
    assert interpret(0.95, 3) == "insufficient_data"
    assert interpret(None, 50) == "insufficient_data"


def test_percent_agreement():
    assert percent_agreement([[1, 1, 2], [3, 3]]) == pytest.approx(2 / 4)
    assert percent_agreement([[1]]) is None


def test_bootstrap_ci_is_deterministic_and_brackets_mean():
    vals = [1, 2, 3, 4, 5, 4, 3]
    lo, hi = bootstrap_mean_ci(vals)
    assert bootstrap_mean_ci(vals) == (lo, hi)
    assert lo <= sum(vals) / len(vals) <= hi
    assert bootstrap_mean_ci([]) is None
    assert bootstrap_mean_ci([2.0]) == (2.0, 2.0)
    assert not math.isnan(lo)
