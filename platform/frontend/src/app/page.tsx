"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loading } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { homePath } from "@/lib/roles";

export default function Home() {
  const { status, me } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (status === "authenticated") router.replace(homePath(me));
    if (status === "anonymous") router.replace("/login");
  }, [status, me, router]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Loading label="Opening your workspace" variant="inline" />
    </div>
  );
}
