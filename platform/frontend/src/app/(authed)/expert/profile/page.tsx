"use client";

import { useState, type FormEvent } from "react";
import { RoleGate } from "@/components/AppShell";
import { Button, Card, EmptyState, ErrorAlert, Input, Loading, Notice, PageHeader, Select, StatusBadge, Table, Td, Textarea, Th } from "@/components/ui";
import {
  isApiError,
  type ConflictInput,
  type ConflictRelationship,
  type CredentialInput,
  type CredentialKind,
  type ExpertProfile,
  type ExpertProfileInput,
  type ExpertSkill,
  type Skill,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAsyncAction, useResource } from "@/lib/hooks";
import { fmtDay, humanize } from "@/lib/format";

const CREDENTIAL_KINDS: CredentialKind[] = ["degree", "license", "certification", "employment", "publication"];
const RELATIONSHIPS: ConflictRelationship[] = ["employee", "former_employee", "consultant", "investor", "family", "other"];

export default function ExpertProfilePage() {
  return (
    <RoleGate roles={["expert"]}>
      <PageHeader title="Expert profile" subtitle="Your profile is used to match you to projects. Customers never see your name." back={{ href: "/expert", label: "My work" }} />
      <div className="flex flex-col gap-6">
        <ProfileCard />
        <CredentialsCard />
        <ConflictsCard />
      </div>
    </RoleGate>
  );
}

function ProfileCard() {
  const { api, reloadMe } = useAuth();
  const profile = useResource("expert:profile", async () => {
    try {
      return await api.expert.profile();
    } catch (e) {
      if (isApiError(e) && e.status === 404) return null;
      throw e;
    }
  });
  const skills = useResource("skills", () => api.skills());

  if ((profile.loading && profile.data === undefined) || (skills.loading && !skills.data)) return <Loading label="Loading profile" />;
  if (profile.error && profile.data === undefined) return <ErrorAlert error={profile.error} onRetry={profile.reload} />;
  return (
    <ProfileForm
      key={profile.data ? JSON.stringify(profile.data) : "new"}
      initial={profile.data ?? null}
      skills={skills.data ?? []}
      skillsError={skills.error}
      onSaved={(p) => {
        profile.mutate(() => p);
        void reloadMe();
      }}
    />
  );
}

