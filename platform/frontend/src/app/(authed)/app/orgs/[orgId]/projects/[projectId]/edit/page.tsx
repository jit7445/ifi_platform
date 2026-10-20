"use client";

import { useParams, useRouter } from "next/navigation";
import { EmptyState, ErrorAlert, Loading, PageHeader } from "@/components/ui";
import { ProjectForm, projectToInput } from "@/components/project/ProjectForm";
import { useApi } from "@/lib/auth";
import { useResource } from "@/lib/hooks";

export default function EditProjectPage() {
  const { orgId, projectId } = useParams<{ orgId: string; projectId: string }>();
  const api = useApi();
  const router = useRouter();
  const res = useResource(`project:${projectId}`, () => api.projects.get(orgId, projectId));
  const back = { href: `/app/orgs/${orgId}/projects/${projectId}`, label: "Project" };
  if (res.loading) return <Loading />;
  if (res.error || !res.data) return <ErrorAlert error={res.error} onRetry={res.reload} />;
  const p = res.data;
  if (p.status !== "draft" && p.status !== "changes_requested") {
    return (
      <>
        <PageHeader title={`Edit ${p.name}`} back={back} />
        <EmptyState title="This project can no longer be edited">Only draft projects or projects with requested changes can be edited.</EmptyState>
      </>
    );
  }
  return (
    <>
      <PageHeader title={`Edit ${p.name}`} back={back} />
      <ProjectForm
        initial={projectToInput(p)}
        submitLabel="Save changes"
        onSubmit={async (v) => {
          await api.projects.update(orgId, projectId, v);
          router.push(back.href);
        }}
      />
    </>
  );
}
