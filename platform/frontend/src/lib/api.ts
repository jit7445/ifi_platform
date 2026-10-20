// Typed client for the Phase 1 MVP API (platform/docs/mvp_api_contract.md).

export type UUID = string;
export type Timestamp = string;

/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

export interface ListResponse<T> {
  data: T[];
  next_cursor: string | null;
}

export interface FieldError {
  field: string;
  code: string;
  message: string;
}

export interface ProblemJson {
  type?: string;
  title?: string;
  status?: number;
  code?: string;
  detail?: string;
  errors?: FieldError[];
}

export type OrgKind = "platform" | "customer";
export type Role =
  | "platform_admin"
  | "project_manager"
  | "reviewer"
  | "expert"
  | "customer_admin"
  | "customer_member";

/* ------------------------------------------------------------------ */
/* Auth and identity                                                   */
/* ------------------------------------------------------------------ */

export interface User {
  id: UUID;
  email: string;
  full_name: string;
  mfa_enabled: boolean;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  user?: User;
}

export interface Membership {
  org_id: UUID;
  org_name: string;
  org_kind: OrgKind;
  roles: Role[];
}

export interface Me {
  user: User;
  memberships: Membership[];
  expert_profile_id: UUID | null;
  mfa_required_but_missing: boolean;
}

export interface SignupInput {
  email: string;
  password: string;
  full_name: string;
  org_name: string;
}

export interface LoginInput {
  email: string;
  password: string;
  totp_code?: string;
}

export interface MfaSetup {
  secret: string;
  otpauth_url: string;
}

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

export type TaskType = "rubric_scoring" | "pairwise_preference" | "sft_correction";
export type Difficulty = "general" | "professional" | "expert";
export type DeliverableFormat = "evaluation_results" | "sft" | "preference_pairs";
export type ProjectStatus =
  | "draft"
  | "submitted"
  | "changes_requested"
  | "approved"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export interface QualitySettings {
  overlap_k: number;
  review_rate: number;
  gold_rate: number;
  agreement_threshold: number;
}

export interface RequiredSkill {
  skill_key: string;
  min_level: number;
}

export interface ProjectInput {
  name: string;
  code: string;
  description: string;
  domain: string;
  task_type: TaskType;
  languages: string[];
  difficulty: Difficulty;
  target_volume: number;
  deadline: string;
  deliverable_format: DeliverableFormat;
  quality: QualitySettings;
  required_skills: RequiredSkill[];
  excluded_companies: string[];
}

export interface ProjectCounts {
  items: number;
  tasks: number;
  tasks_completed: number;
  submissions: number;
}

export interface Project extends ProjectInput {
  id: UUID;
  org_id: UUID;
  status: ProjectStatus;
  current_rubric_version_id: UUID | null;
  counts: ProjectCounts;
  created_at: Timestamp;
  org_name?: string;
}

/* ------------------------------------------------------------------ */
/* Rubrics                                                             */
/* ------------------------------------------------------------------ */

export type ScaleType = "likert" | "binary" | "categorical";
export type Severity = "minor" | "major" | "critical";

export interface Criterion {
  key: string;
  label: string;
  description: string;
  scale_type: ScaleType;
  scale_min: number;
  scale_max: number;
  anchors: Record<string, string>;
  options: string[];
  weight: number;
  is_required: boolean;
  explanation_required_below: number | null;
}

export interface ErrorLabelDef {
  key: string;
  label: string;
  severity: Severity;
}

export interface RubricVersionInput {
  instructions_md: string;
  criteria: Criterion[];
  error_labels: ErrorLabelDef[];
  require_correction: boolean;
  require_overall_comment: boolean;
}

export interface RubricVersion extends RubricVersionInput {
  id: UUID;
  version: number;
  status: "draft" | "published";
  content_sha256?: string | null;
  published_at?: Timestamp | null;
  created_at?: Timestamp;
}

export interface Rubric {
  id: UUID;
  name: string;
  project_id: UUID;
  versions: RubricVersion[];
}

export interface PublishResult {
  id: UUID;
  version: number;
  status: "published";
  content_sha256: string;
  published_at: Timestamp;
}

/* ------------------------------------------------------------------ */
/* Uploads, ingestion, items, gold                                     */
/* ------------------------------------------------------------------ */

export type UploadContentType = "application/x-ndjson" | "text/csv" | "application/json";

export interface UploadTicket {
  upload_id: UUID;
  method: "PUT";
  url: string;
  headers: Record<string, string>;
  expires_at: Timestamp;
}

