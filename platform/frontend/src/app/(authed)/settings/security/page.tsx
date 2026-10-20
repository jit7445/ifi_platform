"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, Card, ErrorAlert, Input, Notice, PageHeader } from "@/components/ui";
import type { MfaSetup } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function SecurityPage() {
  const { me, api, reloadMe } = useAuth();
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);
  const enabled = me?.user.mfa_enabled ?? false;

  async function begin() {
    setPending(true);
    setError(null);
    try {
      setSetup(await api.auth.mfaSetup());
    } catch (e) {
      setError(e);
    } finally {
      setPending(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api.auth.mfaVerify(code.trim());
      setDone(true);
      setSetup(null);
      setCode("");
      await reloadMe();
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHeader title="Security" subtitle={me?.user.email} />
      <Card
        title="Two-factor authentication"
        actions={enabled ? <Badge tone="green">Enabled</Badge> : <Badge tone="yellow">Not enabled</Badge>}
      >
        <div className="flex max-w-xl flex-col gap-4">
          {done && <Notice tone="green">Two-factor authentication is now active. You will be asked for a code at sign in.</Notice>}
          {!setup && (
            <>
              <p className="text-sm text-fg-muted">
                Protect your account with a time-based one-time code from an authenticator app such as 1Password, Authy or Google
                Authenticator.
              </p>
              <div>
                <Button onClick={begin} loading={pending} variant={enabled ? "secondary" : "primary"}>
                  {enabled ? "Re-enrol authenticator" : "Set up authenticator"}
                </Button>
              </div>
            </>
          )}
          {setup && (
            <form onSubmit={verify} className="flex flex-col gap-4">
              <ol className="list-decimal space-y-3 pl-5 text-sm text-fg">
                <li>
                  Add a new account in your authenticator app using this setup URL:
                  <code className="mt-1 block break-all rounded bg-surface-sunken p-2 font-mono text-xs">{setup.otpauth_url}</code>
                </li>
                <li>
                  Or enter this secret manually:
                  <code className="mt-1 block break-all rounded bg-surface-sunken p-2 font-mono text-sm tracking-wider">{setup.secret}</code>
                </li>
                <li>Enter the 6-digit code the app shows.</li>
              </ol>
              <Input
                label="Verification code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                wrapperClassName="max-w-[12rem]"
              />
              <div className="flex gap-2">
                <Button type="submit" loading={pending} disabled={code.length !== 6}>
                  Verify and enable
                </Button>
                <Button variant="ghost" onClick={() => setSetup(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
          <ErrorAlert error={error} />
        </div>
      </Card>
    </>
  );
}
