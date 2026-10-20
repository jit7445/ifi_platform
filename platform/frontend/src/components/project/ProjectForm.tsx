"use client";

import { useState, type FormEvent } from "react";
import { Button, Card, ErrorAlert, Input, Loading, Select, Textarea, cx } from "@/components/ui";
import {
  ApiError,
  type DeliverableFormat,
  type Difficulty,
  type Project,
  type ProjectInput,
  type Skill,
  type TaskType,
} from "@/lib/api";
import { useApi } from "@/lib/auth";
import { useResource } from "@/lib/hooks";
import { humanize } from "@/lib/format";

const STEPS = ["Basics", "Task", "Volume", "Quality", "Experts", "Review"] as const;
type Step = (typeof STEPS)[number];

const STEP_FIELDS: Record<Step, string[]> = {
  Basics: ["name", "code", "description", "domain"],
  Task: ["task_type", "deliverable_format", "languages", "difficulty"],
  Volume: ["target_volume", "deadline"],
  Quality: ["quality"],
  Experts: ["required_skills", "excluded_companies"],
  Review: [],
};

export const TASK_TYPES: { value: TaskType; label: string; help: string }[] = [
  { value: "rubric_scoring", label: "Rubric scoring", help: "Experts score each model output against your criteria." },
  { value: "pairwise_preference", label: "Pairwise preference", help: "Experts compare two outputs and pick the better one." },
  { value: "sft_correction", label: "SFT correction", help: "Experts rewrite outputs into gold-standard answers." },
];

const DEFAULT_DELIVERABLE: Record<TaskType, DeliverableFormat> = {
  rubric_scoring: "evaluation_results",
  pairwise_preference: "preference_pairs",
  sft_correction: "sft",
};

export function emptyProject(): ProjectInput {
  return {
    name: "",
    code: "",
    description: "",
    domain: "",
    task_type: "rubric_scoring",
    languages: ["en"],
    difficulty: "professional",
    target_volume: 500,
    deadline: "",
    deliverable_format: "evaluation_results",
    quality: { overlap_k: 2, review_rate: 0.1, gold_rate: 0.05, agreement_threshold: 0.67 },
    required_skills: [],
    excluded_companies: [],
  };
}

export function projectToInput(p: Project): ProjectInput {
  return {
    name: p.name,
    code: p.code,
    description: p.description ?? "",
    domain: p.domain ?? "",
    task_type: p.task_type,
    languages: p.languages ?? ["en"],
    difficulty: p.difficulty,
    target_volume: p.target_volume,
    deadline: p.deadline ?? "",
    deliverable_format: p.deliverable_format,
    quality: p.quality,
    required_skills: p.required_skills ?? [],
    excluded_companies: p.excluded_companies ?? [],
  };
}

function toDateInput(v: string): string {
  return v ? v.slice(0, 10) : "";
}

function fromDateInput(v: string): string {
  return v ? `${v}T23:59:59Z` : "";
}

function validateStep(step: Step, v: ProjectInput): Record<string, string> {
  const e: Record<string, string> = {};
  if (step === "Basics") {
    if (!v.name.trim()) e.name = "Name is required";
    if (!/^[A-Z0-9-]{2,24}$/.test(v.code)) e.code = "2 to 24 characters: capital letters, digits and hyphens";
    if (!v.domain.trim()) e.domain = "Domain is required";
  }
  if (step === "Task") {
    if (v.languages.length === 0) e.languages = "Add at least one language";
  }
  if (step === "Volume") {
    if (!Number.isInteger(v.target_volume) || v.target_volume < 1) e.target_volume = "Enter a whole number above 0";
    if (!v.deadline) e.deadline = "Pick a deadline";
  }
  if (step === "Quality") {
    const q = v.quality;
    if (!Number.isInteger(q.overlap_k) || q.overlap_k < 1 || q.overlap_k > 5) e["quality.overlap_k"] = "Between 1 and 5";
    if (!(q.review_rate >= 0 && q.review_rate <= 1)) e["quality.review_rate"] = "Between 0 and 1";
    if (!(q.gold_rate >= 0 && q.gold_rate <= 0.3)) e["quality.gold_rate"] = "Between 0 and 0.3";
    if (!(q.agreement_threshold >= 0 && q.agreement_threshold <= 1)) e["quality.agreement_threshold"] = "Between 0 and 1";
  }
  if (step === "Experts") {
    v.required_skills.forEach((s, i) => {
      if (s.min_level < 1 || s.min_level > 5) e[`required_skills.${i}.min_level`] = "Level 1 to 5";
    });
  }
  return e;
}

