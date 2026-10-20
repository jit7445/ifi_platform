"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { ErrorAlert, Loading, PageHeader, ProgressBar, Stat, StatusBadge, TabPanel, Tabs } from "@/components/ui";
import { IconCheckBadge, IconFolder, IconTarget, IconUsers } from "@/components/icons";
import { OverviewTab } from "@/components/project/OverviewTab";
import { DataTab } from "@/components/project/DataTab";
import { RubricTab } from "@/components/project/RubricTab";
import { GoldTab } from "@/components/project/GoldTab";
import { QualityTab } from "@/components/project/QualityTab";
import { DatasetsTab } from "@/components/project/DatasetsTab";
import { useApi } from "@/lib/auth";
import { useResource } from "@/lib/hooks";
import { fmtNum, humanize } from "@/lib/format";
import { alphaBand, overallAlpha } from "@/lib/quality";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "data", label: "Data" },
  { id: "rubric", label: "Rubric" },
  { id: "gold", label: "Gold" },
  { id: "quality", label: "Quality" },
  { id: "datasets", label: "Datasets & exports" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const bandTone = { reliable: "green", tentative: "yellow", unreliable: "red", insufficient_data: "default" } as const;

export default function ProjectDetailPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const api = useApi();
  const [tab, setTab] = useState<TabId>("overview");
  const res = useResource(`project:${projectId}`, () => api.projects.get(orgId, projectId));
  const metrics = useResource(`project-kpi-metrics:${projectId}`, () => api.metrics.latest(orgId, projectId));
  const back = { href: `/app/orgs/${orgId}/projects`, label: "Projects" };

  if (!res.data) {
    return (
      <>
        <PageHeader title="Project" back={back} />
        {res.loading ? <Loading label="Loading project" /> : <ErrorAlert error={res.error} onRetry={res.reload} />}
      </>
    );
  }
  const p = res.data;
  const ctx = { orgId, project: p, reloadProject: res.reload };
  const c = p.counts ?? { items: 0, tasks: 0, tasks_completed: 0, submissions: 0 };
  const alpha = overallAlpha(metrics.data);
  const band = alphaBand(alpha);

  return (
    <>
      <PageHeader
        title={p.name}
        back={back}
        status={<StatusBadge status={p.status} />}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-xs">{p.code}</span>
            <span aria-hidden="true" className="text-fg-subtle">
              /
            </span>
            <span>{humanize(p.task_type)}</span>
            {p.domain && (
              <>
                <span aria-hidden="true" className="text-fg-subtle">
                  /
                </span>
                <span>{p.domain}</span>
              </>
            )}
          </span>
        }
      />
      <section aria-label="Key figures" className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Items" value={c.items} hint={`Target ${p.target_volume}`} icon={<IconFolder size={16} />} />
        <Stat
          label="Tasks completed"
          value={
            <>
              {c.tasks_completed}
              <span className="text-base font-medium text-fg-subtle"> / {c.tasks}</span>
            </>
          }
          icon={<IconCheckBadge size={16} />}
          footer={<ProgressBar value={c.tasks ? c.tasks_completed / c.tasks : 0} label="Task completion" hideLabel />}
        />
        <Stat label="Submissions" value={c.submissions} icon={<IconUsers size={16} />} />
        <Stat
          label="Agreement (alpha)"
          value={fmtNum(alpha, 2)}
          tone={bandTone[band]}
          hint={alpha === null ? "Not computed yet" : humanize(band)}
          icon={<IconTarget size={16} />}
        />
      </section>
      <Tabs tabs={[...TABS]} active={tab} onChange={setTab} label="Project sections" />
      <TabPanel id={tab}>
        {tab === "overview" && <OverviewTab {...ctx} />}
        {tab === "data" && <DataTab {...ctx} />}
        {tab === "rubric" && <RubricTab {...ctx} />}
        {tab === "gold" && <GoldTab {...ctx} />}
        {tab === "quality" && <QualityTab {...ctx} />}
        {tab === "datasets" && <DatasetsTab {...ctx} />}
      </TabPanel>
    </>
  );
}
