import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Ensure there is an authenticated user; redirect to /login otherwise. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}
