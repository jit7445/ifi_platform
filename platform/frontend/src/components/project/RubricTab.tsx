"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  ErrorAlert,
  Input,
  Loading,
  Notice,
  Select,
  StatusBadge,
  Textarea,
  TextBlock,
  cx,
} from "@/components/ui";
import { ApiError, isApiError, type Criterion, type ErrorLabelDef, type Rubric, type RubricVersion, type RubricVersionInput, type ScaleType, type Severity } from "@/lib/api";
import { useApi } from "@/lib/auth";
import { useResource } from "@/lib/hooks";
import { fmtDate, humanize } from "@/lib/format";
import {
  WEIGHT_TOLERANCE,
  emptyRubricInput,
  newCriterion,
  normaliseWeights,
  toRubricInput,
  validateRubric,
  weightSum,
  withScaleType,
} from "@/lib/rubric";
import type { ProjectTabProps } from "./types";

function versionToInput(v: RubricVersion): RubricVersionInput {
  return {
    instructions_md: v.instructions_md ?? "",
    criteria: (v.criteria ?? []).map((c) => ({ ...c, anchors: c.anchors ?? {}, options: c.options ?? [] })),
    error_labels: v.error_labels ?? [],
    require_correction: !!v.require_correction,
    require_overall_comment: !!v.require_overall_comment,
  };
}

export function RubricTab({ orgId, project, reloadProject }: ProjectTabProps) {
  const api = useApi();
  const rubrics = useResource(`rubrics:${project.id}`, () => api.rubrics.listForProject(orgId, project.id));
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<unknown>(null);

  if (rubrics.loading && !rubrics.data) return <Loading label="Loading rubric" />;
  if (rubrics.error && !rubrics.data) return <ErrorAlert error={rubrics.error} onRetry={rubrics.reload} />;
  const rubric = rubrics.data?.[0];

  if (!rubric) {
    return (
      <EmptyState
        title="No rubric yet"
        action={
          <div className="flex flex-col items-center gap-2">
            <Button
              loading={creating}
              onClick={async () => {
                setCreating(true);
                setCreateError(null);
                try {
                  await api.rubrics.create(orgId, { name: `${project.name} rubric`, project_id: project.id });
                  rubrics.reload();
                } catch (e) {
                  setCreateError(e);
                } finally {
                  setCreating(false);
                }
              }}
            >
              Create rubric
            </Button>
            <ErrorAlert error={createError} />
          </div>
        }
      >
        The rubric defines the criteria, scales and error labels experts use for every task.
      </EmptyState>
    );
  }

  return (
    <RubricVersions
      key={rubric.id}
      orgId={orgId}
      rubric={rubric}
      currentVersionId={project.current_rubric_version_id}
      onChanged={() => {
        rubrics.reload();
        reloadProject();
      }}
    />
  );
}

function RubricVersions({
  orgId,
  rubric,
  currentVersionId,
  onChanged,
}: {
  orgId: string;
  rubric: Rubric;
  currentVersionId: string | null;
  onChanged: () => void;
}) {
  const versions = [...(rubric.versions ?? [])].sort((a, b) => b.version - a.version);
  const draft = versions.find((v) => v.status === "draft");
  const latestPublished = versions.find((v) => v.status === "published");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [startingNew, setStartingNew] = useState(false);
  const selected = versions.find((v) => v.id === selectedId) ?? draft ?? latestPublished ?? null;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[14rem_1fr]">
      <Card title="Versions">
        {versions.length === 0 && <p className="text-sm text-fg-muted">No versions yet.</p>}
        <ul className="flex flex-col gap-1">
          {versions.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(v.id);
                  setStartingNew(false);
                }}
                aria-current={selected?.id === v.id && !startingNew ? "true" : undefined}
                className={cx(
                  "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                  selected?.id === v.id && !startingNew ? "bg-primary-subtle text-primary-text" : "hover:bg-surface-hover",
                )}
              >
                <span>
                  v{v.version}
                  {v.id === currentVersionId && <span className="ml-1 text-xs text-success">(current)</span>}
                </span>
                <StatusBadge status={v.status} />
              </button>
            </li>
          ))}
        </ul>
        {!draft && (
          <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => setStartingNew(true)}>
            {latestPublished ? `New draft from v${latestPublished.version}` : "Start first draft"}
          </Button>
        )}
      </Card>

      <div>
        {startingNew || versions.length === 0 ? (
          <RubricEditor
            key={`new-${latestPublished?.id ?? "empty"}`}
            orgId={orgId}
            rubricId={rubric.id}
            version={null}
            initial={latestPublished ? versionToInput(latestPublished) : emptyRubricInput()}
            onSaved={() => {
              setStartingNew(false);
              setSelectedId(null);
              onChanged();
            }}
          />
        ) : selected && selected.status === "draft" ? (
          <RubricEditor
            key={selected.id}
            orgId={orgId}
            rubricId={rubric.id}
            version={selected}
            initial={versionToInput(selected)}
            onSaved={onChanged}
          />
        ) : selected ? (
          <PublishedVersion v={selected} isCurrent={selected.id === currentVersionId} />
        ) : null}
        {versions.length > 0 && !selected && !startingNew && <Loading />}
      </div>
    </div>
  );
}

