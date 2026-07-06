import type { Estimate, EstimateLineItem } from "@prisma/client";
import { toNumber } from "@/lib/money";
import type { EditorEstimate } from "@/components/estimates/estimate-editor";

export function toEditorEstimate(
  estimate: Estimate & { lineItems: EstimateLineItem[] },
): EditorEstimate {
  return {
    id: estimate.id,
    clientId: estimate.clientId,
    issueDate: estimate.issueDate.toISOString().slice(0, 10),
    expiryDate: estimate.expiryDate ? estimate.expiryDate.toISOString().slice(0, 10) : null,
    currency: estimate.currency,
    vatEnabled: estimate.vatEnabled,
    vatRate: toNumber(estimate.vatRate),
    withholdingEnabled: estimate.withholdingEnabled,
    withholdingRate: toNumber(estimate.withholdingRate),
    discountType: estimate.discountType,
    discountValue: toNumber(estimate.discountValue),
    notes: estimate.notes,
    terms: estimate.terms,
    templateId: estimate.templateId,
    accentColor: estimate.accentColor,
    status: estimate.status,
    customFields: (estimate.customFields as Record<string, unknown> | null) ?? null,
    lineItems: estimate.lineItems
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
