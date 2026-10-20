"""Pure QA logic over *resolved* submissions (keyed by model name, never by expert-facing slot letters),
so experts who saw A/B in different orders are compared on the same outputs."""

import statistics
from collections import Counter
from itertools import combinations
from typing import Any


def score_map(resolved: dict) -> dict[tuple[str, str], Any]:
    return {(s["criterion_key"], s["model"]): s["value"] for s in resolved.get("scores", [])}


def preference_outcome(resolved: dict) -> str | None:
    p = resolved.get("preference")
    if not p:
        return None
    if p.get("is_tie"):
        return "tie"
    if p.get("chosen_model"):
        return f"model:{p['chosen_model']}"
    return "both_bad" if p.get("both_bad") else None


def gold_check(resolved: dict, expected: dict, tolerance: int, criteria: list[dict], models: list[str]) -> tuple[bool, dict]:
    """expected.scores keys are `criterion` (applies to every output) or `criterion|model`."""
    by_key = {c["key"]: c for c in criteria}
    got = score_map(resolved)
    checks = []
    for key, want in (expected.get("scores") or {}).items():
        crit, _, model = key.partition("|")
        c = by_key.get(crit)
        if c is None:
            continue
        for m in [model] if model else models:
            have = got.get((crit, m))
            if have is None:
                ok = False
            elif c["scale_type"] == "likert":
                ok = abs(float(have) - float(want)) <= tolerance
            else:
                ok = have == want
            checks.append({"criterion": crit, "model": m, "expected": want, "actual": have, "passed": ok})
    pref_ok = None
    if expected.get("preferred_model"):
        want = expected["preferred_model"]
        outcome = preference_outcome(resolved)
        pref_ok = outcome == ("tie" if want == "tie" else f"model:{want}")
        checks.append({"criterion": "preference", "expected": want, "actual": outcome, "passed": pref_ok})
    passed = all(c["passed"] for c in checks) if checks else True
    return passed, {"checks": checks, "tolerance": tolerance}


def disagreement(resolveds: list[dict], criteria: list[dict], models: list[str], task_type: str) -> tuple[bool, dict]:
    maps = [score_map(r) for r in resolveds]
    issues = []
    for c in criteria:
        if not c.get("is_required", True):
            continue
        for m in models:
            vals = [mp[(c["key"], m)] for mp in maps if (c["key"], m) in mp]
            if len(vals) < 2:
                continue
            if c["scale_type"] == "likert":
                spread = max(vals) - min(vals)
                if spread > 1:
                    issues.append({"criterion": c["key"], "model": m, "values": vals, "kind": "range", "spread": spread})
            elif len(set(map(str, vals))) > 1:
                issues.append({"criterion": c["key"], "model": m, "values": vals, "kind": "mismatch"})
    if task_type == "pairwise_preference":
        outcomes = [preference_outcome(r) for r in resolveds]
        if len(set(outcomes)) > 1:
            issues.append({"criterion": "preference", "values": outcomes, "kind": "mismatch"})
    return bool(issues), {"issues": issues, "n_submissions": len(resolveds)}


def _majority(values: list[Any]) -> Any:
    counts = Counter(map(repr, values))
    best = max(counts.values())
    for v in values:
        if counts[repr(v)] == best:
            return v
    return None


def consensus(resolveds: list[dict], criteria: list[dict], models: list[str]) -> dict:
    maps = [score_map(r) for r in resolveds]
    scores: dict[str, dict[str, Any]] = {m: {} for m in models}
    for c in criteria:
        for m in models:
            vals = [mp[(c["key"], m)] for mp in maps if (c["key"], m) in mp]
            if not vals:
                continue
            if c["scale_type"] == "likert":
                med = statistics.median(vals)
                scores[m][c["key"]] = int(med + 0.5)
            else:
                scores[m][c["key"]] = _majority(vals)
    prefs = [r["preference"] for r in resolveds if r.get("preference")]
    preference = None
    if prefs:
        outcome = _majority([preference_outcome(r) for r in resolveds if r.get("preference")])
        same = [p for r, p in zip([r for r in resolveds if r.get("preference")], prefs) if preference_outcome(r) == outcome]
        preference = {
            "chosen_model": same[0]["chosen_model"], "rejected_model": same[0]["rejected_model"],
            "is_tie": same[0]["is_tie"], "both_bad": any(p["both_bad"] for p in same),
            "strength": int(statistics.median([p["strength"] for p in same]) + 0.5),
        }
    corrections = sorted((r for r in resolveds if r.get("corrected_output")),
                         key=lambda r: -(r.get("confidence") or 0))
    correction = corrections[0]["corrected_output"] if corrections else None
    label_votes = Counter((lab["label_key"], lab["model"]) for r in resolveds
                          for lab in {(x["label_key"], x["model"]): x for x in r.get("error_labels", [])}.values())
    need = len(resolveds) / 2
    labels = [{"label_key": k, "model": m, "votes": n} for (k, m), n in sorted(label_votes.items()) if n > need]
    return {"final_scores": scores, "final_preference": preference, "final_correction": correction,
            "final_error_labels": labels}