function PublishedVersion({ v, isCurrent }: { v: RubricVersion; isCurrent: boolean }) {
  return (
    <Card
      title={`Version ${v.version}`}
      actions={
        <>
          {isCurrent && <Badge tone="green">Project current</Badge>}
          <StatusBadge status={v.status} />
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <Notice>
          Published versions are immutable. Published {fmtDate(v.published_at)}. Content SHA-256:{" "}
          <code className="break-all font-mono text-xs">{v.content_sha256 ?? "-"}</code>
        </Notice>
        <section>
          <h3 className="mb-1 text-sm font-semibold text-fg">Instructions</h3>
          <TextBlock text={v.instructions_md} className="rounded-md bg-surface-sunken p-3" />
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold text-fg">Criteria</h3>
          <ul className="flex flex-col gap-3">
            {v.criteria.map((c) => (
              <li key={c.key} className="rounded-md border border-line p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-fg">{c.label}</span>
                  <code className="font-mono text-xs text-fg-muted">{c.key}</code>
                  <Badge>{humanize(c.scale_type)}</Badge>
                  <Badge tone="blue">weight {c.weight}</Badge>
                  {c.is_required && <Badge tone="purple">required</Badge>}
                </div>
                {c.description && <p className="mt-1 text-fg-muted">{c.description}</p>}
                <p className="mt-1 text-xs text-fg-muted">
                  {c.scale_type === "categorical" ? `Options: ${c.options.join(", ")}` : `Scale ${c.scale_min} to ${c.scale_max}`}
                  {c.explanation_required_below !== null && `; explanation required below ${c.explanation_required_below}`}
                </p>
                {Object.keys(c.anchors ?? {}).length > 0 && (
                  <ul className="mt-2 grid gap-1 text-xs text-fg-muted sm:grid-cols-2">
                    {Object.entries(c.anchors).map(([k, t]) => (
                      <li key={k}>
                        <strong>{k}</strong>: {t}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold text-fg">Error labels</h3>
          {v.error_labels.length === 0 ? (
            <p className="text-sm text-fg-muted">None</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {v.error_labels.map((l) => (
                <li key={l.key}>
                  <Badge tone={l.severity === "critical" ? "red" : l.severity === "major" ? "yellow" : "gray"}>
                    {l.label} ({l.severity})
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
        <p className="text-sm text-fg-muted">
          Correction required: {v.require_correction ? "yes" : "no"}. Overall comment required: {v.require_overall_comment ? "yes" : "no"}.
        </p>
      </div>
    </Card>
  );
}

function RubricEditor({
  orgId,
  rubricId,
  version,
  initial,
  onSaved,
}: {
  orgId: string;
  rubricId: string;
  version: RubricVersion | null;
  initial: RubricVersionInput;
  onSaved: () => void;
}) {
  const api = useApi();
  const [r, setR] = useState<RubricVersionInput>(initial);
  const [local, setLocal] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState<"save" | "publish" | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const server = error instanceof ApiError ? normalise(error.fieldErrors()) : {};
  const fe = { ...server, ...local };
  const sum = weightSum(r.criteria);
  const sumOk = Math.abs(sum - 1) <= WEIGHT_TOLERANCE;

  const setCrit = (i: number, c: Criterion) => setR((p) => ({ ...p, criteria: p.criteria.map((x, j) => (j === i ? c : x)) }));
  const setLabel = (i: number, l: ErrorLabelDef) => setR((p) => ({ ...p, error_labels: p.error_labels.map((x, j) => (j === i ? l : x)) }));

  async function persist(): Promise<RubricVersion | null> {
    const errs = validateRubric(r);
    setLocal(errs);
    if (Object.keys(errs).length) return null;
    const body = toRubricInput(r);
    return version ? api.rubrics.updateVersion(orgId, rubricId, version.id, body) : api.rubrics.createVersion(orgId, rubricId, body);
  }

  async function save() {
    setPending("save");
    setError(null);
    setSaved(null);
    try {
      const v = await persist();
      if (v) {
        setSaved("Draft saved.");
        onSaved();
      }
    } catch (e) {
      setError(e);
    } finally {
      setPending(null);
    }
  }

  async function publish() {
    if (!window.confirm("Publish this version? Published rubrics cannot be edited, and it becomes the project's current rubric.")) return;
    setPending("publish");
    setError(null);
    setSaved(null);
    try {
      const v = await persist();
      if (v) {
        await api.rubrics.publish(orgId, rubricId, v.id);
        onSaved();
      }
    } catch (e) {
      setError(e);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card
        title={version ? `Draft v${version.version}` : "New draft"}
        actions={
          <>
            <Button variant="secondary" onClick={save} loading={pending === "save"} disabled={pending !== null}>
              Save draft
            </Button>
            <Button onClick={publish} loading={pending === "publish"} disabled={pending !== null}>
              Publish
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {saved && <Notice tone="green">{saved}</Notice>}
          {isApiError(error, "rubric_immutable") ? (
            <ErrorAlert error={error} title="This version is already published and cannot be changed. Start a new draft instead." />
          ) : (
            <ErrorAlert error={error} />
          )}
          {Object.keys(local).length > 0 && (
            <p role="alert" className="text-sm font-medium text-danger">
              Fix the highlighted fields before saving.
            </p>
          )}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-fg">Instructions for experts (Markdown)</span>
              <button type="button" className="text-sm text-primary-text hover:underline" onClick={() => setPreview((p) => !p)}>
                {preview ? "Edit" : "Preview"}
              </button>
            </div>
            {preview ? (
              <TextBlock text={r.instructions_md} className="min-h-[10rem] rounded-md border border-line bg-surface-sunken p-3" />
            ) : (
              <Textarea
                aria-label="Instructions for experts"
                rows={8}
                className="font-mono"
                value={r.instructions_md}
                onChange={(e) => setR({ ...r, instructions_md: e.target.value })}
                error={fe.instructions_md}
              />
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            <Checkbox
              label="Require a corrected answer"
              checked={r.require_correction}
              onChange={(e) => setR({ ...r, require_correction: e.target.checked })}
            />
            <Checkbox
              label="Require an overall comment"
              checked={r.require_overall_comment}
              onChange={(e) => setR({ ...r, require_overall_comment: e.target.checked })}
            />
          </div>
        </div>
      </Card>

      <Card
        title="Criteria"
        actions={
          <>
            <span
              className={cx("text-sm font-medium tabular-nums", sumOk ? "text-success" : "text-danger")}
              aria-live="polite"
            >
              Weights sum: {sum.toFixed(3)} {sumOk ? "(ok)" : "(must be 1)"}
            </span>
            <Button variant="secondary" size="sm" onClick={() => setR({ ...r, criteria: normaliseWeights(r.criteria) })}>
              Normalise
            </Button>
          </>
        }
      >
        {fe.weights && <p className="mb-3 text-sm font-medium text-danger">{fe.weights}</p>}
        {fe.criteria && <p className="mb-3 text-sm font-medium text-danger">{fe.criteria}</p>}
        <ol className="flex flex-col gap-4">
          {r.criteria.map((c, i) => (
            <li key={i} className="rounded-md border border-line p-4">
              <CriterionEditor
                c={c}
                index={i}
                errors={fe}
                onChange={(nc) => setCrit(i, nc)}
                onRemove={() => setR({ ...r, criteria: r.criteria.filter((_, j) => j !== i) })}
                onMove={(d) => {
                  const j = i + d;
                  if (j < 0 || j >= r.criteria.length) return;
                  const next = [...r.criteria];
                  [next[i], next[j]] = [next[j], next[i]];
                  setR({ ...r, criteria: next });
                }}
              />
            </li>
          ))}
        </ol>
        <Button variant="secondary" className="mt-4" onClick={() => setR({ ...r, criteria: [...r.criteria, newCriterion(r.criteria.length)] })}>
          Add criterion
        </Button>
      </Card>

      <Card title="Error labels">
        <p className="mb-3 text-sm text-fg-muted">Experts tag outputs with these labels. Severity drives reporting and review triggers.</p>
        {r.error_labels.length === 0 && <p className="mb-3 text-sm text-fg-muted">No error labels.</p>}
        <ul className="flex flex-col gap-3">
          {r.error_labels.map((l, i) => (
            <li key={i} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_10rem_auto]">
              <Input
                label="Key"
                className="font-mono"
                value={l.key}
                onChange={(e) => setLabel(i, { ...l, key: e.target.value })}
                error={fe[`error_labels.${i}.key`]}
              />
              <Input label="Label" value={l.label} onChange={(e) => setLabel(i, { ...l, label: e.target.value })} error={fe[`error_labels.${i}.label`]} />
              <Select label="Severity" value={l.severity} onChange={(e) => setLabel(i, { ...l, severity: e.target.value as Severity })}>
                <option value="minor">Minor</option>
                <option value="major">Major</option>
                <option value="critical">Critical</option>
              </Select>
              <Button variant="ghost" onClick={() => setR({ ...r, error_labels: r.error_labels.filter((_, j) => j !== i) })} aria-label={`Remove label ${l.label || l.key}`}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => setR({ ...r, error_labels: [...r.error_labels, { key: `label_${r.error_labels.length + 1}`, label: "", severity: "major" }] })}
        >
          Add error label
        </Button>
      </Card>
    </div>
  );
}

function CriterionEditor({
  c,
  index,
  errors,
  onChange,
  onRemove,
  onMove,
}: {
  c: Criterion;
  index: number;
  errors: Record<string, string>;
  onChange: (c: Criterion) => void;
  onRemove: () => void;
  onMove: (d: -1 | 1) => void;
}) {
  const p = `criteria.${index}`;
  const points: number[] = [];
  if (c.scale_type !== "categorical" && Number.isInteger(c.scale_min) && Number.isInteger(c.scale_max) && c.scale_max - c.scale_min <= 10) {
    for (let v = c.scale_min; v <= c.scale_max; v++) points.push(v);
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-fg">
          Criterion {index + 1}
          {c.label ? `: ${c.label}` : ""}
        </h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onMove(-1)} aria-label={`Move criterion ${index + 1} up`}>
            Up
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onMove(1)} aria-label={`Move criterion ${index + 1} down`}>
            Down
          </Button>
          <Button variant="ghost" size="sm" onClick={onRemove} aria-label={`Remove criterion ${index + 1}`}>
            Remove
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input label="Key" className="font-mono" value={c.key} onChange={(e) => onChange({ ...c, key: e.target.value })} error={errors[`${p}.key`]} />
        <Input label="Label" value={c.label} onChange={(e) => onChange({ ...c, label: e.target.value })} error={errors[`${p}.label`]} wrapperClassName="lg:col-span-2" />
        <Select label="Scale type" value={c.scale_type} onChange={(e) => onChange(withScaleType(c, e.target.value as ScaleType))}>
          <option value="likert">Likert</option>
          <option value="binary">Binary</option>
          <option value="categorical">Categorical</option>
        </Select>
        <Textarea
          label="Description"
          rows={2}
          wrapperClassName="sm:col-span-2 lg:col-span-4"
          value={c.description}
          onChange={(e) => onChange({ ...c, description: e.target.value })}
        />
        {c.scale_type === "likert" && (
          <>
            <Input
              label="Min"
              type="number"
              step={1}
              value={Number.isNaN(c.scale_min) ? "" : c.scale_min}
              onChange={(e) => onChange({ ...c, scale_min: e.target.valueAsNumber })}
              error={errors[`${p}.scale_min`]}
            />
            <Input
              label="Max"
              type="number"
              step={1}
              value={Number.isNaN(c.scale_max) ? "" : c.scale_max}
              onChange={(e) => onChange({ ...c, scale_max: e.target.valueAsNumber })}
              error={errors[`${p}.scale_max`]}
            />
          </>
        )}
        {c.scale_type === "categorical" && (
          <Input
            label="Options"
            hint="Comma separated"
            wrapperClassName="sm:col-span-2"
            value={c.options.join(", ")}
            onChange={(e) => {
              const options = e.target.value.split(",").map((o) => o.trimStart());
              onChange({ ...c, options, scale_min: 0, scale_max: Math.max(0, options.length - 1) });
            }}
            error={errors[`${p}.options`]}
          />
        )}
        <Input
          label="Weight"
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={Number.isNaN(c.weight) ? "" : c.weight}
          onChange={(e) => onChange({ ...c, weight: e.target.valueAsNumber })}
          error={errors[`${p}.weight`]}
        />
        {c.scale_type !== "categorical" && (
          <Input
            label="Explanation required below"
            type="number"
            hint="Leave empty for never"
            value={c.explanation_required_below ?? ""}
            onChange={(e) => onChange({ ...c, explanation_required_below: e.target.value === "" ? null : e.target.valueAsNumber })}
            error={errors[`${p}.explanation_required_below`]}
          />
        )}
        <div className="flex items-end pb-2">
          <Checkbox label="Required" checked={c.is_required} onChange={(e) => onChange({ ...c, is_required: e.target.checked })} />
        </div>
      </div>
      {points.length > 0 && (
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-fg">Anchors</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {points.map((v) => (
              <Input
                key={v}
                label={c.scale_type === "binary" ? (v === 1 ? "1 (yes)" : "0 (no)") : String(v)}
                value={c.anchors[String(v)] ?? ""}
                placeholder="What this score means"
                onChange={(e) => onChange({ ...c, anchors: { ...c.anchors, [String(v)]: e.target.value } })}
              />
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}

function normalise(errs: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, msg] of Object.entries(errs)) out[k.replace(/\[(\d+)\]/g, ".$1")] = msg;
  return out;
}
