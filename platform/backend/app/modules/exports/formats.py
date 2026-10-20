"""Pure export row builders over frozen dataset-version snapshots (contract section 8)."""

import hashlib
import json
from collections.abc import Iterable, Iterator

GENERATOR = "ifl-export/1.0"

COMPATIBLE = {
    "evaluation_results_jsonl": {"rubric_scoring", "pairwise_preference", "sft_correction"},
    "sft_jsonl": {"rubric_scoring", "pairwise_preference", "sft_correction"},
    "preference_pairs_jsonl": {"pairwise_preference"},
}


def compatible(fmt: str, task_type: str, has_corrections: bool) -> str | None:
    if task_type not in COMPATIBLE[fmt]:
        return f"{fmt} requires a pairwise_preference project"
    if fmt == "sft_jsonl" and not (task_type == "sft_correction" or has_corrections):
        return "sft_jsonl requires corrections (sft_correction projects or rubrics that require a correction)"
    return None


def evaluation_rows(snaps: Iterable[dict], include_rationales: bool) -> Iterator[dict]:
    for s in snaps:
        r = s["result"]
        pref = r.get("final_preference")
        row = {
            "item_id": s["item_id"], "external_id": s["external_id"], "prompt": s["prompt"],
            "outputs": [{"model": o["model"], "text": o["text"]} for o in s["outputs"]],
            "final_scores": r["final_scores"], "error_labels": r.get("final_error_labels") or [],
            "preference": None if not pref else {k: pref.get(k) for k in ("chosen_model", "rejected_model", "is_tie", "both_bad", "strength")},
            "final_source": r["final_source"], "agreement": r.get("agreement"),
            "rubric_version": s["rubric_version"]["version"],
        }
        if include_rationales:
            corr = r.get("final_correction")
            row["correction_rationale"] = corr.get("rationale") if corr else None
            row["expert_pseudonyms"] = s.get("expert_pseudonyms", [])
        yield row


def sft_rows(snaps: Iterable[dict]) -> Iterator[dict]:
    for s in snaps:
        corr = s["result"].get("final_correction")
        if not corr or not (corr.get("text") or "").strip():
            continue
        user = s["prompt"] if not s.get("context") else f"{s['context']}\n\n{s['prompt']}"
        yield {"messages": [{"role": "user", "content": user}, {"role": "assistant", "content": corr["text"]}],
               "metadata": {"item_id": s["item_id"], "source_model": corr.get("source_model"),
                            "rubric_version": s["rubric_version"]["version"]}}


def preference_rows(snaps: Iterable[dict], drop_ties: bool, include_both_bad: bool = False) -> Iterator[dict]:
    for s in snaps:
        pref = s["result"].get("final_preference")
        if not pref:
            continue
        if pref.get("is_tie") or not pref.get("chosen_model"):
            if drop_ties or not pref.get("chosen_model"):
                continue
        if pref.get("both_bad") and not include_both_bad:
            continue
        text = {o["model"]: o["text"] for o in s["outputs"]}
        chosen, rejected = pref["chosen_model"], pref.get("rejected_model")
        if chosen not in text or rejected not in text:
            continue
        user = s["prompt"] if not s.get("context") else f"{s['context']}\n\n{s['prompt']}"
        yield {"prompt": [{"role": "user", "content": user}],
               "chosen": [{"role": "assistant", "content": text[chosen]}],
               "rejected": [{"role": "assistant", "content": text[rejected]}],
               "metadata": {"item_id": s["item_id"], "chosen_model": chosen, "rejected_model": rejected,
                            "strength": pref.get("strength"), "both_bad": bool(pref.get("both_bad"))}}


def build(fmt: str, snaps: list[dict], options: dict) -> list[dict]:
    if fmt == "evaluation_results_jsonl":
        return list(evaluation_rows(snaps, bool(options.get("include_rationales"))))
    if fmt == "sft_jsonl":
        return list(sft_rows(snaps))
    if fmt == "preference_pairs_jsonl":
        return list(preference_rows(snaps, options.get("drop_ties", True), bool(options.get("include_both_bad"))))
    raise ValueError(fmt)


def to_jsonl(rows: list[dict]) -> bytes:
    return b"".join(json.dumps(r, ensure_ascii=False, sort_keys=True).encode() + b"\n" for r in rows)


def manifest(*, project_code: str, dataset_version: int, dataset_manifest_sha256: str, rubric_content_sha256: str | None,
             fmt: str, filename: str, data: bytes, row_count: int, created_at: str) -> dict:
    return {"project_code": project_code, "dataset_version": dataset_version,
            "dataset_manifest_sha256": dataset_manifest_sha256, "rubric_version_sha256": rubric_content_sha256,
            "format": fmt, "file": filename, "row_count": row_count, "sha256": hashlib.sha256(data).hexdigest(),
            "size_bytes": len(data), "created_at": created_at, "generator": GENERATOR}
