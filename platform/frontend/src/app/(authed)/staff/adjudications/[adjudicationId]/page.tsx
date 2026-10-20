"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { RoleGate } from "@/components/AppShell";
import { ScorePicker } from "@/components/expert/ScorePicker";
import { ItemAndOutputs, SubmissionView } from "@/components/staff/SubmissionView";
import { Button, Card, Checkbox, ErrorAlert, Loading, Notice, PageHeader, Select, StatusBadge, TextBlock, Textarea, cx } from "@/components/ui";
import type { AdjudicationDetail, AdjudicationResolveInput, Slot } from "@/lib/api";
import { useApi } from "@/lib/auth";
import { useAsyncAction, useResource } from "@/lib/hooks";
import { fmtDate } from "@/lib/format";
import { REVIEW_ROLES } from "@/lib/roles";
import {
  MIN_ADJUDICATION_RATIONALE,
  consensusFinalResult,
  disagreements,
  finalResultFromSubmission,
  needsPreference,
  scoreKey,
  validateResolution,
  type FinalResult,
} from "@/lib/workbench";

export default function StaffAdjudicationPage() {
  return (
    <RoleGate roles={REVIEW_ROLES}>
      <AdjudicationScreen />
    </RoleGate>
  );
}

function AdjudicationScreen() {
  const { adjudicationId } = useParams<{ adjudicationId: string }>();
  const api = useApi();
  const res = useResource(`staff:adjudication:${adjudicationId}`, () => api.staff.adjudication(adjudicationId));
  const back = { href: "/staff/adjudications", label: "Adjudications" };

  if (!res.data) {
    return (
      <>
        <PageHeader title="Adjudication" back={back} />
        {res.loading ? <Loading label="Loading adjudication" /> : <ErrorAlert error={res.error} onRetry={res.reload} />}
      </>
    );
  }
  const a = res.data;
  const criteria = a.rubric_version?.criteria ?? [];
  const slots = a.outputs.map((o) => o.slot);
  const conflicts = disagreements(criteria, a.submissions);

  return (
    <>
      <PageHeader
        title={a.project_name}
        back={back}
        status={<StatusBadge status={a.status} />}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <span>{a.submissions.length} submissions</span>
            <span>Created {fmtDate(a.created_at)}</span>
          </span>
        }
      />
      <div className="flex flex-col gap-6">
        {a.rubric_version?.instructions_md && (
          <details className="rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5">
            <summary className="cursor-pointer text-base font-semibold text-fg">Rubric instructions (v{a.rubric_version.version})</summary>
            <TextBlock className="mt-3" text={a.rubric_version.instructions_md} />
          </details>
        )}
        <ItemAndOutputs item={a.item} outputs={a.outputs} />
        <section aria-labelledby="subs-heading">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="subs-heading" className="text-[15px] font-semibold tracking-tight text-fg">
              Submissions
            </h2>
            <span className="inline-flex items-center gap-2 rounded-full border border-warning-line bg-warning-subtle px-2.5 py-0.5 text-xs font-medium text-warning">
              <span aria-hidden="true" className="h-2 w-2 rounded-sm bg-warning" />
              {conflicts.size} {conflicts.size === 1 ? "disagreement" : "disagreements"} highlighted
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {a.submissions.map((s, i) => (
              <Card key={s.id} title={s.expert_pseudonym ?? `Submission ${i + 1}`}>
                <SubmissionView submission={s} criteria={criteria} errorLabels={a.rubric_version?.error_labels ?? []} slots={slots} highlight={conflicts} />
              </Card>
            ))}
          </div>
        </section>
        {a.status === "resolved" ? <Notice tone="green">This adjudication is resolved.</Notice> : <ResolveForm adj={a} slots={slots} conflicts={conflicts} onResolved={res.reload} />}
      </div>
    </>
  );
}

