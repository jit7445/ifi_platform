"use client";

import { useState, type FormEvent } from "react";
import { Button, Card, Checkbox, EmptyState, ErrorAlert, Input, Loading, Notice, Select, StatusBadge, Table, Td, Th, Textarea } from "@/components/ui";
import { ApiError, type DatasetVersion, type ExportFormat, type ExportJob } from "@/lib/api";
import { useApi } from "@/lib/auth";
import { useInterval, useResource } from "@/lib/hooks";
import { fmtBytes, fmtDate, shortSha } from "@/lib/format";
import { allowedExportFormats, EXPORT_LABELS } from "@/lib/exports";
import type { ProjectTabProps } from "./types";

const PENDING = new Set(["queued", "running", "pending", "processing"]);

export function DatasetsTab({ orgId, project }: ProjectTabProps) {
  const api = useApi();
  const datasets = useResource(`datasets:${project.id}`, () => api.datasets.list(orgId, project.id));
  const exportsRes = useResource(`exports:${project.id}`, () => api.exports.list(orgId, project.id));
  const rubricInfo = useResource(`rubric-correction:${project.id}`, async () => {
    const rubrics = await api.rubrics.listForProject(orgId, project.id);
    const v = rubrics.flatMap((r) => r.versions ?? []).find((x) => x.id === project.current_rubric_version_id);
    return { requireCorrection: !!v?.require_correction };
  });
  const formats = allowedExportFormats(project.task_type, rubricInfo.data?.requireCorrection ?? false);
  const anyPending = (exportsRes.data ?? []).some((e) => PENDING.has(e.status));
  useInterval(exportsRes.reload, 3000, anyPending);

  return (
    <div className="flex flex-col gap-6">
      <FreezeForm orgId={orgId} projectId={project.id} onFrozen={datasets.reload} />
      <Card title="Dataset versions">
        {datasets.loading && !datasets.data && <Loading />}
        <ErrorAlert error={datasets.error} onRetry={datasets.reload} />
        {datasets.data && datasets.data.length === 0 && <p className="text-sm text-fg-muted">No frozen versions yet.</p>}
        {datasets.data && datasets.data.length > 0 && (
          <Table caption="Dataset versions">
            <thead>
              <tr>
                <Th>Version</Th>
                <Th>Status</Th>
                <Th className="text-right">Items</Th>
                <Th>Manifest SHA-256</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {datasets.data.map((d) => (
                <tr key={d.id}>
                  <Td>v{d.version}</Td>
                  <Td>
                    <StatusBadge status={d.status} />
                  </Td>
                  <Td className="text-right tabular-nums">{d.item_count}</Td>
                  <Td className="font-mono text-xs" >
                    <span title={d.manifest_sha256}>{shortSha(d.manifest_sha256)}</span>
                  </Td>
                  <Td>{fmtDate(d.created_at)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {datasets.data && datasets.data.length > 0 && (
        <ExportForm
          key={formats.join(",")}
          orgId={orgId}
          projectId={project.id}
          datasets={datasets.data}
          formats={formats}
          isPairwise={project.task_type === "pairwise_preference"}
          onCreated={exportsRes.reload}
        />
      )}

      <Card title="Exports">
        {exportsRes.loading && !exportsRes.data && <Loading />}
        <ErrorAlert error={exportsRes.error} onRetry={exportsRes.reload} />
        {exportsRes.data && exportsRes.data.length === 0 && (
          <EmptyState title="No exports yet">Freeze a dataset version, then create an export in the format you need.</EmptyState>
        )}
        {exportsRes.data && exportsRes.data.length > 0 && (
          <Table caption="Exports">
            <thead>
              <tr>
                <Th>Format</Th>
                <Th>Status</Th>
                <Th className="text-right">Rows</Th>
                <Th className="text-right">Size</Th>
                <Th>SHA-256</Th>
                <Th>Created</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {exportsRes.data.map((e) => (
                <ExportRow key={e.id} orgId={orgId} job={e} />
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function ExportRow({ orgId, job }: { orgId: string; job: ExportJob }) {
  const api = useApi();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const ready = job.status === "succeeded" || job.status === "ready" || job.status === "completed";
  return (
    <tr>
      <Td>{EXPORT_LABELS[job.format] ?? job.format}</Td>
      <Td>
        <StatusBadge status={job.status} />
      </Td>
      <Td className="text-right tabular-nums">{job.row_count ?? "-"}</Td>
      <Td className="text-right tabular-nums">{fmtBytes(job.size_bytes)}</Td>
      <Td className="font-mono text-xs">
        <span title={job.sha256 ?? undefined}>{shortSha(job.sha256)}</span>
      </Td>
      <Td>{fmtDate(job.created_at)}</Td>
      <Td>
        <Button
          size="sm"
          variant="secondary"
          disabled={!ready}
          loading={pending}
          onClick={async () => {
            setPending(true);
            setError(null);
            try {
              const d = await api.exports.downloadUrl(orgId, job.id);
              const a = document.createElement("a");
              a.href = d.url;
              a.download = d.filename;
              a.rel = "noopener";
              document.body.appendChild(a);
              a.click();
              a.remove();
            } catch (e) {
              setError(e);
            } finally {
              setPending(false);
            }
          }}
        >
          Download
        </Button>
        <ErrorAlert error={error} />
      </Td>
    </tr>
  );
}

function FreezeForm({ orgId, projectId, onFrozen }: { orgId: string; projectId: string; onFrozen: () => void }) {
  const api = useApi();
  const [minAgreement, setMinAgreement] = useState("");
  const [excludeGold, setExcludeGold] = useState(true);
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [frozen, setFrozen] = useState<DatasetVersion | null>(null);
  const fe = error instanceof ApiError ? error.fieldErrors() : {};

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setFrozen(null);
    try {
      const d = await api.datasets.freeze(orgId, projectId, {
        include: { min_agreement: minAgreement === "" ? null : Number(minAgreement), exclude_gold: excludeGold },
        notes,
      });
      setFrozen(d);
      setNotes("");
      onFrozen();
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card title="Freeze a dataset version">
      <form onSubmit={submit} className="flex max-w-2xl flex-col gap-4">
        <p className="text-sm text-fg-muted">
          A frozen version is an immutable snapshot of completed tasks with a final result. Exports are always created from a frozen version.
        </p>
        <Input
          label="Minimum agreement (optional)"
          type="number"
          min={0}
          max={1}
          step={0.01}
          value={minAgreement}
          onChange={(e) => setMinAgreement(e.target.value)}
          hint="Exclude items whose agreement is below this value."
          wrapperClassName="max-w-xs"
          error={fe["include.min_agreement"]}
        />
        <Checkbox label="Exclude gold items" checked={excludeGold} onChange={(e) => setExcludeGold(e.target.checked)} />
        <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <ErrorAlert error={error} />
        {frozen && (
          <Notice tone="green">
            Version v{frozen.version} frozen with {frozen.item_count} items.
          </Notice>
        )}
        <div>
          <Button type="submit" loading={pending}>
            Freeze version
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ExportForm({
  orgId,
  projectId,
  datasets,
  formats,
  isPairwise,
  onCreated,
}: {
  orgId: string;
  projectId: string;
  datasets: DatasetVersion[];
  formats: ExportFormat[];
  isPairwise: boolean;
  onCreated: () => void;
}) {
  const api = useApi();
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? "");
  const [format, setFormat] = useState<ExportFormat>(formats[formats.length - 1]);
  const [includeRationales, setIncludeRationales] = useState(false);
  const [dropTies, setDropTies] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const fe = error instanceof ApiError ? error.fieldErrors() : {};

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api.exports.create(orgId, projectId, {
        dataset_version_id: datasetId,
        format,
        options: { include_rationales: includeRationales, drop_ties: dropTies },
      });
      onCreated();
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card title="Create an export">
      <form onSubmit={submit} className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
        <Select label="Dataset version" value={datasetId} onChange={(e) => setDatasetId(e.target.value)} error={fe.dataset_version_id}>
          {datasets.map((d) => (
            <option key={d.id} value={d.id}>
              v{d.version} ({d.item_count} items)
            </option>
          ))}
        </Select>
        <Select
          label="Format"
          value={format}
          onChange={(e) => setFormat(e.target.value as ExportFormat)}
          error={fe.format}
          hint="Only formats compatible with this project's task type are offered."
        >
          {formats.map((f) => (
            <option key={f} value={f}>
              {EXPORT_LABELS[f]}
            </option>
          ))}
        </Select>
        <Checkbox label="Include expert rationales" checked={includeRationales} onChange={(e) => setIncludeRationales(e.target.checked)} />
        {isPairwise && <Checkbox label="Drop ties" checked={dropTies} onChange={(e) => setDropTies(e.target.checked)} />}
        <div className="sm:col-span-2">
          <ErrorAlert error={error} />
          <Button type="submit" loading={pending} disabled={!datasetId} className="mt-2">
            Create export
          </Button>
        </div>
      </form>
    </Card>
  );
}
