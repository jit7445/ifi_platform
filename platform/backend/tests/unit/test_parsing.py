import json
from pathlib import Path

from Frontier_platform.platform.backend.app.modules.ingestion.parsing import expected_outputs_for, parse_csv, parse_jsonl

SAMPLE = Path(__file__).resolve().parents[2] / "sample_data"


def line(**o):
    base = {"id": "q1", "prompt": "p", "responses": [{"model": "m1", "text": "t1"}, {"model": "m2", "text": "t2"}]}
    base.update(o)
    return json.dumps(base)


def test_sample_files_parse_cleanly():
    r = parse_jsonl((SAMPLE / "pairwise.jsonl").read_bytes(), (2, 2))
    assert r.failed == 0 and r.total == len(r.rows) == 8
    c = parse_csv((SAMPLE / "pairwise.csv").read_bytes(), (2, 2))
    assert c.failed == 0 and len(c.rows) == 8
    s = parse_jsonl((SAMPLE / "single.jsonl").read_bytes(), (1, 2))
    assert s.failed == 0 and all(len(x.responses) == 1 for x in s.rows)


def test_row_errors_are_reported_with_line_numbers():
    data = "\n".join([line(), "{not json", line(id="q2", prompt=""), line(id="q1"), line(id="q3", responses=[{"model": "m1", "text": "x"}])])
    r = parse_jsonl(data.encode(), (2, 2))
    assert r.total == 5 and len(r.rows) == 1 and r.failed == 4
    rows = {e["row"]: e["message"] for e in r.errors}
    assert "invalid JSON" in rows[2] and "prompt" in rows[3] and "duplicate" in rows[4] and "exactly 2" in rows[5]


def test_duplicate_models_rejected():
    r = parse_jsonl(line(responses=[{"model": "m", "text": "a"}, {"model": "m", "text": "b"}]).encode(), (1, 2))
    assert r.failed == 1


def test_csv_missing_columns():
    r = parse_csv(b"id,prompt\n1,hi\n", (1, 2))
    assert r.failed == 1 and "missing CSV columns" in r.errors[0]["message"]


def test_expected_outputs():
    assert expected_outputs_for("pairwise_preference") == (2, 2)
    assert expected_outputs_for("rubric_scoring") == (1, 2)


def test_hash_ignores_nothing_material():
    a = parse_jsonl(line().encode(), (2, 2)).rows[0]
    b = parse_jsonl(line(prompt="other").encode(), (2, 2)).rows[0]
    assert a.content_sha256() != b.content_sha256()
