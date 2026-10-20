"""Pure parsing of the fixed MVP input schema (JSONL or CSV) into normalized rows."""

import csv
import hashlib
import io
import json
from dataclasses import dataclass, field

MAX_TEXT = 200_000
MAX_ERRORS = 100


@dataclass
class ParsedRow:
    row: int
    external_id: str
    prompt: str
    context: str | None
    reference_answer: str | None
    responses: list[dict]
    metadata: dict

    def content_sha256(self) -> str:
        body = {
            "id": self.external_id, "prompt": self.prompt, "context": self.context,
            "reference_answer": self.reference_answer, "responses": self.responses, "metadata": self.metadata,
        }
        return hashlib.sha256(json.dumps(body, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


@dataclass
class ParseResult:
    rows: list[ParsedRow] = field(default_factory=list)
    errors: list[dict] = field(default_factory=list)
    total: int = 0
    failed: int = 0
    seen_ids: set[str] = field(default_factory=set)

    def fail(self, row: int, message: str) -> None:
        self.failed += 1
        if len(self.errors) < MAX_ERRORS:
            self.errors.append({"row": row, "message": message})


def _opt_str(v, name: str) -> str | None:
    if v is None or v == "":
        return None
    if not isinstance(v, str):
        raise ValueError(f"{name} must be a string")
    if len(v) > MAX_TEXT:
        raise ValueError(f"{name} exceeds {MAX_TEXT} characters")
    return v


def normalize(obj: dict, row: int, expected_outputs: tuple[int, int]) -> ParsedRow:
    if not isinstance(obj, dict):
        raise ValueError("row must be a JSON object")
    ext = obj.get("id")
    if isinstance(ext, int):
        ext = str(ext)
    if not isinstance(ext, str) or not ext.strip() or len(ext) > 200:
        raise ValueError("id is required (string, <= 200 chars)")
    prompt = _opt_str(obj.get("prompt"), "prompt")
    if not prompt:
        raise ValueError("prompt is required")
    responses = obj.get("responses")
    if not isinstance(responses, list):
        raise ValueError("responses must be a list")
    lo, hi = expected_outputs
    if not lo <= len(responses) <= hi:
        raise ValueError(f"expected {lo}..{hi} responses, got {len(responses)}" if lo != hi
                         else f"expected exactly {lo} responses, got {len(responses)}")
    norm, models = [], set()
    for i, r in enumerate(responses):
        if not isinstance(r, dict):
            raise ValueError(f"responses[{i}] must be an object")
        model = r.get("model")
        text = r.get("text")
        if not isinstance(model, str) or not model.strip() or len(model) > 200:
            raise ValueError(f"responses[{i}].model is required")
        if not isinstance(text, str) or not text.strip():
            raise ValueError(f"responses[{i}].text is required")
        if len(text) > MAX_TEXT:
            raise ValueError(f"responses[{i}].text exceeds {MAX_TEXT} characters")
        if model in models:
            raise ValueError(f"duplicate model {model} in responses")
        models.add(model)
        norm.append({"model": model.strip(), "text": text})
    meta = obj.get("metadata") or {}
    if not isinstance(meta, dict):
        raise ValueError("metadata must be an object")
    return ParsedRow(row, ext.strip(), prompt, _opt_str(obj.get("context"), "context"),
                     _opt_str(obj.get("reference_answer"), "reference_answer"), norm, meta)


def _dedupe(result: ParseResult, parsed: ParsedRow) -> None:
    if parsed.external_id in result.seen_ids:
        result.fail(parsed.row, f"duplicate id {parsed.external_id} in file")
        return
    result.seen_ids.add(parsed.external_id)
    result.rows.append(parsed)


def parse_jsonl(data: bytes, expected_outputs: tuple[int, int]) -> ParseResult:
    result = ParseResult()
    text = data.decode("utf-8-sig")
    for n, line in enumerate(text.splitlines(), start=1):
        if not line.strip():
            continue
        result.total += 1
        try:
            obj = json.loads(line)
            _dedupe(result, normalize(obj, n, expected_outputs))
        except json.JSONDecodeError as e:
            result.fail(n, f"invalid JSON: {e.msg}")
        except ValueError as e:
            result.fail(n, str(e))
    return result


CSV_COLUMNS = ["id", "prompt", "context", "reference_answer", "model_a", "response_a", "model_b", "response_b"]


def parse_csv(data: bytes, expected_outputs: tuple[int, int]) -> ParseResult:
    result = ParseResult()
    reader = csv.DictReader(io.StringIO(data.decode("utf-8-sig"), newline=""))
    missing = {"id", "prompt", "model_a", "response_a"} - set(reader.fieldnames or [])
    if missing:
        result.fail(1, f"missing CSV columns: {', '.join(sorted(missing))}")
        return result
    for n, rec in enumerate(reader, start=2):
        result.total += 1
        responses = []
        for slot in ("a", "b"):
            m, t = (rec.get(f"model_{slot}") or "").strip(), rec.get(f"response_{slot}") or ""
            if m or t.strip():
                responses.append({"model": m, "text": t})
        obj = {"id": rec.get("id"), "prompt": rec.get("prompt"), "context": rec.get("context"),
               "reference_answer": rec.get("reference_answer"), "responses": responses}
        try:
            _dedupe(result, normalize(obj, n, expected_outputs))
        except ValueError as e:
            result.fail(n, str(e))
    return result


def expected_outputs_for(task_type: str) -> tuple[int, int]:
    return (2, 2) if task_type == "pairwise_preference" else (1, 2)