function ProfileForm({
  initial,
  skills,
  skillsError,
  onSaved,
}: {
  initial: ExpertProfile | null;
  skills: Skill[];
  skillsError: unknown;
  onSaved: (p: ExpertProfile) => void;
}) {
  const { api } = useAuth();
  const [form, setForm] = useState<ExpertProfileInput>({
    headline: initial?.headline ?? "",
    bio: initial?.bio ?? "",
    years_experience: initial?.years_experience ?? 0,
    country: initial?.country ?? "",
    languages: initial?.languages ?? ["en"],
    weekly_hours: initial?.weekly_hours ?? 10,
    skills: initial?.skills ?? [],
  });
  const [langText, setLangText] = useState((initial?.languages ?? ["en"]).join(", "));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const save = useAsyncAction(async (b: ExpertProfileInput) => api.expert.saveProfile(b));

  const set = <K extends keyof ExpertProfileInput>(k: K, v: ExpertProfileInput[K]) => {
    setSaved(false);
    setForm((f) => ({ ...f, [k]: v }));
  };
  const setSkill = (i: number, patch: Partial<ExpertSkill>) =>
    set(
      "skills",
      form.skills.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    );
  const usedSkills = new Set(form.skills.map((s) => s.skill_key));
  const byDomain = new Map<string, Skill[]>();
  for (const s of skills) byDomain.set(s.domain, [...(byDomain.get(s.domain) ?? []), s]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const languages = langText
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
    const errs: Record<string, string> = {};
    if (!form.headline.trim()) errs.headline = "Add a short headline";
    if (!form.country.trim()) errs.country = "Country is required";
    if (languages.length === 0) errs.languages = "Add at least one language code";
    if (!Number.isFinite(form.years_experience) || form.years_experience < 0) errs.years_experience = "Enter 0 or more";
    if (!Number.isFinite(form.weekly_hours) || form.weekly_hours < 0 || form.weekly_hours > 80) errs.weekly_hours = "Enter 0 to 80";
    if (form.skills.some((s) => !s.skill_key)) errs.skills = "Choose a skill for every row or remove it";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const res = await save.run({ ...form, languages });
    if (res) {
      setSaved(true);
      onSaved(res);
    }
  };

  return (
    <Card title="Profile">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Input label="Headline" required value={form.headline} onChange={(e) => set("headline", e.target.value)} error={errors.headline} placeholder="e.g. Corporate lawyer, 12 years in M&A" />
        <Textarea label="Bio" value={form.bio} onChange={(e) => set("bio", e.target.value)} rows={4} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Years of experience"
            type="number"
            min={0}
            value={Number.isFinite(form.years_experience) ? form.years_experience : ""}
            onChange={(e) => set("years_experience", e.target.valueAsNumber)}
            error={errors.years_experience}
          />
          <Input label="Country" required value={form.country} onChange={(e) => set("country", e.target.value)} error={errors.country} placeholder="e.g. IN" />
          <Input
            label="Languages"
            value={langText}
            onChange={(e) => {
              setSaved(false);
              setLangText(e.target.value);
            }}
            hint="Comma separated codes, e.g. en, hi"
            error={errors.languages}
          />
          <Input
            label="Hours per week"
            type="number"
            min={0}
            max={80}
            value={Number.isFinite(form.weekly_hours) ? form.weekly_hours : ""}
            onChange={(e) => set("weekly_hours", e.target.valueAsNumber)}
            error={errors.weekly_hours}
          />
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-fg">Skills</legend>
          {skillsError !== undefined && skillsError !== null && <ErrorAlert error={skillsError} title="Could not load the skill list" />}
          {form.skills.length === 0 && <p className="text-sm text-fg-muted">No skills added yet.</p>}
          {form.skills.map((s, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <Select
                label={<span className="sr-only">Skill {i + 1}</span>}
                wrapperClassName="min-w-[12rem] flex-1"
                value={s.skill_key}
                onChange={(e) => setSkill(i, { skill_key: e.target.value })}
              >
                <option value="">Choose a skill</option>
                {[...byDomain.entries()].map(([domain, list]) => (
                  <optgroup key={domain} label={humanize(domain)}>
                    {list.map((sk) => (
                      <option key={sk.key} value={sk.key} disabled={usedSkills.has(sk.key) && sk.key !== s.skill_key}>
                        {sk.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
              <Select label={<span className="sr-only">Level for skill {i + 1}</span>} wrapperClassName="w-36" value={s.level} onChange={(e) => setSkill(i, { level: Number(e.target.value) })}>
                {[1, 2, 3, 4, 5].map((l) => (
                  <option key={l} value={l}>
                    Level {l}
                  </option>
                ))}
              </Select>
              <Button variant="ghost" size="sm" onClick={() => set("skills", form.skills.filter((_, j) => j !== i))} aria-label={`Remove skill ${i + 1}`}>
                Remove
              </Button>
            </div>
          ))}
          {errors.skills && (
            <p className="text-xs font-medium text-danger" role="alert">
              {errors.skills}
            </p>
          )}
          <div>
            <Button variant="secondary" size="sm" onClick={() => set("skills", [...form.skills, { skill_key: "", level: 3 }])}>
              Add skill
            </Button>
          </div>
          <p className="text-xs text-fg-muted">Level 1 is familiarity, level 5 is recognised authority.</p>
        </fieldset>

        <ErrorAlert error={save.error} />
        {saved && <Notice tone="green">Profile saved.</Notice>}
        <div className="flex items-center gap-3">
          <Button type="submit" loading={save.pending}>
            Save profile
          </Button>
          {initial?.status && (
            <span className="text-sm text-fg-muted">
              Status: <StatusBadge status={initial.status} />
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}

function CredentialsCard() {
  const { api } = useAuth();
  const list = useResource("expert:credentials", () => api.expert.credentials());
  const blank: CredentialInput = { kind: "degree", title: "", issuer: "" };
  const [form, setForm] = useState<CredentialInput>(blank);
  const [yearText, setYearText] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const add = useAsyncAction((b: CredentialInput) => api.expert.addCredential(b));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.issuer.trim()) errs.issuer = "Issuer is required";
    const year = yearText.trim() ? Number(yearText) : undefined;
    if (year !== undefined && (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear() + 1)) errs.year = "Enter a valid year";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const body: CredentialInput = { kind: form.kind, title: form.title.trim(), issuer: form.issuer.trim() };
    if (year !== undefined) body.year = year;
    if (form.identifier?.trim()) body.identifier = form.identifier.trim();
    const res = await add.run(body);
    if (res) {
      setForm(blank);
      setYearText("");
      list.reload();
    }
  };

  return (
    <Card title="Credentials">
      <p className="mb-3 text-sm text-fg-muted">Credentials are checked by the Infollion team before they count toward matching.</p>
      {list.loading && !list.data ? (
        <Loading label="Loading credentials" variant="table" />
      ) : list.error && !list.data ? (
        <ErrorAlert error={list.error} onRetry={list.reload} />
      ) : list.data?.length ? (
        <Table caption="Credentials">
          <thead>
            <tr>
              <Th>Kind</Th>
              <Th>Title</Th>
              <Th>Issuer</Th>
              <Th>Year</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {list.data.map((c) => (
              <tr key={c.id}>
                <Td>{humanize(c.kind)}</Td>
                <Td>{c.title}</Td>
                <Td>{c.issuer}</Td>
                <Td>{c.year ?? "-"}</Td>
                <Td>
                  <StatusBadge status={c.status} />
                  {c.note && <p className="mt-1 text-xs text-fg-muted">{c.note}</p>}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState title="No credentials yet" />
      )}

      <form onSubmit={onSubmit} noValidate className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Select label="Kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as CredentialKind })}>
          {CREDENTIAL_KINDS.map((k) => (
            <option key={k} value={k}>
              {humanize(k)}
            </option>
          ))}
        </Select>
        <Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} error={errors.title} />
        <Input label="Issuer" required value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} error={errors.issuer} />
        <Input label="Year" inputMode="numeric" value={yearText} onChange={(e) => setYearText(e.target.value)} error={errors.year} />
        <Input label="Identifier" value={form.identifier ?? ""} onChange={(e) => setForm({ ...form, identifier: e.target.value })} hint="Licence or registration number" />
        <div className="sm:col-span-2 lg:col-span-5">
          <ErrorAlert error={add.error} />
          <Button type="submit" variant="secondary" loading={add.pending} className="mt-2">
            Add credential
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ConflictsCard() {
  const { api } = useAuth();
  const list = useResource("expert:conflicts", () => api.expert.conflicts());
  const blank: ConflictInput = { organization_name: "", relationship: "employee" };
  const [form, setForm] = useState<ConflictInput>(blank);
  const [error, setError] = useState<string | null>(null);
  const add = useAsyncAction((b: ConflictInput) => api.expert.addConflict(b));
  const remove = useAsyncAction((id: string) => api.expert.removeConflict(id));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.organization_name.trim()) {
      setError("Organisation name is required");
      return;
    }
    setError(null);
    const body: ConflictInput = { organization_name: form.organization_name.trim(), relationship: form.relationship };
    if (form.until) body.until = form.until;
    const res = await add.run(body);
    if (res) {
      setForm(blank);
      list.reload();
    }
  };

  return (
    <Card title="Conflicts of interest">
      <p className="mb-3 text-sm text-fg-muted">
        Declare organisations you are connected to. You will not be matched to projects from these organisations.
      </p>
      {list.loading && !list.data ? (
        <Loading label="Loading conflicts" variant="table" />
      ) : list.error && !list.data ? (
        <ErrorAlert error={list.error} onRetry={list.reload} />
      ) : list.data?.length ? (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {list.data.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <span>
                <span className="font-medium">{c.organization_name}</span> · {humanize(c.relationship)}
                {c.until && <span className="text-fg-muted"> · until {fmtDay(c.until)}</span>}
              </span>
              <Button
                variant="ghost"
                size="sm"
                loading={remove.pending}
                onClick={async () => {
                  await remove.run(c.id);
                  list.reload();
                }}
                aria-label={`Remove conflict with ${c.organization_name}`}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No conflicts declared" />
      )}
      <ErrorAlert error={remove.error} />
      <form onSubmit={onSubmit} noValidate className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input
          label="Organisation"
          required
          value={form.organization_name}
          onChange={(e) => setForm({ ...form, organization_name: e.target.value })}
          error={error}
        />
        <Select label="Relationship" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value as ConflictRelationship })}>
          {RELATIONSHIPS.map((r) => (
            <option key={r} value={r}>
              {humanize(r)}
            </option>
          ))}
        </Select>
        <Input label="Until" type="date" value={form.until ?? ""} onChange={(e) => setForm({ ...form, until: e.target.value || undefined })} hint="Leave empty if ongoing" />
        <div className="sm:col-span-3">
          <ErrorAlert error={add.error} />
          <Button type="submit" variant="secondary" loading={add.pending} className="mt-2">
            Declare conflict
          </Button>
        </div>
      </form>
    </Card>
  );
}
