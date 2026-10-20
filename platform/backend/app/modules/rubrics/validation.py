"""Pure rubric checks, shared by the API and unit tests."""

import hashlib
import json
import re

KEY_RE = re.compile(r"^[a-z][a-z0-9_]{0,63}$")
SCALE_TYPES = {"likert", "binary", "categorical"}
SEVERITIES = {"minor", "major", "critical"}


def _err(field: str, code: str, message: str) -> dict:
    return {"field": field, "code": code, "message": message}


def validate_criteria(criteria: list[dict], *, for_publish: bool = False) -> list[dict]:
    errs: list[dict] = []
    seen: set[str] = set()
    for i, c in enumerate(criteria):
        f = f"criteria.{i}"
        key = c.get("key", "")
        if not KEY_RE.match(key or ""):
            errs.append(_err(f"{f}.key", "invalid", "key must be snake_case"))
        if key in seen:
            errs.append(_err(f"{f}.key", "duplicate", f"duplicate criterion key {key}"))
        seen.add(key)
        st = c.get("scale_type")
        if st not in SCALE_TYPES:
            errs.append(_err(f"{f}.scale_type", "invalid", "scale_type must be likert, binary or categorical"))
            continue
        lo, hi = c.get("scale_min"), c.get("scale_max")
        if st == "likert":
            if not isinstance(lo, int) or not isinstance(hi, int) or lo >= hi or hi - lo > 10:
                errs.append(_err(f"{f}.scale_max", "invalid", "likert needs integer scale_min < scale_max (span <= 10)"))
            for k in (c.get("anchors") or {}):
                try:
                    v = int(k)
                except ValueError:
                    v = None
                if v is None or (isinstance(lo, int) and isinstance(hi, int) and not lo <= v <= hi):
                    errs.append(_err(f"{f}.anchors", "invalid", f"anchor {k} is outside the scale"))
        elif st == "binary":
            if (lo, hi) not in ((0, 1), (None, None)):
                errs.append(_err(f"{f}.scale_min", "invalid", "binary criteria use scale 0..1"))
        elif st == "categorical":
            opts = c.get("options") or []
            if len(opts) < 2 or len(set(opts)) != len(opts):
                errs.append(_err(f"{f}.options", "invalid", "categorical criteria need at least two distinct options"))
        w = c.get("weight")
        if not isinstance(w, (int, float)) or w < 0 or w > 1:
            errs.append(_err(f"{f}.weight", "invalid", "weight must be within 0..1"))
        erb = c.get("explanation_required_below")
        if erb is not None and (st == "categorical" or not isinstance(erb, (int, float))):
            errs.append(_err(f"{f}.explanation_required_below", "invalid", "must be a number on a numeric scale or null"))
    if criteria:
        total = sum(float(c.get("weight") or 0) for c in criteria)
        if abs(total - 1.0) > 0.001:
            errs.append(_err("criteria", "weights_sum", f"weights must sum to 1 (got {total:.4f})"))
    elif for_publish:
        errs.append(_err("criteria", "required", "a published rubric needs at least one criterion"))
    return errs


def validate_error_labels(labels: list[dict]) -> list[dict]:
    errs = []
    seen = set()
    for i, lab in enumerate(labels):
        if not KEY_RE.match(lab.get("key", "") or ""):
            errs.append(_err(f"error_labels.{i}.key", "invalid", "key must be snake_case"))
        if lab.get("key") in seen:
            errs.append(_err(f"error_labels.{i}.key", "duplicate", "duplicate label key"))
        seen.add(lab.get("key"))
        if lab.get("severity") not in SEVERITIES:
            errs.append(_err(f"error_labels.{i}.severity", "invalid", "severity must be minor, major or critical"))
    return errs


def normalize_criterion(c: dict) -> dict:
    st = c["scale_type"]
    out = dict(c)
    if st == "binary":
        out["scale_min"], out["scale_max"] = 0, 1
    if st != "categorical":
        out["options"] = []
    return out


def content_sha256(version: dict) -> str:
    canonical = {
        "instructions_md": version["instructions_md"],
        "criteria": version["criteria"],
        "error_labels": version["error_labels"],
        "require_correction": version["require_correction"],
        "require_overall_comment": version["require_overall_comment"],
    }
    return hashlib.sha256(json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
