"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthCard } from "@/components/AuthCard";
import { Button, ErrorAlert, Input } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { homePath } from "@/lib/roles";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ full_name: "", email: "", org_name: "", password: "" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [local, setLocal] = useState<Record<string, string>>({});
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const fe = { ...(error instanceof ApiError ? error.fieldErrors() : {}), ...local };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.full_name.trim()) errs.full_name = "Enter your name";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = "Enter a valid email";
    if (!form.org_name.trim()) errs.org_name = "Enter your organisation name";
    if (form.password.length < 12) errs.password = "Use at least 12 characters";
    setLocal(errs);
    if (Object.keys(errs).length) return;
    setPending(true);
    setError(null);
    try {
      const me = await signup(form);
      router.replace(homePath(me));
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="Create your organisation"
      subtitle="Start an evaluation project with vetted domain experts."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary-text hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <Input label="Full name" autoComplete="name" required value={form.full_name} onChange={set("full_name")} error={fe.full_name} />
        <Input label="Work email" type="email" autoComplete="email" required value={form.email} onChange={set("email")} error={fe.email} />
        <Input label="Organisation" autoComplete="organization" required value={form.org_name} onChange={set("org_name")} error={fe.org_name} />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          hint="At least 12 characters."
          value={form.password}
          onChange={set("password")}
          error={fe.password}
        />
        <ErrorAlert error={error} />
        <Button type="submit" size="lg" className="mt-1" loading={pending}>
          Create account
        </Button>
      </form>
    </AuthCard>
  );
}
