"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { RoleGate } from "@/components/AppShell";
import { Badge, Button, Card, DefList, EmptyState, ErrorAlert, Loading, Modal, Notice, PageHeader, Select, Stat, StatusBadge, Table, Td, Textarea, Th, TextBlock } from "@/components/ui";
import type { Credential, ExpertDetail, ExpertTier } from "@/lib/api";
import { useApi } from "@/lib/auth";
import { useAsyncAction, useResource } from "@/lib/hooks";
import { fmtDay, fmtPct, humanize } from "@/lib/format";
import { STAFF_ROLES } from "@/lib/roles";

export default function StaffExpertPage() {
  return (
    <RoleGate roles={STAFF_ROLES}>
      <StaffExpert />
    </RoleGate>
  );
}

function StaffExpert() {
  const { expertId } = useParams<{ expertId: string }>();
  const api = useApi();
  const res = useResource(`staff:expert:${expertId}`, () => api.staff.expert(expertId));
  const skills = useResource("skills", () => api.skills());
  const back = { href: "/staff/experts", label: "Experts" };

  if (!res.data) {
    return (
      <>
        <PageHeader title="Expert" back={back} />
        {res.loading ? <Loading label="Loading expert" /> : <ErrorAlert error={res.error} onRetry={res.reload} />}
      </>
    );
  }
  const x = res.data;
  const skillLabel = new Map((skills.data ?? []).map((s) => [s.key, s.label]));

  return (
    <>
      <PageHeader
        title={x.display_name}
        back={back}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {x.pseudonym && <span>{x.pseudonym}</span>}
            <StatusBadge status={x.status} />
            {x.tier && <Badge tone="purple">{humanize(x.tier)}</Badge>}
            {x.email && <span>{x.email}</span>}
          </span>
        }
      />
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Submissions" value={x.quality?.submissions ?? 0} />
          <Stat label="Gold accuracy" value={fmtPct(x.quality?.gold_accuracy)} />
          <Stat label="Acceptance rate" value={fmtPct(x.quality?.acceptance_rate)} />
        </div>

        <StatusCard expert={x} onSaved={(d) => res.mutate((prev) => (prev ? { ...prev, ...d, credentials: prev.credentials, conflicts: prev.conflicts } : d))} />

        <Card title="Profile">
          <div className="flex flex-col gap-4">
            {x.headline && <p className="font-medium text-fg">{x.headline}</p>}
            <DefList
              items={[
                ["Country", x.country ?? "-"],
                ["Years of experience", x.years_experience ?? "-"],
                ["Languages", x.languages?.join(", ") || "-"],
                ["Hours per week", x.weekly_hours ?? "-"],
                [
                  "Skills",
                  x.skills?.length ? (
                    <span className="flex flex-wrap gap-1">
                      {x.skills.map((s) => (
                        <Badge key={s.skill_key}>
                          {skillLabel.get(s.skill_key) ?? s.skill_key} · level {s.level}
                        </Badge>
                      ))}
                    </span>
                  ) : (
                    "-"
                  ),
                ],
              ]}
            />
            {x.bio && <TextBlock text={x.bio} />}
          </div>
        </Card>

        <CredentialsCard expertId={x.id} credentials={x.credentials ?? []} onChanged={res.reload} />

        <Card title="Conflicts of interest">
          {x.conflicts?.length ? (
            <ul className="divide-y divide-line text-sm">
              {x.conflicts.map((c) => (
                <li key={c.id} className="py-2">
                  <span className="font-medium">{c.organization_name}</span> · {humanize(c.relationship)}
                  {c.until && <span className="text-fg-muted"> · until {fmtDay(c.until)}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No conflicts declared" />
          )}
        </Card>
      </div>
    </>
  );
}

function StatusCard({ expert, onSaved }: { expert: ExpertDetail; onSaved: (d: ExpertDetail) => void }) {
  const api = useApi();
  const [status, setStatus] = useState<"active" | "suspended">(expert.status === "suspended" ? "suspended" : "active");
  const [tier, setTier] = useState<ExpertTier>(expert.tier ?? "standard");
  const [saved, setSaved] = useState(false);
  const save = useAsyncAction(() => api.staff.updateExpert(expert.id, { status, tier }));
  return (
    <Card title="Status">
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Status"
          wrapperClassName="w-40"
          value={status}
          onChange={(e) => {
            setSaved(false);
            setStatus(e.target.value as "active" | "suspended");
          }}
        >
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </Select>
        <Select
          label="Tier"
          wrapperClassName="w-40"
          value={tier}
          onChange={(e) => {
            setSaved(false);
            setTier(e.target.value as ExpertTier);
          }}
        >
          <option value="standard">Standard</option>
          <option value="senior">Senior</option>
        </Select>
        <Button
          variant="secondary"
          loading={save.pending}
          onClick={async () => {
            if (status === "suspended" && expert.status !== "suspended" && !window.confirm("Suspend this expert? They will stop receiving tasks.")) return;
            const r = await save.run();
            if (r) {
              setSaved(true);
              onSaved(r);
            }
          }}
        >
          Save
        </Button>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {saved && <Notice tone="green">Expert updated.</Notice>}
        <ErrorAlert error={save.error} />
      </div>
    </Card>
  );
}

function CredentialsCard({ expertId, credentials, onChanged }: { expertId: string; credentials: Credential[]; onChanged: () => void }) {
  const api = useApi();
  const [target, setTarget] = useState<{ cred: Credential; status: "verified" | "rejected" } | null>(null);
  const [note, setNote] = useState("");
  const verify = useAsyncAction((cid: string, status: "verified" | "rejected", n: string) => api.staff.verifyCredential(expertId, cid, { status, note: n }));

  return (
    <Card title="Credentials">
      {credentials.length === 0 ? (
        <EmptyState title="No credentials submitted" />
      ) : (
        <Table caption="Credentials">
          <thead>
            <tr>
              <Th>Kind</Th>
              <Th>Title</Th>
              <Th>Issuer</Th>
              <Th>Year</Th>
              <Th>Identifier</Th>
              <Th>Status</Th>
              <Th>
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {credentials.map((c) => (
              <tr key={c.id}>
                <Td>{humanize(c.kind)}</Td>
                <Td>{c.title}</Td>
                <Td>{c.issuer}</Td>
                <Td>{c.year ?? "-"}</Td>
                <Td className="font-mono text-xs">{c.identifier ?? "-"}</Td>
                <Td>
                  <StatusBadge status={c.status} />
                  {c.note && <p className="mt-1 text-xs text-fg-muted">{c.note}</p>}
                </Td>
                <Td>
                  <span className="flex gap-1">
                    {c.status !== "verified" && (
                      <Button size="sm" variant="secondary" onClick={() => setTarget({ cred: c, status: "verified" })}>
                        Verify
                      </Button>
                    )}
                    {c.status !== "rejected" && (
                      <Button size="sm" variant="ghost" onClick={() => setTarget({ cred: c, status: "rejected" })}>
                        Reject
                      </Button>
                    )}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Modal
        open={target !== null}
        title={target?.status === "verified" ? "Verify credential" : "Reject credential"}
        onClose={() => {
          setTarget(null);
          setNote("");
        }}
      >
        {target && (
          <>
            <p className="mb-3 text-sm text-fg-muted">
              {target.cred.title}, {target.cred.issuer}
            </p>
            <Textarea
              label={target.status === "verified" ? "How was it verified?" : "Reason for rejection"}
              required
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <ErrorAlert error={verify.error} />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setTarget(null)}>
                Cancel
              </Button>
              <Button
                variant={target.status === "verified" ? "primary" : "danger"}
                disabled={!note.trim()}
                loading={verify.pending}
                onClick={async () => {
                  const r = await verify.run(target.cred.id, target.status, note.trim());
                  if (r) {
                    setTarget(null);
                    setNote("");
                    onChanged();
                  }
                }}
              >
                {target.status === "verified" ? "Verify" : "Reject"}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </Card>
  );
}