export function ProjectForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: ProjectInput;
  submitLabel: string;
  onSubmit: (v: ProjectInput) => Promise<void>;
}) {
  const api = useApi();
  const skills = useResource<Skill[]>("skills", () => api.skills());
  const [v, setV] = useState<ProjectInput>(initial);
  const [stepIdx, setStepIdx] = useState(0);
  const [local, setLocal] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const [langDraft, setLangDraft] = useState("");
  const [companyDraft, setCompanyDraft] = useState("");
  const step = STEPS[stepIdx];

  const server = error instanceof ApiError ? normaliseFieldKeys(error.fieldErrors()) : {};
  const fe = { ...server, ...local };
  const stepHasError = (s: Step) => Object.keys(server).some((k) => STEP_FIELDS[s].some((f) => k === f || k.startsWith(`${f}.`)));

  const patch = (p: Partial<ProjectInput>) => setV((prev) => ({ ...prev, ...p }));
  const patchQ = (p: Partial<ProjectInput["quality"]>) => setV((prev) => ({ ...prev, quality: { ...prev.quality, ...p } }));

  function goNext() {
    const errs = validateStep(step, v);
    setLocal(errs);
    if (Object.keys(errs).length === 0) setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (step !== "Review") {
      goNext();
      return;
    }
    for (let i = 0; i < STEPS.length - 1; i++) {
      const errs = validateStep(STEPS[i], v);
      if (Object.keys(errs).length) {
        setLocal(errs);
        setStepIdx(i);
        return;
      }
    }
    setPending(true);
    setError(null);
    try {
      await onSubmit(v);
    } catch (err) {
      setError(err);
      if (err instanceof ApiError) {
        const keys = Object.keys(normaliseFieldKeys(err.fieldErrors()));
        const first = STEPS.findIndex((s) => keys.some((k) => STEP_FIELDS[s].some((f) => k === f || k.startsWith(`${f}.`))));
        if (first >= 0) setStepIdx(first);
      }
    } finally {
      setPending(false);
    }
  }

  const skillList = skills.data ?? [];
  const skillMap = new Map(skillList.map((s) => [s.key, s]));

  return (
    <form onSubmit={submit} noValidate>
      <ol className="mb-6 flex flex-wrap gap-2" aria-label="Wizard steps">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => i < stepIdx && setStepIdx(i)}
              aria-current={i === stepIdx ? "step" : undefined}
              disabled={i > stepIdx}
              className={cx(
                "flex items-center gap-2 rounded-full border px-3 py-1 text-sm",
                i === stepIdx ? "border-primary bg-primary-subtle font-medium text-primary-text" : "border-line-strong bg-surface text-fg-muted",
                i > stepIdx && "opacity-60",
                stepHasError(s) && "border-danger",
              )}
            >
              <span className="text-xs text-fg-subtle">{i + 1}</span>
              {s}
            </button>
          </li>
        ))}
      </ol>

      <Card title={step}>
        <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {step === "Basics" && (
            <>
              <Input label="Project name" required value={v.name} onChange={(e) => patch({ name: e.target.value })} error={fe.name} />
              <Input
                label="Project code"
                required
                hint="Short reference, e.g. FIN-QA-01"
                value={v.code}
                onChange={(e) => patch({ code: e.target.value.toUpperCase() })}
                error={fe.code}
                className="font-mono"
              />
              <Input
                label="Domain"
                required
                hint="e.g. Finance, Clinical medicine, Contract law"
                value={v.domain}
                onChange={(e) => patch({ domain: e.target.value })}
                error={fe.domain}
              />
              <Textarea
                label="Description"
                wrapperClassName="sm:col-span-2"
                value={v.description}
                onChange={(e) => patch({ description: e.target.value })}
                error={fe.description}
                hint="What is being evaluated and why. Experts see a summary of this."
              />
            </>
          )}

          {step === "Task" && (
            <>
              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-sm font-medium text-fg">Task type</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {TASK_TYPES.map((t) => (
                    <label
                      key={t.value}
                      className={cx(
                        "cursor-pointer rounded-md border p-3 text-sm",
                        v.task_type === t.value ? "border-primary bg-primary-subtle" : "border-line-strong bg-surface",
                      )}
                    >
                      <input
                        type="radio"
                        name="task_type"
                        className="sr-only"
                        checked={v.task_type === t.value}
                        onChange={() => patch({ task_type: t.value, deliverable_format: DEFAULT_DELIVERABLE[t.value] })}
                      />
                      <span className="block font-medium text-fg">{t.label}</span>
                      <span className="mt-1 block text-fg-muted">{t.help}</span>
                    </label>
                  ))}
                </div>
                {fe.task_type && <p className="mt-1 text-xs text-danger">{fe.task_type}</p>}
              </fieldset>
              <Select
                label="Deliverable format"
                value={v.deliverable_format}
                onChange={(e) => patch({ deliverable_format: e.target.value as DeliverableFormat })}
                error={fe.deliverable_format}
              >
                <option value="evaluation_results">Evaluation results</option>
                <option value="sft">SFT dataset</option>
                <option value="preference_pairs" disabled={v.task_type !== "pairwise_preference"}>
                  Preference pairs
                </option>
              </Select>
              <Select
                label="Difficulty"
                value={v.difficulty}
                onChange={(e) => patch({ difficulty: e.target.value as Difficulty })}
                error={fe.difficulty}
              >
                <option value="general">General</option>
                <option value="professional">Professional</option>
                <option value="expert">Expert</option>
              </Select>
              <div className="sm:col-span-2">
                <div className="flex items-end gap-2">
                  <Input
                    label="Languages"
                    hint="ISO codes such as en, hi, de. Press Add after each."
                    value={langDraft}
                    onChange={(e) => setLangDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addLang();
                      }
                    }}
                    wrapperClassName="flex-1"
                    error={fe.languages}
                  />
                  <Button variant="secondary" onClick={addLang} className="mb-[1.375rem]">
                    Add
                  </Button>
                </div>
                <ChipList items={v.languages} onRemove={(x) => patch({ languages: v.languages.filter((l) => l !== x) })} />
              </div>
            </>
          )}

          {step === "Volume" && (
            <>
              <Input
                label="Target volume (items)"
                type="number"
                min={1}
                required
                value={Number.isNaN(v.target_volume) ? "" : v.target_volume}
                onChange={(e) => patch({ target_volume: e.target.valueAsNumber })}
                error={fe.target_volume}
              />
              <Input
                label="Deadline"
                type="date"
                required
                value={toDateInput(v.deadline)}
                onChange={(e) => patch({ deadline: fromDateInput(e.target.value) })}
                error={fe.deadline}
              />
            </>
          )}

          {step === "Quality" && (
            <>
              <Input
                label="Overlap (experts per item)"
                type="number"
                min={1}
                max={5}
                value={Number.isNaN(v.quality.overlap_k) ? "" : v.quality.overlap_k}
                onChange={(e) => patchQ({ overlap_k: e.target.valueAsNumber })}
                error={fe["quality.overlap_k"]}
                hint="1 to 5. Two or more enables agreement metrics and adjudication."
              />
              <Input
                label="Review rate"
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={Number.isNaN(v.quality.review_rate) ? "" : v.quality.review_rate}
                onChange={(e) => patchQ({ review_rate: e.target.valueAsNumber })}
                error={fe["quality.review_rate"]}
                hint="Share of finalized tasks sampled for reviewer QA (0 to 1)."
              />
              <Input
                label="Gold rate"
                type="number"
                min={0}
                max={0.3}
                step={0.01}
                value={Number.isNaN(v.quality.gold_rate) ? "" : v.quality.gold_rate}
                onChange={(e) => patchQ({ gold_rate: e.target.valueAsNumber })}
                error={fe["quality.gold_rate"]}
                hint="Share of hidden known-answer items (0 to 0.3)."
              />
              <Input
                label="Agreement threshold"
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={Number.isNaN(v.quality.agreement_threshold) ? "" : v.quality.agreement_threshold}
                onChange={(e) => patchQ({ agreement_threshold: e.target.valueAsNumber })}
                error={fe["quality.agreement_threshold"]}
                hint="Minimum Krippendorff alpha considered acceptable (0 to 1)."
              />
            </>
          )}

          {step === "Experts" && (
            <>
              <div className="sm:col-span-2">
                <p className="mb-2 text-sm font-medium text-fg">Required skills</p>
                {skills.loading && <Loading label="Loading skills" />}
                <ErrorAlert error={skills.error} onRetry={skills.reload} />
                {skills.data && (
                  <div className="flex flex-col gap-2">
                    {v.required_skills.map((s, i) => (
                      <div key={`${s.skill_key}-${i}`} className="flex flex-wrap items-end gap-2">
                        <Select
                          label={`Skill ${i + 1}`}
                          value={s.skill_key}
                          wrapperClassName="min-w-[12rem] flex-1"
                          onChange={(e) =>
                            patch({
                              required_skills: v.required_skills.map((x, j) => (j === i ? { ...x, skill_key: e.target.value } : x)),
                            })
                          }
                        >
                          {skillList.map((sk) => (
                            <option key={sk.key} value={sk.key}>
                              {sk.label} ({sk.domain})
                            </option>
                          ))}
                        </Select>
                        <Select
                          label="Minimum level"
                          value={s.min_level}
                          wrapperClassName="w-36"
                          error={fe[`required_skills.${i}.min_level`]}
                          onChange={(e) =>
                            patch({
                              required_skills: v.required_skills.map((x, j) => (j === i ? { ...x, min_level: Number(e.target.value) } : x)),
                            })
                          }
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </Select>
                        <Button
                          variant="ghost"
                          aria-label={`Remove skill ${skillMap.get(s.skill_key)?.label ?? s.skill_key}`}
                          onClick={() => patch({ required_skills: v.required_skills.filter((_, j) => j !== i) })}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                    {skillList.length === 0 ? (
                      <p className="text-sm text-fg-muted">No skills are configured on the platform yet.</p>
                    ) : (
                      <div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            const unused = skillList.find((sk) => !v.required_skills.some((r) => r.skill_key === sk.key));
                            if (unused) patch({ required_skills: [...v.required_skills, { skill_key: unused.key, min_level: 3 }] });
                          }}
                        >
                          Add required skill
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="sm:col-span-2">
                <div className="flex items-end gap-2">
                  <Input
                    label="Excluded companies"
                    hint="Experts with a declared relationship to these organisations are excluded."
                    value={companyDraft}
                    onChange={(e) => setCompanyDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCompany();
                      }
                    }}
                    wrapperClassName="flex-1"
                    error={fe.excluded_companies}
                  />
                  <Button variant="secondary" onClick={addCompany} className="mb-[1.375rem]">
                    Add
                  </Button>
                </div>
                <ChipList
                  items={v.excluded_companies}
                  onRemove={(x) => patch({ excluded_companies: v.excluded_companies.filter((c) => c !== x) })}
                />
              </div>
            </>
          )}

          {step === "Review" && (
            <div className="sm:col-span-2">
              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <Row k="Name" v={`${v.name} (${v.code})`} />
                <Row k="Domain" v={v.domain} />
                <Row k="Task type" v={humanize(v.task_type)} />
                <Row k="Deliverable" v={humanize(v.deliverable_format)} />
                <Row k="Difficulty" v={humanize(v.difficulty)} />
                <Row k="Languages" v={v.languages.join(", ")} />
                <Row k="Target volume" v={String(v.target_volume)} />
                <Row k="Deadline" v={toDateInput(v.deadline)} />
                <Row
                  k="Quality"
                  v={`overlap ${v.quality.overlap_k}, review ${v.quality.review_rate}, gold ${v.quality.gold_rate}, agreement ${v.quality.agreement_threshold}`}
                />
                <Row
                  k="Required skills"
                  v={
                    v.required_skills.length
                      ? v.required_skills.map((s) => `${skillMap.get(s.skill_key)?.label ?? s.skill_key} (L${s.min_level}+)`).join(", ")
                      : "None"
                  }
                />
                <Row k="Excluded companies" v={v.excluded_companies.join(", ") || "None"} />
              </dl>
            </div>
          )}
        </div>
        <div className="mt-6 flex flex-col gap-3">
          <ErrorAlert error={error} />
          <div className="flex flex-wrap gap-2">
            {stepIdx > 0 && (
              <Button variant="secondary" onClick={() => setStepIdx((i) => i - 1)}>
                Back
              </Button>
            )}
            <Button type="submit" loading={pending}>
              {step === "Review" ? submitLabel : "Continue"}
            </Button>
          </div>
        </div>
      </Card>
    </form>
  );

  function addLang() {
    const parts = langDraft
      .split(/[\s,]+/)
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);
    if (parts.length) patch({ languages: Array.from(new Set([...v.languages, ...parts])) });
    setLangDraft("");
  }

  function addCompany() {
    const c = companyDraft.trim();
    if (c && !v.excluded_companies.includes(c)) patch({ excluded_companies: [...v.excluded_companies, c] });
    setCompanyDraft("");
  }
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-fg-muted">{k}</dt>
      <dd className="mt-0.5 text-fg">{v || "-"}</dd>
    </div>
  );
}

function ChipList({ items, onRemove }: { items: string[]; onRemove: (x: string) => void }) {
  if (!items.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {items.map((x) => (
        <li key={x}>
          <span className="inline-flex items-center gap-1 rounded-full bg-surface-sunken py-0.5 pl-2.5 pr-1 text-sm text-fg">
            {x}
            <button type="button" onClick={() => onRemove(x)} className="rounded-full px-1.5 text-fg-muted hover:bg-surface-hover" aria-label={`Remove ${x}`}>
              &times;
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Maps server paths like `quality[0]` or `required_skills[1].min_level` onto the dotted keys used by the form. */
function normaliseFieldKeys(errs: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, msg] of Object.entries(errs)) out[k.replace(/\[(\d+)\]/g, ".$1").replace(/^body\./, "")] = msg;
  return out;
}

