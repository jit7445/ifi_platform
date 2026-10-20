"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { EmptyState, Loading } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { customerOrgs } from "@/lib/roles";

export default function AppIndex() {
  const { me } = useAuth();
  const router = useRouter();
  const orgs = customerOrgs(me);
  const first = orgs[0]?.org_id;
  useEffect(() => {
    if (first) router.replace(`/app/orgs/${first}/projects`);
  }, [first, router]);
  if (!first) return <EmptyState title="No customer organisation">Your account is not a member of a customer organisation.</EmptyState>;
  return <Loading />;
}
