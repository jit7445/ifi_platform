"use client";

import { useState, type FormEvent } from "react";
import { RoleGate } from "@/components/AppShell";
import { AuditTable } from "@/components/AuditTable";
import { Button, Input, PageHeader } from "@/components/ui";
import { useApi } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/roles";

export default function StaffAuditPage() {
  const api = useApi();
  const [draft, setDraft] = useState("");
  const [orgId, setOrgId] = useState("");
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setOrgId(draft.trim());
  };
  return (
    <RoleGate roles={STAFF_ROLES}>
      <PageHeader title="Audit log" subtitle="Security-relevant actions across all organisations" />
      <form onSubmit={onSubmit} className="mb-4 flex flex-wrap items-end gap-2">
        <Input label="Organisation ID" wrapperClassName="w-full max-w-sm" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="All organisations" />
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>
      <AuditTable cacheKey={`staff:audit:${orgId}`} fetchPage={(cursor) => api.staff.audit({ org_id: orgId || undefined, limit: 50, cursor })} />
    </RoleGate>
  );
}
