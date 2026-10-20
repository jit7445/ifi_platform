"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/ui";
import { useAuth } from "@/lib/auth";

export default function OrgLayout({ children }: { children: ReactNode }) {
  const { orgId } = useParams<{ orgId: string }>();
  const { me } = useAuth();
  const member = me?.memberships.find((m) => m.org_id === orgId);
  if (!member) {
    return <EmptyState title="Organisation not found">You are not a member of this organisation, or it does not exist.</EmptyState>;
  }
  return <>{children}</>;
}