export interface UploadComplete {
  status: "available";
  size_bytes: number;
  sha256: string;
}

export type IngestionStatus = "queued" | "running" | "succeeded" | "partially_succeeded" | "failed";

export interface Ingestion {
  id: UUID;
  status: IngestionStatus;
  rows_total: number;
  rows_ok: number;
  rows_failed: number;
  errors: { row: number; message: string }[];
  dataset_version_id: UUID | null;
}

export interface ItemResponse {
  model_run_id: UUID;
  model: string;
  text: string;
}

export interface Item {
  id: UUID;
  external_id: string;
  prompt: string;
  context: string | null;
  reference_answer: string | null;
  responses: ItemResponse[];
  is_gold: boolean;
}

export interface GoldInput {
  item_id: UUID;
  expected: { scores: Record<string, number | string>; preferred_model?: string };
  tolerance: 0 | 1;
}

export interface GoldItem extends GoldInput {
  id: UUID;
  created_at?: Timestamp;
}

/* ------------------------------------------------------------------ */
/* Metrics                                                             */
/* ------------------------------------------------------------------ */

export type Interpretation = "reliable" | "tentative" | "unreliable" | "insufficient_data";

export interface Metrics {
  metric_run_id: UUID;
  computed_at: Timestamp;
  progress: {
    tasks_total: number;
    tasks_completed: number;
    submissions: number;
    throughput_per_day: number;
  };
  agreement: {
    criterion: string;
    metric: "krippendorff_alpha";
    level: string;
    value: number | null;
    n_items: number;
    percent_agreement: number | null;
    interpretation: Interpretation;
  }[];
  preference_agreement: {
    metric: string;
    value: number | null;
    percent_agreement: number | null;
    n_items: number;
  } | null;
  gold_accuracy: { value: number | null; n: number };
  review: {
    acceptance_rate: number | null;
    rework_rate: number | null;
    rejection_rate: number | null;
    n: number;
  };
  model_scores: { model: string; criterion: string; mean: number; ci: [number, number]; n: number }[];
  win_rates: { model_a: string; model_b: string; a_wins: number; b_wins: number; ties: number; n: number }[] | null;
  error_labels: { key: string; label: string; count: number; critical_count: number }[];
}

/* ------------------------------------------------------------------ */
/* Datasets and exports                                                */
/* ------------------------------------------------------------------ */

export interface DatasetVersion {
  id: UUID;
  version: number;
  status: "frozen";
  item_count: number;
  manifest_sha256: string;
  created_at: Timestamp;
  notes?: string | null;
}

export type ExportFormat = "evaluation_results_jsonl" | "sft_jsonl" | "preference_pairs_jsonl";

export interface ExportJob {
  id: UUID;
  status: string;
  format: ExportFormat;
  row_count: number | null;
  sha256: string | null;
  size_bytes: number | null;
  created_at: Timestamp;
  dataset_version_id?: UUID;
}

export interface DownloadUrl {
  url: string;
  expires_at: Timestamp;
  filename: string;
  sha256: string;
}

export interface AuditEvent {
  id: UUID;
  action: string;
  actor_id?: UUID | null;
  actor_email?: string | null;
  target_type?: string | null;
  target_id?: UUID | null;
  created_at: Timestamp;
  metadata?: Record<string, unknown>;
  org_id?: UUID;
}

export interface Usage {
  accepted_tasks: number;
  by_project: { project_id: UUID; name?: string; project_name?: string; accepted_tasks: number }[];
}

export interface Member {
  user_id: UUID;
  email: string;
  full_name: string;
  roles: Role[];
}

/* ------------------------------------------------------------------ */
/* Expert                                                              */
/* ------------------------------------------------------------------ */

export interface Skill {
  key: string;
  label: string;
  domain: string;
}

export interface ExpertSkill {
  skill_key: string;
  level: number;
}

export interface ExpertProfileInput {
  headline: string;
  bio: string;
  years_experience: number;
  country: string;
  languages: string[];
  weekly_hours: number;
  skills: ExpertSkill[];
}

export interface ExpertProfile extends ExpertProfileInput {
  id?: UUID;
  status?: ExpertStatus;
  tier?: ExpertTier;
}

export type CredentialKind = "degree" | "license" | "certification" | "employment" | "publication";
export type CredentialStatus = "pending" | "verified" | "rejected";

export interface CredentialInput {
  kind: CredentialKind;
  title: string;
  issuer: string;
  year?: number;
  identifier?: string;
}

