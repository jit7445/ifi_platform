"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RoleGate } from "@/components/AppShell";
import { IconBriefcase, IconInbox, IconPlay, IconUser } from "@/components/icons";
import { Button, EmptyState, ErrorAlert, LinkButton, Loading, Notice, PageHeader, ProgressBar, StatusBadge, Table, Td, Th, cx } from "@/components/ui";
import { isApiError, type AssignmentStatus, type ExpertProject } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/hooks";
import { fmtDate, humanize } from "@/lib/format";

const TASK_TABS: { id: AssignmentStatus; label: string }[] = [
  { id: "in_progress", label: "In progress" },
  { id: "rework", label: "Rework requested" },
  { id: "submitted", label: "Submitted" },
];

export default function ExpertHomePage() {
  return (
    <RoleGate roles={["expert"]}>
      <ExpertHome />
    </RoleGate>
  );
}

function ExpertHome() {
  const { api, me } = useAuth();
  const router = useRouter();
  const projects = useResource("expert:projects", () => api.expert.projects());
  const [taskStatus, setTaskStatus] = useState<AssignmentStatus>("in_progress");
  const tasks = useResource(`expert:tasks:${taskStatus}`, () => api.expert.tasks(taskStatus));
  const [starting, setStarting] = useState<string | null>(null);
  const [startError, setStartError] = useState<{ projectId: string; error: unknown } | null>(null);

  const start = async (p: ExpertProject) => {
    setStarting(p.project_id);
    setStartError(null);
    try {
      const t = await api.expert.nextTask(p.project_id);
      router.push(`/expert/tasks/${t.assignment_id}`);
    } catch (e) {
      setStartError({ projectId: p.project_id, error: e });
      projects.reload();
    } finally {
      setStarting(null);
    }
  };

  return (
    <>
      <PageHeader
        title="My work"
        subtitle="Projects you are approved on and the tasks you are working on"
        actions={
          <LinkButton href="/expert/profile" size="sm">
            <IconUser size={15} />
            Edit profile
          </LinkButton>
        }
      />
      {!me?.expert_profile_id && (
        <div className="mb-4">
          <Notice tone="yellow">
            Complete your <Link className="font-medium underline" href="/expert/profile">expert profile</Link> so project managers can match you to projects.
          </Notice>
        </div>
      )}

      <div className="flex flex-col gap-10">
        <section aria-labelledby="projects-heading">
          <h2 id="projects-heading" className="mb-3 text-[15px] font-semibold tracking-tight text-fg">
            Your projects
          </h2>
          {projects.loading && !projects.data ? (
            <Loading label="Loading projects" variant="cards" />
          ) : projects.error && !projects.data ? (
            <ErrorAlert error={projects.error} onRetry={projects.reload} />
          ) : !projects.data?.length ? (
            <EmptyState title="No projects yet" icon={IconBriefcase}>
              When a project manager approves you for a project it appears here.
            </EmptyState>
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {projects.data.map((p) => {
                const capped = p.max_tasks > 0 && p.my_submitted + p.my_in_progress >= p.max_tasks;
                const err = startError?.projectId === p.project_id ? startError.error : null;
                return (
                  <li key={p.project_id} className="flex flex-col rounded-xl border border-line bg-surface p-5 shadow-card transition-shadow hover:shadow-pop">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold tracking-tight text-fg">{p.name}</p>
                        <p className="mt-0.5 text-xs text-fg-muted">
                          {p.customer_display} · {humanize(p.task_type)}
                        </p>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                    <dl className="mt-4 grid grid-cols-3 divide-x divide-line rounded-lg border border-line bg-surface-sunken text-center">
                      <div className="px-2 py-2.5">
                        <dt className="text-[11px] font-medium text-fg-muted">Available</dt>
                        <dd className="mt-0.5 text-lg font-semibold tabular-nums text-fg">{p.available_tasks}</dd>
                      </div>
                      <div className="px-2 py-2.5">
                        <dt className="text-[11px] font-medium text-fg-muted">In progress</dt>
                        <dd className="mt-0.5 text-lg font-semibold tabular-nums text-fg">{p.my_in_progress}</dd>
                      </div>
                      <div className="px-2 py-2.5">
                        <dt className="text-[11px] font-medium text-fg-muted">Submitted</dt>
                        <dd className="mt-0.5 text-lg font-semibold tabular-nums text-fg">
                          {p.my_submitted}
                          {p.max_tasks > 0 && <span className="text-xs font-normal text-fg-subtle"> / {p.max_tasks}</span>}
                        </dd>
                      </div>
                    </dl>
                    {p.max_tasks > 0 && (
                      <div className="mt-4">
                        <ProgressBar value={p.my_submitted / p.max_tasks} label="Your task allowance used" tone="accent" />
                      </div>
                    )}
                    <div className="mt-auto pt-4">
                      <Button
                        className="w-full sm:w-auto"
                        loading={starting === p.project_id}
                        disabled={p.status !== "active" || p.available_tasks === 0 || capped || starting !== null}
                        onClick={() => start(p)}
                      >
                        {starting !== p.project_id && <IconPlay size={15} />}
                        Start next task
                      </Button>
                      {p.status !== "active" && <p className="mt-2 text-xs text-fg-muted">Tasks open when the project is active.</p>}
                      {capped && <p className="mt-2 text-xs text-fg-muted">You have reached your task limit for this project.</p>}
                    </div>
                    {err !== null && (
                      <div className="mt-3">
                        {isApiError(err, "no_tasks_available") ? (
                          <Notice>No tasks are available right now. Check back later.</Notice>
                        ) : (
                          <ErrorAlert error={err} />
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="tasks-heading">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 id="tasks-heading" className="text-[15px] font-semibold tracking-tight text-fg">
              My tasks
            </h2>
            <div role="group" aria-label="Filter tasks" className="inline-flex flex-wrap rounded-lg border border-line bg-surface-sunken p-0.5">
              {TASK_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={taskStatus === t.id}
                  onClick={() => setTaskStatus(t.id)}
                  className={cx(
                    "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                    taskStatus === t.id ? "bg-surface text-fg shadow-card" : "text-fg-muted hover:text-fg",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {tasks.loading && !tasks.data ? (
            <Loading label="Loading tasks" variant="table" />
          ) : tasks.error && !tasks.data ? (
            <ErrorAlert error={tasks.error} onRetry={tasks.reload} />
          ) : !tasks.data?.length ? (
            <EmptyState title="Nothing here" icon={IconInbox}>
              No tasks with this status.
            </EmptyState>
          ) : (
            <Table caption="My tasks">
              <thead>
                <tr>
                  <Th>Project</Th>
                  <Th>Type</Th>
                  <Th>Status</Th>
                  <Th>Due</Th>
                  <Th>Started</Th>
                  <Th>
                    <span className="sr-only">Open</span>
                  </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {tasks.data.map((t) => (
                  <tr key={t.assignment_id}>
                    <Td>{t.project_name}</Td>
                    <Td>{humanize(t.task_type)}</Td>
                    <Td>
                      <StatusBadge status={t.status} />
                    </Td>
                    <Td className="whitespace-nowrap">{fmtDate(t.due_at)}</Td>
                    <Td className="whitespace-nowrap">{fmtDate(t.created_at)}</Td>
                    <Td>
                      <Link className="font-medium text-primary-text hover:underline" href={`/expert/tasks/${t.assignment_id}`}>
                        {t.status === "submitted" ? "View" : "Open"}
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </section>
      </div>
    </>
  );
}
