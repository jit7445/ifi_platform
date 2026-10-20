import type { Me, Membership, Role } from "./api";

export function allRoles(me: Me | null): Set<Role> {
  const out = new Set<Role>();
  for (const m of me?.memberships ?? []) for (const r of m.roles) out.add(r);
  return out;
}

export function hasAny(me: Me | null, roles: Role[]): boolean {
  const mine = allRoles(me);
  return roles.some((r) => mine.has(r));
}

export const STAFF_ROLES: Role[] = ["platform_admin", "project_manager"];
export const REVIEW_ROLES: Role[] = ["platform_admin", "project_manager", "reviewer"];

export function customerOrgs(me: Me | null): Membership[] {
  return (me?.memberships ?? []).filter(
    (m) => m.org_kind === "customer" && m.roles.some((r) => r === "customer_admin" || r === "customer_member"),
  );
}

export function isOrgAdmin(me: Me | null, orgId: string): boolean {
  return (me?.memberships ?? []).some((m) => m.org_id === orgId && m.roles.includes("customer_admin"));
}

export function homePath(me: Me | null): string {
  if (!me) return "/login";
  if (hasAny(me, STAFF_ROLES)) return "/staff/projects";
  if (hasAny(me, ["reviewer"])) return "/staff/reviews";
  const orgs = customerOrgs(me);
  if (orgs.length > 0) return `/app/orgs/${orgs[0].org_id}/projects`;
  if (hasAny(me, ["expert"]) || me.expert_profile_id) return "/expert";
  return "/settings/security";
}
