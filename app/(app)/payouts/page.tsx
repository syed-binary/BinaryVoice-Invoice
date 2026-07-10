import Link from "next/link";
import { Plus, Banknote, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { getCompany } from "@/lib/company";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const RUN_STYLE: Record<string, string> = {
  DRAFT: "bg-amber-500/15 text-amber-600",
  APPROVED: "bg-sky-500/15 text-sky-600",
  PAID: "bg-emerald-500/15 text-emerald-600",
};

export default async function PayoutsPage() {
  await requireCapability("contractors:read");
  const [runs, company] = await Promise.all([
    prisma.payoutRun.findMany({
      include: { _count: { select: { payouts: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getCompany(),
  ]);

  return (
    <>
      <PageHeader title="Payout runs" description="Track-only batches of contractor payments sent via bank/Wise.">
        <Button render={<Link href="/payouts/new" />} className="gap-2">
          <Plus className="size-4" /> New run
        </Button>
      </PageHeader>

      <PageBody>
        {runs.length === 0 ? (
          <EmptyState
            icon={Banknote}
            title="No payout runs yet"
            description="Batch approved payables into a run to track a payment batch."
            action={
              <Button render={<Link href="/payouts/new" />} className="gap-2">
                <Plus className="size-4" /> New run
              </Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            {runs.map((run) => (
              <Link
                key={run.id}
                href={`/payouts/${run.id}`}
                className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-accent/40"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{run.number}</span>
                    {run.name && <span className="truncate text-sm text-muted-foreground">{run.name}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {run._count.payouts} payout{run._count.payouts === 1 ? "" : "s"} ·{" "}
                    {run.paidDate ? `paid ${formatDate(run.paidDate)}` : `created ${formatDate(run.createdAt)}`}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold tabular">
                    {formatMoney(run.totalBase, company.baseCurrency)}
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", RUN_STYLE[run.status])}>
                    {run.status.toLowerCase()}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}
