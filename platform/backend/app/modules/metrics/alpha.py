"""Krippendorff's alpha (Krippendorff 2011, "Computing Krippendorff's Alpha-Reliability") via the coincidence matrix.

Units are lists of the values the raters gave (missing ratings omitted); units with fewer than two values are not
pairable and do not contribute."""

from collections.abc import Hashable, Sequence
from itertools import combinations

import numpy as np

LEVELS = ("nominal", "ordinal", "interval", "ratio")
MIN_PAIRABLE_UNITS = 5


def _delta(values: list, counts: np.ndarray, level: str) -> np.ndarray:
    k = len(values)
    if level == "nominal":
        return 1.0 - np.eye(k)
    v = np.asarray(values, dtype=float)
    if level == "interval":
        return (v[:, None] - v[None, :]) ** 2
    if level == "ratio":
        s = v[:, None] + v[None, :]
        with np.errstate(divide="ignore", invalid="ignore"):
            d = np.where(s == 0, 0.0, ((v[:, None] - v[None, :]) / s) ** 2)
        return d
    if level == "ordinal":
        cum = np.cumsum(counts)
        d = np.zeros((k, k))
        for i in range(k):
            for j in range(i + 1, k):
                between = cum[j] - (cum[i - 1] if i > 0 else 0)
                d[i, j] = d[j, i] = (between - (counts[i] + counts[j]) / 2) ** 2
        return d
    raise ValueError(f"unknown level {level}")


def coincidence(units: Sequence[Sequence[Hashable]], values: list) -> np.ndarray:
    idx = {v: i for i, v in enumerate(values)}
    o = np.zeros((len(values), len(values)))
    for u in units:
        m = len(u)
        if m < 2:
            continue
        w = 1.0 / (m - 1)
        for a, b in combinations(u, 2):
            o[idx[a], idx[b]] += w
            o[idx[b], idx[a]] += w
    return o


def krippendorff_alpha(units: Sequence[Sequence[Hashable]], level: str = "nominal") -> float | None:
    """Returns alpha, or None when it is undefined (fewer than two pairable values or no variation)."""
    if level not in LEVELS:
        raise ValueError(f"level must be one of {LEVELS}")
    pairable = [list(u) for u in units if len(u) >= 2]
    if not pairable:
        return None
    if level == "nominal":
        values = sorted({v for u in pairable for v in u}, key=repr)
    else:
        values = sorted({v for u in pairable for v in u})
    if len(values) < 2:
        return None
    o = coincidence(pairable, values)
    n_c = o.sum(axis=1)
    n = n_c.sum()
    if n <= 1:
        return None
    d = _delta(values, n_c, level)
    observed = (o * d).sum()
    expected = (np.outer(n_c, n_c) * d).sum() / (n - 1)
    if expected == 0:
        return None
    return float(1.0 - observed / expected)


def percent_agreement(units: Sequence[Sequence[Hashable]]) -> float | None:
    agree = total = 0
    for u in units:
        for a, b in combinations(u, 2):
            total += 1
            agree += a == b
    return agree / total if total else None


def interpret(alpha: float | None, n_pairable: int) -> str:
    if alpha is None or n_pairable < MIN_PAIRABLE_UNITS:
        return "insufficient_data"
    if alpha >= 0.8:
        return "reliable"
    if alpha >= 0.667:
        return "tentative"
    return "unreliable"


def bootstrap_mean_ci(values: Sequence[float], n_boot: int = 1000, seed: int = 7) -> tuple[float, float] | None:
    if not values:
        return None
    arr = np.asarray(values, dtype=float)
    if len(arr) == 1:
        return float(arr[0]), float(arr[0])
    rng = np.random.default_rng(seed)
    means = rng.choice(arr, size=(n_boot, len(arr)), replace=True).mean(axis=1)
    lo, hi = np.percentile(means, [2.5, 97.5])
    return float(lo), float(hi)