export interface Credential extends CredentialInput {
  id: UUID;
  status: CredentialStatus;
  note?: string | null;
}

export type ConflictRelationship =
  | "employee"
  | "former_employee"
  | "consultant"
  | "investor"
  | "family"
  | "other";

export interface ConflictInput {
  organization_name: string;
  relationship: ConflictRelationship;
  until?: string;
}

export interface Conflict extends ConflictInput {
  id: UUID;
}

export interface ExpertProject {
  project_id: UUID;
  name: string;
  customer_display: string;
  task_type: TaskType;
  status: ProjectStatus;
  available_tasks: number;
  my_submitted: number;
  my_in_progress: number;
  max_tasks: number;
}

export type AssignmentStatus = "in_progress" | "submitted" | "rework";

export interface TaskSummary {
  assignment_id: UUID;
  task_id: UUID;
  project_id: UUID;
  project_name: string;
  task_type: TaskType;
  status: AssignmentStatus | string;
  due_at: Timestamp | null;
  created_at: Timestamp;
}

export type Slot = "A" | "B";

export interface TaskRubricVersion extends RubricVersionInput {
  id: UUID;
  version: number;
}

export interface Feedback {
  from: "review" | "adjudication";
  message: string;
  created_at: Timestamp;
}

export interface TaskPayload {
  assignment_id: UUID;
  task_id: UUID;
  status: AssignmentStatus | string;
  task_type: TaskType;
  project: { id: UUID; name: string; customer_display: string };
  item: { prompt: string; context: string | null; reference_answer_visible: false };
  outputs: { slot: Slot; text: string }[];
  rubric_version: TaskRubricVersion;
  draft: Record<string, unknown> | null;
  feedback: Feedback[];
  lease_expires_at: Timestamp | null;
}

export type ScoreValue = number | string;

export interface SubmissionScore {
  criterion_key: string;
  output_slot: Slot;
  value: ScoreValue;
  explanation?: string;
}

export interface SubmissionErrorLabel {
  label_key: string;
  output_slot: Slot;
  note?: string;
}

export interface Preference {
  chosen_slot: Slot | null;
  strength: number;
  is_tie: boolean;
  both_bad: boolean;
  rationale: string;
}

export interface CorrectedOutput {
  source_slot: Slot;
  text: string;
  rationale?: string;
}

export interface SubmissionInput {
  rubric_version_id: UUID;
  scores: SubmissionScore[];
  error_labels: SubmissionErrorLabel[];
  corrected_output: CorrectedOutput | null;
  preference: Preference | null;
  overall_comment?: string;
  confidence: number;
  time_spent_seconds: number;
}

export interface SubmissionResult {
  submission_id: UUID;
  revision: number;
  status: "submitted";
}

/* ------------------------------------------------------------------ */
/* Staff                                                               */
/* ------------------------------------------------------------------ */

export interface RecommendFactors {
  skill_match: number;
  credential_verified: number;
  language: number;
  quality_history: number;
  availability: number;
  load: number;
}

export interface Candidate {
  expert_id: UUID;
  pseudonym: string;
  display_name: string;
  score: number;
  factors: RecommendFactors;
  flags: string[];
}

export type ExclusionReason = "conflict_of_interest" | "missing_skill" | "inactive" | "unverified";

export interface Recommendation {
  algorithm_version: string;
  candidates: Candidate[];
  excluded: { expert_id: UUID; display_name: string; reason: ExclusionReason; detail: string }[];
}

export interface AssignmentResult {
  approved: { expert_id: UUID; max_tasks?: number; display_name?: string }[];
  rejected: { expert_id: UUID; reason: string }[];
}

export interface ProjectExpert {
  expert_id: UUID;
  display_name?: string;
  pseudonym?: string;
  max_tasks: number;
  status?: string;
  approved_at?: Timestamp;
  submissions?: number;
}

export type ExpertStatus = "active" | "suspended" | "pending" | string;
export type ExpertTier = "standard" | "senior";

export interface ExpertListItem {
  id: UUID;
  display_name: string;
  pseudonym?: string;
  email?: string;
  headline?: string;
  country?: string;
  status: ExpertStatus;
  tier?: ExpertTier;
  skills?: ExpertSkill[];
}

export interface ExpertDetail extends ExpertListItem {
  bio?: string;
  years_experience?: number;
  languages?: string[];
  weekly_hours?: number;
  credentials: Credential[];
  conflicts: Conflict[];
  quality: { gold_accuracy: number | null; acceptance_rate: number | null; submissions: number };
}

