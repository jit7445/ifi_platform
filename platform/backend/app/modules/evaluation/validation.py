"""Pure submission validation (contract section 5). Returns field errors and quality flags."""

from typing import Any

MIN_EXPLANATION = 20
MIN_RATIONALE = 20
MIN_CORRECTION = 20
TOO_FAST_SECONDS = 20


def _err(field: str, code: str, message: str) -> dict:
    return {"field": field, "code": code, "message": message}


def _value_ok(c: dict, v: Any) -> bool:
    st = c["scale_type"]
    if st == "categorical":
        return isinstance(v, str) and v in (c.get("options") or [])
    if isinstance(v, bool) or not isinstance(v, (int, float)) or float(v) != int(v):
        return False
    if st == "binary":
        return int(v) in (0, 1)
    return c["scale_min"] <= int(v) <= c["scale_max"]


def validate_submission(task_type: str, rubric: dict, slots: list[str], body: dict) -> tuple[list[dict], list[str]]:
    errs: list[dict] = []
    flags: list[str] = []
    criteria = {c["key"]: c for c in rubric["criteria"]}
    labels = {lab["key"] for lab in rubric["error_labels"]}

    if str(body.get("rubric_version_id")) != str(rubric["id"]):
        errs.append(_err("rubric_version_id", "mismatch", "rubric version does not match the task"))

    seen: set[tuple[str, str]] = set()
    for i, s in enumerate(body.get("scores") or []):
        f = f"scores.{i}"
        key, slot = s.get("criterion_key"), s.get("output_slot")
        c = criteria.get(key)
        if c is None:
            errs.append(_err(f"{f}.criterion_key", "unknown", f"unknown criterion {key}"))
            continue
        if slot not in slots:
            errs.append(_err(f"{f}.output_slot", "unknown", f"output slot must be one of {slots}"))
            continue
        if (key, slot) in seen:
            errs.append(_err(f, "duplicate", f"{key} already scored for slot {slot}"))
            continue
        seen.add((key, slot))
        v = s.get("value")
        if not _value_ok(c, v):
            errs.append(_err(f"{f}.value", "out_of_range", f"value {v!r} is not valid for {key}"))
            continue
        below = c.get("explanation_required_below")
        if below is not None and c["scale_type"] != "categorical" and float(v) < below:
            if len((s.get("explanation") or "").strip()) < MIN_EXPLANATION:
                errs.append(_err(f"{f}.explanation", "required",
                                 f"explain scores below {below:g} for {key} (at least {MIN_EXPLANATION} characters)"))
    for key, c in criteria.items():
        if c.get("is_required", True):
            for slot in slots:
                if (key, slot) not in seen:
                    errs.append(_err("scores", "missing", f"{key} is required for output {slot}"))

    for i, lab in enumerate(body.get("error_labels") or []):
        if lab.get("label_key") not in labels:
            errs.append(_err(f"error_labels.{i}.label_key", "unknown", f"unknown error label {lab.get('label_key')}"))
        if lab.get("output_slot") not in slots:
            errs.append(_err(f"error_labels.{i}.output_slot", "unknown", f"output slot must be one of {slots}"))

    pref = body.get("preference")
    if task_type == "pairwise_preference":
        if not pref:
            errs.append(_err("preference", "required", "pairwise tasks need a preference"))
        else:
            chosen, tie, both_bad = pref.get("chosen_slot"), bool(pref.get("is_tie")), bool(pref.get("both_bad"))
            if chosen is not None and chosen not in slots:
                errs.append(_err("preference.chosen_slot", "unknown", "chosen_slot must be A or B"))
            if tie and chosen is not None:
                errs.append(_err("preference.is_tie", "conflict", "a tie cannot also choose a slot"))
            if not tie and chosen is None and not both_bad:
                errs.append(_err("preference.chosen_slot", "required", "choose a slot, mark a tie, or mark both bad"))
            strength = pref.get("strength")
            if not isinstance(strength, int) or isinstance(strength, bool) or not 1 <= strength <= 3:
                errs.append(_err("preference.strength", "out_of_range", "strength must be 1..3"))
            if len((pref.get("rationale") or "").strip()) < MIN_RATIONALE:
                errs.append(_err("preference.rationale", "too_short", f"rationale needs at least {MIN_RATIONALE} characters"))
    elif pref:
        errs.append(_err("preference", "not_allowed", "preference is only for pairwise tasks"))

    corr = body.get("corrected_output")
    if rubric.get("require_correction") or task_type == "sft_correction":
        if not corr or len((corr.get("text") or "").strip()) < MIN_CORRECTION:
            errs.append(_err("corrected_output.text", "required", f"a corrected output of at least {MIN_CORRECTION} characters is required"))
    if corr:
        if corr.get("source_slot") not in slots:
            errs.append(_err("corrected_output.source_slot", "unknown", f"source_slot must be one of {slots}"))

    if rubric.get("require_overall_comment") and not (body.get("overall_comment") or "").strip():
        errs.append(_err("overall_comment", "required", "an overall comment is required"))

    conf = body.get("confidence")
    if not isinstance(conf, int) or isinstance(conf, bool) or not 1 <= conf <= 5:
        errs.append(_err("confidence", "out_of_range", "confidence must be 1..5"))
    t = body.get("time_spent_seconds")
    if not isinstance(t, int) or isinstance(t, bool) or t < 0:
        errs.append(_err("time_spent_seconds", "invalid", "time_spent_seconds must be a non-negative integer"))
    elif t < TOO_FAST_SECONDS:
        flags.append("too_fast")
    return errs, flags


def resolve(body: dict, slot_map: dict[str, str], model_of: dict[str, str]) -> dict:
    """Replaces slot letters with output ids and model names so QA, metrics and exports are slot-free."""

    def out(slot: str | None) -> tuple[str | None, str | None]:
        if slot is None:
            return None, None
        oid = slot_map[slot]
        return oid, model_of[oid]

    scores = []
    for s in body.get("scores") or []:
        oid, model = out(s["output_slot"])
        scores.append({"criterion_key": s["criterion_key"], "output_id": oid, "model": model, "value": s["value"],
                       "explanation": s.get("explanation")})
    labels = []
    for lab in body.get("error_labels") or []:
        oid, model = out(lab["output_slot"])
        labels.append({"label_key": lab["label_key"], "output_id": oid, "model": model, "note": lab.get("note")})
    corr = body.get("corrected_output")
    corrected = None
    if corr:
        oid, model = out(corr.get("source_slot"))
        corrected = {"source_output_id": oid, "source_model": model, "text": corr["text"], "rationale": corr.get("rationale")}
    pref = body.get("preference")
    preference = None
    if pref:
        chosen_id, chosen_model = out(pref.get("chosen_slot"))
        rejected_model = None
        if chosen_id is not None:
            other = [s for s in slot_map if s != pref["chosen_slot"]]
            rejected_model = model_of[slot_map[other[0]]] if other else None
        preference = {"chosen_model": chosen_model, "rejected_model": rejected_model, "is_tie": bool(pref.get("is_tie")),
                      "both_bad": bool(pref.get("both_bad")), "strength": pref.get("strength"), "rationale": pref.get("rationale")}
    return {"scores": scores, "error_labels": labels, "corrected_output": corrected, "preference": preference,
            "overall_comment": body.get("overall_comment"), "confidence": body.get("confidence")}
