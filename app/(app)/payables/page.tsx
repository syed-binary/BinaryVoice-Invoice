import Link from "next/link";
import { Plus, Receipt, ArrowUpRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { PayableStatus, Prisma } from "@prisma/client";
import { requireCapability } from "@/lib/permissions";
import { getCompany } from "@/lib/company";
import { toNumber, formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUSES: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "RECEIVED", label: "Received" },
  { value: "APPROVED", label: "Approved" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "PAID", label: "Paid" },
  { value: "REJECTED", label: "Rejected" },
];

const PAYABLE_STYLE: Record<string, string> = {
  RECEIVED: "bg-amber-500/15 text-amber-600",
  APPROVED: "bg-sky-500/15 text-sky-600",
  SCHEDULED: "bg-violet-500/15 text-violet-600",
  PAID: "bg-emerald-500/15 text-emerald-600",
  REJECTED: "bg-destructive/10 text-destructive",
};

export default async function PayablesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireCapability("contractors:read");
  const { status } = await searchParams;
  const company = await getCompany();

  const where: Prisma.ContractorInvoiceWhereInput = status
    ? { status: status as PayableStatus }
    : {};
  const payables = await prisma.contractorInvoice.findMany({
    where,
    include: { contractor: { select: { name: true } } },
    orderBy: { issueDate: "desc" },
  });

  const dueBase = payables
    .filter((p) => p.status === "APPROVED" || p.status === "SCHEDULED")
    .reduce((s, p) => s + toNumber(p.baseTotal), 0);

  return (
    <>
      <PageHeader
        title="Payables"
        description={`Contractor invoices awaiting payment · ${formatMoney(dueBase, company.baseCurrency)} approved & unpaid`}
      >
        <Button variant="outline" render={<Link href="/payouts" />} className="gap-2">
          Payout runs <ArrowUpRight className="size-4" />
        </Button>
        <Button render={<Link href="/payables/new" />} className="gap-2">
          <Plus className="size-4" /> New payable
        </Button>
      </PageHeader>

      <PageBody className="space-y-5">
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <Link
              key={s.value}
              href={s.value ? `/payables?status=${s.value}` : "/payables"}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                (status ?? "") === s.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {s.label}
            </Link>
          ))}
        </div>

        {payables.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No payables"
            description="Record contractor invoices here to approve and track payouts."
            action={
              <Button render={<Link href="/payables/new" />} className="gap-2">
                <Plus className="size-4" /> New payable
              </Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            {payables.map((p) => (
              <Link
                key={p.id}
                href={`/payables/${p.id}`}
                className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-accent/40"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{p.internalNumber}</span>
                    {p.contractorRef && (
                      <span className="text-xs text-muted-foreground">({p.contractorRef})</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.contractor.name} · {formatDate(p.issueDate)}
                    {p.dueDate ? ` · due ${formatDate(p.dueDate)}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular">
                      {formatMoney(p.total, p.currency)}
                    </div>
                    {p.currency !== company.baseCurrency && (
                      <div className="text-xs text-muted-foreground tabular">
                        ≈ {formatMoney(p.baseTotal, company.baseCurrency)}
                      </div>
                    )}
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", PAYABLE_STYLE[p.status])}>
                    {p.status.toLowerCase()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}
