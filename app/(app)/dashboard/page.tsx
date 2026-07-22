import Link from "next/link";
import { format, subMonths, startOfMonth, addDays } from "date-fns";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  FileText,
  Receipt,
  CalendarClock,
  FileSignature,
  ShieldAlert,
  Users,
  UserCog,
  PiggyBank,
  Landmark,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/permissions";
import { getCompany } from "@/lib/company";
import { getRate } from "@/lib/fx";
import { gratuityAccrual } from "@/lib/payroll/gratuity";
import { toNumber, formatMoney, round2 } from "@/lib/money";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { InvoiceStatusPill } from "@/components/app/status-pill";
import { Button } from "@/components/ui/button";
import { STAGE_LABEL } from "@/lib/crm";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const role = user.role ?? "MEMBER";
  const company = await getCompany();
  const base = company.baseCurrency;
  const now = new Date();
  const in30 = addDays(now, 30);

  const seesContractors = can(role, "contractors:read");
  const seesHr = can(role, "hr:read");
  const seesPayroll = can(role, "payroll:read");
  const seesContracts = can(role, "contracts:read");

  const [
    invoices,
    payments,
    openDeals,
    payables,
    receivedCount,
    pendingLeave,
    contractsAwaiting,
    expiringDocs,
    employees,
    activeContractors,
    activeEngagements,
    employeeCount,
    monthlyContractors,
    receivedAgg,
    paidOutAgg,
    payrollPaidAgg,
  ] = await Promise.all([
    prisma.invoice.findMany({ include: { client: { select: { displayName: true } } }, orderBy: { issueDate: "desc" } }),
    prisma.payment.findMany({
      where: { date: { gte: startOfMonth(subMonths(now, 5)) } },
      select: { baseAmount: true, date: true },
    }),
    prisma.deal.findMany({ where: { archived: false, stage: { notIn: ["WON", "LOST"] } } }),
    seesContractors
      ? prisma.contractorInvoice.findMany({ where: { status: { in: ["APPROVED", "SCHEDULED"] } } })
      : Promise.resolve([]),
    seesContractors
      ? prisma.contractorInvoice.count({ where: { status: "RECEIVED" } })
      : Promise.resolve(0),
    seesHr ? prisma.leaveRequest.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
    seesContracts
      ? prisma.contract.findMany({
          where: { status: "SENT" },
          select: { id: true, number: true, title: true },
          take: 5,
        })
      : Promise.resolve([]),
    prisma.document.count({
      where: { archived: false, expiryDate: { not: null, lte: in30 } },
    }),
    seesPayroll
      ? prisma.employee.findMany({
          where: { archived: false, terminationDate: null },
          include: { compensation: { orderBy: { effectiveDate: "desc" }, take: 1 } },
        })
      : Promise.resolve([]),
    seesContractors
      ? prisma.contractor.count({ where: { archived: false, status: "ACTIVE" } })
      : Promise.resolve(0),
    seesContractors
      ? prisma.engagement.count({ where: { status: "ACTIVE" } })
      : Promise.resolve(0),
    seesHr
      ? prisma.employee.count({ where: { archived: false, terminationDate: null } })
      : Promise.resolve(0),
    seesContractors
      ? prisma.contractor.findMany({
          where: {
            archived: false,
            status: { in: ["ONBOARDING", "ACTIVE"] },
            defaultRateUnit: "MONTH",
            defaultCostRate: { not: null },
          },
          select: { currency: true, defaultCostRate: true },
        })
      : Promise.resolve([]),
    prisma.payment.aggregate({ _sum: { baseAmount: true } }),
    seesContractors
      ? prisma.payout.aggregate({ _sum: { baseAmount: true } })
      : Promise.resolve({ _sum: { baseAmount: null } }),
    seesPayroll
      ? prisma.payrollRun.aggregate({ where: { status: "PAID" }, _sum: { totalNet: true } })
      : Promise.resolve({ _sum: { totalNet: null } }),
  ]);

  // --- Money, all in base currency ---
  let receivables = 0;
  let overdue = 0;
  let overdueCount = 0;
  for (const inv of invoices) {
    if (!["SENT", "PARTIALLY_PAID", "OVERDUE"].includes(inv.status)) continue;
    const rate = toNumber(inv.fxRate) || 1;
    const due = (toNumber(inv.total) - toNumber(inv.amountPaid)) * rate;
    receivables += due;
    if (inv.status === "OVERDUE" || (inv.dueDate && inv.dueDate < now && due > 0.005)) {
      overdue += due;
      overdueCount++;
    }
  }
  const payablesDue = payables.reduce((s, p) => s + toNumber(p.baseTotal), 0);

  let monthlyPayroll = 0;
  let gratuity = 0;
  for (const e of employees) {
    const c = e.compensation[0];
    if (!c) continue;
    monthlyPayroll +=
      toNumber(c.basicSalary) + toNumber(c.housingAllowance) +
      toNumber(c.transportAllowance) + toNumber(c.otherAllowances);
    gratuity += gratuityAccrual(e.joinDate, now, toNumber(c.basicSalary)).accrued;
  }
  // Contractor rate cards are a recurring monthly commitment too — convert
  // each monthly retainer to base currency and fold it into the payroll figure.
  for (const c of monthlyContractors) {
    const rate = (await getRate(c.currency, base)) ?? 1;
    monthlyPayroll += toNumber(c.defaultCostRate) * rate;
  }
  const cashOut = round2(payablesDue + monthlyPayroll);

  // Cash actually held: everything received minus everything paid out, as
  // recorded in the system (invoice payments − contractor payouts − payroll).
  const cashOnHand = round2(
    toNumber(receivedAgg._sum.baseAmount) -
      toNumber(paidOutAgg._sum.baseAmount) -
      toNumber(payrollPaidAgg._sum.totalNet),
  );
  // Net position = cash actually held minus everything due to go out.
  const net = round2(cashOnHand - cashOut);

  // Weighted pipeline in base currency.
  let pipeline = 0;
  for (const d of openDeals) {
    if (d.value == null) continue;
    const rate = (await getRate(d.currency, base)) ?? 1;
    pipeline += toNumber(d.value) * rate * ((d.probability ?? 50) / 100);
  }
  pipeline = round2(pipeline);

  // Pipeline by stage (counts) for the mini funnel.
  const stages = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION"] as const;
  const stageCounts = stages.map((s) => ({
    stage: s,
    count: openDeals.filter((d) => d.stage === s).length,
  }));

  // Revenue by month (payments, base currency).
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(startOfMonth(now), 5 - i);
    return { key: format(d, "yyyy-MM"), month: format(d, "MMM"), total: 0 };
  });
  const monthMap = new Map(months.map((m) => [m.key, m]));
  for (const p of payments) {
    const bucket = monthMap.get(format(p.date, "yyyy-MM"));
    if (bucket) bucket.total += toNumber(p.baseAmount);
  }

  // --- Needs attention ---
  const attention: { icon: typeof Receipt; label: string; href: string; tone: "amber" | "red" }[] = [];
  if (overdueCount > 0)
    attention.push({ icon: AlertTriangle, label: `${overdueCount} overdue invoice${overdueCount > 1 ? "s" : ""} · ${formatMoney(round2(overdue), base)}`, href: "/invoices?status=OVERDUE", tone: "red" });
  if (receivedCount > 0)
    attention.push({ icon: Receipt, label: `${receivedCount} contractor invoice${receivedCount > 1 ? "s" : ""} awaiting approval`, href: "/payables?status=RECEIVED", tone: "amber" });
  if (pendingLeave > 0)
    attention.push({ icon: CalendarClock, label: `${pendingLeave} leave request${pendingLeave > 1 ? "s" : ""} pending`, href: "/hr/leave", tone: "amber" });
  for (const c of contractsAwaiting)
    attention.push({ icon: FileSignature, label: `${c.number} awaiting signature — ${c.title}`, href: `/contracts/${c.id}`, tone: "amber" });
  if (expiringDocs > 0)
    attention.push({ icon: ShieldAlert, label: `${expiringDocs} document${expiringDocs > 1 ? "s" : ""} expiring within 30 days`, href: "/contractors", tone: "amber" });

  const recent = invoices.slice(0, 5);

  return (
    <>
      <PageHeader title="Dashboard" description="Everything in orbit — at a glance.">
        <Button render={<Link href="/estimates/new" />} variant="outline">New estimate</Button>
        <Button render={<Link href="/invoices/new" />} className="gap-2">
          <Plus className="size-4" /> New invoice
        </Button>
      </PageHeader>

      <PageBody className="space-y-6">
        {/* Row 1 — the money */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Cash with Binary Labs" value={formatMoney(cashOnHand, base)} sub="received − paid out" icon={Landmark} accent="primary" delay={0} />
          <StatCard label="Cash in (receivables)" value={formatMoney(round2(receivables), base)} sub={`${formatMoney(round2(overdue), base)} overdue`} icon={TrendingUp} accent="emerald" delay={60} />
          <StatCard label="Cash out (due)" value={formatMoney(cashOut, base)} sub={seesPayroll ? `payables + monthly payroll` : "approved payables"} icon={TrendingDown} accent="red" delay={120} />
          <StatCard label="Net position" value={formatMoney(net, base)} sub="cash held − cash out" icon={Wallet} accent="primary" delay={180} />
          <StatCard label="Weighted pipeline" value={formatMoney(pipeline, base)} sub={`${openDeals.length} open deal${openDeals.length === 1 ? "" : "s"}`} icon={Target} accent="amber" delay={240} />
        </div>

        {/* Row 2 — needs attention + workforce */}
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="animate-enter rounded-xl border bg-card p-5" style={{ animationDelay: "220ms" }}>
            <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">Needs your attention</h2>
            {attention.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">All clear — nothing waiting on you. 🛰️</p>
            ) : (
              <ul className="divide-y">
                {attention.slice(0, 6).map((a) => (
                  <li key={a.label}>
                    <Link href={a.href} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm hover:bg-muted/60">
                      <a.icon className={a.tone === "red" ? "size-4 shrink-0 text-destructive" : "size-4 shrink-0 text-amber-500"} />
                      <span className="min-w-0 flex-1 truncate">{a.label}</span>
                      <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="animate-enter rounded-xl border bg-card p-5" style={{ animationDelay: "280ms" }}>
            <h2 className="mb-3 font-display text-lg font-semibold tracking-tight">Workforce</h2>
            <dl className="space-y-3 text-sm">
              {seesHr && (
                <div className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-muted-foreground"><Users className="size-4" /> Employees</dt>
                  <dd className="font-semibold tabular">{employeeCount}</dd>
                </div>
              )}
              {seesContractors && (
                <>
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-2 text-muted-foreground"><UserCog className="size-4" /> Active contractors</dt>
                    <dd className="font-semibold tabular">{activeContractors}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-2 text-muted-foreground"><Target className="size-4" /> Engagements running</dt>
                    <dd className="font-semibold tabular">{activeEngagements}</dd>
                  </div>
                </>
              )}
              {seesPayroll && (
                <>
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-2 text-muted-foreground"><PiggyBank className="size-4" /> Monthly payroll + contractors</dt>
                    <dd className="font-semibold tabular">{formatMoney(round2(monthlyPayroll), base)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Gratuity liability</dt>
                    <dd className="tabular">{formatMoney(round2(gratuity), base)}</dd>
                  </div>
                </>
              )}
            </dl>
            <div className="mt-4 border-t pt-3">
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Pipeline</div>
              <div className="flex items-center gap-1.5">
                {stageCounts.map((s) => (
                  <Link key={s.stage} href="/crm" className="flex-1 rounded-md bg-muted/60 px-1.5 py-1.5 text-center hover:bg-accent">
                    <div className="text-sm font-semibold tabular">{s.count}</div>
                    <div className="truncate text-[9px] uppercase tracking-wide text-muted-foreground">{STAGE_LABEL[s.stage]}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Row 3 — revenue + recent invoices */}
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="animate-enter rounded-xl border bg-card p-5" style={{ animationDelay: "340ms" }}>
            <div className="mb-4">
              <h2 className="font-display text-lg font-semibold tracking-tight">Revenue</h2>
              <p className="text-xs text-muted-foreground">Payments received · last 6 months · {base}</p>
            </div>
            <RevenueChart data={months} currency={base} />
          </div>

          <div className="animate-enter rounded-xl border bg-card p-5" style={{ animationDelay: "400ms" }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold tracking-tight">Recent invoices</h2>
              <Link href="/invoices" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                View all <ArrowUpRight className="size-3" />
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              <ul className="divide-y">
                {recent.map((inv) => (
                  <li key={inv.id}>
                    <Link href={`/invoices/${inv.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/60">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{inv.client.displayName}</div>
                        <div className="font-mono text-xs text-muted-foreground">{inv.number}</div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-sm font-semibold tabular">{formatMoney(inv.total, inv.currency)}</span>
                        <InvoiceStatusPill status={inv.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="size-3.5" />
          Press <kbd className="rounded border px-1.5 py-0.5 text-[10px]">⌘K</kbd> to search everything · deeper numbers in <Link href="/reports" className="text-primary hover:underline">Reports</Link>
        </p>
      </PageBody>
    </>
  );
}
