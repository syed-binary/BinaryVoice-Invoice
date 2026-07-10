"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { audit } from "@/lib/audit";
import { notifyRoles } from "@/lib/notify";
import { toNumber } from "@/lib/money";

/** Generate (once) and return the public acceptance path for an estimate. */
export async function getEstimateShareLink(
  id: string,
): Promise<{ error?: string; path?: string }> {
  await requireUser();
  const estimate = await prisma.estimate.findUnique({ where: { id } });
  if (!estimate) return { error: "Estimate not found" };
  let token = estimate.publicToken;
  if (!token) {
    token = randomBytes(24).toString("base64url");
    await prisma.estimate.update({ where: { id }, data: { publicToken: token } });
  }
  return { path: `/estimate/${token}` };
}

/**
 * PUBLIC: client accepts or declines via the unguessable token — no session.
 */
export async function respondToEstimate(
  token: string,
  decision: "ACCEPTED" | "DECLINED",
): Promise<{ error?: string; ok?: boolean }> {
  if (decision !== "ACCEPTED" && decision !== "DECLINED") {
    return { error: "Invalid decision" };
  }
  const estimate = await prisma.estimate.findUnique({
    where: { publicToken: token },
    include: { client: { select: { displayName: true } } },
  });
  if (!estimate) return { error: "This link is not valid" };
  if (estimate.status !== "SENT" && estimate.status !== "DRAFT") {
    return { error: "This estimate is no longer open for a response" };
  }
  if (estimate.expiryDate && estimate.expiryDate < new Date()) {
    return { error: "This estimate has expired — please ask for a refreshed quote" };
  }

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;

  await prisma.estimate.update({
    where: { id: estimate.id },
    data: { status: decision },
  });
  await audit(
    { id: `estimate-client:${estimate.clientId}`, role: "PUBLIC" },
    `estimate.${decision.toLowerCase()}`,
    "Estimate",
    estimate.id,
    { number: estimate.number, ip },
  );
  await notifyRoles(["ADMIN", "FINANCE", "MEMBER"], {
    type: `estimate.${decision.toLowerCase()}`,
    title: `${estimate.number} ${decision.toLowerCase()} by ${estimate.client.displayName}`,
    body: `${estimate.currency} ${toNumber(estimate.total).toFixed(2)}`,
    href: `/estimates/${estimate.id}`,
    email: true,
  });

  revalidatePath(`/estimates/${estimate.id}`);
  revalidatePath("/estimates");
  return { ok: true };
}
