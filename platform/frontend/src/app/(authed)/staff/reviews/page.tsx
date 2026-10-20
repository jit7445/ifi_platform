"use client";

import Link from "next/link";
import { useState } from "react";
import { RoleGate } from "@/components/AppShell";
import { Badge, Button, EmptyState, ErrorAlert, Loading, PageHeader, StatusBadge, Table, Td, Th } from "@/components/ui";
import type { ReviewKind, ReviewStatus } from "@/lib/api";
import { useApi } from "@/lib/auth";
import { useResource } from "@/lib/hooks";
import { fmtDate, humanize } from "@/lib/format";
import { REVIEW_ROLES } from "@/lib/roles";

const STATUSES: ReviewStatus[] = ["open", "claimed", "done"];
const KIND_TONE: Record<ReviewKind, "gray" | "yellow" | "red" | "blue"> = {
  sample: "gray",
  low_agreement: "yellow",
  gold_fail: "red",
  too_fast: "blue",
};

export default function StaffReviewsPage() {
  return (
    <RoleGate roles={REVIEW_ROLES}>
      <Reviews />
    </RoleGate>
  );
}

function Reviews() {
  const api = useApi();
  const [status, setStatus] = useState<ReviewStatus>("open");
  const list = useResource(`staff:reviews:${status}`, () => api.staff.reviews({ status }));

  return (
    <>
      <PageHeader
        title="Reviews"
        subtitle="Submissions sampled or flagged by quality checks"
        actions={
          <div role="group" aria-label="Filter reviews" className="flex gap-1">
            {STATUSES.map((s) => (
              <Button key={s} size="sm" variant={status === s ? "primary" : "secondary"} aria-pressed={status === s} onClick={() => setStatus(s)}>
                {humanize(s)}
              </Button>
            ))}
          </div>
        }
      />
      {list.loading && !list.data ? (
        <Loading label="Loading reviews" variant="table" />
      ) : list.error && !list.data ? (
        <ErrorAlert error={list.error} onRetry={list.reload} />
      ) : !list.data?.length ? (
        <EmptyState title="No reviews">Nothing is {status} right now.</EmptyState>
      ) : (
        <Table caption="Reviews">
          <thead>
            <tr>
              <Th>Project</Th>
              <Th>Reason</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th>
                <span className="sr-only">Open</span>
              </Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.data.map((r) => (
              <tr key={r.id}>
                <Td>{r.project_name}</Td>
                <Td>
                  <Badge tone={KIND_TONE[r.kind] ?? "gray"}>{humanize(r.kind)}</Badge>
                </Td>
                <Td>
                  <StatusBadge status={r.status} />
                </Td>
                <Td className="whitespace-nowrap">{fmtDate(r.created_at)}</Td>
                <Td>
                  <Link className="font-medium text-primary-text hover:underline" href={`/staff/reviews/${r.id}`}>
                    {r.status === "done" ? "View" : "Review"}
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
