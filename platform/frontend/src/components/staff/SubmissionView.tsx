"use client";

import { Badge, TextBlock, cx } from "@/components/ui";
import type { Criterion, ErrorLabelDef, ScoreValue, Slot, StaffOutput, StaffItem, Submission } from "@/lib/api";
import { fmtDuration } from "@/lib/format";
import { TOO_FAST_SECONDS, scoreKey } from "@/lib/workbench";

export function ItemAndOutputs({ item, outputs }: { item: StaffItem; outputs: StaffOutput[] }) {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <h2 className="mb-2 text-base font-semibold text-fg">Prompt</h2>
        <TextBlock className="prose-read" text={item.prompt} />
        {item.context && (
          <div className="mt-3 border-t border-line pt-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-fg-muted">Context</p>
            <TextBlock text={item.context} />
          </div>
        )}
        {item.reference_answer && (
          <div className="mt-3 border-t border-line pt-3">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-fg-muted">Reference answer</p>
            <TextBlock text={item.reference_answer} />
          </div>
        )}
      </section>
      <div className={cx("grid grid-cols-1 gap-4", outputs.length > 1 && "lg:grid-cols-2")}>
        {outputs.map((o) => (
          <section key={o.slot} className="rounded-xl border border-line bg-surface p-4 shadow-card sm:p-5">
            <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-fg">
              Response {o.slot} <Badge tone="purple">{o.model}</Badge>
            </h2>
            <div className="max-h-[28rem] overflow-y-auto">
              <TextBlock className="prose-read" text={o.text} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function fmtValue(v: ScoreValue | undefined): string {
  return v === undefined ? "-" : String(v);
}

/** Read-only rendering of one submission; `highlight` marks score keys that disagree. */
export function SubmissionView({
  submission: s,
  criteria,
  errorLabels,
  slots,
  highlight,
}: {
  submission: Submission;
  criteria: Criterion[];
  errorLabels: ErrorLabelDef[];
  slots: Slot[];
  highlight?: Set<string>;
}) {
  const byKey = new Map(s.scores.map((x) => [scoreKey(x.criterion_key, x.output_slot), x]));
  const labelName = new Map(errorLabels.map((l) => [l.key, l]));
  const keys = criteria.length ? criteria.map((c) => ({ key: c.key, label: c.label })) : [...new Set(s.scores.map((x) => x.criterion_key))].map((k) => ({ key: k, label: k }));
  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex flex-wrap gap-2 text-xs text-fg-muted">
        {s.revision !== undefined && <Badge>Revision {s.revision}</Badge>}
        <Badge>Confidence {s.confidence}/5</Badge>
        <Badge tone={s.time_spent_seconds < TOO_FAST_SECONDS ? "red" : "gray"}>Time {fmtDuration(s.time_spent_seconds)}</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <caption className="sr-only">Scores</caption>
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-fg-muted">
              <th scope="col" className="py-1 pr-3">
                Criterion
              </th>
              {slots.map((sl) => (
                <th key={sl} scope="col" className="px-2 py-1">
                  {sl}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {keys.map((c) => (
              <tr key={c.key}>
                <th scope="row" className="py-1.5 pr-3 text-left font-normal text-fg">
                  {c.label}
                </th>
                {slots.map((sl) => {
                  const k = scoreKey(c.key, sl);
                  const sc = byKey.get(k);
                  return (
                    <td
                      key={sl}
                      className={cx("px-2 py-1.5 align-top", highlight?.has(k) && "bg-warning-subtle text-warning shadow-[inset_3px_0_0_var(--warning)]")}
                    >
                      <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
                        {fmtValue(sc?.value)}
                        {highlight?.has(k) && <span className="sr-only"> (disagreement)</span>}
                      </span>
                      {sc?.explanation && <p className="mt-0.5 text-xs text-fg-muted">{sc.explanation}</p>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {s.error_labels.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-fg-muted">Error labels</p>
          <ul className="flex flex-col gap-1">
            {s.error_labels.map((l, i) => {
              const def = labelName.get(l.label_key);
              return (
                <li key={i}>
                  <Badge tone={def?.severity === "critical" ? "red" : def?.severity === "major" ? "yellow" : "gray"}>{l.output_slot}</Badge> {def?.label ?? l.label_key}
                  {l.note && <span className="text-fg-muted"> · {l.note}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {s.preference && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-fg-muted">Preference</p>
          <p>
            {s.preference.is_tie ? "Tie" : s.preference.chosen_slot ? `Response ${s.preference.chosen_slot} (strength ${s.preference.strength})` : "No choice"}
            {s.preference.both_bad && <Badge tone="red">Both bad</Badge>}
          </p>
          <TextBlock className="mt-1 text-fg-muted" text={s.preference.rationale} />
        </div>
      )}
      {s.corrected_output && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-fg-muted">Correction (from response {s.corrected_output.source_slot})</p>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-line bg-surface-sunken p-3">
            <TextBlock text={s.corrected_output.text} />
          </div>
          {s.corrected_output.rationale && <p className="mt-1 text-xs text-fg-muted">{s.corrected_output.rationale}</p>}
        </div>
      )}
      {s.overall_comment && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-fg-muted">Overall comment</p>
          <TextBlock text={s.overall_comment} />
        </div>
      )}
    </div>
  );
}
