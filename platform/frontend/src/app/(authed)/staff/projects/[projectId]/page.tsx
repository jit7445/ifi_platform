"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { RoleGate } from "@/components/AppShell";
import { IconUsers } from "@/components/icons";
import {
  Badge,
  Button,
  Card,
  DefList,
  EmptyState,
  ErrorAlert,
  Input,
  Loading,
  Modal,
  Notice,
  PageHeader,
  MiniBar,
  ProgressBar,
  StatusBadge,
  Table,
  Td,
  Textarea,
  Th,
} from "@/components/ui";
import type { AssignmentResult, Project, Recommendation } from "@/lib/api";
import { useApi } from "@/lib/auth";
import { useAsyncAction, useResource } from "@/lib/hooks";
import { fmtDay, fmtDuration, fmtNum, fmtPct, humanize } from "@/lib/format";
import { STAFF_ROLES } from "@/lib/roles";

export default function StaffProjectPage() {
  return (
    <RoleGate roles={STAFF_ROLES}>
      <StaffProject />
    </RoleGate>
  );
}

function StaffProject() {
  const { projectId } = useParams<{ projectId: string }>();
  const api = useApi();
  // There is no single-project staff endpoint, so the detail view reads the cross-org list.
  const res = useResource(`staff:project:${projectId}`, async () => {
    const all = await api.staff.projects();
    return all.find((p) => p.id === projectId) ?? null;
  });
  const back = { href: "/staff/projects", label: "Project queue" };

  if (res.data === undefined) {
    return (
      <>
        <PageHeader title="Project" back={back} />
        {res.loading ? <Loading label="Loading project" /> : <ErrorAlert error={res.error} onRetry={res.reload} />}
      </>
    );
  }
  if (res.data === null) {
    return (
      <>
        <PageHeader title="Project" back={back} />
        <EmptyState title="Project not found" />
      </>
    );
  }
  const p = res.data;
  return (
    <>
      <PageHeader
        title={p.name}
        back={back}
        status={<StatusBadge status={p.status} />}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-xs">{p.code}</span>
            <span aria-hidden="true" className="text-fg-subtle">
              /
            </span>
            <span>{p.org_name}</span>
          </span>
        }
      />
      <div className="flex flex-col gap-6">
        <Lifecycle project={p} onChanged={res.reload} />
        <Overview project={p} />
        <ProjectExperts project={p} />
        <ExpertMetrics projectId={p.id} />
      </div>
    </>
  );
}

function Lifecycle({ project: p, onChanged }: { project: Project; onChanged: () => void }) {
  const api = useApi();
  const [notice, setNotice] = useState<string | null>(null);
  const [changesOpen, setChangesOpen] = useState(false);
  const [note, setNote] = useState("");
  const action = useAsyncAction(async (fn: () => Promise<unknown>, done: string) => {
    setNotice(null);
    await fn();
    setNotice(done);
    onChanged();
    return true;
  });
  const generate = useAsyncAction(() => api.staff.generateTasks(p.id));

  const s = p.status;
  const canActivate = s === "approved" || s === "paused";
  const canGenerate = s === "approved" || s === "active" || s === "paused";

  return (
    <Card title="Lifecycle">
      <div className="flex flex-wrap gap-2">
        {s === "submitted" && (
          <>
            <Button loading={action.pending} onClick={() => action.run(() => api.staff.approve(p.id), "Project approved.")}>
              Approve
            </Button>
            <Button variant="secondary" onClick={() => setChangesOpen(true)}>
              Request changes
            </Button>
          </>
        )}
        {canActivate && (
          <Button loading={action.pending} onClick={() => action.run(() => api.staff.activate(p.id), "Project activated.")}>
            Activate
          </Button>
        )}
        {s === "active" && (
          <>
            <Button variant="secondary" loading={action.pending} onClick={() => action.run(() => api.staff.pause(p.id), "Project paused.")}>
              Pause
            </Button>
            <Button
              variant="secondary"
              loading={action.pending}
              onClick={() => {
                if (window.confirm("Mark this project as completed? Experts will no longer receive tasks.")) {
                  void action.run(() => api.staff.complete(p.id), "Project completed.");
                }
              }}
            >
              Complete
            </Button>
          </>
        )}
        {canGenerate && (
          <Button
            variant="secondary"
            loading={generate.pending}
            onClick={async () => {
              setNotice(null);
              const r = await generate.run();
              if (r) {
                setNotice(`Created ${r.created} tasks (${r.gold_tasks} gold).`);
                onChanged();
              }
            }}
          >
            Generate tasks
          </Button>
        )}
        {!["submitted", "approved", "active", "paused"].includes(s) && <p className="text-sm text-fg-muted">No staff actions for a {humanize(s).toLowerCase()} project.</p>}
      </div>
      {canActivate && (
        <p className="mt-2 text-xs text-fg-muted">Activation needs a published rubric and ingested items. Generate tasks before or after activating.</p>
      )}
      <div className="mt-3 flex flex-col gap-2">
        {notice && <Notice tone="green">{notice}</Notice>}
        <ErrorAlert error={action.error} />
        <ErrorAlert error={generate.error} />
      </div>

      <Modal open={changesOpen} title="Request changes" onClose={() => setChangesOpen(false)}>
        <Textarea label="What should the customer change?" required rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setChangesOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!note.trim()}
            loading={action.pending}
            onClick={async () => {
              const ok = await action.run(() => api.staff.requestChanges(p.id, note.trim()), "Changes requested.");
              if (ok) {
                setChangesOpen(false);
                setNote("");
              }
            }}
          >
            Send request
          </Button>
        </div>
      </Modal>
    </Card>
  );
}