function ResolveForm({ adj, slots, conflicts, onResolved }: { adj: AdjudicationDetail; slots: Slot[]; conflicts: Set<string>; onResolved: () => void }) {
  const api = useApi();
  const criteria = adj.rubric_version?.criteria ?? [];
  const pairwise = adj.task_type ? needsPreference(adj.task_type) : adj.submissions.some((s) => s.preference);
  const hasCorrection = adj.submissions.some((s) => s.corrected_output?.text);
  const [mode, setMode] = useState<AdjudicationResolveInput["resolution"]>("merge");
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<FinalResult>(() => consensusFinalResult(criteria, adj.submissions));
  const [rationale, setRationale] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const resolve = useAsyncAction((b: AdjudicationResolveInput) => api.staff.resolveAdjudication(adj.id, b));

  const input: AdjudicationResolveInput = {
    resolution: mode,
    ...(mode === "select_submission" && selected ? { selected_submission_id: selected } : {}),
    final_result: result,
    rationale: rationale.trim(),
  };
  const errors = validateResolution(input, criteria, slots);
  const shown = showErrors ? errors : {};

  const pick = (id: string) => {
    setSelected(id);
    const sub = adj.submissions.find((s) => s.id === id);
    if (sub) setResult(finalResultFromSubmission(sub));
  };
  const pref = result.preference ?? { chosen_slot: null, is_tie: false, both_bad: false, strength: 1 };
  const prefChoice = pref.is_tie ? "tie" : (pref.chosen_slot ?? "");

  return (
    <Card title="Resolution">
      <div className="flex flex-col gap-5">
        <fieldset className="flex flex-wrap gap-3">
          <legend className="mb-1 text-sm font-medium text-fg">Method</legend>
          {(
            [
              ["merge", "Merge: set each final value"],
              ["select_submission", "Adopt one submission"],
            ] as const
          ).map(([id, label]) => (
            <label key={id} className="flex items-center gap-2 text-sm">
              <input type="radio" name="resolution" className="accent-primary" checked={mode === id} onChange={() => setMode(id)} />
              {label}
            </label>
          ))}
        </fieldset>

        {mode === "select_submission" && (
          <Select label="Submission" wrapperClassName="max-w-sm" value={selected} onChange={(e) => pick(e.target.value)} error={shown.selected_submission_id}>
            <option value="">Choose a submission</option>
            {adj.submissions.map((s, i) => (
              <option key={s.id} value={s.id}>
                {s.expert_pseudonym ?? `Submission ${i + 1}`}
              </option>
            ))}
          </Select>
        )}

        <div>
          <p className="mb-2 text-sm font-medium text-fg">Final scores</p>
          <ol className="flex flex-col divide-y divide-line">
            {criteria.map((c) => (
              <li key={c.key} className="py-3">
                <p className="mb-2 text-sm font-medium text-fg">{c.label}</p>
                <div className={cx("grid grid-cols-1 gap-3", slots.length > 1 && "md:grid-cols-2")}>
                  {slots.map((sl) => {
                    const k = scoreKey(c.key, sl);
                    return (
                      <ScorePicker
                        key={sl}
                        criterion={c}
                        label={`Response ${sl}`}
                        value={result.scores[k]}
                        highlight={conflicts.has(k)}
                        error={shown[`final_result.scores.${k}`]}
                        disabled={mode === "select_submission"}
                        onChange={(v) => setResult((r) => ({ ...r, scores: { ...r.scores, [k]: v } }))}
                      />
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {pairwise && (
          <fieldset disabled={mode === "select_submission"} className="flex flex-wrap items-end gap-3">
            <legend className="mb-1 text-sm font-medium text-fg">Final preference</legend>
            <Select
              label="Preferred"
              wrapperClassName="w-44"
              value={prefChoice}
              onChange={(e) => {
                const v = e.target.value;
                setResult((r) => ({
                  ...r,
                  preference: { ...pref, is_tie: v === "tie", chosen_slot: v === "A" || v === "B" ? v : null },
                }));
              }}
            >
              <option value="">None</option>
              {slots.map((sl) => (
                <option key={sl} value={sl}>
                  Response {sl}
                </option>
              ))}
              <option value="tie">Tie</option>
            </Select>
            <Select
              label="Strength"
              wrapperClassName="w-32"
              value={pref.strength}
              onChange={(e) => setResult((r) => ({ ...r, preference: { ...pref, strength: Number(e.target.value) } }))}
            >
              {[1, 2, 3].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
            <Checkbox label="Both bad" checked={pref.both_bad} onChange={(e) => setResult((r) => ({ ...r, preference: { ...pref, both_bad: e.target.checked } }))} />
          </fieldset>
        )}

        {hasCorrection && (
          <Textarea
            label="Final corrected text"
            rows={8}
            className="font-mono"
            disabled={mode === "select_submission"}
            value={result.corrected_text ?? ""}
            onChange={(e) => setResult((r) => ({ ...r, corrected_text: e.target.value }))}
          />
        )}

        <Textarea
          label={`Rationale (at least ${MIN_ADJUDICATION_RATIONALE} characters)`}
          required
          rows={4}
          value={rationale}
          error={shown.rationale}
          onChange={(e) => setRationale(e.target.value)}
        />
        <ErrorAlert error={resolve.error} />
        <div>
          <Button
            loading={resolve.pending}
            onClick={async () => {
              setShowErrors(true);
              if (Object.keys(errors).length) return;
              if (await resolve.run(input)) onResolved();
            }}
          >
            Resolve
          </Button>
        </div>
      </div>
    </Card>
  );
}
