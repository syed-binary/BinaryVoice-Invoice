import { PrismaClient } from "@prisma/client";
import { calculateTotals } from "../lib/calculations";

const prisma = new PrismaClient();

async function main() {
  const client = await prisma.client.create({
    data: {
      displayName: "Acme Robotics FZ-LLC",
      companyName: "Acme Robotics FZ-LLC",
      email: "ap@acme-robotics.ae",
      phone: "+971 4 555 1234",
      trn: "100123456700003",
      currency: "AED",
      billingAddress: "Office 1204, One Central\nWorld Trade Centre\nDubai, UAE",
    },
  });

  const lines = [
    { description: "Senior Data Engineer", quantity: 2, unitPrice: 7500, unit: "month", discount: 0 },
    { description: "ML Engineer", quantity: 1, unitPrice: 18000, unit: "month", discount: 1000 },
    { description: "DevOps Engineer", quantity: 1, unitPrice: 4500, unit: "month", discount: 0 },
  ];

  const totals = calculateTotals({
    lines: lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice, discount: l.discount })),
    discountType: "PERCENT",
    discountValue: 5,
    vatEnabled: true,
    vatRate: 5,
    withholdingEnabled: false,
    withholdingRate: 0,
  });

  const invoice = await prisma.invoice.create({
    data: {
      number: "BL-2026-0001",
      status: "SENT",
      clientId: client.id,
      issueDate: new Date("2026-07-01"),
      dueDate: new Date("2026-07-15"),
      currency: "AED",
      vatEnabled: true,
      vatRate: 5,
      withholdingEnabled: false,
      withholdingRate: 0,
      withholdingAmount: totals.withholdingAmount,
      discountType: "PERCENT",
      discountValue: 5,
      discountAmount: totals.discountAmount,
      subtotal: totals.subtotal,
      vatAmount: totals.vatAmount,
      total: totals.total,
      netPayable: totals.netPayable,
      notes: "Thank you for partnering with Binary Labs on your AI roadmap.",
      terms: "Payment due within 14 days via bank transfer. Quote the invoice number as reference.",
      templateId: "modern",
      customFields: { po_number: "PO-4471", project_code: "ACME-AI-01" },
      lineItems: {
        create: lines.map((l, i) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          unit: l.unit,
          discount: l.discount,
          lineTotal: totals.lineTotals[i],
          sortOrder: i,
        })),
      },
    },
  });

  // bump the counter so the next real invoice is BL-2026-0002
  await prisma.companySettings.update({
    where: { id: "company" },
    data: { nextInvoiceNumber: 2 },
  });

  console.log("Created client", client.id, "invoice", invoice.id, invoice.number);
  console.log("Totals:", JSON.stringify(totals));
}

main().finally(() => prisma.$disconnect());
