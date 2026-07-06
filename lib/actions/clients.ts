"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getFieldDefs, collectCustomFields } from "@/lib/custom-fields";

const str = (v: FormDataEntryValue | null) =>
  v === null || v === "" ? null : String(v).trim();

const schema = z.object({
  displayName: z.string().min(1, "Client name is required"),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
});

export type ClientFormState = { error?: string };

export async function saveClient(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  await requireUser();

  const id = str(formData.get("id"));
  const displayName = str(formData.get("displayName"));
  const email = str(formData.get("email"));

  const parsed = schema.safeParse({ displayName, email: email ?? "" });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const defs = await getFieldDefs("CLIENT");
  const customFields = collectCustomFields(formData, defs);

  const whtRaw = formData.get("withholdingRate");
  const withholdingRate =
    whtRaw === null || whtRaw === "" || Number.isNaN(Number(whtRaw))
      ? null
      : Number(whtRaw);

  const data = {
    displayName: displayName!,
    companyName: str(formData.get("companyName")),
    email,
    phone: str(formData.get("phone")),
    trn: str(formData.get("trn")),
    currency: str(formData.get("currency")) ?? "AED",
    billingAddress: str(formData.get("billingAddress")),
    shippingAddress: str(formData.get("shippingAddress")),
    notes: str(formData.get("notes")),
    exportClient: formData.get("exportClient") === "on",
    withholdingRate,
    customFields,
  };

  let clientId: string;
  if (id) {
    const updated = await prisma.client.update({ where: { id }, data });
    clientId = updated.id;
  } else {
    const created = await prisma.client.create({ data });
    clientId = created.id;
  }

  revalidatePath("/clients");
  redirect(`/clients/${clientId}`);
}

export async function setClientArchived(id: string, archived: boolean) {
  await requireUser();
  await prisma.client.update({ where: { id }, data: { archived } });
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
}

export async function deleteClient(id: string) {
  await requireUser();
  const count = await prisma.invoice.count({ where: { clientId: id } });
  const estCount = await prisma.estimate.count({ where: { clientId: id } });
  if (count > 0 || estCount > 0) {
    // Has history — archive instead of hard delete.
    await prisma.client.update({ where: { id }, data: { archived: true } });
    revalidatePath("/clients");
    redirect("/clients");
  }
  await prisma.client.delete({ where: { id } });
  revalidatePath("/clients");
  redirect("/clients");
}
