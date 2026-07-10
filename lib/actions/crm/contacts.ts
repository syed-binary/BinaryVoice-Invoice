"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";

const contactSchema = z.object({
  id: z.string().optional(),
  clientId: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  email: z.string().email().nullish().or(z.literal("")),
  phone: z.string().nullish(),
  title: z.string().nullish(),
  isPrimary: z.boolean().default(false),
  notes: z.string().nullish(),
});

export type ContactInput = z.input<typeof contactSchema>;
export type ContactResult = { error?: string; id?: string };

export async function saveContact(input: ContactInput): Promise<ContactResult> {
  await requireCapability("clients:write");
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid contact" };
  }
  const p = parsed.data;
  const data = {
    clientId: p.clientId,
    name: p.name,
    email: p.email || null,
    phone: p.phone ?? null,
    title: p.title ?? null,
    isPrimary: p.isPrimary,
    notes: p.notes ?? null,
  };

  const saved = await prisma.$transaction(async (tx) => {
    if (p.isPrimary) {
      await tx.contact.updateMany({
        where: { clientId: p.clientId, isPrimary: true },
        data: { isPrimary: false },
      });
    }
    return p.id
      ? tx.contact.update({ where: { id: p.id }, data })
      : tx.contact.create({ data });
  });

  revalidatePath(`/clients/${p.clientId}`);
  return { id: saved.id };
}

export async function deleteContact(id: string) {
  await requireCapability("clients:write");
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) return;
  await prisma.contact.delete({ where: { id } });
  revalidatePath(`/clients/${contact.clientId}`);
}
