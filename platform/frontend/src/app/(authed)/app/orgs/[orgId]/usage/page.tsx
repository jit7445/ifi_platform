"use client";

import { useParams } from "next/navigation";
import { EmptyState, ErrorAlert, Loading, PageHeader, Stat, Table, Td, Th } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useResource } from "@/lib/hooks";
import { isOrgAdmin } from "@/lib/roles";

export default function UsagePage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { me, api } = useAuth();
  const admin = isOrgAdmin(me, orgId);
  const res = useResource(admin ? `usage:${orgId}` : null, () => api.orgAdmin.usage(orgId));
  if (!admin) return <EmptyState title="Admins only">Usage is available to organisation admins.</EmptyState>;
  return (
    <>
      <PageHeader title="Usage" subtitle="Accepted tasks are the billable unit" />
      {res.loading && !res.data && <Loading />}
      <ErrorAlert error={res.error} onRetry={res.reload} />
      {res.data && (
        <div className="flex flex-col gap-6">
          <div className="max-w-xs">
            <Stat label="Accepted tasks" value={res.data.accepted_tasks} />
          </div>
          {res.data.by_project.length === 0 ? (
            <EmptyState title="No usage yet">Usage is recorded when a task result is finalized.</EmptyState>
          ) : (
            <Table caption="Usage by project">
              <thead>
                <tr>
                  <Th>Project</Th>
                  <Th className="text-right">Accepted tasks</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {res.data.by_project.map((p) => (
                  <tr key={p.project_id}>
                    <Td>{p.name ?? p.project_name ?? p.project_id}</Td>
                    <Td className="text-right tabular-nums">{p.accepted_tasks}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      )}
    </>
  );
}
