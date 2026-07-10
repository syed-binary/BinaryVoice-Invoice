import { redirect } from "next/navigation";
import { requireUser } from "./session";
import { can, type Capability } from "./capabilities";

export { can, type Capability };

/**
 * Server-side capability enforcement (the map itself lives in
 * lib/capabilities.ts so client components can gate nav with `can`).
 *
 * Ensure the current user holds a capability. Redirects to /login when
 * unauthenticated (via requireUser); redirects home when authenticated but
 * lacking the capability.
 */
export async function requireCapability(cap: Capability) {
  const user = await requireUser();
  if (!can(user.role ?? "MEMBER", cap)) redirect("/");
  return user;
}
