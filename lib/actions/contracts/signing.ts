"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { notifyRoles } from "@/lib/notify";

/**
 * PUBLIC signing action — authenticated by the unguessable signatory token,
 * NOT by session (counterparties have no login). Never import requireUser
 * here. IP/user-agent are captured for the signature audit trail.
 */

const signSchema = z.object({
  token: z.string().min(1),
  signatureName: z.string().min(2, "Type your full legal name"),
  agreed: z.literal(true, { error: "You must tick the agreement box" }),
});

export type SignInput = z.input<typeof signSchema>;
export type SignResult = { error?: string; ok?: boolean };

export async function signContract(input: SignInput): Promise<SignResult> {
  const parsed = signSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const p = parsed.data;

  const signatory = await prisma.contractSignatory.findUnique({
    where: { token: p.token },
    include: { contract: true },
  });
  if (!signatory) return { error: "This signing link is not valid" };
  if (signatory.signedAt) return { error: "Already signed" };
  if (signatory.contract.status !== "SENT") {
    return { error: "This contract is no longer open for signing" };
  }

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  const userAgent = h.get("user-agent");

  await prisma.contractSignatory.update({
    where: { id: signatory.id },
    data: {
      signedAt: new Date(),
      signatureName: p.signatureName,
      ip,
      userAgent,
    },
  });
  await audit(
    { id: `signatory:${signatory.email}`, role: "PUBLIC" },
    "contract.sign",
    "Contract",
    signatory.contractId,
    {
      signatory: signatory.email,
      signatureName: p.signatureName,
      bodyHash: signatory.contract.bodyHash,
      ip,
    },
  );

  const unsigned = await prisma.contractSignatory.count({
    where: { contractId: signatory.contractId, signedAt: null },
  });
  if (unsigned === 0) {
    await prisma.contract.update({
      where: { id: signatory.contractId },
      data: { status: "SIGNED" },
    });
    await notifyRoles(["ADMIN", "FINANCE"], {
      type: "contract.signed",
      title: `${signatory.contract.number} fully signed`,
      body: `${signatory.contract.title} — all signatories have signed.`,
      href: `/contracts/${signatory.contractId}`,
      email: true,
    });
  }

  revalidatePath(`/contracts/${signatory.contractId}`);
  return { ok: true };
}

/** Record that the signatory opened the link (called from the sign page). */
export async function markViewed(token: string) {
  await prisma.contractSignatory.updateMany({
    where: { token, viewedAt: null },
    data: { viewedAt: new Date() },
  });
}
