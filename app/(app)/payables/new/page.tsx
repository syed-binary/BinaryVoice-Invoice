import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { getCompany } from "@/lib/company";
import { toNumber } from "@/lib/money";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { PayableEditor } from "@/components/payables/payable-editor";

export default async function NewPayablePage({
  searchParams,
}: {
  searchParams: Promise<{ contractor?: string }>;
}) {
  await requireCapability("contractors:write");
  const { contractor } = await searchParams;
  const [contractors, engagements, company] = await Promise.all([
    prisma.contractor.findMany({
      where: { archived: false },
      select: {
        id: true,
        name: true,
        currency: true,
        defaultCostRate: true,
        defaultRateUnit: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.engagement.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        contractorId: true,
        title: true,
        costRate: true,
        costCurrency: true,
        rateUnit: true,
      },
      orderBy: { startDate: "desc" },
    }),
    getCompany(),
  ]);

  return (
    <>
      <PageHeader title="New payable" description="Record a contractor's invoice for approval and payout." />
      <PageBody>
        <PayableEditor
          contractors={contractors.map((c) => ({
            ...c,
            defaultCostRate: c.defaultCostRate != null ? toNumber(c.defaultCostRate) : null,
          }))}
          engagements={engagements.map((e) => ({
            ...e,
            costRate: toNumber(e.costRate),
          }))}
          baseCurrency={company.baseCurrency}
          preselectContractorId={contractor}
        />
      </PageBody>
    </>
  );
}
