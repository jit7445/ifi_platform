"use client";

import { useState, type FormEvent } from "react";
import { Button, Card, EmptyState, ErrorAlert, Loading, Notice, Select, Table, Td, Th } from "@/components/ui";
import { ApiError, type Criterion, type Item, type RubricVersion } from "@/lib/api";
import { useApi } from "@/lib/auth";
import { useResource } from "@/lib/hooks";
import type { ProjectTabProps } from "./types";

export function GoldTab({ orgId, project }: ProjectTabProps) {
  const api = useApi();
  const data = useResource(`gold:${project.id}`, async () => {
    const [rubrics, items, gold] = await Promise.all([
      api.rubrics.listForProject(orgId, project.id),
      api.items.list(orgId, project.id, { limit: 200 }),
      api.gold.list(orgId, project.id),
    ]);
    const versions = rubrics.flatMap((r) => r.versions ?? []);
    const current =
      versions.find((v) => v.id === project.current_rubric_version_id) ??
      versions.filter((v) => v.status === "published").sort((a, b) => b.version - a.version)[0] ??
      null;
    return { rubric: current, items: items.data, gold };
  });

  if (data.loading && !data.data) return <Loading label="Loading gold items" variant="table" />;
  if (!data.data) return <ErrorAlert error={data.error} onRetry={data.reload} />;
  const { rubric, items, gold } = data.data;
  const itemById = new Map(items.map((i) => [i.id, i]));

  if (!rubric) {
    return <EmptyState title="Publish a rubric first">Gold items need expected scores for each rubric criterion.</EmptyState>;
  }
  if (items.length === 0) {
    return <EmptyState title="No items yet">Upload data in the Data tab, then mark known-answer items as gold.</EmptyState>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Notice>
        Gold items are hidden known-answer tasks. Experts cannot tell them apart from normal tasks; their answers are compared against the
        expected scores to measure accuracy. Target gold rate: {Math.round(project.quality.gold_rate * 100)}% of items.
      </Notice>
      <GoldForm orgId={orgId} projectId={project.id} rubric={rubric} items={items.filter((i) => !i.is_gold)} onCreated={data.reload} />
      <Card title={`Gold items (${gold.length})`}>
        {gold.length === 0 ? (
          <p className="text-sm text-fg-muted">No gold items yet.</p>
        ) : (
          <Table caption="Gold items">
            <thead>
              <tr>
                <Th>Item</Th>
                <Th>Expected scores</Th>
                <Th>Preferred model</Th>
                <Th>Tolerance</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {gold.map((g) => (
                <GoldRow key={g.id} orgId={orgId} projectId={project.id} gold={g} item={itemById.get(g.item_id)} onDeleted={data.reload} />
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function GoldRow({
  orgId,
  projectId,
  gold,
  item,
  onDeleted,
}: {
  orgId: string;
  projectId: string;
  gold: { id: string; item_id: string; expected: { scores: Record<string, number | string>; preferred_model?: string }; tolerance: number };
  item: Item | undefined;
  onDeleted: () => void;
}) {
  const api = useApi();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  return (
    <tr>
      <Td>
        <div className="font-mono text-xs">{item?.external_id ?? gold.item_id.slice(0, 8)}</div>
        {item && <p className="line-clamp-2 max-w-xs text-xs text-fg-muted">{item.prompt}</p>}
      </Td>
      <Td className="text-xs">
        {Object.entries(gold.expected.scores ?? {}).map(([k, v]) => (
          <div key={k}>
            <span className="font-mono">{k}</span>: {String(v)}
          </div>
        ))}
      </Td>
      <Td>{gold.expected.preferred_model ?? "-"}</Td>
      <Td>{gold.tolerance}</Td>
      <Td>
        <Button
          variant="ghost"
          size="sm"
          loading={pending}
          onClick={async () => {
            if (!window.confirm("Remove this gold item?")) return;
            setPending(true);
            setError(null);
            try {
              await api.gold.remove(orgId, projectId, gold.id);
              onDeleted();
            } catch (e) {
              setError(e);
            } finally {
              setPending(false);
            }
          }}
        >
          Remove
        </Button>
        <ErrorAlert error={error} />
      </Td>
    </tr>
  );
}

function defaultValue(c: Criterion): string {
  if (c.scale_type === "categorical") return c.options[0] ?? "";
  return String(c.scale_max);
}

function GoldForm({
  orgId,
  projectId,
  rubric,
  items,
  onCreated,
}: {
  orgId: string;
  projectId: string;
  rubric: RubricVersion;
  items: Item[];
  onCreated: () => void;
}) {
  const api = useApi();
  const [itemId, setItemId] = useState("");
  const [scores, setScores] = useState<Record<string, string>>(() => Object.fromEntries(rubric.criteria.map((c) => [c.key, defaultValue(c)])));
  const [preferred, setPreferred] = useState("");
  const [tolerance, setTolerance] = useState<0 | 1>(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [ok, setOk] = useState(false);
  const item = items.find((i) => i.id === itemId);
  const fe = error instanceof ApiError ? error.fieldErrors() : {};

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!itemId) return;
    setPending(true);
    setError(null);
    setOk(false);
    try {
      const parsed: Record<string, number | string> = {};
      for (const c of rubric.criteria) parsed[c.key] = c.scale_type === "categorical" ? scores[c.key] : Number(scores[c.key]);
      await api.gold.create(orgId, projectId, {
        item_id: itemId,
        expected: { scores: parsed, ...(preferred ? { preferred_model: preferred } : {}) },
        tolerance,
      });
      setOk(true);
      setItemId("");
      setPreferred("");
      onCreated();
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card title="Mark an item as gold">
      <form onSubmit={submit} className="flex max-w-3xl flex-col gap-4">
        <Select label="Item" value={itemId} onChange={(e) => setItemId(e.target.value)} required error={fe.item_id}>
          <option value="">Choose an item</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.external_id}: {i.prompt.slice(0, 80)}
            </option>
          ))}
        </Select>
        {item && (
          <div className="rounded-md bg-surface-sunken p-3 text-sm">
            <p className="whitespace-pre-wrap text-fg">{item.prompt}</p>
            {item.reference_answer && <p className="mt-2 text-xs text-fg-muted">Reference answer: {item.reference_answer}</p>}
          </div>
        )}
        <fieldset className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-medium text-fg">Expected scores</legend>
          {rubric.criteria.map((c) => (
            <Select
              key={c.key}
              label={c.label}
              value={scores[c.key] ?? ""}
              onChange={(e) => setScores((s) => ({ ...s, [c.key]: e.target.value }))}
              error={fe[`expected.scores.${c.key}`]}
            >
              {(c.scale_type === "categorical"
                ? c.options
                : Array.from({ length: c.scale_max - c.scale_min + 1 }, (_, k) => String(c.scale_min + k))
              ).map((o) => (
                <option key={o} value={o}>
                  {o}
                  {c.anchors?.[o] ? `: ${c.anchors[o]}` : ""}
                </option>
              ))}
            </Select>
          ))}
        </fieldset>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select label="Preferred model (optional)" value={preferred} onChange={(e) => setPreferred(e.target.value)}>
            <option value="">None</option>
            {(item?.responses ?? []).map((r) => (
              <option key={r.model_run_id} value={r.model}>
                {r.model}
              </option>
            ))}
          </Select>
          <Select
            label="Tolerance"
            hint="1 accepts answers within one scale point"
            value={tolerance}
            onChange={(e) => setTolerance(Number(e.target.value) as 0 | 1)}
          >
            <option value={0}>0 (exact)</option>
            <option value={1}>1 (within one point)</option>
          </Select>
        </div>
        <ErrorAlert error={error} />
        {ok && <Notice tone="green">Gold item saved.</Notice>}
        <div>
          <Button type="submit" loading={pending} disabled={!itemId}>
            Save gold item
          </Button>
        </div>
      </form>
    </Card>
  );
}
