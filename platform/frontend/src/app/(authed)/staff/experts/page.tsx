"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { RoleGate } from "@/components/AppShell";
import { Badge, Button, EmptyState, ErrorAlert, Input, Loading, PageHeader, Select, StatusBadge, Table, Td, Th } from "@/components/ui";
import { useApi } from "@/lib/auth";
import { useResource } from "@/lib/hooks";
import { humanize } from "@/lib/format";
import { STAFF_ROLES } from "@/lib/roles";

interface Filters {
  q: string;
  skill: string;
  status: string;
}

export default function StaffExpertsPage() {
  return (
    <RoleGate roles={STAFF_ROLES}>
      <StaffExperts />
    </RoleGate>
  );
}

function StaffExperts() {
  const api = useApi();
  const [draft, setDraft] = useState<Filters>({ q: "", skill: "", status: "" });
  const [filters, setFilters] = useState<Filters>(draft);
  const skills = useResource("skills", () => api.skills());
  const list = useResource(`staff:experts:${JSON.stringify(filters)}`, () =>
    api.staff.experts({ q: filters.q || undefined, skill: filters.skill || undefined, status: filters.status || undefined }),
  );
  const skillLabel = new Map((skills.data ?? []).map((s) => [s.key, s.label]));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFilters({ ...draft, q: draft.q.trim() });
  };

  return (
    <>
      <PageHeader title="Experts" subtitle="Search the expert network, review credentials and manage status" />
      <form onSubmit={onSubmit} className="mb-4 grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_14rem_10rem_auto]">
        <Input label="Search" type="search" value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} placeholder="Name, email or headline" />
        <Select label="Skill" value={draft.skill} onChange={(e) => setDraft({ ...draft, skill: e.target.value })}>
          <option value="">Any skill</option>
          {(skills.data ?? []).map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </Select>
        <Select label="Status" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </Select>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {list.loading && !list.data ? (
        <Loading label="Loading experts" variant="table" />
      ) : list.error && !list.data ? (
        <ErrorAlert error={list.error} onRetry={list.reload} />
      ) : !list.data?.length ? (
        <EmptyState title="No experts match these filters" />
      ) : (
        <Table caption="Experts">
          <thead>
            <tr>
              <Th>Expert</Th>
              <Th>Headline</Th>
              <Th>Country</Th>
              <Th>Skills</Th>
              <Th>Tier</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.data.map((x) => (
              <tr key={x.id}>
                <Td>
                  <Link href={`/staff/experts/${x.id}`} className="font-medium text-primary-text hover:underline">
                    {x.display_name}
                  </Link>
                  {x.email && <p className="text-xs text-fg-muted">{x.email}</p>}
                </Td>
                <Td className="max-w-xs">{x.headline ?? "-"}</Td>
                <Td>{x.country ?? "-"}</Td>
                <Td>
                  <span className="flex max-w-sm flex-wrap gap-1">
                    {(x.skills ?? []).slice(0, 5).map((s) => (
                      <Badge key={s.skill_key}>
                        {skillLabel.get(s.skill_key) ?? s.skill_key} {s.level}
                      </Badge>
                    ))}
                    {(x.skills?.length ?? 0) > 5 && <Badge>+{(x.skills?.length ?? 0) - 5}</Badge>}
                  </span>
                </Td>
                <Td>{x.tier ? humanize(x.tier) : "-"}</Td>
                <Td>
                  <StatusBadge status={x.status} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
