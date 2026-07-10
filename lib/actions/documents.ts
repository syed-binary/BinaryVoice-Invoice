"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { documentCapability } from "@/lib/documents";
import { deleteFile } from "@/lib/storage";
import { audit } from "@/lib/audit";

export async function setDocumentArchived(id: string, archived: boolean) {
  const user = await requireUser();
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return;
  if (!can(user.role ?? "MEMBER", documentCapability(doc.entityType, "write"))) {
    return { error: "Forbidden" };
  }
  await prisma.document.update({ where: { id }, data: { archived } });
  revalidatePath("/");
}

export async function deleteDocument(id: string) {
  const user = await requireUser();
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return;
  if (!can(user.role ?? "MEMBER", documentCapability(doc.entityType, "write"))) {
    return { error: "Forbidden" };
  }
  await prisma.document.delete({ where: { id } });
  await deleteFile(doc.storageKey);
  await audit(user, "document.delete", doc.entityType, doc.entityId, {
    fileName: doc.fileName,
    kind: doc.kind,
  });
  revalidatePath("/");
}
