"use client";

import { useState } from "react";
import { Button, EmptyState, ErrorAlert, Loading, Table, Td, Th } from "@/components/ui";
import type { AuditEvent, ListResponse } from "@/lib/api";
import { useResource } from "@/lib/hooks";
import { fmtDate } from "@/lib/format";

export function AuditTable({ cacheKey, fetchPage }: { cacheKey: string; fetchPage: (cursor: string | null) => Promise<ListResponse<AuditEvent>> }) {
  const first = useResource(cacheKey, () => fetchPage(null));
  const [more, setMore] = useState<{ key: string; events: AuditEvent[]; cursor: string | null } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<unknown>(null);
  const extra = more?.key === cacheKey ? more : null;
  const events = [...(first.data?.data ?? []), ...(extra?.events ?? [])];
  const cursor = extra ? extra.cursor : (first.data?.next_cursor ?? null);

  if (first.loading && !first.data) return <Loading label="Loading audit events" variant="table" />;
  if (first.error && !first.data) return <ErrorAlert error={first.error} onRetry={first.reload} />;
  if (events.length === 0) return <EmptyState title="No audit events">Actions such as exports, downloads and approvals appear here.</EmptyState>;

  return (
    <>
      <Table caption="Audit events">
        <thead>
          <tr>
            <Th>Time</Th>
            <Th>Action</Th>
            <Th>Actor</Th>
            <Th>Target</Th>
            <Th>Details</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {events.map((e) => (
            <tr key={e.id}>
              <Td className="whitespace-nowrap">{fmtDate(e.created_at)}</Td>
              <Td className="font-mono text-xs">{e.action}</Td>
              <Td>{e.actor_email ?? e.actor_id?.slice(0, 8) ?? "system"}</Td>
              <Td className="text-xs">
                {e.target_type ?? "-"} {e.target_id ? <span className="font-mono">{e.target_id.slice(0, 8)}</span> : null}
              </Td>
              <Td className="max-w-xs">
                {e.metadata && Object.keys(e.metadata).length > 0 ? (
                  <code className="line-clamp-2 break-all font-mono text-xs text-fg-muted">{JSON.stringify(e.metadata)}</code>
                ) : (
                  "-"
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <ErrorAlert error={moreError} />
      {cursor && (
        <Button
          variant="secondary"
          className="mt-3"
          loading={loadingMore}
          onClick={async () => {
            setLoadingMore(true);
            setMoreError(null);
            try {
              const page = await fetchPage(cursor);
              setMore({ key: cacheKey, events: [...(extra?.events ?? []), ...page.data], cursor: page.next_cursor });
            } catch (e) {
              setMoreError(e);
            } finally {
              setLoadingMore(false);
            }
          }}
        >
          Load more
        </Button>
      )}
    </>
  );
}