export interface ExpertMetric {
  expert_id: UUID;
  pseudonym: string;
  submissions: number;
  gold_accuracy: number | null;
  acceptance_rate: number | null;
  avg_time_seconds: number | null;
  agreement_with_consensus: number | null;
}

export type ReviewKind = "sample" | "low_agreement" | "gold_fail" | "too_fast";
export type ReviewStatus = "open" | "claimed" | "done";
export type ReviewDecision = "accept" | "request_rework" | "reject" | "escalate";

export interface Review {
  id: UUID;
  project_id: UUID;
  project_name: string;
  task_id: UUID;
  submission_id: UUID;
  kind: ReviewKind;
  status: ReviewStatus;
  created_at: Timestamp;
}

export interface StaffOutput {
  slot: Slot;
  model: string;
  text: string;
}

export interface StaffItem {
  prompt: string;
  context: string | null;
  reference_answer?: string | null;
}

export interface Submission {
  id: UUID;
  revision?: number;
  expert_pseudonym?: string;
  scores: SubmissionScore[];
  error_labels: SubmissionErrorLabel[];
  corrected_output: CorrectedOutput | null;
  preference: Preference | null;
  overall_comment?: string | null;
  confidence: number;
  time_spent_seconds: number;
  created_at?: Timestamp;
}

export interface ReviewDetail extends Review {
  item: StaffItem;
  outputs: StaffOutput[];
  rubric_version?: TaskRubricVersion;
  submission: Submission;
  expert_pseudonym: string;
  task_type?: TaskType;
}

export interface Adjudication {
  id: UUID;
  project_id: UUID;
  project_name: string;
  task_id: UUID;
  status: "open" | "resolved";
  created_at: Timestamp;
}

export interface AdjudicationDetail extends Adjudication {
  item: StaffItem;
  outputs: StaffOutput[];
  rubric_version?: TaskRubricVersion;
  task_type?: TaskType;
  submissions: Submission[];
  disagreement?: unknown;
}

export interface AdjudicationResolveInput {
  resolution: "select_submission" | "merge";
  selected_submission_id?: UUID;
  final_result: {
    scores: Record<string, ScoreValue>;
    preference?: { chosen_slot: Slot | null; is_tie: boolean; both_bad: boolean; strength: number };
    corrected_text?: string;
  };
  rationale: string;
}

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly title: string;
  readonly detail: string | undefined;
  readonly type: string | undefined;
  readonly errors: FieldError[];

  constructor(status: number, problem: ProblemJson) {
    const title = problem.title ?? defaultTitle(status);
    super(problem.detail ?? title);
    this.name = "ApiError";
    this.status = status;
    this.code = problem.code ?? `http_${status}`;
    this.title = title;
    this.detail = problem.detail;
    this.type = problem.type;
    this.errors = problem.errors ?? [];
  }

  /** Field errors keyed by field path; the first message wins per field. */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const e of this.errors) {
      if (e.field && !(e.field in out)) out[e.field] = e.message;
    }
    return out;
  }
}

function defaultTitle(status: number): string {
  if (status === 0) return "Network error";
  if (status === 401) return "Not signed in";
  if (status === 403) return "Not allowed";
  if (status === 404) return "Not found";
  if (status === 409) return "Conflict";
  if (status === 422) return "Validation failed";
  if (status === 429) return "Too many requests";
  if (status >= 500) return "Server error";
  return "Request failed";
}

type FastApiDetail = { loc?: (string | number)[]; msg?: string; type?: string };

/**
 * Normalises an error body into RFC 9457 shape. Also accepts the FastAPI
 * default `{ detail: string | [{ loc, msg, type }] }` so framework-level
 * errors raised before the problem handler still surface field messages.
 */
