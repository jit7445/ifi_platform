"use client";

import { useState, type FormEvent } from "react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorAlert,
  Loading,
  Notice,
  ProgressBar,
  Select,
  StatusBadge,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { putToPresignedUrl, type Ingestion, type Item, type UploadContentType } from "@/lib/api";
import { useApi } from "@/lib/auth";
import { useInterval, useResource } from "@/lib/hooks";
import { fmtBytes } from "@/lib/format";
import type { ProjectTabProps } from "./types";

const MAX_BYTES = 200 * 1024 * 1024;

type Phase = "idle" | "requesting" | "uploading" | "verifying" | "ingesting" | "done" | "error";

function detectFormat(name: string): { contentType: UploadContentType; format: "jsonl" | "csv" } | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".csv")) return { contentType: "text/csv", format: "csv" };
  if (lower.endsWith(".jsonl") || lower.endsWith(".ndjson")) return { contentType: "application/x-ndjson", format: "jsonl" };
  if (lower.endsWith(".json")) return { contentType: "application/json", format: "jsonl" };
  return null;
}

export function DataTab({ orgId, project, reloadProject }: ProjectTabProps) {
  const api = useApi();
  const [file, setFile] = useState<File | null>(null);
  const [onError, setOnError] = useState<"skip_row" | "fail">("skip_row");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<unknown>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [ingestion, setIngestion] = useState<Ingestion | null>(null);
  const [ingestionId, setIngestionId] = useState<string | null>(null);
  const [itemsNonce, setItemsNonce] = useState(0);

  const polling = phase === "ingesting" && ingestionId !== null;
  useInterval(
    () => {
      if (!ingestionId) return;
      api.ingestions.get(orgId, project.id, ingestionId).then(
        (ing) => {
          setIngestion(ing);
          if (ing.status !== "queued" && ing.status !== "running") {
            setPhase("done");
            setItemsNonce((n) => n + 1);
            reloadProject();
          }
        },
        (e) => {
          setError(e);
          setPhase("error");
        },
      );
    },
    2000,
    polling,
  );

  async function start(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setFileError("Choose a file to upload");
      return;
    }
    const fmt = detectFormat(file.name);
    if (!fmt) {
      setFileError("Use a .jsonl, .ndjson, .json or .csv file");
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileError(`File is ${fmtBytes(file.size)}; the limit is 200 MiB`);
      return;
    }
    setFileError(null);
    setError(null);
    setIngestion(null);
    setProgress(0);
    try {
      setPhase("requesting");
      const ticket = await api.uploads.create(orgId, { filename: file.name, content_type: fmt.contentType, size_bytes: file.size });
      setPhase("uploading");
      await putToPresignedUrl(ticket, file, setProgress);
      setPhase("verifying");
      await api.uploads.complete(orgId, ticket.upload_id);
      const ing = await api.ingestions.create(orgId, project.id, { upload_id: ticket.upload_id, format: fmt.format, on_error: onError });
      setIngestionId(ing.ingestion_id);
      setPhase("ingesting");
    } catch (err) {
      setError(err);
      setPhase("error");
    }
  }

  const busy = phase === "requesting" || phase === "uploading" || phase === "verifying" || phase === "ingesting";

  return (
    <div className="flex flex-col gap-6">
      <Card title="Upload items">
        <form onSubmit={start} className="flex max-w-2xl flex-col gap-4" noValidate>
          <p className="text-sm text-fg-muted">
            Upload JSONL (one object per line with <code className="font-mono text-xs">id</code>,{" "}
            <code className="font-mono text-xs">prompt</code>, optional <code className="font-mono text-xs">context</code> and{" "}
            <code className="font-mono text-xs">reference_answer</code>, and <code className="font-mono text-xs">responses</code> as{" "}
            <code className="font-mono text-xs">{"[{ model, text }]"}</code>) or CSV with columns{" "}
            <code className="font-mono text-xs">id,prompt,context,reference_answer,model_a,response_a,model_b,response_b</code>. Maximum 200 MiB.
          </p>
          <div className="flex flex-col gap-1">
            <label htmlFor="data-file" className="text-sm font-medium text-fg">
              Data file
            </label>
            <input
              id="data-file"
              type="file"
              accept=".jsonl,.ndjson,.json,.csv,application/x-ndjson,text/csv,application/json"
              disabled={busy}
              aria-invalid={fileError ? true : undefined}
              aria-describedby={fileError ? "data-file-error" : undefined}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setFileError(null);
              }}
              className="block w-full text-sm text-fg file:mr-3 file:rounded-md file:border-0 file:bg-surface-sunken file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-surface-hover"
            />
            {file && <p className="text-xs text-fg-muted">{fmtBytes(file.size)}</p>}
            {fileError && (
              <p id="data-file-error" role="alert" className="text-xs font-medium text-danger">
                {fileError}
              </p>
            )}
          </div>
          <Select
            label="If a row is invalid"
            value={onError}
            onChange={(e) => setOnError(e.target.value as "skip_row" | "fail")}
            wrapperClassName="max-w-xs"
            disabled={busy}
          >
            <option value="skip_row">Skip the row and continue</option>
            <option value="fail">Fail the whole ingestion</option>
          </Select>
          <div>
            <Button type="submit" loading={busy} disabled={!file}>
              Upload and ingest
            </Button>
          </div>
        </form>

        <div className="mt-6 flex max-w-2xl flex-col gap-3" aria-live="polite">
          {phase === "requesting" && <p className="text-sm text-fg-muted">Requesting an upload slot...</p>}
          {phase === "uploading" && <ProgressBar value={progress} label="Uploading file" />}
          {phase === "verifying" && <p className="text-sm text-fg-muted">Verifying upload checksum...</p>}
          {phase === "ingesting" && (
            <p className="text-sm text-fg-muted">
              Ingestion {ingestion ? <StatusBadge status={ingestion.status} /> : "queued"}. Parsing rows...
            </p>
          )}
          <ErrorAlert error={error} />
          {ingestion && phase === "done" && <IngestionResult ing={ingestion} />}
        </div>
      </Card>

      <ItemsTable orgId={orgId} projectId={project.id} nonce={itemsNonce} />
    </div>
  );
}

