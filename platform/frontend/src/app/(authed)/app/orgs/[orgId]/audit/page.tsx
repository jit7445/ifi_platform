"use client";

import { useParams } from "next/navigation";
import { AuditTable } from "@/components/AuditTable";
import { EmptyState, PageHeader } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { isOrgAdmin } from "@/lib/roles";

export default function OrgAuditPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { me, api } = useAuth();
  if (!isOrgAdmin(me, orgId)) return <EmptyState title="Admins only">The audit log is available to organisation admins.</EmptyState>;
  return (
    <>
      <PageHeader title="Audit log" subtitle="Security-relevant actions in your organisation" />
      <AuditTable cacheKey={`audit:${orgId}`} fetchPage={(cursor) => api.orgAdmin.audit(orgId, { limit: 50, cursor })} />
    </>
  );
}
