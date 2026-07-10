"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { sendMail } from "@/lib/email";

const schema = z.object({
  contractorId: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type PortalAccessInput = z.input<typeof schema>;
export type PortalAccessResult = { error?: string; ok?: boolean };

/**
 * Create (or reset) the contractor's portal login. The account uses the
 * contractor's email with role CONTRACTOR — path-gated to /portal only.
 */
export async function grantPortalAccess(
  input: PortalAccessInput,
): Promise<PortalAccessResult> {
  const admin = await requireCapability("contractors:write");
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const p = parsed.data;

  const contractor = await prisma.contractor.findUnique({
    where: { id: p.contractorId },
  });
  if (!contractor) return { error: "Contractor not found" };

  const passwordHash = await bcrypt.hash(p.password, 10);

  if (contractor.userId) {
    await prisma.user.update({
      where: { id: contractor.userId },
      data: { passwordHash },
    });
  } else {
    const existing = await prisma.user.findUnique({
      where: { email: contractor.email },
    });
    if (existing) {
      return { error: "A user with the contractor's email already exists" };
    }
    const user = await prisma.user.create({
      data: {
        email: contractor.email,
        name: contractor.name,
        passwordHash,
        role: "CONTRACTOR",
      },
    });
    await prisma.contractor.update({
      where: { id: contractor.id },
      data: { userId: user.id },
    });
  }

  await audit(admin, "contractor.portal-access", "Contractor", contractor.id, {
    email: contractor.email,
    reset: !!contractor.userId,
  });
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  await sendMail({
    to: contractor.email,
    subject: "Your Binary Labs portal access",
    html: `<p>Dear ${contractor.name},</p><p>You can now sign in to the contractor portal at <a href="${appUrl}/login">${appUrl}/login</a> with this email address. Your password was shared with you separately.</p>`,
    text: `Sign in at ${appUrl}/login with this email address.`,
  });

  revalidatePath(`/contractors/${contractor.id}`);
  return { ok: true };
}