export function normalizeProblem(status: number, body: unknown): ProblemJson {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { status, title: defaultTitle(status), detail: typeof body === "string" && body ? body : undefined };
  }
  const b = body as Record<string, unknown>;
  const problem: ProblemJson = {
    type: typeof b.type === "string" ? b.type : undefined,
    title: typeof b.title === "string" ? b.title : undefined,
    status: typeof b.status === "number" ? b.status : status,
    code: typeof b.code === "string" ? b.code : undefined,
    detail: typeof b.detail === "string" ? b.detail : undefined,
    errors: [],
  };
  if (Array.isArray(b.errors)) {
    for (const raw of b.errors) {
      if (raw && typeof raw === "object") {
        const e = raw as Record<string, unknown>;
        problem.errors!.push({
          field: typeof e.field === "string" ? e.field : "",
          code: typeof e.code === "string" ? e.code : "invalid",
          message: typeof e.message === "string" ? e.message : "Invalid value",
        });
      }
    }
  } else if (Array.isArray(b.detail)) {
    for (const raw of b.detail as FastApiDetail[]) {
      const loc = (raw.loc ?? []).filter((p, i) => !(i === 0 && (p === "body" || p === "query" || p === "path")));
      problem.errors!.push({
        field: loc.join("."),
        code: raw.type ?? "invalid",
        message: raw.msg ?? "Invalid value",
      });
    }
    problem.code ??= "validation_error";
  }
  if (!problem.title) problem.title = defaultTitle(status);
  return problem;
}

export async function parseProblem(res: Response): Promise<ApiError> {
  let body: unknown = null;
  const text = await res.text().catch(() => "");
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = res.status >= 500 ? null : text.slice(0, 300);
    }
  }
  return new ApiError(res.status, normalizeProblem(res.status, body));
}

export function isApiError(e: unknown, code?: string): e is ApiError {
  return e instanceof ApiError && (code === undefined || e.code === code);
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.detail && e.detail !== e.title) return `${e.title}: ${e.detail}`;
    return e.title;
  }
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

/** Accepts both the `{ data, next_cursor }` envelope and a bare array. */
export function unwrapList<T>(body: ListResponse<T> | T[] | null | undefined): T[] {
  if (!body) return [];
  if (Array.isArray(body)) return body;
  return Array.isArray(body.data) ? body.data : [];
}

/* ------------------------------------------------------------------ */
/* Client                                                              */
/* ------------------------------------------------------------------ */

export interface TokenStore {
  get(): string | null;
  set(token: string | null): void;
}

export interface ClientOptions {
  /** Same-origin prefix that the Next rewrite maps to `${API_URL}/v1`. */
  baseUrl?: string;
  /** Prefix for auth endpoints; must match the refresh cookie path. */
  authBaseUrl?: string;
  fetchImpl?: typeof fetch;
  tokens: TokenStore;
  onAuthLost?: () => void;
  newIdempotencyKey?: () => string;
}

type Query = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  body?: unknown;
  query?: Query;
  idempotent?: boolean;
  auth?: boolean;
  signal?: AbortSignal;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly authBaseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly tokens: TokenStore;
  private readonly onAuthLost?: () => void;
  private readonly newKey: () => string;
  private refreshing: Promise<string | null> | null = null;

  constructor(opts: ClientOptions) {
    this.baseUrl = opts.baseUrl ?? "/api/v1";
    this.authBaseUrl = opts.authBaseUrl ?? "/v1/auth";
    this.fetchImpl = opts.fetchImpl ?? ((...args) => fetch(...args));
    this.tokens = opts.tokens;
    this.onAuthLost = opts.onAuthLost;
    this.newKey = opts.newIdempotencyKey ?? (() => crypto.randomUUID());
  }

  private url(path: string, query?: Query): string {
    const base = path.startsWith("/auth/") ? this.authBaseUrl + path.slice("/auth".length) : this.baseUrl + path;
    if (!query) return base;
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
    }
    const s = qs.toString();
    return s ? `${base}?${s}` : base;
  }

  /** Single-flight refresh using the httpOnly cookie. Resolves to null when the session is gone. */
  refresh(): Promise<string | null> {
    if (!this.refreshing) {
      this.refreshing = (async () => {
        try {
          const res = await this.fetchImpl(this.url("/auth/refresh"), {
            method: "POST",
            credentials: "include",
            headers: { Accept: "application/json" },
          });
          if (!res.ok) {
            this.tokens.set(null);
            return null;
          }
          const body = (await res.json()) as TokenResponse;
          this.tokens.set(body.access_token);
          return body.access_token;
        } catch {
          return null;
        } finally {
          this.refreshing = null;
        }
      })();
    }
    return this.refreshing;
  }

  async request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
    const idempotencyKey = opts.idempotent ? this.newKey() : undefined;
    const send = async (): Promise<Response> => {
      const headers: Record<string, string> = { Accept: "application/json, application/problem+json" };
      if (opts.body !== undefined) headers["Content-Type"] = "application/json";
      if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
      const token = opts.auth === false ? null : this.tokens.get();
      if (token) headers.Authorization = `Bearer ${token}`;
      try {
        return await this.fetchImpl(this.url(path, opts.query), {
          method,
          headers,
          body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
          credentials: "include",
          signal: opts.signal,
        });
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") throw e;
        throw new ApiError(0, { title: "Network error", detail: "Could not reach the server. Check your connection." });
      }
    };

    let res = await send();
    if (res.status === 401 && opts.auth !== false) {
      const err = await parseProblem(res);
      if (err.code !== "token_expired") {
        this.onAuthLost?.();
        throw err;
      }
      const fresh = await this.refresh();
      if (!fresh) {
        this.onAuthLost?.();
        throw err;
      }
      res = await send();
    }
    if (!res.ok) {
      const err = await parseProblem(res);
      if (res.status === 401 && opts.auth !== false) this.onAuthLost?.();
      throw err;
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  get<T>(path: string, query?: Query, signal?: AbortSignal) {
    return this.request<T>("GET", path, { query, signal });
  }
  post<T>(path: string, body?: unknown, idempotent = false) {
    return this.request<T>("POST", path, { body: body ?? {}, idempotent });
  }
  put<T>(path: string, body: unknown) {
    return this.request<T>("PUT", path, { body });
  }
  patch<T>(path: string, body: unknown) {
    return this.request<T>("PATCH", path, { body });
  }
  del<T = void>(path: string) {
    return this.request<T>("DELETE", path);
  }
}

