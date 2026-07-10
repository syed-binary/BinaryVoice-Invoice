import type { Invoice, LineItem } from "@prisma/client";
import { toNumber } from "@/lib/money";
import type { EditorInvoice } from "@/components/invoices/invoice-editor";

/** Map a DB invoice (+lines) into the client editor's serializable shape. */
export function toEditorInvoice(
  invoice: Invoice & { lineItems: LineItem[] },
): EditorInvoice {
  return {
    id: invoice.id,
    clientId: invoice.clientId,
    issueDate: invoice.issueDate.toISOString().slice(0, 10),
    dueDate: invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : null,
    currency: invoice.currency,
    fxRate: toNumber(invoice.fxRate),
    vatEnabled: invoice.vatEnabled,
    vatRate: toNumber(invoice.vatRate),
    withholdingEnabled: invoice.withholdingEnabled,
    withholdingRate: toNumber(invoice.withholdingRate),
    discountType: invoice.discountType,
    discountValue: toNumber(invoice.discountValue),
    notes: invoice.notes,
    terms: invoice.terms,
    templateId: invoice.templateId,
    accentColor: invoice.accentColor,
    status: invoice.status,
    customFields: (invoice.customFields as Record<string, unknown> | null) ?? null,
    lineItems: invoice.lineItems
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((l) => ({
        itemId: l.itemId,
        description: l.description,
        quantity: toNumber(l.quantity),
        unitPrice: toNumber(l.unitPrice),
        unit: l.unit,
        discount: toNumber(l.discount),
      })),
  };
}