function IngestionResult({ ing }: { ing: Ingestion }) {
  return (
    <div className="flex flex-col gap-3">
      <Notice tone={ing.status === "succeeded" ? "green" : "yellow"}>
        Ingestion <strong>{ing.status.replace(/_/g, " ")}</strong>: {ing.rows_ok} of {ing.rows_total} rows imported
        {ing.rows_failed > 0 ? `, ${ing.rows_failed} failed` : ""}.
      </Notice>
      {ing.errors.length > 0 && (
        <Table caption="Row errors">
          <thead>
            <tr>
              <Th>Row</Th>
              <Th>Error</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ing.errors.map((e, i) => (
              <tr key={i}>
                <Td className="tabular-nums">{e.row}</Td>
                <Td>{e.message}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {ing.errors.length >= 100 && <p className="text-xs text-fg-muted">Showing the first 100 errors.</p>}
    </div>
  );
}

function ItemsTable({ orgId, projectId, nonce }: { orgId: string; projectId: string; nonce: number }) {
  const api = useApi();
  const [extra, setExtra] = useState<{ items: Item[]; cursor: string | null; forNonce: number }>({ items: [], cursor: null, forNonce: -1 });
  const [moreError, setMoreError] = useState<unknown>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const first = useResource(`items:${projectId}:${nonce}`, () => api.items.list(orgId, projectId, { limit: 50 }));

  const extraItems = extra.forNonce === nonce ? extra.items : [];
  const cursor = extra.forNonce === nonce ? extra.cursor : (first.data?.next_cursor ?? null);
  const items = [...(first.data?.data ?? []), ...extraItems];

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await api.items.list(orgId, projectId, { limit: 50, cursor });
      setExtra({ items: [...extraItems, ...page.data], cursor: page.next_cursor, forNonce: nonce });
    } catch (e) {
      setMoreError(e);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <Card title="Items">
      {first.loading && !first.data && <Loading label="Loading items" variant="table" />}
      <ErrorAlert error={first.error} onRetry={first.reload} />
      {first.data && items.length === 0 && <EmptyState title="No items yet">Upload a file above to add items.</EmptyState>}
      {items.length > 0 && (
        <>
          <Table caption="Items">
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Prompt</Th>
                <Th>Responses</Th>
                <Th>Gold</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((it) => (
                <tr key={it.id}>
                  <Td className="font-mono text-xs">{it.external_id}</Td>
                  <Td className="max-w-md">
                    <p className="line-clamp-3 break-words">{it.prompt}</p>
                  </Td>
                  <Td className="text-xs text-fg-muted">{it.responses.map((r) => r.model).join(", ")}</Td>
                  <Td>{it.is_gold ? <Badge tone="yellow">Gold</Badge> : null}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <ErrorAlert error={moreError} />
          {cursor && (
            <div className="mt-3">
              <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