function Overview({ project: p }: { project: Project }) {
  const c = p.counts ?? { items: 0, tasks: 0, tasks_completed: 0, submissions: 0 };
  return (
    <Card title="Overview">
      <div className="flex flex-col gap-4">
        {c.tasks > 0 && <ProgressBar value={c.tasks_completed / c.tasks} label={`${c.tasks_completed} of ${c.tasks} tasks completed`} />}
        <DefList
          items={[
            ["Task type", humanize(p.task_type)],
            ["Domain", p.domain || "-"],
            ["Difficulty", humanize(p.difficulty)],
            ["Languages", p.languages.join(", ") || "-"],
            ["Target volume", p.target_volume],
            ["Deadline", fmtDay(p.deadline)],
            ["Deliverable", humanize(p.deliverable_format)],
            ["Items / submissions", `${c.items} / ${c.submissions}`],
            [
              "Quality",
              `overlap ${p.quality.overlap_k}, review ${fmtPct(p.quality.review_rate)}, gold ${fmtPct(p.quality.gold_rate)}, agreement ${fmtNum(p.quality.agreement_threshold)}`,
            ],
            ["Rubric", p.current_rubric_version_id ? "Published" : "Not published"],
            [
              "Required skills",
              p.required_skills.length ? (
                <span className="flex flex-wrap gap-1">
                  {p.required_skills.map((s) => (
                    <Badge key={s.skill_key}>
                      {s.skill_key} &ge; {s.min_level}
                    </Badge>
                  ))}
                </span>
              ) : (
                "-"
              ),
            ],
            ["Excluded companies", p.excluded_companies.join(", ") || "-"],
          ]}
        />
        {p.description && <p className="whitespace-pre-wrap text-sm text-fg">{p.description}</p>}
      </div>
    </Card>
  );
}

