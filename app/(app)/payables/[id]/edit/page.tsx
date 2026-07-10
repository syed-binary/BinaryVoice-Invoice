import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { getCompany } from "@/lib/company";
import { toNumber } from "@/lib/money";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { PayableEditor } from "@/components/payables/payable-editor";

export default async function EditPayablePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability("contractors:write");
  const { id } = await params;
  const [payable, contractors, engagements, company] = await Promise.all([
    prisma.contractorInvoice.findUnique({
      where: { id },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.contractor.findMany({
      where: { archived: false },
      select: { id: true, name: true, currency: true, defaultCostRate: true, defaultRateUnit: true },
      orderBy: { name: "asc" },
    }),
    prisma.engagement.findMany({
      select: { id: true, contractorId: true, title: true, costRate: true, costCurrency: true, rateUnit: true },
      orderBy: { startDate: "desc" },
    }),
    getCompany(),
  ]);
  if (!payable) notFound();
  if (payable.status !== "RECEIVED") redirect(`/payables/${id}`);

  return (
    <>
      <PageHeader title={`Edit ${payable.internalNumber}`} />
      <PageBody>
        <PayableEditor
          contractors={contractors.map((c) => ({
            ...c,
            defaultCostRate: c.defaultCostRate != null ? toNumber(c.defaultCostRate) : null,
          }))}
          engagements={engagements.map((e) => ({ ...e, costRate: toNumber(e.costRate) }))}
          baseCurrency={company.baseCurrency}
          payable={{
            id: payable.id,
            contractorId: payable.contractorId,
            engagementId: payable.engagementId,
            contractorRef: payable.contractorRef,
            periodStart: payable.periodStart?.toISOString().slice(0, 10) ?? null,
            periodEnd: payable.periodEnd?.toISOString().slice(0, 10) ?? null,
            issueDate: payable.issueDate.toISOString().slice(0, 10),
            dueDate: payable.dueDate?.toISOString().slice(0, 10) ?? null,
            currency: payable.currency,
            fxRate: toNumber(payable.fxRate),
            notes: payable.notes,
            lines: payable.lines.map((l) => ({
              description: l.description,
              quantity: toNumber(l.quantity),
              unitPrice: toNumber(l.unitPrice),
              unit: l.unit,
            })),
          }}
        />
      </PageBody>
    </>
  );
}
