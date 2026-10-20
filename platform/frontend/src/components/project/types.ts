import type { Project } from "@/lib/api";

export interface ProjectTabProps {
  orgId: string;
  project: Project;
  reloadProject: () => void;
}
