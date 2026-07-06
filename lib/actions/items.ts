"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const str = (v: FormDataEntryValue | null) =>
  v === null || v === "" ? null : String(v).trim();
const numOr = (v: FormDataEntryValue | null, fallback: number) => {
  const n = v === null || v === "" ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const schema = z.object({ name: z.string().min(1, "Item name is required") });

export type ItemFormState = { error?: string };

export async function saveItem(
  _prev: ItemFormState,
  formData: FormData,
): Promise<ItemFormState> {
  await requireUser();
  const id = str(formData.get("id"));
  const name = str(formData.get("name"));

  const parsed = schema.safeParse({ name });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data = {
    name: name!,
    description: str(formData.get("description")),
    unitPrice: numOr(formData.get("unitPrice"), 0),
    taxRate: numOr(formData.get("taxRate"), 0),
    unit: str(formData.get("unit")),
  };

  if (id) {
    await prisma.item.update({ where: { id }, data });
  } else {
    await prisma.item.create({ data });
  }

  revalidatePath("/items");
  redirect("/items");
}

export async function deleteItem(id: string) {
  await requireUser();
  await prisma.item.delete({ where: { id } });
  revalidatePath("/items");
  redirect("/items");
}