function ProjectExperts({ project: p }: { project: Project }) {
  const api = useApi();
  const experts = useResource(`staff:project-experts:${p.id}`, () => api.staff.projectExperts(p.id));
  const revoke = useAsyncAction((expertId: string) => api.staff.revokeExpert(p.id, expertId));
  const [recommendOpen, setRecommendOpen] = useState(false);

  return (
    <Card
      title="Approved experts"
      actions={
        <Button size="sm" onClick={() => setRecommendOpen((o) => !o)} aria-expanded={recommendOpen}>
          {recommendOpen ? "Hide recommendations" : "Find experts"}
        </Button>
      }
    >
      {recommendOpen && (
        <div className="mb-6">
          <Recommend projectId={p.id} onAssigned={experts.reload} />
        </div>
      )}
      {experts.loading && !experts.data ? (
        <Loading label="Loading experts" variant="table" />
      ) : experts.error && !experts.data ? (
        <ErrorAlert error={experts.error} onRetry={experts.reload} />
      ) : !experts.data?.length ? (
        <EmptyState title="No experts approved yet" icon={IconUsers}>Use Find experts to get ranked recommendations.</EmptyState>
      ) : (
        <Table caption="Approved experts">
          <thead>
            <tr>
              <Th>Expert</Th>
              <Th className="text-right">Max tasks</Th>
              <Th className="text-right">Submissions</Th>
              <Th>Status</Th>
              <Th>Approved</Th>
              <Th>
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {experts.data.map((e) => (
              <tr key={e.expert_id}>
                <Td>
                  <Link href={`/staff/experts/${e.expert_id}`} className="font-medium text-primary-text hover:underline">
                    {e.display_name ?? e.pseudonym ?? e.expert_id.slice(0, 8)}
                  </Link>
                  {e.pseudonym && e.display_name && <p className="text-xs text-fg-muted">{e.pseudonym}</p>}
                </Td>
                <Td className="text-right tabular-nums">{e.max_tasks}</Td>
                <Td className="text-right tabular-nums">{e.submissions ?? "-"}</Td>
                <Td>{e.status ? <StatusBadge status={e.status} /> : "-"}</Td>
                <Td className="whitespace-nowrap">{fmtDay(e.approved_at)}</Td>
                <Td>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={revoke.pending}
                    onClick={async () => {
                      if (!window.confirm("Remove this expert from the project? In-progress tasks return to the pool.")) return;
                      await revoke.run(e.expert_id);
                      experts.reload();
                    }}
                  >
                    Remove
                  </Button>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <ErrorAlert error={revoke.error} />
    </Card>
  );
}

function Recommend({ projectId, onAssigned }: { projectId: string; onAssigned: () => void }) {
  const api = useApi();
  const [count, setCount] = useState(20);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [result, setResult] = useState<AssignmentResult | null>(null);
  const run = useAsyncAction(() => api.staff.recommend(projectId, count));
  const assign = useAsyncAction((experts: { expert_id: string; max_tasks: number }[]) => api.staff.assign(projectId, experts));
  const names = new Map((rec?.candidates ?? []).map((c) => [c.expert_id, c.display_name]));
  const selectedIds = Object.keys(selected);

  return (
    <div className="rounded-xl border border-line bg-surface-sunken p-4 sm:p-5">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setResult(null);
          const r = await run.run();
          if (r) {
            setRec(r);
            setSelected({});
          }
        }}
      >
        <Input
          label="Candidates"
          type="number"
          min={1}
          max={100}
          wrapperClassName="w-32"
          value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(100, e.target.valueAsNumber || 1)))}
        />
        <Button type="submit" variant="secondary" loading={run.pending}>
          Recommend
        </Button>
        {rec && <span className="text-xs text-fg-muted">Algorithm {rec.algorithm_version}</span>}
      </form>
      <div className="mt-2">
        <ErrorAlert error={run.error} />
      </div>

      {rec && (
        <div className="mt-4 flex flex-col gap-4">
          {rec.candidates.length === 0 ? (
            <EmptyState title="No eligible candidates" />
          ) : (
            <Table caption="Recommended experts">
              <thead>
                <tr>
                  <Th>
                    <span className="sr-only">Select</span>
                  </Th>
                  <Th>Expert</Th>
                  <Th className="text-right">Score</Th>
                  <Th>Factors</Th>
                  <Th>Flags</Th>
                  <Th>Max tasks</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rec.candidates.map((c) => {
                  const on = c.expert_id in selected;
                  return (
                    <tr key={c.expert_id}>
                      <Td>
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-primary"
                          aria-label={`Select ${c.display_name}`}
                          checked={on}
                          onChange={(e) =>
                            setSelected((s) => {
                              const next = { ...s };
                              if (e.target.checked) next[c.expert_id] = 50;
                              else delete next[c.expert_id];
                              return next;
                            })
                          }
                        />
                      </Td>
                      <Td>
                        <Link href={`/staff/experts/${c.expert_id}`} className="font-medium text-primary-text hover:underline">
                          {c.display_name}
                        </Link>
                        <p className="text-xs text-fg-muted">{c.pseudonym}</p>
                      </Td>
                      <Td className="text-right tabular-nums">
                        <span className="inline-flex rounded-md bg-primary-subtle px-1.5 py-0.5 font-semibold text-primary-text">{fmtNum(c.score, 3)}</span>
                      </Td>
                      <Td>
                        <dl className="grid min-w-[16rem] grid-cols-1 gap-x-5 gap-y-1 text-xs text-fg-muted sm:grid-cols-2">
                          {Object.entries(c.factors).map(([k, v]) => (
                            <div key={k} className="flex items-center justify-between gap-2">
                              <dt className="truncate">{humanize(k)}</dt>
                              <dd className="flex items-center gap-1.5 tabular-nums text-fg">
                                <MiniBar value={v} label={humanize(k)} />
                                <span className="w-8 text-right">{fmtNum(v, 2)}</span>
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </Td>
                      <Td>
                        <span className="flex flex-wrap gap-1">
                          {c.flags.length ? c.flags.map((f) => <Badge key={f} tone="yellow">{humanize(f)}</Badge>) : "-"}
                        </span>
                      </Td>
                      <Td>
                        <Input
                          type="number"
                          min={1}
                          aria-label={`Max tasks for ${c.display_name}`}
                          wrapperClassName="w-24"
                          disabled={!on}
                          value={on ? selected[c.expert_id] : ""}
                          onChange={(e) => setSelected((s) => ({ ...s, [c.expert_id]: Math.max(1, e.target.valueAsNumber || 1) }))}
                        />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}

          {rec.excluded.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-fg">{rec.excluded.length} excluded</summary>
              <ul className="mt-2 flex flex-col gap-1">
                {rec.excluded.map((x) => (
                  <li key={x.expert_id}>
                    <span className="font-medium">{x.display_name}</span> <Badge tone={x.reason === "conflict_of_interest" ? "red" : "gray"}>{humanize(x.reason)}</Badge>{" "}
                    <span className="text-fg-muted">{x.detail}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={selectedIds.length === 0}
              loading={assign.pending}
              onClick={async () => {
                const r = await assign.run(selectedIds.map((id) => ({ expert_id: id, max_tasks: selected[id] })));
                if (r) {
                  setResult(r);
                  setSelected({});
                  onAssigned();
                }
              }}
            >
              Approve {selectedIds.length || ""} selected
            </Button>
          </div>
          <ErrorAlert error={assign.error} />
          {result && (
            <Notice tone={result.rejected.length ? "yellow" : "green"}>
              Approved {result.approved.length} expert{result.approved.length === 1 ? "" : "s"}.
              {result.rejected.length > 0 && (
                <ul className="mt-1 list-disc pl-5">
                  {result.rejected.map((r) => (
                    <li key={r.expert_id}>
                      {names.get(r.expert_id) ?? r.expert_id.slice(0, 8)}: {humanize(r.reason)}
                    </li>
                  ))}
                </ul>
              )}
            </Notice>
          )}
        </div>
      )}
    </div>
  );
}

function ExpertMetrics({ projectId }: { projectId: string }) {
  const api = useApi();
  const m = useResource(`staff:expert-metrics:${projectId}`, () => api.staff.expertMetrics(projectId));
  return (
    <Card title="Expert quality" actions={<Button size="sm" variant="ghost" onClick={m.reload}>Refresh</Button>}>
      {m.loading && !m.data ? (
        <Loading label="Loading metrics" variant="table" />
      ) : m.error && !m.data ? (
        <ErrorAlert error={m.error} onRetry={m.reload} />
      ) : !m.data?.length ? (
        <EmptyState title="No submissions yet" />
      ) : (
        <Table caption="Expert quality">
          <thead>
            <tr>
              <Th>Expert</Th>
              <Th className="text-right">Submissions</Th>
              <Th className="text-right">Gold accuracy</Th>
              <Th className="text-right">Acceptance</Th>
              <Th className="text-right">Agreement</Th>
              <Th className="text-right">Avg time</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {m.data.map((r) => (
              <tr key={r.expert_id}>
                <Td>
                  <Link href={`/staff/experts/${r.expert_id}`} className="text-primary-text hover:underline">
                    {r.pseudonym}
                  </Link>
                </Td>
                <Td className="text-right tabular-nums">{r.submissions}</Td>
                <Td className="text-right tabular-nums">{fmtPct(r.gold_accuracy)}</Td>
                <Td className="text-right tabular-nums">{fmtPct(r.acceptance_rate)}</Td>
                <Td className="text-right tabular-nums">{fmtPct(r.agreement_with_consensus)}</Td>
                <Td className="text-right tabular-nums">{r.avg_time_seconds === null ? "-" : fmtDuration(r.avg_time_seconds)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
