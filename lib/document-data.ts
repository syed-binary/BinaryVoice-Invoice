import type {
  CompanySettings,
  Client,
  Invoice,
  LineItem,
  Estimate,
  EstimateLineItem,
  CustomFieldDefinition,
} from "@prisma/client";
import { toNumber } from "@/lib/money";
import { formatDate } from "@/lib/format";

export type DocLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  unit: string | null;
  discount: number;
  lineTotal: number;
};

export type DocData = {
  kind: "INVOICE" | "ESTIMATE";
  docLabel: string;
  number: string;
  status: string;
  dateLabel: string;
  dateValue: string;
  dueLabel: string;
  dueValue: string;
  currency: string;
  vatEnabled: boolean;
  vatRate: number;
  withholdingEnabled: boolean;
  withholdingRate: number;
  withholdingAmount: number;
  netPayable: number;
  company: CompanySettings;
  client: Client;
  lines: DocLine[];
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  notes: string | null;
  terms: string | null;
  customFields: { label: string; value: string }[];
  accentColor: string;
};

function customFieldList(
  raw: unknown,
  defs: CustomFieldDefinition[],
): { label: string; value: string }[] {
  const cf = (raw as Record<string, unknown> | null) ?? {};
  return defs
    .filter((d) => cf[d.key] !== undefined && cf[d.key] !== null && cf[d.key] !== "")
    .map((d) => ({ label: d.label, value: String(cf[d.key]) }));
}

export function buildInvoiceDoc(
  invoice: Invoice & { client: Client; lineItems: LineItem[] },
  company: CompanySettings,
  defs: CustomFieldDefinition[],
): DocData {
  const total = toNumber(invoice.total);
  const amountPaid = toNumber(invoice.amountPaid);
  return {
    kind: "INVOICE",
    docLabel: invoice.vatEnabled ? "TAX INVOICE" : "INVOICE",
    number: invoice.number,
    status: invoice.status,
    dateLabel: "Invoice date",
    dateValue: formatDate(invoice.issueDate),
    dueLabel: "Due date",
    dueValue: formatDate(invoice.dueDate),
    currency: invoice.currency,
    vatEnabled: invoice.vatEnabled,
    vatRate: toNumber(invoice.vatRate),
    withholdingEnabled: invoice.withholdingEnabled,
    withholdingRate: toNumber(invoice.withholdingRate),
    withholdingAmount: toNumber(invoice.withholdingAmount),
    netPayable: toNumber(invoice.netPayable) || total,
    company,
    client: invoice.client,
    lines: invoice.lineItems
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((l) => ({
        description: l.description,
        quantity: toNumber(l.quantity),
        unitPrice: toNumber(l.unitPrice),
        unit: l.unit,
        discount: toNumber(l.discount),
        lineTotal: toNumber(l.lineTotal),
      })),
    subtotal: toNumber(invoice.subtotal),
    discountAmount: toNumber(invoice.discountAmount),
    vatAmount: toNumber(invoice.vatAmount),
    total,
    amountPaid,
    amountDue: (toNumber(invoice.netPayable) || total) - amountPaid,
    notes: invoice.notes,
    terms: invoice.terms,
    customFields: customFieldList(invoice.customFields, defs),
    accentColor: invoice.accentColor || company.accentColor,
  };
}

export function buildEstimateDoc(
  estimate: Estimate & { client: Client; lineItems: EstimateLineItem[] },
  company: CompanySettings,
  defs: CustomFieldDefinition[],
): DocData {
  const total = toNumber(estimate.total);
  return {
    kind: "ESTIMATE",
    docLabel: "ESTIMATE",
    number: estimate.number,
    status: estimate.status,
    dateLabel: "Estimate date",
    dateValue: formatDate(estimate.issueDate),
    dueLabel: "Valid until",
    dueValue: formatDate(estimate.expiryDate),
    currency: estimate.currency,
    vatEnabled: estimate.vatEnabled,
    vatRate: toNumber(estimate.vatRate),
    withholdingEnabled: estimate.withholdingEnabled,
    withholdingRate: toNumber(estimate.withholdingRate),
    withholdingAmount: toNumber(estimate.withholdingAmount),
    netPayable: toNumber(estimate.netPayable) || total,
    company,
    client: estimate.client,
    lines: estimate.lineItems
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((l) => ({
        description: l.description,
        quantity: toNumber(l.quantity),
        unitPrice: toNumber(l.unitPrice),
        unit: l.unit,
        discount: toNumber(l.discount),
        lineTotal: toNumber(l.lineTotal),
      })),
    subtotal: toNumber(estimate.subtotal),
    discountAmount: toNumber(estimate.discountAmount),
    vatAmount: toNumber(estimate.vatAmount),
    total,
    amountPaid: 0,
    amountDue: toNumber(estimate.netPayable) || total,
    notes: estimate.notes,
    terms: estimate.terms,
    customFields: customFieldList(estimate.customFields, defs),
    accentColor: estimate.accentColor || company.accentColor,
  };
}
