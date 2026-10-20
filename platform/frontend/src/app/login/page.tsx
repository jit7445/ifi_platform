"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AuthCard } from "@/components/AuthCard";
import { Button, ErrorAlert, Input, Notice } from "@/components/ui";
import { isApiError, type Me } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { homePath } from "@/lib/roles";

function nextTarget(me: Me): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/") && !next.startsWith("//") ? next : homePath(me);
}

export default function LoginPage() {
  const { login, status, me } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [mfaStep, setMfaStep] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (status === "authenticated" && me) router.replace(nextTarget(me));
  }, [status, me, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const m = await login({ email, password, totp_code: mfaStep ? totp.trim() : undefined });
      router.replace(nextTarget(m));
    } catch (err) {
      if (isApiError(err, "mfa_required")) {
        if (mfaStep) setError(err);
        setMfaStep(true);
      } else {
        setError(err);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      title={mfaStep ? "Two-factor verification" : "Sign in"}
      subtitle={mfaStep ? "Enter the 6-digit code from your authenticator app." : "Use your work email and password."}
      footer={
        <>
          New customer?{" "}
          <Link href="/signup" className="font-medium text-primary-text hover:underline">
            Create an organisation
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        {!mfaStep ? (
          <>
            <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        ) : (
          <>
            <Notice>Signed in as {email}.</Notice>
            <Input
              label="Authentication code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              value={totp}
              onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
            />
          </>
        )}
        <ErrorAlert error={error} />
        <Button type="submit" size="lg" className="mt-1" loading={pending} disabled={!email || !password || (mfaStep && totp.length !== 6)}>
          {mfaStep ? "Verify and sign in" : "Sign in"}
        </Button>
        {mfaStep && (
          <Button
            variant="ghost"
            onClick={() => {
              setMfaStep(false);
              setTotp("");
              setError(null);
            }}
          >
            Use a different account
          </Button>
        )}
      </form>
    </AuthCard>
  );
}
