"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const str = (v: FormDataEntryValue | null) =>
  v === null || v === "" ? null : String(v).trim();

const settingsSchema = z.object({
  legalName: z.string().min(1, "Legal name is required"),
});

export type ActionState = { ok?: boolean; error?: string };

export async function updateCompanySettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const legalName = str(formData.get("legalName"));
  const parsed = settingsSchema.safeParse({ legalName });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const num = (key: string, fallback: number) => {
    const v = formData.get(key);
    const n = v === null || v === "" ? NaN : Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  await prisma.companySettings.update({
    where: { id: "company" },
    data: {
      legalName: legalName!,
      tradeName: str(formData.get("tradeName")),
      arabicName: str(formData.get("arabicName")),
      addressLine1: str(formData.get("addressLine1")),
      addressLine2: str(formData.get("addressLine2")),
      city: str(formData.get("city")),
      emirate: str(formData.get("emirate")),
      country: str(formData.get("country")) ?? "United Arab Emirates",
      poBox: str(formData.get("poBox")),
      phone: str(formData.get("phone")),
      email: str(formData.get("email")),
      website: str(formData.get("website")),
      logoUrl: str(formData.get("logoUrl")),
      corporateTaxTrn: str(formData.get("corporateTaxTrn")),
      vatTrn: str(formData.get("vatTrn")),
      vatEnabled: formData.get("vatEnabled") === "on",
      defaultVatRate: num("defaultVatRate", 5),
      defaultWithholdingRate: num("defaultWithholdingRate", 20),
      bankName: str(formData.get("bankName")),
      accountName: str(formData.get("accountName")),
      iban: str(formData.get("iban")),
      swift: str(formData.get("swift")),
      accountNumber: str(formData.get("accountNumber")),
      routingCode: str(formData.get("routingCode")),
      baseCurrency: str(formData.get("baseCurrency")) ?? "AED",
      invoicePrefix: str(formData.get("invoicePrefix")) ?? "BL",
      estimatePrefix: str(formData.get("estimatePrefix")) ?? "EST",
      numberPadding: num("numberPadding", 4),
      defaultTemplate: str(formData.get("defaultTemplate")) ?? "modern",
      accentColor: str(formData.get("accentColor")) ?? "#4f46e5",
      defaultNotes: str(formData.get("defaultNotes")),
      defaultTerms: str(formData.get("defaultTerms")),
      defaultDueDays: num("defaultDueDays", 14),
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}
