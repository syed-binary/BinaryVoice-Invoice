"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { encryptField } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { notifyRoles } from "@/lib/notify";

/** Staff: mint (or return) the contractor's public onboarding link path. */
export async function generateOnboardingLink(
  contractorId: string,
): Promise<{ error?: string; path?: string }> {
  await requireCapability("contractors:write");
  const contractor = await prisma.contractor.findUnique({ where: { id: contractorId } });
  if (!contractor) return { error: "Contractor not found" };
  let token = contractor.onboardingToken;
  if (!token) {
    token = randomBytes(24).toString("base64url");
    await prisma.contractor.update({
      where: { id: contractorId },
      data: { onboardingToken: token },
    });
  }
  return { path: `/onboard/${token}` };
}

const submitSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1, "Your name is required"),
  email: z.string().email("A valid email is required"),
  phone: z.string().nullish(),
  address: z.string().min(1, "Your address is required"),
  taxResidency: z.string().nullish(),
  entityName: z.string().nullish(),
  taxId: z.string().nullish(),
  vatRegistered: z.boolean().default(false),
  currency: z.string().min(1),
  payoutMethod: z.string().nullish(),
  payoutDetails: z.string().nullish(),
});

export type OnboardingInput = z.input<typeof submitSchema>;
export type OnboardingResult = { error?: string; ok?: boolean };

/** PUBLIC: contractor submits their own profile via the token link. */
export async function submitOnboarding(
  input: OnboardingInput,
): Promise<OnboardingResult> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }
  const p = parsed.data;

  const contractor = await prisma.contractor.findUnique({
    where: { onboardingToken: p.token },
  });
  if (!contractor || contractor.archived) {
    return { error: "This onboarding link is not valid" };
  }

  // Their real email must not collide with another record.
  const emailClash = await prisma.contractor.findFirst({
    where: { email: p.email, id: { not: contractor.id } },
  });
  if (emailClash) return { error: "This email is already registered — contact us" };

  await prisma.contractor.update({
    where: { id: contractor.id },
    data: {
      name: p.name,
      email: p.email,
      phone: p.phone ?? null,
      address: p.address,
      taxResidency: p.taxResidency ?? null,
      entityName: p.entityName ?? null,
      taxId: p.taxId ?? null,
      vatRegistered: p.vatRegistered,
      currency: p.currency,
      payoutMethod: p.payoutMethod ?? null,
      ...(p.payoutDetails ? { payoutDetails: encryptField(p.payoutDetails) } : {}),
      onboardingCompletedAt: new Date(),
    },
  });
  await audit(
    { id: `onboarding:${contractor.id}`, role: "PUBLIC" },
    "contractor.onboard-submit",
    "Contractor",
    contractor.id,
    { name: p.name, email: p.email },
  );
  await notifyRoles(["ADMIN", "FINANCE"], {
    type: "contractor.onboarded",
    title: `${p.name} completed onboarding`,
    body: `Profile and documents submitted — review and activate.`,
    href: `/contractors/${contractor.id}`,
    email: true,
  });

  revalidatePath(`/contractors/${contractor.id}`);
  return { ok: true };
}
