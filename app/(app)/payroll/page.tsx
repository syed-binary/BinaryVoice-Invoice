import Link from "next/link";
import { Banknote, ChevronRight, PiggyBank } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { formatMoney } from "@/lib/money";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import { CreateRunButton } from "@/components/payroll/run-widgets";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const RUN_STYLE: Record<string, string> = {
  DRAFT: "bg-amber-500/15 text-amber-600",
  APPROVED: "bg-sky-500/15 text-sky-600",
  PAID: "bg-emerald-500/15 text-emerald-600",
};

const MONTH = (m: number) => new Date(2026, m - 1, 1).toLocaleString("en", { month: "long" });

export default async function PayrollPage() {
  await requireCapability("payroll:read");
  const runs = await prisma.payrollRun.findMany({
    include: { _count: { select: { payslips: true } } },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
  });

  return (
    <>
      <PageHeader title="Payroll" description="Monthly runs, payslips and WPS bank files.">
        <Button variant="outline" render={<Link href="/payroll/gratuity" />} className="gap-2">
          <PiggyBank className="size-4" /> Gratuity liability
        </Button>
        <CreateRunButton />
      </PageHeader>
      <PageBody>
        {runs.length === 0 ? (
          <EmptyState icon={Banknote} title="No payroll runs yet"
            description="Create a run to snapshot compensation for a month." action={<CreateRunButton />} />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            {runs.map((r) => (
              <Link key={r.id} href={`/payroll/${r.id}`}
                className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-accent/40">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{r.number}</span>
                    <span className="text-sm">{MONTH(r.periodMonth)} {r.periodYear}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{r._count.payslips} payslip{r._count.payslips === 1 ? "" : "s"}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold tabular">{formatMoney(r.totalNet, r.currency)}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", RUN_STYLE[r.status])}>
                    {r.status.toLowerCase()}
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
