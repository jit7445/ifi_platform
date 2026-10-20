"use client";

import { useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorAlert, Loading, Notice, ProgressBar, Stat, Table, Td, Th, cx } from "@/components/ui";
import { IconChart, IconRefresh } from "@/components/icons";
import { alphaBand, overallAlpha } from "@/lib/quality";
import { isApiError, type Metrics } from "@/lib/api";
import { useApi, useAuth } from "@/lib/auth";
import { useInterval, useResource } from "@/lib/hooks";
import { fmtDate, fmtNum, fmtPct } from "@/lib/format";
import { isOrgAdmin } from "@/lib/roles";
import type { ProjectTabProps } from "./types";

export function QualityTab({ orgId, project }: ProjectTabProps) {
  const api = useApi();
  const { me } = useAuth();
  const canCompute = isOrgAdmin(me, orgId);
  const metrics = useResource(`metrics:${project.id}`, () => api.metrics.latest(orgId, project.id));
  const [computing, setComputing] = useState<{ previous: string | null; ticks: number } | null>(null);
  const [error, setError] = useState<unknown>(null);

  useInterval(
    () => {
      if (!computing) return;
      api.metrics.latest(orgId, project.id).then(
        (m) => {
          if (m.metric_run_id !== computing.previous) {
            setComputing(null);
            metrics.mutate(() => m);
          } else if (computing.ticks >= 40) {
            setComputing(null);
          } else {
            setComputing({ ...computing, ticks: computing.ticks + 1 });
          }
        },
        () => setComputing((c) => (c && c.ticks >= 40 ? null : c && { ...c, ticks: c.ticks + 1 })),
      );
    },
    3000,
    computing !== null,
  );

  async function recompute() {
    setError(null);
    try {
      await api.metrics.compute(orgId, project.id);
      setComputing({ previous: metrics.data?.metric_run_id ?? null, ticks: 0 });
    } catch (e) {
      setError(e);
    }
  }

  const notFound = isApiError(metrics.error, "not_found") || (metrics.error as { status?: number } | undefined)?.status === 404;
  const m = metrics.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">{m ? `Computed ${fmtDate(m.computed_at)}` : "Quality metrics are computed on demand."}</p>
        {canCompute && (
          <Button onClick={recompute} loading={computing !== null} variant="secondary" size="sm">
            {!computing && <IconRefresh size={15} />}
            {computing ? "Computing" : "Recompute metrics"}
          </Button>
        )}
      </div>
      <ErrorAlert error={error} />
      {metrics.loading && !m && <Loading label="Loading metrics" />}
      {!m && notFound && (
        <EmptyState title="No metrics yet" icon={IconChart}>
          Metrics appear once experts have submitted work{canCompute ? " and you run a computation" : ""}.
        </EmptyState>
      )}
      {!m && metrics.error && !notFound ? <ErrorAlert error={metrics.error} onRetry={metrics.reload} /> : null}
      {m && <MetricsView m={m} threshold={project.quality.agreement_threshold} />}
    </div>
  );
}

const interpretationTone = { reliable: "green", tentative: "yellow", unreliable: "red", insufficient_data: "gray" } as const;
const bandStatTone = { reliable: "green", tentative: "yellow", unreliable: "red", insufficient_data: "default" } as const;
const SERIES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"];

function rateTone(v: number | null | undefined, good: number, warn: number, higherIsBetter = true) {
  if (v === null || v === undefined) return "default" as const;
  if (higherIsBetter) return v >= good ? ("green" as const) : v >= warn ? ("yellow" as const) : ("red" as const);
  return v <= good ? ("green" as const) : v <= warn ? ("yellow" as const) : ("red" as const);
}

