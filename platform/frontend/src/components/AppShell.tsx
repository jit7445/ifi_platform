"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/api";
import { allRoles, customerOrgs, hasAny, isOrgAdmin, REVIEW_ROLES, STAFF_ROLES } from "@/lib/roles";
import {
  IconBriefcase,
  IconChart,
  IconCheckBadge,
  IconChevronDown,
  IconFolder,
  IconLock,
  IconLogout,
  IconMenu,
  IconQueue,
  IconScale,
  IconScroll,
  IconUser,
  IconUsers,
  IconX,
  LogoMark,
} from "./icons";
import { ThemeToggle } from "./ThemeToggle";
import { Skeleton, cx, EmptyState, Notice } from "./ui";

type NavIcon = typeof IconFolder;

interface NavGroup {
  label: string;
  links: { href: string; label: string; icon: NavIcon }[];
}

function useNav(): NavGroup[] {
  const { me } = useAuth();
  const groups: NavGroup[] = [];
  for (const org of customerOrgs(me)) {
    const links = [{ href: `/app/orgs/${org.org_id}/projects`, label: "Projects", icon: IconFolder }];
    if (isOrgAdmin(me, org.org_id)) {
      links.push({ href: `/app/orgs/${org.org_id}/usage`, label: "Usage", icon: IconChart });
      links.push({ href: `/app/orgs/${org.org_id}/audit`, label: "Audit log", icon: IconScroll });
    }
    groups.push({ label: org.org_name, links });
  }
  if (hasAny(me, STAFF_ROLES)) {
    groups.push({
      label: "Operations",
      links: [
        { href: "/staff/projects", label: "Project queue", icon: IconQueue },
        { href: "/staff/experts", label: "Experts", icon: IconUsers },
        { href: "/staff/audit", label: "Audit log", icon: IconScroll },
      ],
    });
  }
  if (hasAny(me, REVIEW_ROLES)) {
    groups.push({
      label: "Quality",
      links: [
        { href: "/staff/reviews", label: "Reviews", icon: IconCheckBadge },
        { href: "/staff/adjudications", label: "Adjudications", icon: IconScale },
      ],
    });
  }
  if (hasAny(me, ["expert"]) || me?.expert_profile_id) {
    groups.push({
      label: "Expert",
      links: [
        { href: "/expert", label: "My work", icon: IconBriefcase },
        { href: "/expert/profile", label: "Profile", icon: IconUser },
      ],
    });
  }
  groups.push({ label: "Account", links: [{ href: "/settings/security", label: "Security", icon: IconLock }] });
  return groups;
}

const ROLE_LABEL: Record<Role, string> = {
  platform_admin: "Platform admin",
  project_manager: "Project manager",
  reviewer: "Reviewer",
  expert: "Expert",
  customer_admin: "Customer admin",
  customer_member: "Customer",
};

const ROLE_ORDER: Role[] = ["platform_admin", "project_manager", "reviewer", "customer_admin", "customer_member", "expert"];

