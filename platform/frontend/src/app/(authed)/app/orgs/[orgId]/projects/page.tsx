"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { IconFolder, IconPlus } from "@/components/icons";
import { EmptyState, ErrorAlert, LinkButton, Loading, MiniBar, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui";
import { useApi, useAuth } from "@/lib/auth";
import { useResource } from "@/lib/hooks";
import { fmtDay, humanize } from "@/lib/format";
import { unwrapList } from "@/lib/api";

export default function ProjectsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const api = useApi();
  const { me } = useAuth();
  const org = me?.memberships.find((m) => m.org_id === orgId);
  const res = useResource(`projects:${orgId}`, async () => unwrapList(await api.projects.list(orgId, { limit: 200 })));

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle={org?.org_name ? `Evaluation projects for ${org.org_name}` : undefined}
        actions={
          <LinkButton href={`/app/orgs/${orgId}/projects/new`} variant="primary">
            <IconPlus size={16} />
            New project
          </LinkButton>
        }
      />
      {res.loading && !res.data && <Loading label="Loading projects" variant="table" />}
      <ErrorAlert error={res.error} onRetry={res.reload} />
      {res.data && res.data.length === 0 && (
        <EmptyState
          title="No projects yet"
          icon={IconFolder}
          action={
            <LinkButton href={`/app/orgs/${orgId}/projects/new`} variant="primary">
              Create your first project
            </LinkButton>
          }
        >
          A project defines the task, rubric, data and quality settings for an evaluation.
        </EmptyState>
      )}
      {res.data && res.data.length > 0 && (
        <Table caption="Projects">
          <thead>
            <tr>
              <Th>Project</Th>
              <Th>Status</Th>
              <Th>Task type</Th>
              <Th className="text-right">Items</Th>
              <Th className="text-right">Completed</Th>
              <Th>Deadline</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {res.data.map((p) => (
              <tr key={p.id}>
                <Td>
                  <Link href={`/app/orgs/${orgId}/projects/${p.id}`} className="font-medium text-primary-text hover:underline">
                    {p.name}
                  </Link>
                  <div className="font-mono text-xs text-fg-subtle">{p.code}</div>
                </Td>
                <Td>
                  <StatusBadge status={p.status} />
                </Td>
                <Td className="text-fg-muted">{humanize(p.task_type)}</Td>
                <Td className="text-right tabular-nums">{p.counts?.items ?? 0}</Td>
                <Td className="text-right tabular-nums">
                  <span className="inline-flex items-center justify-end gap-2">
                    <MiniBar value={p.counts?.tasks ? (p.counts.tasks_completed ?? 0) / p.counts.tasks : 0} label="Completion" />
                    <span>
                      {p.counts?.tasks_completed ?? 0} <span className="text-fg-subtle">/ {p.counts?.tasks ?? 0}</span>
                    </span>
                  </span>
                </Td>
                <Td className="whitespace-nowrap text-fg-muted">{fmtDay(p.deadline)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
