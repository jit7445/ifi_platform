"use client";

import Link from "next/link";
import { useState } from "react";
import { RoleGate } from "@/components/AppShell";
import { EmptyState, ErrorAlert, Loading, PageHeader, Select, StatusBadge, Table, Td, Th } from "@/components/ui";
import type { ProjectStatus } from "@/lib/api";
import { useApi } from "@/lib/auth";
import { useResource } from "@/lib/hooks";
import { fmtDay, humanize } from "@/lib/format";
import { STAFF_ROLES } from "@/lib/roles";

const STATUSES: ProjectStatus[] = ["submitted", "changes_requested", "approved", "active", "paused", "completed", "draft", "cancelled"];

export default function StaffProjectsPage() {
  return (
    <RoleGate roles={STAFF_ROLES}>
      <StaffProjects />
    </RoleGate>
  );
}

function StaffProjects() {
  const api = useApi();
  const [status, setStatus] = useState<ProjectStatus | "">("submitted");
  const list = useResource(`staff:projects:${status}`, () => api.staff.projects(status || undefined));

  return (
    <>
      <PageHeader
        title="Project queue"
        subtitle="Projects across all customer organisations"
        actions={
          <Select label={<span className="sr-only">Status</span>} value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus | "")}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {humanize(s)}
              </option>
            ))}
          </Select>
        }
      />
      {list.loading && !list.data ? (
        <Loading label="Loading projects" variant="table" />
      ) : list.error && !list.data ? (
        <ErrorAlert error={list.error} onRetry={list.reload} />
      ) : !list.data?.length ? (
        <EmptyState title="No projects">{status ? `No projects are ${humanize(status).toLowerCase()}.` : "No projects yet."}</EmptyState>
      ) : (
        <Table caption="Projects">
          <thead>
            <tr>
              <Th>Project</Th>
              <Th>Organisation</Th>
              <Th>Status</Th>
              <Th>Type</Th>
              <Th className="text-right">Items</Th>
              <Th className="text-right">Tasks done</Th>
              <Th>Deadline</Th>
              <Th>Created</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.data.map((p) => (
              <tr key={p.id}>
                <Td>
                  <Link href={`/staff/projects/${p.id}`} className="font-medium text-primary-text hover:underline">
                    {p.name}
                  </Link>
                  <p className="font-mono text-xs text-fg-muted">{p.code}</p>
                </Td>
                <Td>{p.org_name ?? "-"}</Td>
                <Td>
                  <StatusBadge status={p.status} />
                </Td>
                <Td>{humanize(p.task_type)}</Td>
                <Td className="text-right tabular-nums">{p.counts?.items ?? 0}</Td>
                <Td className="text-right tabular-nums">
                  {p.counts?.tasks_completed ?? 0} / {p.counts?.tasks ?? 0}
                </Td>
                <Td className="whitespace-nowrap">{fmtDay(p.deadline)}</Td>
                <Td className="whitespace-nowrap">{fmtDay(p.created_at)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
