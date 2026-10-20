"""Pure project metrics over resolved (model-keyed) submissions and task results."""

from collections import Counter, defaultdict

from Frontier_platform.platform.backend.app.modules.metrics.alpha import bootstrap_mean_ci, interpret, krippendorff_alpha, percent_agreement
from Frontier_platform.platform.backend.app.modules.quality.logic import preference_outcome

LEVEL_FOR = {"likert": "ordinal", "binary": "nominal", "categorical": "nominal"}


def agreement_units(submissions: list[dict], criterion: str) -> list[list]:
    """One unit per (task, model); values from each expert's latest accepted submission."""
    units: dict[tuple, list] = defaultdict(list)
    for s in submissions:
        for sc in s["resolved"].get("scores", []):
            if sc["criterion_key"] == criterion:
                units[(s["task_id"], sc["model"])].append(sc["value"])
    return list(units.values())


def preference_units(submissions: list[dict]) -> list[list]:
    units: dict = defaultdict(list)
    for s in submissions:
        o = preference_outcome(s["resolved"])
        if o is not None:
            units[s["task_id"]].append(o)
    return list(units.values())


def compute(*, criteria: list[dict], error_labels: list[dict], task_type: str, tasks_total: int, tasks_completed: int,
            submissions_count: int, completed_last_7d: int, accepted_submissions: list[dict], results: list[dict],
            gold: tuple[int, int], review_decisions: list[str]) -> dict:
    agreement = []
    for c in criteria:
        units = agreement_units(accepted_submissions, c["key"])
        pairable = [u for u in units if len(u) >= 2]
        level = LEVEL_FOR[c["scale_type"]]
        a = krippendorff_alpha(pairable, level) if pairable else None
        pa = percent_agreement(pairable)
        agreement.append({"criterion": c["key"], "metric": "krippendorff_alpha", "level": level,
                          "value": None if a is None else round(a, 4), "n_items": len(pairable),
                          "percent_agreement": None if pa is None else round(pa, 4),
                          "interpretation": interpret(a, len(pairable))})
    pref = None
    if task_type == "pairwise_preference":
        units = [u for u in preference_units(accepted_submissions) if len(u) >= 2]
        a = krippendorff_alpha(units, "nominal") if units else None
        pa = percent_agreement(units)
        pref = {"metric": "krippendorff_alpha", "value": None if a is None else round(a, 4),
                "percent_agreement": None if pa is None else round(pa, 4), "n_items": len(units),
                "interpretation": interpret(a, len(units))}

    numeric = {c["key"] for c in criteria if c["scale_type"] in ("likert", "binary")}
    per: dict[tuple[str, str], list[float]] = defaultdict(list)
    for r in results:
        for model, crits in (r["final_scores"] or {}).items():
            for k, v in crits.items():
                if k in numeric and isinstance(v, (int, float)):
                    per[(model, k)].append(float(v))
    model_scores = []
    for (model, k), vals in sorted(per.items()):
        ci = bootstrap_mean_ci(vals)
        model_scores.append({"model": model, "criterion": k, "mean": round(sum(vals) / len(vals), 4),
                             "ci": [round(ci[0], 4), round(ci[1], 4)] if ci else None, "n": len(vals)})

    win_rates = None
    if task_type == "pairwise_preference":
        pairs: dict[tuple[str, str], Counter] = defaultdict(Counter)
        for r in results:
            p = r.get("final_preference")
            models = sorted((r["final_scores"] or {}).keys())
            if not p or len(models) != 2:
                continue
            a_m, b_m = models
            if p.get("is_tie") or not p.get("chosen_model"):
                pairs[(a_m, b_m)]["ties"] += 1
            elif p["chosen_model"] == a_m:
                pairs[(a_m, b_m)]["a_wins"] += 1
            else:
                pairs[(a_m, b_m)]["b_wins"] += 1
        win_rates = [{"model_a": a, "model_b": b, "a_wins": c["a_wins"], "b_wins": c["b_wins"], "ties": c["ties"],
                      "n": sum(c.values())} for (a, b), c in sorted(pairs.items())]

    meta = {lab["key"]: lab for lab in error_labels}
    counts = Counter(lab["label_key"] for s in accepted_submissions for lab in s["resolved"].get("error_labels", []))
    labels_out = [{"key": k, "label": meta.get(k, {}).get("label", k), "count": n,
                   "critical_count": n if meta.get(k, {}).get("severity") == "critical" else 0}
                  for k, n in counts.most_common()]

    decided = Counter(review_decisions)
    nrev = sum(decided[d] for d in ("accept", "request_rework", "reject"))
    passed, gold_n = gold
    return {
        "progress": {"tasks_total": tasks_total, "tasks_completed": tasks_completed, "submissions": submissions_count,
                     "throughput_per_day": round(completed_last_7d / 7, 2)},
        "agreement": agreement,
        "preference_agreement": pref,
        "gold_accuracy": {"value": round(passed / gold_n, 4) if gold_n else None, "n": gold_n},
        "review": {"acceptance_rate": round(decided["accept"] / nrev, 4) if nrev else None,
                   "rework_rate": round(decided["request_rework"] / nrev, 4) if nrev else None,
                   "rejection_rate": round(decided["reject"] / nrev, 4) if nrev else None, "n": nrev},
        "model_scores": model_scores,
        "win_rates": win_rates,
        "error_labels": labels_out,
    }


def agreement_with_consensus(expert_subs: list[dict], results_by_task: dict) -> float | None:
    agree = total = 0
    for s in expert_subs:
        r = results_by_task.get(s["task_id"])
        if not r:
            continue
        for sc in s["resolved"].get("scores", []):
            final = (r["final_scores"] or {}).get(sc["model"], {}).get(sc["criterion_key"])
            if final is None:
                continue
            total += 1
            agree += final == sc["value"]
    return round(agree / total, 4) if total else None