/* ------------------------------------------------------------------ */
/* Endpoints                                                           */
/* ------------------------------------------------------------------ */

export interface Page {
  limit?: number;
  cursor?: string | null;
}

export function endpoints(c: ApiClient) {
  const org = (orgId: string) => `/orgs/${orgId}`;
  return {
    auth: {
      signup: (b: SignupInput) => c.request<TokenResponse>("POST", "/auth/signup", { body: b, auth: false }),
      login: (b: LoginInput) => c.request<TokenResponse>("POST", "/auth/login", { body: b, auth: false }),
      logout: () => c.request<void>("POST", "/auth/logout", { body: {} }),
      mfaSetup: () => c.post<MfaSetup>("/auth/mfa/setup"),
      mfaVerify: (code: string) => c.post<{ mfa_enabled: true }>("/auth/mfa/verify", { code }),
    },
    me: () => c.get<Me>("/me"),
    skills: async () => unwrapList(await c.get<ListResponse<Skill> | Skill[]>("/skills")),

    projects: {
      list: (orgId: string, p?: Page) => c.get<ListResponse<Project>>(`${org(orgId)}/projects`, { ...p }),
      get: (orgId: string, pid: string) => c.get<Project>(`${org(orgId)}/projects/${pid}`),
      create: (orgId: string, b: ProjectInput) => c.post<Project>(`${org(orgId)}/projects`, b, true),
      update: (orgId: string, pid: string, b: Partial<ProjectInput>) =>
        c.patch<Project>(`${org(orgId)}/projects/${pid}`, b),
      submit: (orgId: string, pid: string) => c.post<Project>(`${org(orgId)}/projects/${pid}:submit`),
    },
    rubrics: {
      listForProject: async (orgId: string, projectId: string) =>
        unwrapList(await c.get<ListResponse<Rubric> | Rubric[]>(`${org(orgId)}/rubrics`, { project_id: projectId })),
      get: (orgId: string, rid: string) => c.get<Rubric>(`${org(orgId)}/rubrics/${rid}`),
      create: (orgId: string, b: { name: string; project_id: string }) => c.post<Rubric>(`${org(orgId)}/rubrics`, b),
      createVersion: (orgId: string, rid: string, b: RubricVersionInput) =>
        c.post<RubricVersion>(`${org(orgId)}/rubrics/${rid}/versions`, b),
      updateVersion: (orgId: string, rid: string, vid: string, b: RubricVersionInput) =>
        c.patch<RubricVersion>(`${org(orgId)}/rubrics/${rid}/versions/${vid}`, b),
      publish: (orgId: string, rid: string, vid: string) =>
        c.post<PublishResult>(`${org(orgId)}/rubrics/${rid}/versions/${vid}:publish`, { set_as_project_current: true }),
    },
    uploads: {
      create: (orgId: string, b: { filename: string; content_type: UploadContentType; size_bytes: number }) =>
        c.post<UploadTicket>(`${org(orgId)}/uploads`, b),
      complete: (orgId: string, uploadId: string) => c.post<UploadComplete>(`${org(orgId)}/uploads/${uploadId}:complete`),
    },
    ingestions: {
      create: (orgId: string, pid: string, b: { upload_id: string; format: "jsonl" | "csv"; on_error: "skip_row" | "fail" }) =>
        c.post<{ ingestion_id: string; status: IngestionStatus }>(`${org(orgId)}/projects/${pid}/ingestions`, b, true),
      get: (orgId: string, pid: string, id: string) => c.get<Ingestion>(`${org(orgId)}/projects/${pid}/ingestions/${id}`),
    },
    items: {
      list: (orgId: string, pid: string, p?: Page) => c.get<ListResponse<Item>>(`${org(orgId)}/projects/${pid}/items`, { ...p }),
    },
    gold: {
      list: async (orgId: string, pid: string) =>
        unwrapList(await c.get<ListResponse<GoldItem> | GoldItem[]>(`${org(orgId)}/projects/${pid}/gold-items`)),
      create: (orgId: string, pid: string, b: GoldInput) => c.post<GoldItem>(`${org(orgId)}/projects/${pid}/gold-items`, b),
      remove: (orgId: string, pid: string, gid: string) => c.del(`${org(orgId)}/projects/${pid}/gold-items/${gid}`),
    },
    metrics: {
      compute: (orgId: string, pid: string) =>
        c.post<{ metric_run_id: string; status: string }>(`${org(orgId)}/projects/${pid}/metrics:compute`),
      latest: (orgId: string, pid: string) => c.get<Metrics>(`${org(orgId)}/projects/${pid}/metrics`, { run: "latest" }),
    },
    datasets: {
      list: async (orgId: string, pid: string) =>
        unwrapList(await c.get<ListResponse<DatasetVersion> | DatasetVersion[]>(`${org(orgId)}/projects/${pid}/dataset-versions`)),
      freeze: (orgId: string, pid: string, b: { include: { min_agreement: number | null; exclude_gold: boolean }; notes: string }) =>
        c.post<DatasetVersion>(`${org(orgId)}/projects/${pid}/dataset-versions`, b),
    },
    exports: {
      list: async (orgId: string, pid: string) =>
        unwrapList(await c.get<ListResponse<ExportJob> | ExportJob[]>(`${org(orgId)}/projects/${pid}/exports`)),
      get: (orgId: string, pid: string, eid: string) => c.get<ExportJob>(`${org(orgId)}/projects/${pid}/exports/${eid}`),
      create: (
        orgId: string,
        pid: string,
        b: { dataset_version_id: string; format: ExportFormat; options: { include_rationales: boolean; drop_ties: boolean } },
      ) => c.post<{ export_id: string; status: string }>(`${org(orgId)}/projects/${pid}/exports`, b, true),
      downloadUrl: (orgId: string, eid: string) => c.get<DownloadUrl>(`${org(orgId)}/exports/${eid}/download-url`),
    },
    orgAdmin: {
      members: async (orgId: string) => unwrapList(await c.get<ListResponse<Member> | Member[]>(`${org(orgId)}/members`)),
      audit: (orgId: string, p?: Page) => c.get<ListResponse<AuditEvent>>(`${org(orgId)}/audit-events`, { ...p }),
      usage: (orgId: string) => c.get<Usage>(`${org(orgId)}/usage`),
    },

    expert: {
      profile: () => c.get<ExpertProfile>("/me/expert"),
      saveProfile: (b: ExpertProfileInput) => c.put<ExpertProfile>("/me/expert", b),
      credentials: async () => unwrapList(await c.get<ListResponse<Credential> | Credential[]>("/me/expert/credentials")),
      addCredential: (b: CredentialInput) => c.post<Credential>("/me/expert/credentials", b),
      conflicts: async () => unwrapList(await c.get<ListResponse<Conflict> | Conflict[]>("/me/expert/conflicts")),
      addConflict: (b: ConflictInput) => c.post<Conflict>("/me/expert/conflicts", b),
      removeConflict: (id: string) => c.del(`/me/expert/conflicts/${id}`),
      projects: async () => unwrapList(await c.get<ListResponse<ExpertProject> | ExpertProject[]>("/me/projects")),
      nextTask: (projectId: string) => c.post<TaskSummary>("/me/tasks:next", { project_id: projectId }, true),
      tasks: async (status?: AssignmentStatus) =>
        unwrapList(await c.get<ListResponse<TaskSummary> | TaskSummary[]>("/me/tasks", { status })),
      task: (assignmentId: string) => c.get<TaskPayload>(`/me/tasks/${assignmentId}`),
      saveDraft: (assignmentId: string, draft: unknown) => c.put<unknown>(`/me/tasks/${assignmentId}/draft`, draft),
      submit: (assignmentId: string, b: SubmissionInput) =>
        c.post<SubmissionResult>(`/me/tasks/${assignmentId}/submission`, b, true),
      release: (assignmentId: string) => c.post<void>(`/me/tasks/${assignmentId}:release`),
    },

    staff: {
      projects: async (status?: ProjectStatus) =>
        unwrapList(await c.get<ListResponse<Project> | Project[]>("/staff/projects", { status })),
      approve: (pid: string) => c.post<Project>(`/staff/projects/${pid}:approve`),
      requestChanges: (pid: string, note: string) => c.post<Project>(`/staff/projects/${pid}:request-changes`, { note }),
      activate: (pid: string) => c.post<Project>(`/staff/projects/${pid}:activate`),
      pause: (pid: string) => c.post<Project>(`/staff/projects/${pid}:pause`),
      complete: (pid: string) => c.post<Project>(`/staff/projects/${pid}:complete`),
      generateTasks: (pid: string) => c.post<{ created: number; gold_tasks: number }>(`/staff/projects/${pid}:generate-tasks`),
      recommend: (pid: string, count: number) => c.post<Recommendation>(`/staff/projects/${pid}:recommend-experts`, { count }),
      assign: (pid: string, experts: { expert_id: string; max_tasks: number }[]) =>
        c.post<AssignmentResult>(`/staff/projects/${pid}/assignments`, { experts }, true),
      projectExperts: async (pid: string) =>
        unwrapList(await c.get<ListResponse<ProjectExpert> | ProjectExpert[]>(`/staff/projects/${pid}/experts`)),
      revokeExpert: (pid: string, expertId: string) => c.del(`/staff/projects/${pid}/experts/${expertId}`),
      expertMetrics: async (pid: string) =>
        unwrapList(await c.get<ListResponse<ExpertMetric> | ExpertMetric[]>(`/staff/projects/${pid}/metrics/experts`)),
      experts: async (q: { q?: string; skill?: string; status?: string }) =>
        unwrapList(await c.get<ListResponse<ExpertListItem> | ExpertListItem[]>("/staff/experts", q)),
      expert: (id: string) => c.get<ExpertDetail>(`/staff/experts/${id}`),
      verifyCredential: (id: string, cid: string, b: { status: "verified" | "rejected"; note: string }) =>
        c.post<Credential>(`/staff/experts/${id}/credentials/${cid}:verify`, b),
      updateExpert: (id: string, b: { status: "active" | "suspended"; tier?: ExpertTier }) =>
        c.patch<ExpertDetail>(`/staff/experts/${id}`, b),
      reviews: async (q: { status?: ReviewStatus; project_id?: string }) =>
        unwrapList(await c.get<ListResponse<Review> | Review[]>("/staff/reviews", q)),
      review: (id: string) => c.get<ReviewDetail>(`/staff/reviews/${id}`),
      claimReview: (id: string) => c.post<Review>(`/staff/reviews/${id}:claim`),
      decideReview: (id: string, b: { decision: ReviewDecision; feedback: string }) =>
        c.post<Review>(`/staff/reviews/${id}:decide`, b),
      adjudications: async (q: { status?: "open" | "resolved"; project_id?: string }) =>
        unwrapList(await c.get<ListResponse<Adjudication> | Adjudication[]>("/staff/adjudications", q)),
      adjudication: (id: string) => c.get<AdjudicationDetail>(`/staff/adjudications/${id}`),
      resolveAdjudication: (id: string, b: AdjudicationResolveInput) =>
        c.post<Adjudication>(`/staff/adjudications/${id}:resolve`, b),
      audit: (q: { org_id?: string } & Page) => c.get<ListResponse<AuditEvent>>("/staff/audit-events", { ...q }),
    },
  };
}

export type Endpoints = ReturnType<typeof endpoints>;

/** PUTs a file to a presigned URL. Not proxied: the URL points at object storage. */
export async function putToPresignedUrl(
  ticket: UploadTicket,
  file: Blob,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(ticket.method ?? "PUT", ticket.url);
    for (const [k, v] of Object.entries(ticket.headers ?? {})) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) onProgress?.(ev.loaded / ev.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new ApiError(xhr.status, { title: "Upload failed", detail: `Storage responded with ${xhr.status}` }));
    xhr.onerror = () => reject(new ApiError(0, { title: "Upload failed", detail: "Could not reach storage." }));
    xhr.send(file);
  });
}
