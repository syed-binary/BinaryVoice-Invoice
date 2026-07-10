import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Ensure there is an authenticated user; redirect to /login otherwise. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

/**
 * Portal pages/actions: ensure the user is a CONTRACTOR and resolve their
 * Contractor record (linked via Contractor.userId). Entity links are looked
 * up per request — never stored in the JWT.
 */
export async function requirePortalContractor() {
  const user = await requireUser();
  if (user.role !== "CONTRACTOR") redirect("/dashboard");
  const contractor = await prisma.contractor.findUnique({
    where: { userId: user.id },
  });
  if (!contractor || contractor.archived) redirect("/login");
  return { user, contractor };
}
