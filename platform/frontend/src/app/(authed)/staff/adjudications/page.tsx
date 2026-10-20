"use client";

import Link from "next/link";
import { useState } from "react";
import { RoleGate } from "@/components/AppShell";
import { Button, EmptyState, ErrorAlert, Loading, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui";
import { useApi } from "@/lib/auth";
import { useResource } from "@/lib/hooks";
import { fmtDate, humanize } from "@/lib/format";
import { REVIEW_ROLES } from "@/lib/roles";

type Status = "open" | "resolved";

export default function StaffAdjudicationsPage() {
  return (
    <RoleGate roles={REVIEW_ROLES}>
      <Adjudications />
    </RoleGate>
  );
}

function Adjudications() {
  const api = useApi();
  const [status, setStatus] = useState<Status>("open");
  const list = useResource(`staff:adjudications:${status}`, () => api.staff.adjudications({ status }));

  return (
    <>
      <PageHeader
        title="Adjudications"
        subtitle="Items where overlapping experts disagreed"
        actions={
          <div role="group" aria-label="Filter adjudications" className="flex gap-1">
            {(["open", "resolved"] as Status[]).map((s) => (
              <Button key={s} size="sm" variant={status === s ? "primary" : "secondary"} aria-pressed={status === s} onClick={() => setStatus(s)}>
                {humanize(s)}
              </Button>
            ))}
          </div>
        }
      />
      {list.loading && !list.data ? (
        <Loading label="Loading adjudications" variant="table" />
      ) : list.error && !list.data ? (
        <ErrorAlert error={list.error} onRetry={list.reload} />
      ) : !list.data?.length ? (
        <EmptyState title="Nothing to adjudicate">No {status} adjudications.</EmptyState>
      ) : (
        <Table caption="Adjudications">
          <thead>
            <tr>
              <Th>Project</Th>
              <Th>Task</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th>
                <span className="sr-only">Open</span>
              </Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.data.map((a) => (
              <tr key={a.id}>
                <Td>{a.project_name}</Td>
                <Td className="font-mono text-xs">{a.task_id.slice(0, 8)}</Td>
                <Td>
                  <StatusBadge status={a.status} />
                </Td>
                <Td className="whitespace-nowrap">{fmtDate(a.created_at)}</Td>
                <Td>
                  <Link className="font-medium text-primary-text hover:underline" href={`/staff/adjudications/${a.id}`}>
                    {a.status === "resolved" ? "View" : "Resolve"}
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
