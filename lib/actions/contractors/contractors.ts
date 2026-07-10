"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { encryptField } from "@/lib/crypto";
import { audit } from "@/lib/audit";

const contractorSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().nullish(),
  country: z.string().min(1, "Country is required"),
  taxResidency: z.string().nullish(),
  entityName: z.string().nullish(),
  taxId: z.string().nullish(),
  vatRegistered: z.boolean().default(false),
  address: z.string().nullish(),
  currency: z.string().min(1),
  payoutMethod: z.string().nullish(),
  payoutDetails: z.string().nullish(), // plaintext from the form; encrypted at rest
  defaultCostRate: z.number().nonnegative().nullish(),
  defaultRateUnit: z.enum(["HOUR", "DAY", "MONTH", "FIXED"]).default("DAY"),
  status: z.enum(["ONBOARDING", "ACTIVE", "INACTIVE"]).default("ONBOARDING"),
  notes: z.string().nullish(),
});

export type ContractorInput = z.input<typeof contractorSchema>;
export type ContractorResult = { error?: string; id?: string };

export async function saveContractor(
  input: ContractorInput,
): Promise<ContractorResult> {
  const user = await requireCapability("contractors:write");
  const parsed = contractorSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid contractor" };
  }
  const p = parsed.data;

  const data = {
    name: p.name,
    email: p.email,
    phone: p.phone ?? null,
    country: p.country,
    taxResidency: p.taxResidency ?? null,
    entityName: p.entityName ?? null,
    taxId: p.taxId ?? null,
    vatRegistered: p.vatRegistered,
    address: p.address ?? null,
    currency: p.currency,
    payoutMethod: p.payoutMethod ?? null,
    // Encrypted at rest; empty string means "leave unchanged" on update.
    ...(p.payoutDetails
      ? { payoutDetails: encryptField(p.payoutDetails) }
      : p.id
        ? {}
        : { payoutDetails: null }),
    defaultCostRate: p.defaultCostRate ?? null,
    defaultRateUnit: p.defaultRateUnit,
    status: p.status,
    notes: p.notes ?? null,
  };

  let id: string;
  if (p.id) {
    await prisma.contractor.update({ where: { id: p.id }, data });
    id = p.id;
  } else {
    const created = await prisma.contractor.create({ data });
    id = created.id;
    await audit(user, "contractor.create", "Contractor", id, { name: p.name });
  }

  revalidatePath("/contractors");
  revalidatePath(`/contractors/${id}`);
  return { id };
}

export async function setContractorArchived(id: string, archived: boolean) {
  await requireCapability("contractors:write");
  await prisma.contractor.update({ where: { id }, data: { archived } });
  revalidatePath("/contractors");
  revalidatePath(`/contractors/${id}`);
}

/**
 * Delete a contractor. Mirrors deleteClient: with history (engagements,
 * payables, payouts or contracts) the record is archived instead of
 * destroyed, so paid/signed records keep their references.
 */
export async function deleteContractor(id: string) {
  const user = await requireCapability("contractors:write");
  const contractor = await prisma.contractor.findUnique({
    where: { id },
    include: {
      _count: {
        select: { engagements: true, payables: true, payouts: true, contracts: true },
      },
    },
  });
  if (!contractor) return;

  const hasHistory =
    contractor._count.engagements > 0 ||
    contractor._count.payables > 0 ||
    contractor._count.payouts > 0 ||
    contractor._count.contracts > 0;

  if (hasHistory) {
    await prisma.contractor.update({ where: { id }, data: { archived: true } });
    await audit(user, "contractor.archive", "Contractor", id, {
      name: contractor.name,
    });
  } else {
    await prisma.contractor.delete({ where: { id } });
    await audit(user, "contractor.delete", "Contractor", id, {
      name: contractor.name,
    });
  }
  revalidatePath("/contractors");
  redirect("/contractors");
}
