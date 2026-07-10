import { redirect } from "next/navigation";
import { requireUser } from "./session";

/**
 * Capability-based access control on top of the Role enum.
 *
 * Roles are coarse (who you are); capabilities are fine (what you may do).
 * Server actions and protected API routes call `requireCapability` instead of
 * bare `requireUser`. Path-prefix gating by role lives in auth.config.ts
 * (edge-safe, JWT role only) — this module is the node-side source of truth.
 */

export type Capability =
  | "billing:read"
  | "billing:write"
  | "clients:read"
  | "clients:write"
  | "contractors:read"
  | "contractors:write"
  | "contracts:read"
  | "contracts:write"
  | "hr:read"
  | "hr:write"
  | "payroll:read"
  | "payroll:write"
  | "compensation:read" // salary visibility — deliberately separate from hr:read
  | "settings:write"
  | "files:read"
  | "files:write"
  | "audit:read"
  | "portal:contractor"
  | "portal:employee";

type AppRole = "ADMIN" | "FINANCE" | "HR" | "MEMBER" | "CONTRACTOR" | "EMPLOYEE";

const ALL: Capability[] = [
  "billing:read",
  "billing:write",
  "clients:read",
  "clients:write",
  "contractors:read",
  "contractors:write",
  "contracts:read",
  "contracts:write",
  "hr:read",
  "hr:write",
  "payroll:read",
  "payroll:write",
  "compensation:read",
  "settings:write",
  "files:read",
  "files:write",
  "audit:read",
];

const CAPS: Record<AppRole, Capability[]> = {
  ADMIN: ALL,
  FINANCE: [
    "billing:read",
    "billing:write",
    "clients:read",
    "clients:write",
    "contractors:read",
    "contractors:write",
    "contracts:read",
    "contracts:write",
    "payroll:read",
    "payroll:write",
    "compensation:read",
    "files:read",
    "files:write",
    "audit:read",
  ],
  HR: [
    "hr:read",
    "hr:write",
    "contracts:read",
    "contractors:read",
    "files:read",
    "files:write",
  ],
  // MEMBER keeps the app's historical behavior: billing + clients, no HR/payroll.
  MEMBER: [
    "billing:read",
    "billing:write",
    "clients:read",
    "clients:write",
    "contracts:read",
    "files:read",
    "files:write",
  ],
  CONTRACTOR: ["portal:contractor"],
  EMPLOYEE: ["portal:employee"],
};

export function can(role: string, cap: Capability): boolean {
  return (CAPS[role as AppRole] ?? []).includes(cap);
}

/**
 * Ensure the current user holds a capability. Redirects to /login when
 * unauthenticated (via requireUser); redirects home when authenticated but
 * lacking the capability.
 */
export async function requireCapability(cap: Capability) {
  const user = await requireUser();
  if (!can(user.role ?? "MEMBER", cap)) redirect("/");
  return user;
}
