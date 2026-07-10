import { prisma } from "@/lib/prisma";
import { requirePortalContractor } from "@/lib/session";
import { toNumber } from "@/lib/money";
import { PortalInvoiceForm } from "@/components/portal/portal-invoice-form";

export const dynamic = "force-dynamic";

export default async function PortalNewInvoicePage() {
  const { contractor } = await requirePortalContractor();
  const engagements = await prisma.engagement.findMany({
    where: { contractorId: contractor.id, status: "ACTIVE" },
    orderBy: { startDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">Submit an invoice</h1>
        <p className="text-sm text-muted-foreground">
          Invoices are reviewed by finance before payout. Your billing currency is {contractor.currency}.
        </p>
      </div>
      <PortalInvoiceForm
        currency={contractor.currency}
        engagements={engagements.map((e) => ({
          value: e.id,
          label: e.title,
          rate: toNumber(e.costRate),
          unit: e.rateUnit,
        }))}
      />
    </div>
  );
}
