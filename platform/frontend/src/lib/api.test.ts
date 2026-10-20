import { describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError, endpoints, errorMessage, normalizeProblem, unwrapList, type TokenStore } from "./api";

function store(initial: string | null = null): TokenStore {
  let t = initial;
  return { get: () => t, set: (v) => void (t = v) };
}

function json(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("normalizeProblem", () => {
  it("keeps RFC 9457 fields and field errors", () => {
    const p = normalizeProblem(422, {
      title: "Validation failed",
      status: 422,
      code: "validation_error",
      errors: [{ field: "scores.0.value", code: "out_of_range", message: "Too high" }],
    });
    expect(p.code).toBe("validation_error");
    expect(p.errors).toEqual([{ field: "scores.0.value", code: "out_of_range", message: "Too high" }]);
  });

  it("converts FastAPI default validation details", () => {
    const p = normalizeProblem(422, { detail: [{ loc: ["body", "email"], msg: "field required", type: "missing" }] });
    expect(p.code).toBe("validation_error");
    expect(p.errors).toEqual([{ field: "email", code: "missing", message: "field required" }]);
  });

  it("falls back to a status title for non-object bodies", () => {
    expect(normalizeProblem(503, null).title).toBe("Server error");
    expect(new ApiError(404, normalizeProblem(404, null)).code).toBe("http_404");
  });
});

describe("unwrapList / errorMessage", () => {
  it("accepts envelopes and bare arrays", () => {
    expect(unwrapList({ data: [1, 2], next_cursor: null })).toEqual([1, 2]);
    expect(unwrapList([3])).toEqual([3]);
    expect(unwrapList(null)).toEqual([]);
  });
  it("joins title and detail", () => {
    expect(errorMessage(new ApiError(409, { title: "Conflict", detail: "Rubric is published" }))).toBe("Conflict: Rubric is published");
  });
});

describe("ApiClient", () => {
  it("routes auth calls to /v1/auth and the rest to /api/v1", async () => {
    const fetchImpl = vi.fn(async () => json(200, { access_token: "tok", expires_in: 900 }));
    const api = endpoints(new ApiClient({ tokens: store(), fetchImpl }));
    await api.auth.login({ email: "a@b.c", password: "p" });
    await api.me();
    expect(fetchImpl.mock.calls.map((c) => (c as unknown[])[0])).toEqual(["/v1/auth/login", "/api/v1/me"]);
  });

  it("sends the bearer token, JSON body and an idempotency key on idempotent calls", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => json(201, { assignment_id: "x" }));
    const api = endpoints(new ApiClient({ tokens: store("abc"), fetchImpl, newIdempotencyKey: () => "key-1" }));
    await api.expert.nextTask("p1");
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(url).toBe("/api/v1/me/tasks:next");
    expect(headers.Authorization).toBe("Bearer abc");
    expect(headers["Idempotency-Key"]).toBe("key-1");
    expect(JSON.parse(init.body as string)).toEqual({ project_id: "p1" });
  });

  it("refreshes once on token_expired and retries with the same idempotency key", async () => {
    const tokens = store("old");
    const keys: string[] = [];
    let n = 0;
    const fetchImpl = vi.fn(async (url: unknown, init?: RequestInit) => {
      if (url === "/v1/auth/refresh") return json(200, { access_token: "new", expires_in: 900 });
      const h = (init?.headers ?? {}) as Record<string, string>;
      if (h["Idempotency-Key"]) keys.push(h["Idempotency-Key"]);
      n++;
      return n === 1 ? json(401, { code: "token_expired", title: "Expired" }) : json(201, { submission_id: "s", revision: 1, status: "submitted" });
    });
    let i = 0;
    const api = endpoints(new ApiClient({ tokens, fetchImpl, newIdempotencyKey: () => `k${++i}` }));
    const res = await api.expert.submit("as", {
      rubric_version_id: "rv",
      scores: [],
      error_labels: [],
      corrected_output: null,
      preference: null,
      confidence: 3,
      time_spent_seconds: 40,
    });
    expect(res.submission_id).toBe("s");
    expect(tokens.get()).toBe("new");
    expect(keys).toEqual(["k1", "k1"]);
  });

  it("reports lost auth when refresh fails", async () => {
    const onAuthLost = vi.fn();
    const fetchImpl = vi.fn(async (url: unknown) => (url === "/v1/auth/refresh" ? json(401, { code: "invalid_refresh" }) : json(401, { code: "token_expired" })));
    const api = endpoints(new ApiClient({ tokens: store("old"), fetchImpl, onAuthLost }));
    await expect(api.me()).rejects.toBeInstanceOf(ApiError);
    expect(onAuthLost).toHaveBeenCalledTimes(1);
  });

  it("surfaces problem codes such as no_tasks_available", async () => {
    const fetchImpl = vi.fn(async () => json(404, { code: "no_tasks_available", title: "No tasks" }));
    const api = endpoints(new ApiClient({ tokens: store("t"), fetchImpl }));
    await expect(api.expert.nextTask("p")).rejects.toMatchObject({ status: 404, code: "no_tasks_available" });
  });

  it("encodes query parameters and skips empty ones", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => json(200, { data: [], next_cursor: null }));
    const api = endpoints(new ApiClient({ tokens: store("t"), fetchImpl }));
    await api.staff.experts({ q: "law yer", skill: "", status: undefined });
    expect(fetchImpl.mock.calls[0][0]).toBe("/api/v1/staff/experts?q=law+yer");
  });
});
