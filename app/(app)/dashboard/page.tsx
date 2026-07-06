import Link from "next/link";
import { format, subMonths, startOfMonth } from "date-fns";
import {
  Wallet,
  BadgeCheck,
  AlertTriangle,
  FileText,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCompany } from "@/lib/company";
import { toNumber, formatMoney } from "@/lib/money";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { InvoiceStatusPill } from "@/components/app/status-pill";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const company = await getCompany();
  const currency = company.baseCurrency;

  const [invoices, payments, clientCount] = await Promise.all([
    prisma.invoice.findMany({
      include: { client: { select: { displayName: true } } },
      orderBy: { issueDate: "desc" },
    }),
    prisma.payment.findMany({
      where: { date: { gte: startOfMonth(subMonths(new Date(), 5)) } },
      select: { amount: true, date: true },
    }),
    prisma.client.count({ where: { archived: false } }),
  ]);

  const now = new Date();
  let outstanding = 0;
  let overdue = 0;
  let paidTotal = 0;
  let draftCount = 0;

  for (const inv of invoices) {
    const total = toNumber(inv.total);
    const paid = toNumber(inv.amountPaid);
    const due = total - paid;
    paidTotal += paid;
    if (inv.status === "DRAFT") draftCount++;
    if (["SENT", "PARTIALLY_PAID", "OVERDUE"].includes(inv.status)) {
      outstanding += due;
      const isOverdue = inv.dueDate && inv.dueDate < now && due > 0.005;
      if (inv.status === "OVERDUE" || isOverdue) overdue += due;
    }
  }

  // Revenue by month (last 6 months, from payments received)
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(startOfMonth(now), 5 - i);
    return { key: format(d, "yyyy-MM"), month: format(d, "MMM"), total: 0 };
  });
  const monthMap = new Map(months.map((m) => [m.key, m]));
  for (const p of payments) {
    const key = format(p.date, "yyyy-MM");
    const bucket = monthMap.get(key);
    if (bucket) bucket.total += toNumber(p.amount);
  }

  const recent = invoices.slice(0, 6);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your invoicing at a glance."
      >
        <Button render={<Link href="/estimates/new" />} variant="outline">
          New estimate
        </Button>
        <Button render={<Link href="/invoices/new" />} className="gap-2">
          <Plus className="size-4" /> New invoice
        </Button>
      </PageHeader>

      <PageBody className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Outstanding"
            value={formatMoney(outstanding, currency)}
            sub="Awaiting payment"
            icon={Wallet}
            accent="primary"
          />
          <StatCard
            label="Collected"
            value={formatMoney(paidTotal, currency)}
            sub="Total received"
            icon={BadgeCheck}
            accent="emerald"
          />
          <StatCard
            label="Overdue"
            value={formatMoney(overdue, currency)}
            sub="Past due date"
            icon={AlertTriangle}
            accent="red"
          />
          <StatCard
            label="Invoices"
            value={String(invoices.length)}
            sub={`${draftCount} draft · ${clientCount} clients`}
            icon={FileText}
            accent="amber"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight">
                  Revenue
                </h2>
                <p className="text-xs text-muted-foreground">
                  Payments received · last 6 months
                </p>
              </div>
            </div>
            <RevenueChart data={months} currency={currency} />
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold tracking-tight">
                Recent invoices
              </h2>
              <Link
                href="/invoices"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View all <ArrowUpRight className="size-3" />
              </Link>
            </div>

            {recent.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No invoices yet"
                description="Create your first invoice to get started."
                className="py-8"
              />
            ) : (
              <ul className="divide-y">
                {recent.map((inv) => (
                  <li key={inv.id}>
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/60"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {inv.client.displayName}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {inv.number}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm font-semibold tabular">
                          {formatMoney(inv.total, inv.currency)}
                        </span>
                        <InvoiceStatusPill status={inv.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </PageBody>
    </>
  );
}