function MetricsView({ m, threshold }: { m: Metrics; threshold: number }) {
  const p = m.progress;
  const alpha = overallAlpha(m);
  const band = alphaBand(alpha);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Agreement (alpha)" value={fmtNum(alpha, 3)} tone={bandStatTone[band]} hint={alpha === null ? "Not enough overlap" : `${band.replace(/_/g, " ")}, threshold ${threshold}`} />
        <Stat label="Gold accuracy" value={fmtPct(m.gold_accuracy.value)} tone={rateTone(m.gold_accuracy.value, 0.85, 0.7)} hint={`n = ${m.gold_accuracy.n}`} />
        <Stat label="Acceptance rate" value={fmtPct(m.review.acceptance_rate)} tone={rateTone(m.review.acceptance_rate, 0.85, 0.7)} hint={`${m.review.n} reviews`} />
        <Stat label="Rework rate" value={fmtPct(m.review.rework_rate)} tone={rateTone(m.review.rework_rate, 0.1, 0.2, false)} hint={`Rejected ${fmtPct(m.review.rejection_rate)}`} />
      </div>

      <Card>
        <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_auto]">
          <ProgressBar value={p.tasks_total ? p.tasks_completed / p.tasks_total : 0} label={`${p.tasks_completed} of ${p.tasks_total} tasks completed`} />
          <p className="text-sm text-fg-muted">
            <span className="font-semibold tabular-nums text-fg">{p.submissions}</span> submissions
          </p>
          <p className="text-sm text-fg-muted">
            <span className="font-semibold tabular-nums text-fg">{fmtNum(p.throughput_per_day, 1)}</span> tasks per day
          </p>
        </div>
      </Card>

      <Card title="Model scores" subtitle="Mean score per criterion with 95% confidence interval whiskers">
        {m.model_scores.length === 0 ? <p className="text-sm text-fg-muted">No finalized scores yet.</p> : <ModelScoreChart scores={m.model_scores} />}
      </Card>

      {m.win_rates && m.win_rates.length > 0 && (
        <Card title="Head-to-head win rates" subtitle="Share of pairwise comparisons won by each model, ties in grey">
          <WinRates rows={m.win_rates} />
        </Card>
      )}

      <Card title="Inter-annotator agreement" flush>
        {m.agreement.length === 0 ? (
          <p className="p-4 text-sm text-fg-muted sm:p-5">Not enough overlapping submissions yet.</p>
        ) : (
          <div className="p-4 sm:p-5">
            <Table caption="Agreement by criterion">
              <thead>
                <tr>
                  <Th>Criterion</Th>
                  <Th>Metric</Th>
                  <Th className="text-right">Alpha</Th>
                  <Th className="text-right">% agreement</Th>
                  <Th className="text-right">Items</Th>
                  <Th>Interpretation</Th>
                </tr>
              </thead>
              <tbody>
                {m.agreement.map((a) => (
                  <tr key={a.criterion}>
                    <Td className="font-mono text-xs">{a.criterion}</Td>
                    <Td className="text-xs text-fg-muted">Krippendorff alpha ({a.level})</Td>
                    <Td className={cx("text-right font-medium tabular-nums", a.value !== null && a.value < threshold && "text-danger")}>{fmtNum(a.value, 3)}</Td>
                    <Td className="text-right tabular-nums">{fmtPct(a.percent_agreement)}</Td>
                    <Td className="text-right tabular-nums">{a.n_items}</Td>
                    <Td>
                      <Badge tone={interpretationTone[a.interpretation] ?? "gray"} dot>
                        {a.interpretation.replace(/_/g, " ")}
                      </Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <p className="mt-3 text-xs text-fg-muted">Alpha of 0.8 or above is reliable, 0.667 to 0.8 tentative. Project threshold: {threshold}.</p>
            {m.preference_agreement && (
              <p className="mt-2 text-sm text-fg">
                Preference agreement ({m.preference_agreement.metric}): <strong>{fmtNum(m.preference_agreement.value, 3)}</strong>,{" "}
                {fmtPct(m.preference_agreement.percent_agreement)} raw agreement over {m.preference_agreement.n_items} items.
              </p>
            )}
          </div>
        )}
      </Card>

      <Card title="Error labels">
        {m.error_labels.length === 0 ? (
          <p className="text-sm text-fg-muted">No error labels applied.</p>
        ) : (
          <Table caption="Error label counts">
            <thead>
              <tr>
                <Th>Label</Th>
                <Th className="text-right">Count</Th>
                <Th className="text-right">Critical</Th>
              </tr>
            </thead>
            <tbody>
              {[...m.error_labels]
                .sort((a, b) => b.count - a.count)
                .map((l) => (
                  <tr key={l.key}>
                    <Td>
                      {l.label} <span className="font-mono text-xs text-fg-subtle">{l.key}</span>
                    </Td>
                    <Td className="text-right tabular-nums">{l.count}</Td>
                    <Td className={cx("text-right tabular-nums", l.critical_count > 0 && "font-semibold text-danger")}>{l.critical_count}</Td>
                  </tr>
                ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Notice>Metrics reflect the latest computation run, not live data.</Notice>
    </>
  );
}

function ModelScoreChart({ scores }: { scores: Metrics["model_scores"] }) {
  const models = [...new Set(scores.map((s) => s.model))];
  const criteria = [...new Set(scores.map((s) => s.criterion))];
  const max = Math.max(1, Math.ceil(Math.max(...scores.map((s) => Math.max(s.mean, s.ci?.[1] ?? s.mean)))));
  const ticks = [0, max / 2, max];
  const x = (v: number) => (Math.max(0, Math.min(max, v)) / max) * 100;
  const color = (model: string) => SERIES[models.indexOf(model) % SERIES.length];

  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted" aria-label="Legend">
        {models.map((mo) => (
          <li key={mo} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ background: color(mo) }} />
            {mo}
          </li>
        ))}
      </ul>
      {criteria.map((crit) => (
        <div key={crit}>
          <p className="mb-2 font-mono text-xs font-medium text-fg">{crit}</p>
          <div className="flex flex-col gap-1.5">
            {scores
              .filter((s) => s.criterion === crit)
              .map((s) => {
                const lo = s.ci?.[0] ?? s.mean;
                const hi = s.ci?.[1] ?? s.mean;
                const desc = `${s.model}, ${crit}: mean ${fmtNum(s.mean, 2)}, 95% CI ${fmtNum(lo, 2)} to ${fmtNum(hi, 2)}, n ${s.n}`;
                return (
                  <div key={s.model} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3 sm:grid-cols-[minmax(0,10rem)_1fr_auto]">
                    <span className="truncate text-xs text-fg-muted" title={s.model}>
                      {s.model}
                    </span>
                    <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="h-5 w-full overflow-visible" role="img" aria-label={desc}>
                      <title>{desc}</title>
                      {ticks.map((t) => (
                        <line key={t} x1={x(t)} x2={x(t)} y1={0} y2={20} stroke="var(--chart-grid)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                      ))}
                      <rect x={0} y={4} width={x(s.mean)} height={12} rx={1} fill={color(s.model)} opacity={0.9} />
                      <line x1={x(lo)} x2={x(hi)} y1={10} y2={10} stroke="var(--fg)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                      <line x1={x(lo)} x2={x(lo)} y1={5} y2={15} stroke="var(--fg)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                      <line x1={x(hi)} x2={x(hi)} y1={5} y2={15} stroke="var(--fg)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                    </svg>
                    <span className="w-24 text-right text-xs tabular-nums text-fg" aria-hidden="true">
                      <span className="font-semibold">{fmtNum(s.mean, 2)}</span>{" "}
                      <span className="text-fg-subtle">
                        &plusmn;{fmtNum((hi - lo) / 2, 2)}
                      </span>
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      ))}
      <div className="grid grid-cols-[minmax(0,7rem)_1fr_auto] gap-3 sm:grid-cols-[minmax(0,10rem)_1fr_auto]" aria-hidden="true">
        <span />
        <div className="relative h-4 text-[11px] tabular-nums text-fg-subtle">
          {ticks.map((t, i) => (
            <span key={t} className={cx("absolute top-0", i === 0 ? "left-0" : i === ticks.length - 1 ? "right-0" : "-translate-x-1/2")} style={i === 1 ? { left: "50%" } : undefined}>
              {fmtNum(t, 1)}
            </span>
          ))}
        </div>
        <span className="w-24" />
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-xs font-medium text-fg-muted hover:text-fg">Show data table</summary>
        <div className="mt-3">
          <Table caption="Mean score per model and criterion with 95% confidence intervals">
            <thead>
              <tr>
                <Th>Model</Th>
                <Th>Criterion</Th>
                <Th className="text-right">Mean</Th>
                <Th className="text-right">95% CI</Th>
                <Th className="text-right">n</Th>
              </tr>
            </thead>
            <tbody>
              {scores.map((s) => (
                <tr key={`${s.model}-${s.criterion}`}>
                  <Td className="font-medium">{s.model}</Td>
                  <Td className="font-mono text-xs">{s.criterion}</Td>
                  <Td className="text-right tabular-nums">{fmtNum(s.mean, 2)}</Td>
                  <Td className="text-right tabular-nums text-fg-muted">
                    {fmtNum(s.ci?.[0], 2)} to {fmtNum(s.ci?.[1], 2)}
                  </Td>
                  <Td className="text-right tabular-nums">{s.n}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </details>
    </div>
  );
}

function WinRates({ rows }: { rows: NonNullable<Metrics["win_rates"]> }) {
  return (
    <ul className="flex flex-col gap-5">
      {rows.map((w) => {
        const n = w.n || 1;
        const a = w.a_wins / n;
        const t = w.ties / n;
        const b = w.b_wins / n;
        const desc = `${w.model_a} wins ${fmtPct(a)}, ties ${fmtPct(t)}, ${w.model_b} wins ${fmtPct(b)} over ${w.n} comparisons`;
        return (
          <li key={`${w.model_a}-${w.model_b}`}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                <span className="font-medium text-fg">{w.model_a}</span> <span className="tabular-nums text-fg-muted">{fmtPct(a)}</span>
              </span>
              <span className="text-xs text-fg-subtle">
                {w.ties} ties, n {w.n}
              </span>
              <span className="min-w-0 truncate text-right">
                <span className="tabular-nums text-fg-muted">{fmtPct(b)}</span> <span className="font-medium text-fg">{w.model_b}</span>
              </span>
            </div>
            <div className="overflow-hidden rounded-full">
            <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="block h-3 w-full" role="img" aria-label={desc}>
              <title>{desc}</title>
              <rect x={0} y={0} width={a * 100} height={10} fill="var(--chart-1)" />
              <rect x={a * 100} y={0} width={t * 100} height={10} fill="var(--line-strong)" />
              <rect x={(a + t) * 100} y={0} width={b * 100} height={10} fill="var(--chart-2)" />
              <line x1={50} x2={50} y1={0} y2={10} stroke="var(--surface)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            </svg>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
