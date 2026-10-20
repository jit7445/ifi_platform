"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Checkbox, ErrorAlert, Modal, Notice, ProgressBar, Select, StatusBadge, TextBlock, Textarea, cx } from "@/components/ui";
import { IconAlert, IconCheckCircle, IconClock, IconCloudCheck } from "@/components/icons";
import type { Slot, TaskPayload } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useInterval } from "@/lib/hooks";
import { fmtDate, fmtDuration, humanize } from "@/lib/format";
import {
  MIN_CORRECTION,
  MIN_EXPLANATION,
  MIN_PREFERENCE_RATIONALE,
  TOO_FAST_SECONDS,
  buildSubmission,
  completion,
  needsCorrection,
  needsExplanation,
  needsPreference,
  restoreDraft,
  scoreKey,
  slotsOf,
  toDraft,
  validateWorkbench,
  type WorkbenchState,
} from "@/lib/workbench";
import { AnchorList, ScorePicker } from "./ScorePicker";

const AUTOSAVE_MS = 30_000;
const STRENGTHS = [
  { v: 1, label: "Slightly better" },
  { v: 2, label: "Clearly better" },
  { v: 3, label: "Much better" },
];

type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "saved"; at: Date } | { kind: "error"; error: unknown };

export function Workbench({ task, onSubmitted }: { task: TaskPayload; onSubmitted: () => void }) {
  const { api } = useAuth();
  const router = useRouter();
  const [initial] = useState(() => restoreDraft(task, task.draft));
  const [state, setState] = useState<WorkbenchState>(initial.state);
  const [elapsed, setElapsed] = useState(initial.elapsed);
  const [dirty, setDirty] = useState(false);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState<unknown>(null);

  const editable = task.status === "in_progress" || task.status === "rework";
  const slots = slotsOf(task);
  const rv = task.rubric_version;
  const errors = validateWorkbench(task, state);
  const visibleErrors = showErrors ? errors : {};
  const errorCount = Object.keys(errors).length;
  const { done, total } = completion(task, state);

  const elapsedRef = useRef(elapsed);
  useEffect(() => {
    elapsedRef.current = elapsed;
  });

  useInterval(
    () => {
      if (document.visibilityState === "visible") setElapsed((s) => s + 1);
    },
    1000,
    editable,
  );

  const saveDraft = async (s: WorkbenchState) => {
    setSave({ kind: "saving" });
    try {
      await api.expert.saveDraft(task.assignment_id, toDraft(s, elapsedRef.current));
      setDirty(false);
      setSave({ kind: "saved", at: new Date() });
    } catch (e) {
      setSave({ kind: "error", error: e });
    }
  };
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });
  useInterval(() => void saveDraft(stateRef.current), AUTOSAVE_MS, editable && dirty && save.kind !== "saving");

  useEffect(() => {
    if (!editable || !dirty) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [editable, dirty]);

  const update = (fn: (s: WorkbenchState) => WorkbenchState) => {
    setState(fn);
    setDirty(true);
  };

  const submit = async () => {
    setShowErrors(true);
    setSubmitError(null);
    if (errorCount > 0) {
      document.getElementById("workbench-errors")?.focus();
      return;
    }
    setSubmitting(true);
    try {
      await api.expert.submit(task.assignment_id, buildSubmission(task, state, elapsed));
      setDirty(false);
      onSubmitted();
    } catch (e) {
      setSubmitError(e);
    } finally {
      setSubmitting(false);
    }
  };

  const release = async () => {
    setReleasing(true);
    setReleaseError(null);
    try {
      await api.expert.release(task.assignment_id);
      setDirty(false);
      router.push("/expert");
    } catch (e) {
      setReleaseError(e);
    } finally {
      setReleasing(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-36 sm:pb-28">
      <div className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
        <StatusBadge status={task.status} />
        <Badge>{humanize(task.task_type)}</Badge>
        <Badge>Rubric v{rv.version}</Badge>
        {task.lease_expires_at && (
          <span className="inline-flex items-center gap-1 text-xs">
            <IconClock size={14} /> Reserved until {fmtDate(task.lease_expires_at)}
          </span>
        )}
      </div>

      {!editable && <Notice>This task has been submitted and is read-only.</Notice>}

      {task.feedback.length > 0 && (
        <section aria-labelledby="feedback-heading" className="rounded-xl border border-warning-line bg-warning-subtle p-4 sm:p-5">
          <h2 id="feedback-heading" className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-warning">
            <IconAlert size={18} /> Reviewer feedback
          </h2>
          <ul className="flex flex-col gap-3">
            {task.feedback.map((f, i) => (
              <li key={i} className="rounded-lg border border-warning-line bg-surface p-3 text-sm">
                <p className="mb-1 text-xs font-medium text-fg-muted">
                  {humanize(f.from)} · {fmtDate(f.created_at)}
                </p>
                <TextBlock text={f.message} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_26rem] xl:gap-6">
        <div className="flex min-w-0 flex-col gap-5 xl:col-start-1 xl:row-start-1">
          {rv.instructions_md && (
            <details className="group rounded-xl border border-line bg-surface shadow-card" open={task.status !== "rework"}>
              <summary className="cursor-pointer list-none px-4 py-3 text-[15px] font-semibold text-fg sm:px-5 [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">
                    &#8250;
                  </span>
                  Instructions
                </span>
              </summary>
              <div className="border-t border-line px-4 py-4 sm:px-5">
                <TextBlock className="prose-read" text={rv.instructions_md} />
              </div>
            </details>
          )}

          <Card title="Prompt">
            <TextBlock className="prose-read" text={task.item.prompt} />
            {task.item.context && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-fg-muted">Context</p>
                <TextBlock className="prose-read text-fg-muted" text={task.item.context} />
              </div>
            )}
          </Card>

          <div className={cx("grid grid-cols-1 gap-4", slots.length > 1 && "md:grid-cols-2")}>
            {task.outputs.map((o, i) => (
              <section key={o.slot} aria-labelledby={`response-${o.slot}`} className="flex min-w-0 flex-col rounded-xl border border-line bg-surface shadow-card">
                <header className="flex items-center gap-2.5 border-b border-line px-4 py-3 sm:px-5">
                  <span
                    aria-hidden="true"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold text-on-primary"
                    style={{ background: i === 0 ? "var(--chart-1)" : "var(--chart-2)" }}
                  >
                    {o.slot}
                  </span>
                  <h2 id={`response-${o.slot}`} className="text-[15px] font-semibold text-fg">
                    Response {o.slot}
                  </h2>
                </header>
                <div className="max-h-[65vh] overflow-y-auto px-4 py-4 sm:px-5" tabIndex={0} aria-label={`Response ${o.slot} text`}>
                  <TextBlock className="prose-read" text={o.text} />
                </div>
              </section>
            ))}
          </div>
        </div>

        <aside aria-label="Scoring" className="min-w-0 xl:sticky xl:top-[4.5rem] xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:max-h-[calc(100vh-11rem)] xl:self-start xl:overflow-y-auto xl:rounded-xl">
          <fieldset disabled={!editable} className="min-w-0">
            <Card
              title="Scoring"
              subtitle={`${done} of ${total} required scores`}
              actions={
                <span className="w-24">
                  <ProgressBar value={total ? done / total : 1} label="Required scores completed" hideLabel tone="accent" />
                </span>
              }
            >
              <ol className="flex flex-col gap-5">
                {rv.criteria.map((c, idx) => {
                  const complete = slots.every((sl) => {
                    const v = state.scores[scoreKey(c.key, sl)]?.value;
                    return v !== null && v !== undefined;
                  });
                  return (
                    <li key={c.key} className={cx("min-w-0", idx > 0 && "border-t border-line pt-5")}>
                      <div className="mb-3 flex items-start gap-2.5">
                        <span
                          aria-hidden="true"
                          className={cx(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                            complete ? "bg-accent-subtle text-accent-text" : "bg-surface-sunken text-fg-muted ring-1 ring-inset ring-line",
                          )}
                        >
                          {complete ? <IconCheckCircle size={14} /> : idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-fg">
                            {c.label}
                            {c.is_required ? (
                              <span className="ml-1 text-danger" title="Required">
                                *<span className="sr-only"> (required)</span>
                              </span>
                            ) : (
                              <span className="ml-2 rounded-full bg-surface-sunken px-1.5 py-0.5 text-[11px] font-medium text-fg-muted">optional</span>
                            )}
                          </p>
                          {c.description && <p className="mt-0.5 text-sm text-fg-muted">{c.description}</p>}
                          <AnchorList criterion={c} />
                        </div>
                      </div>
                      <div className={cx("grid grid-cols-1 gap-4", slots.length > 1 && "md:grid-cols-2 xl:grid-cols-1")}>
                        {slots.map((slot) => {
                          const k = scoreKey(c.key, slot);
                          const entry = state.scores[k];
                          const explain = needsExplanation(c, entry?.value);
                          return (
                            <div key={slot} className="flex min-w-0 flex-col gap-2">
                              <ScorePicker
                                criterion={c}
                                label={`Response ${slot}`}
                                value={entry?.value}
                                error={visibleErrors[`scores.${k}`]}
                                onChange={(v) =>
                                  update((s) => ({ ...s, scores: { ...s.scores, [k]: { value: v, explanation: s.scores[k]?.explanation ?? "" } } }))
                                }
                              />
                              {(explain || entry?.explanation) && (
                                <Textarea
                                  label={explain ? `Why this score? (at least ${MIN_EXPLANATION} characters)` : "Explanation"}
                                  required={explain}
                                  rows={2}
                                  value={entry?.explanation ?? ""}
                                  error={visibleErrors[`scores.${k}.explanation`]}
                                  onChange={(e) =>
                                    update((s) => ({
                                      ...s,
                                      scores: { ...s.scores, [k]: { value: s.scores[k]?.value ?? null, explanation: e.target.value } },
                                    }))
                                  }
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Card>
          </fieldset>
        </aside>

        <div className="flex min-w-0 flex-col gap-5 xl:col-start-1 xl:row-start-2">
          <fieldset disabled={!editable} className="flex min-w-0 flex-col gap-5">
            {rv.error_labels.length > 0 && (
              <Card title="Error labels" subtitle="Tick every problem you found. Add a note to point at the exact issue.">
                <div className={cx("grid grid-cols-1 gap-6", slots.length > 1 && "md:grid-cols-2")}>
                  {slots.map((slot) => (
                    <fieldset key={slot} className="flex min-w-0 flex-col gap-2.5">
                      <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">Response {slot}</legend>
                      {rv.error_labels.map((l) => {
                        const k = scoreKey(l.key, slot);
                        const on = k in state.labels;
                        return (
                          <div key={l.key} className="flex flex-col gap-1.5">
                            <Checkbox
                              checked={on}
                              label={
                                <span className="flex flex-wrap items-center gap-2">
                                  {l.label}
                                  <Badge tone={l.severity === "critical" ? "red" : l.severity === "major" ? "yellow" : "gray"}>{l.severity}</Badge>
                                </span>
                              }
                              onChange={(e) =>
                                update((s) => {
                                  const labels = { ...s.labels };
                                  if (e.target.checked) labels[k] = { note: "" };
                                  else delete labels[k];
                                  return { ...s, labels };
                                })
                              }
                            />
                            {on && (
                              <Textarea
                                label={<span className="sr-only">Note for {l.label} on response {slot}</span>}
                                placeholder="Optional note"
                                rows={1}
                                className="min-h-0"
                                wrapperClassName="pl-6"
                                value={state.labels[k].note}
                                onChange={(e) => update((s) => ({ ...s, labels: { ...s.labels, [k]: { note: e.target.value } } }))}
                              />
                            )}
                          </div>
                        );
                      })}
                    </fieldset>
                  ))}
                </div>
              </Card>
            )}

            {needsPreference(task.task_type) && (
              <Card title="Preference">
                <div className="flex flex-col gap-5">
                  <fieldset aria-invalid={visibleErrors["preference.choice"] ? true : undefined}>
                    <legend className="mb-2 text-sm font-medium text-fg">
                      Which response is better overall?
                      <span className="ml-0.5 text-danger" aria-hidden="true">
                        *
                      </span>
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {([...slots, "tie"] as (Slot | "tie")[]).map((ch) => (
                        <label
                          key={ch}
                          className={cx(
                            "flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus",
                            state.preference.choice === ch
                              ? "border-primary bg-primary-subtle text-primary-text"
                              : "border-line-strong bg-surface text-fg hover:border-primary hover:bg-primary-subtle",
                          )}
                        >
                          <input
                            type="radio"
                            name="preference-choice"
                            className="accent-primary"
                            checked={state.preference.choice === ch}
                            onChange={() => update((s) => ({ ...s, preference: { ...s.preference, choice: ch } }))}
                          />
                          {ch === "tie" ? "About the same" : `Response ${ch}`}
                        </label>
                      ))}
                      {state.preference.choice !== null && (
                        <Button variant="ghost" size="sm" className="self-center" onClick={() => update((s) => ({ ...s, preference: { ...s.preference, choice: null } }))}>
                          Clear
                        </Button>
                      )}
                    </div>
                    {visibleErrors["preference.choice"] && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-danger" role="alert">
                        <IconAlert size={13} />
                        {visibleErrors["preference.choice"]}
                      </p>
                    )}
                  </fieldset>
                  {(state.preference.choice === "A" || state.preference.choice === "B") && (
                    <Select
                      label="How much better?"
                      wrapperClassName="max-w-xs"
                      value={state.preference.strength}
                      onChange={(e) => update((s) => ({ ...s, preference: { ...s.preference, strength: Number(e.target.value) } }))}
                    >
                      {STRENGTHS.map((st) => (
                        <option key={st.v} value={st.v}>
                          {st.label}
                        </option>
                      ))}
                    </Select>
                  )}
                  <Checkbox
                    label="Both responses are unacceptable"
                    hint="You can still pick the less bad one."
                    checked={state.preference.both_bad}
                    onChange={(e) => update((s) => ({ ...s, preference: { ...s.preference, both_bad: e.target.checked } }))}
                  />
                  <Textarea
                    label={`Rationale (at least ${MIN_PREFERENCE_RATIONALE} characters)`}
                    required
                    rows={3}
                    value={state.preference.rationale}
                    error={visibleErrors["preference.rationale"]}
                    onChange={(e) => update((s) => ({ ...s, preference: { ...s.preference, rationale: e.target.value } }))}
                  />
                </div>
              </Card>
            )}

            {needsCorrection(task) && (
              <Card title="Corrected response">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-end gap-2">
                    {slots.length > 1 && (
                      <Select
                        label="Based on"
                        wrapperClassName="w-44"
                        value={state.correction.source_slot}
                        onChange={(e) => update((s) => ({ ...s, correction: { ...s.correction, source_slot: e.target.value as Slot } }))}
                      >
                        {slots.map((sl) => (
                          <option key={sl} value={sl}>
                            Response {sl}
                          </option>
                        ))}
                      </Select>
                    )}
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const src = task.outputs.find((o) => o.slot === state.correction.source_slot);
                        if (!src) return;
                        if (state.correction.text.trim() && !window.confirm("Replace your current text with the original response?")) return;
                        update((s) => ({ ...s, correction: { ...s.correction, text: src.text } }));
                      }}
                    >
                      Copy response {state.correction.source_slot} to edit
                    </Button>
                  </div>
                  <Textarea
                    label={`Corrected text (at least ${MIN_CORRECTION} characters)`}
                    required
                    rows={10}
                    className="font-mono"
                    value={state.correction.text}
                    error={visibleErrors["corrected_output.text"]}
                    onChange={(e) => update((s) => ({ ...s, correction: { ...s.correction, text: e.target.value } }))}
                  />
                  <Textarea
                    label="What did you change and why?"
                    rows={2}
                    value={state.correction.rationale}
                    onChange={(e) => update((s) => ({ ...s, correction: { ...s.correction, rationale: e.target.value } }))}
                  />
                </div>
              </Card>
            )}

            <Card title="Wrap up">
              <div className="flex flex-col gap-5">
                <Textarea
                  label="Overall comment"
                  required={rv.require_overall_comment}
                  rows={3}
                  value={state.overall_comment}
                  error={visibleErrors.overall_comment}
                  onChange={(e) => update((s) => ({ ...s, overall_comment: e.target.value }))}
                />
                <fieldset aria-invalid={visibleErrors.confidence ? true : undefined}>
                  <legend className="mb-2 text-sm font-medium text-fg">
                    How confident are you in this evaluation?
                    <span className="ml-0.5 text-danger" aria-hidden="true">
                      *
                    </span>
                  </legend>
                  <div className="flex flex-wrap gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <label
                        key={n}
                        className={cx(
                          "flex h-10 min-w-11 cursor-pointer items-center justify-center rounded-lg border px-3 text-sm font-semibold tabular-nums transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus",
                          state.confidence === n
                            ? "border-primary bg-primary text-on-primary shadow-card"
                            : "border-line-strong bg-surface text-fg hover:border-primary hover:bg-primary-subtle",
                        )}
                      >
                        <input type="radio" name="confidence" className="sr-only" checked={state.confidence === n} onChange={() => update((s) => ({ ...s, confidence: n }))} />
                        {n}
                      </label>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-fg-muted">1 is a guess, 5 is certain.</p>
                  {visibleErrors.confidence && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-danger" role="alert">
                      <IconAlert size={13} />
                      {visibleErrors.confidence}
                    </p>
                  )}
                </fieldset>
              </div>
            </Card>
          </fieldset>

          {showErrors && errorCount > 0 && (
            <div id="workbench-errors" tabIndex={-1} role="alert" className="flex gap-3 rounded-lg border border-danger-line bg-danger-subtle p-3 text-sm text-danger">
              <IconAlert size={18} className="mt-px shrink-0" />
              <div>
                <p className="font-medium">
                  {errorCount} {errorCount === 1 ? "item needs" : "items need"} attention before you can submit
                </p>
                <ul className="mt-1 list-disc pl-5">
                  {Object.values(errors)
                    .slice(0, 8)
                    .map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                </ul>
              </div>
            </div>
          )}
          <ErrorAlert error={submitError} title="The submission was not accepted" />
        </div>
      </div>

      {editable && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 px-4 py-3 shadow-pop backdrop-blur">
          <div className="mx-auto flex max-w-[96rem] flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
              <span className="inline-flex items-center gap-1.5" aria-label={`Time spent ${fmtDuration(elapsed)}`}>
                <IconClock size={16} className="text-fg-subtle" />
                <span className="font-mono text-fg tabular-nums">{fmtDuration(elapsed)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs" aria-live="polite">
                {save.kind === "saving" && "Saving draft..."}
                {save.kind === "saved" && (
                  <>
                    <IconCloudCheck size={16} className="text-success" />
                    Draft saved {save.at.toLocaleTimeString()}
                  </>
                )}
                {save.kind === "error" && (
                  <span className="inline-flex items-center gap-1 text-danger">
                    <IconAlert size={14} /> Draft not saved
                  </span>
                )}
                {save.kind === "idle" && dirty && "Unsaved changes"}
              </span>
              <span className="hidden text-xs sm:inline">
                <span className="font-semibold tabular-nums text-fg">
                  {done}/{total}
                </span>{" "}
                required scores
              </span>
              {elapsed < TOO_FAST_SECONDS && <span className="text-xs text-warning">Very quick submissions are flagged for review.</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setReleaseOpen(true)}>
                Release task
              </Button>
              <Button variant="secondary" size="sm" loading={save.kind === "saving"} onClick={() => void saveDraft(state)}>
                Save draft
              </Button>
              <Button loading={submitting} onClick={() => void submit()}>
                Submit evaluation
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal open={releaseOpen} title="Release this task?" onClose={() => setReleaseOpen(false)}>
        <p className="text-sm text-fg-muted">The task goes back to the pool for another expert. Your draft will be discarded.</p>
        <ErrorAlert error={releaseError} />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setReleaseOpen(false)}>
            Keep working
          </Button>
          <Button variant="danger" loading={releasing} onClick={() => void release()}>
            Release
          </Button>
        </div>
      </Modal>
    </div>
  );
}
