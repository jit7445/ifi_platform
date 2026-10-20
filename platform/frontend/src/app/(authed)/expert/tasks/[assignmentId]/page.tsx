"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { RoleGate } from "@/components/AppShell";
import { Workbench } from "@/components/expert/Workbench";
import { IconCheckCircle } from "@/components/icons";
import { ErrorAlert, LinkButton, Loading, PageHeader } from "@/components/ui";
import { useApi } from "@/lib/auth";
import { useResource } from "@/lib/hooks";

export default function ExpertTaskPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const api = useApi();
  const task = useResource(`expert:task:${assignmentId}`, () => api.expert.task(assignmentId));
  const [submittedFor, setSubmittedFor] = useState<string | null>(null);
  const back = { href: "/expert", label: "My work" };

  if (submittedFor === assignmentId) {
    return (
      <RoleGate roles={["expert"]}>
        <PageHeader title="Submitted" back={back} />
        <div className="mx-auto mt-6 flex max-w-lg flex-col items-center rounded-2xl border border-success-line bg-surface p-8 text-center shadow-card">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-subtle text-success">
            <IconCheckCircle size={26} />
          </span>
          <h2 className="text-lg font-semibold tracking-tight text-fg">Evaluation submitted</h2>
          <p role="status" className="mt-2 text-sm text-fg-muted">
            Thank you. Your evaluation was submitted and will go through quality checks.
          </p>
          <div className="mt-6 flex gap-2">
            <LinkButton href="/expert" variant="primary">
              Back to my work
            </LinkButton>
          </div>
        </div>
      </RoleGate>
    );
  }

  return (
    <RoleGate roles={["expert"]}>
      {!task.data ? (
        <>
          <PageHeader title="Task" back={back} />
          {task.loading ? <Loading label="Loading task" /> : <ErrorAlert error={task.error} onRetry={task.reload} />}
        </>
      ) : (
        <>
          <PageHeader title={task.data.project.name} subtitle={task.data.project.customer_display} back={back} />
          <Workbench key={task.data.assignment_id} task={task.data} onSubmitted={() => setSubmittedFor(assignmentId)} />
        </>
      )}
    </RoleGate>
  );
}