def from_single(resolved: dict, models: list[str]) -> dict:
    scores: dict[str, dict[str, Any]] = {m: {} for m in models}
    for s in resolved.get("scores", []):
        scores.setdefault(s["model"], {})[s["criterion_key"]] = s["value"]
    p = resolved.get("preference")
    pref = None if not p else {k: p.get(k) for k in ("chosen_model", "rejected_model", "is_tie", "both_bad", "strength")}
    labels = [{"label_key": x["label_key"], "model": x["model"], "votes": 1} for x in resolved.get("error_labels", [])]
    return {"final_scores": scores, "final_preference": pref, "final_correction": resolved.get("corrected_output"),
            "final_error_labels": labels}


def item_agreement(resolveds: list[dict], criteria: list[dict], models: list[str]) -> float | None:
    """Share of rater pairs giving identical values, pooled over criteria x outputs (and preference)."""
    if len(resolveds) < 2:
        return None
    maps = [score_map(r) for r in resolveds]
    agree = total = 0
    for c in criteria:
        for m in models:
            vals = [mp[(c["key"], m)] for mp in maps if (c["key"], m) in mp]
            for a, b in combinations(vals, 2):
                total += 1
                agree += a == b
    outcomes = [preference_outcome(r) for r in resolveds if r.get("preference")]
    for a, b in combinations(outcomes, 2):
        total += 1
        agree += a == b
    return round(agree / total, 4) if total else None


def canonical_slots(models_in_order: list[str]) -> dict[str, str]:
    """Staff views label outputs by item position: first output is A, second is B."""
    return {m: "AB"[i] for i, m in enumerate(models_in_order)}


def to_canonical(resolved: dict, models_in_order: list[str]) -> dict:
    """Renders a resolved submission with canonical slot letters for staff screens."""
    slot = canonical_slots(models_in_order)
    pref = resolved.get("preference")
    corr = resolved.get("corrected_output")
    return {
        "scores": [{"criterion_key": s["criterion_key"], "output_slot": slot.get(s["model"]), "model": s["model"],
                    "value": s["value"], "explanation": s.get("explanation")} for s in resolved.get("scores", [])],
        "error_labels": [{"label_key": x["label_key"], "output_slot": slot.get(x["model"]), "model": x["model"],
                          "note": x.get("note")} for x in resolved.get("error_labels", [])],
        "corrected_output": None if not corr else {
            "source_slot": slot.get(corr.get("source_model")), "source_model": corr.get("source_model"),
            "text": corr["text"], "rationale": corr.get("rationale")},
        "preference": None if not pref else {
            "chosen_slot": slot.get(pref.get("chosen_model")) if pref.get("chosen_model") else None,
            "chosen_model": pref.get("chosen_model"), "is_tie": pref.get("is_tie"), "both_bad": pref.get("both_bad"),
            "strength": pref.get("strength"), "rationale": pref.get("rationale")},
        "overall_comment": resolved.get("overall_comment"),
        "confidence": resolved.get("confidence"),
    }


def from_canonical_final(final: dict, models_in_order: list[str]) -> dict:
    """Adjudication `final_result` uses `criterion|slot` keys in canonical order; convert to model keys."""
    letters = {"AB"[i]: m for i, m in enumerate(models_in_order)}
    scores: dict[str, dict[str, Any]] = {m: {} for m in models_in_order}
    for key, v in (final.get("scores") or {}).items():
        crit, _, slot = key.partition("|")
        model = letters.get(slot or "A")
        if model is None:
            raise ValueError(f"unknown slot in {key}")
        scores[model][crit] = v
    pref = final.get("preference")
    preference = None
    if pref:
        chosen = letters.get(pref.get("chosen_slot")) if pref.get("chosen_slot") else None
        rejected = next((m for m in models_in_order if m != chosen), None) if chosen else None
        preference = {"chosen_model": chosen, "rejected_model": rejected, "is_tie": bool(pref.get("is_tie")),
                      "both_bad": bool(pref.get("both_bad")), "strength": pref.get("strength") or 1}
    correction = None
    if final.get("corrected_text"):
        src = letters.get(final.get("corrected_source_slot") or "A")
        correction = {"source_model": src, "text": final["corrected_text"], "rationale": None}
    return {"final_scores": scores, "final_preference": preference, "final_correction": correction,
            "final_error_labels": final.get("error_labels") or []}
