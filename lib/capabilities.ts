/**
 * Role→capability map. Pure and dependency-free so client components (nav
 * gating) can import it; the server-side enforcement wrapper lives in
 * lib/permissions.ts.
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