function initials(name: string, email: string): string {
  const src = name.trim() || email;
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function UserMenu({ name, email, roles, onSignOut }: { name: string; email: string; roles: string[]; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg p-1 pr-1.5 transition-colors hover:bg-surface-hover"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-subtle text-xs font-semibold text-primary-text ring-1 ring-primary-line">
          {initials(name, email)}
        </span>
        <IconChevronDown size={14} className="hidden text-fg-subtle sm:block" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-surface-raised shadow-pop">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium text-fg">{name || email}</p>
            <p className="truncate text-xs text-fg-muted">{email}</p>
            {roles.length > 0 && <p className="mt-1 text-xs text-fg-subtle">{roles.join(", ")}</p>}
          </div>
          <div className="p-1">
            <Link
              role="menuitem"
              href="/settings/security"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg hover:bg-surface-hover"
            >
              <IconLock size={16} className="text-fg-subtle" /> Security settings
            </Link>
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg hover:bg-surface-hover"
            >
              <IconLogout size={16} className="text-fg-subtle" /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ShellSkeleton({ label }: { label: string }) {
  return (
    <div className="min-h-screen" role="status" aria-live="polite">
      <span className="sr-only">{label}...</span>
      <div className="flex h-14 items-center gap-3 border-b border-line bg-surface px-4">
        <LogoMark size={26} />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex">
        <div className="hidden w-60 shrink-0 flex-col gap-3 border-r border-line bg-surface p-4 lg:flex">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-4 p-6">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { status, me, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const nav = useNav();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const menuOpen = openFor === pathname;

  useEffect(() => {
    if (status === "anonymous") {
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [status, router]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenFor(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  if (status !== "authenticated" || !me) {
    return <ShellSkeleton label={status === "anonymous" ? "Redirecting to sign in" : "Loading your workspace"} />;
  }

  const roles = allRoles(me);
  const roleLabels = ROLE_ORDER.filter((r) => roles.has(r)).map((r) => ROLE_LABEL[r]);
  const signOut = async () => {
    await logout();
    router.replace("/login");
  };

  // The workbench hides the sidebar so both answers and the scoring panel get the full width.
  const focus = pathname.startsWith("/expert/tasks/");
  const isActive = (href: string) => (href === "/expert" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  const navList = (
    <nav aria-label="Main" className="flex flex-col gap-6">
      {nav.map((g) => (
        <div key={g.label}>
          <p className="mb-1.5 truncate px-2.5 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">{g.label}</p>
          <ul className="flex flex-col gap-0.5">
            {g.links.map((l) => {
              const on = isActive(l.href);
              const Icon = l.icon;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={on ? "page" : undefined}
                    className={cx(
                      "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      on ? "bg-primary-subtle font-medium text-primary-text" : "text-fg-muted hover:bg-surface-hover hover:text-fg",
                    )}
                  >
                    {on && <span aria-hidden="true" className="absolute inset-y-1.5 -left-3 w-0.75 rounded-r-full bg-primary" />}
                    <Icon size={18} className={on ? "text-primary-text" : "text-fg-subtle"} />
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-fg focus:shadow-pop"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur supports-backdrop-filter:bg-surface/80">
        <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className={cx(
                "inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-hover hover:text-fg",
                !focus && "lg:hidden",
              )}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setOpenFor(menuOpen ? null : pathname)}
            >
              {menuOpen ? <IconX size={20} /> : <IconMenu size={20} />}
            </button>
            <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-lg" aria-label="Infollion Evaluate home">
              <LogoMark size={28} />
              <span className="truncate text-[15px] font-semibold tracking-tight text-fg">
                Infollion <span className="font-medium text-fg-muted">Evaluate</span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {roleLabels[0] && (
              <span className="hidden rounded-full border border-line bg-surface-sunken px-2.5 py-0.5 text-xs font-medium text-fg-muted md:inline">
                {roleLabels[0]}
              </span>
            )}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            <UserMenu name={me.user.full_name} email={me.user.email} roles={roleLabels} onSignOut={signOut} />
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className={cx("fixed inset-0 top-14 z-40", !focus && "lg:hidden")}>
          <button type="button" aria-label="Close menu" className="absolute inset-0 h-full w-full bg-overlay" onClick={() => setOpenFor(null)} />
          <div id="mobile-nav" className="relative flex h-full w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto border-r border-line bg-surface px-4 py-5 shadow-pop">
            {navList}
            <div className="mt-auto flex items-center justify-between border-t border-line pt-4">
              <span className="text-xs text-fg-muted">Theme</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        <aside
          className={cx(
            "sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 overflow-y-auto border-r border-line bg-surface px-3 py-6",
            !focus && "lg:block",
          )}
        >
          {navList}
        </aside>
        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          {me.mfa_required_but_missing && pathname !== "/settings/security" && (
            <div className="mx-auto mb-5 max-w-7xl">
              <Notice tone="yellow">
                Two-factor authentication is required for your account.{" "}
                <Link href="/settings/security" className="font-medium underline underline-offset-2">
                  Set it up
                </Link>{" "}
                to continue using the platform.
              </Notice>
            </div>
          )}
          <div className={cx("mx-auto", focus ? "max-w-[96rem]" : "max-w-7xl")}>{children}</div>
        </main>
      </div>
    </div>
  );
}

export function RoleGate({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { me } = useAuth();
  if (!hasAny(me, roles)) {
    return (
      <EmptyState title="You do not have access to this area" icon={IconLock}>
        This section requires one of these roles: {roles.join(", ")}.
      </EmptyState>
    );
  }
  return <>{children}</>;
}
