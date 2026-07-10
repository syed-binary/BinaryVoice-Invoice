import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { getCompany } from "@/lib/company";
import { getRate } from "@/lib/fx";
import { toNumber, formatMoney, round2 } from "@/lib/money";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { DealBoard } from "@/components/crm/deal-board";

export const dynamic = "force-dynamic";

export default async function CrmPage() {
  await requireCapability("clients:read");
  const [deals, company] = await Promise.all([
    prisma.deal.findMany({
      where: { archived: false },
      include: { client: { select: { displayName: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    getCompany(),
  ]);

  // Open pipeline value in base currency (probability-weighted).
  const open = deals.filter((d) => !["WON", "LOST"].includes(d.stage));
  let pipelineBase = 0;
  let weightedBase = 0;
  for (const d of open) {
    if (d.value == null) continue;
    const rate = (await getRate(d.currency, company.baseCurrency)) ?? 1;
    const base = toNumber(d.value) * rate;
    pipelineBase += base;
    weightedBase += base * ((d.probability ?? 50) / 100);
  }

  return (
    <>
      <PageHeader
        title="CRM"
        description={`${open.length} open deal${open.length === 1 ? "" : "s"} · pipeline ${formatMoney(round2(pipelineBase), company.baseCurrency)} · weighted ${formatMoney(round2(weightedBase), company.baseCurrency)}`}
      >
        <Button render={<Link href="/crm/deals/new" />} className="gap-2">
          <Plus className="size-4" /> New deal
        </Button>
      </PageHeader>

      <PageBody>
        <DealBoard
          deals={deals.map((d) => ({
            id: d.id,
            name: d.name,
            stage: d.stage,
            partyName: d.client?.displayName ?? d.prospectName ?? "—",
            isProspect: !d.clientId,
            value: d.value != null ? toNumber(d.value) : null,
            currency: d.currency,
            probability: d.probability,
            expectedCloseDate: d.expectedCloseDate,
            hasEstimate: !!d.estimateId,
          }))}
        />
      </PageBody>
    </>
  );
}
