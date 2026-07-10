import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { getCompany } from "@/lib/company";
import { toNumber } from "@/lib/money";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { RunCreateForm } from "@/components/payouts/run-create-form";
import { EmptyState } from "@/components/app/empty-state";
import { Receipt } from "lucide-react";

export default async function NewPayoutRunPage() {
  await requireCapability("contractors:write");
  const [approved, company] = await Promise.all([
    prisma.contractorInvoice.findMany({
      where: { status: "APPROVED" },
      include: { contractor: { select: { name: true } } },
      orderBy: { issueDate: "asc" },
    }),
    getCompany(),
  ]);

  return (
    <>
      <PageHeader title="New payout run" description="Select approved payables to batch into one payment run." />
      <PageBody>
        {approved.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No approved payables"
            description="Approve payables first — only approved payables can join a run."
          />
        ) : (
          <RunCreateForm
            baseCurrency={company.baseCurrency}
            payables={approved.map((p) => ({
              id: p.id,
              internalNumber: p.internalNumber,
              contractorName: p.contractor.name,
              total: toNumber(p.total),
              currency: p.currency,
              baseTotal: toNumber(p.baseTotal),
            }))}
          />
        )}
      </PageBody>
    </>
  );
}
