import { prisma } from "@/lib/prisma";
import type { EditorClient } from "@/components/invoices/invoice-editor";

/** Clients in the shape the invoice/estimate editors expect. */
export async function getEditorClients(): Promise<EditorClient[]> {
  const clients = await prisma.client.findMany({
    where: { archived: false },
    select: {
      id: true,
      displayName: true,
      currency: true,
      exportClient: true,
      withholdingRate: true,
    },
    orderBy: { displayName: "asc" },
  });
  return clients.map((c) => ({
    ...c,
    withholdingRate: c.withholdingRate != null ? Number(c.withholdingRate) : null,
  }));
}

/** Reusable catalog items for the editors. */
export function getEditorItems() {
  return prisma.item.findMany({
    where: { archived: false },
    select: { id: true, name: true, description: true, unitPrice: true, unit: true },
    orderBy: { name: "asc" },
  });
}
