"use client";

import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { ProjectForm, emptyProject } from "@/components/project/ProjectForm";
import { useApi } from "@/lib/auth";

export default function NewProjectPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const api = useApi();
  const router = useRouter();
  return (
    <>
      <PageHeader title="New project" back={{ href: `/app/orgs/${orgId}/projects`, label: "Projects" }} />
      <ProjectForm
        initial={emptyProject()}
        submitLabel="Create project"
        onSubmit={async (v) => {
          const p = await api.projects.create(orgId, v);
          router.push(`/app/orgs/${orgId}/projects/${p.id}`);
        }}
      />
    </>
  );
}
