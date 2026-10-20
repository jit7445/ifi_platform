"use client";

import { useState } from "react";
import { Button, Card, DefList, ErrorAlert, LinkButton, Notice, ProgressBar } from "@/components/ui";
import { useApi } from "@/lib/auth";
import { fmtDate, fmtDay, fmtPct, humanize } from "@/lib/format";
import type { ProjectTabProps } from "./types";

const NEXT_STEP: Record<string, string> = {
  draft: "Upload data, build and publish a rubric, then submit the project for Infollion review.",
  submitted: "Infollion is reviewing your project setup. You will be notified when it is approved.",
  changes_requested: "Infollion requested changes. Update the project and submit it again.",
  approved: "Approved. Infollion is staffing experts and will activate the project.",
  active: "Experts are working on tasks. Track progress in the Quality tab.",
  paused: "Work is paused. Contact your project manager to resume.",
  completed: "Work is complete. Freeze a dataset version and create an export.",
  cancelled: "This project was cancelled.",
};

export function OverviewTab({ orgId, project: p, reloadProject }: ProjectTabProps) {
  const api = useApi();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const editable = p.status === "draft" || p.status === "changes_requested";
  const c = p.counts ?? { items: 0, tasks: 0, tasks_completed: 0, submissions: 0 };

  async function submit() {
    setPending(true);
    setError(null);
    try {
      await api.projects.submit(orgId, p.id);
      reloadProject();
    } catch (e) {
      setError(e);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Notice tone={p.status === "changes_requested" ? "yellow" : "blue"}>{NEXT_STEP[p.status] ?? humanize(p.status)}</Notice>
      {editable && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={submit} loading={pending} disabled={p.status !== "draft" && p.status !== "changes_requested"}>
            Submit for review
          </Button>
          <LinkButton href={`/app/orgs/${orgId}/projects/${p.id}/edit`}>Edit settings</LinkButton>
        </div>
      )}
      <ErrorAlert error={error} />
      {c.tasks > 0 && <ProgressBar value={c.tasks_completed / c.tasks} label={`${c.tasks_completed} of ${c.tasks} tasks completed`} />}
      <Card title="Settings">
        <DefList
          items={[
            ["Domain", p.domain || "-"],
            ["Task type", humanize(p.task_type)],
            ["Deliverable", humanize(p.deliverable_format)],
            ["Difficulty", humanize(p.difficulty)],
            ["Languages", (p.languages ?? []).join(", ") || "-"],
            ["Target volume", p.target_volume],
            ["Deadline", fmtDay(p.deadline)],
            ["Created", fmtDate(p.created_at)],
            [
              "Quality",
              `Overlap ${p.quality.overlap_k}, review ${fmtPct(p.quality.review_rate)}, gold ${fmtPct(p.quality.gold_rate)}, agreement threshold ${p.quality.agreement_threshold}`,
            ],
            ["Rubric", p.current_rubric_version_id ? "Published version set" : "No published rubric yet"],
            ["Required skills", (p.required_skills ?? []).map((s) => `${s.skill_key} (L${s.min_level}+)`).join(", ") || "None"],
            ["Excluded companies", (p.excluded_companies ?? []).join(", ") || "None"],
          ]}
        />
        {p.description && <p className="mt-4 whitespace-pre-wrap text-sm text-fg">{p.description}</p>}
      </Card>
    </div>
  );
}
