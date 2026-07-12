import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCapability, can } from "@/lib/permissions";
import { getCompany } from "@/lib/company";
import { getRate } from "@/lib/fx";
import { gratuityAccrual } from "@/lib/payroll/gratuity";
import { margin } from "@/lib/contractors/margin";
import { toNumber, formatMoney, round2 } from "@/lib/money";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requireCapability("billing:read");
  const company = await getCompany();
  const base = company.baseCurrency;
  const seesPayroll = can(user.role ?? "MEMBER", "payroll:read");

  const [invoices, payables, employees, engagements] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
    }),
    prisma.contractorInvoice.findMany({
      where: { status: { in: ["APPROVED", "SCHEDULED"] } },
      include: { contractor: { select: { name: true } } },
    }),
    seesPayroll
      ? prisma.employee.findMany({
          where: { archived: false, terminationDate: null },
          include: { compensation: { orderBy: { effectiveDate: "desc" }, take: 1 } },
        })
      : Promise.resolve([]),
    prisma.engagement.findMany({
      where: { status: "ACTIVE", billRate: { not: null } },
      include: { contractor: { select: { id: true, name: true } }, client: { select: { displayName: true } } },
    }),
  ]);

  // Receivables outstanding, base currency.
  const receivables = round2(
    invoices.reduce((s, i) => s + (toNumber(i.total) - toNumber(i.amountPaid)) * (toNumber(i.fxRate) || 1), 0),
  );
  // Payables approved & unpaid, base.
  const payablesDue = round2(payables.reduce((s, p) => s + toNumber(p.baseTotal), 0));
  // Monthly payroll obligation + gratuity liability.
  const now = new Date();
  let monthlyPayroll = 0;
  let gratuity = 0;
  for (const e of employees) {
    const c = e.compensation[0];
    if (!c) continue;
    monthlyPayroll += toNumber(c.basicSalary) + toNumber(c.housingAllowance) +
      toNumber(c.transportAllowance) + toNumber(c.otherAllowances);
    gratuity += gratuityAccrual(e.joinDate, now, toNumber(c.basicSalary)).accrued;
  }
  monthlyPayroll = round2(monthlyPayroll);
  gratuity = round2(gratuity);

  const netPosition = round2(receivables - payablesDue - (seesPayroll ? monthlyPayroll : 0));

  // Rate-card margins for active engagements (monthly-normalized where possible).
  const marginRows = [];
  for (const e of engagements) {
    const costFx = await getRate(e.costCurrency, base);
    const billFx = await getRate(e.billCurrency ?? e.costCurrency, base);
    if (costFx === null || billFx === null) continue;
    const m = margin(toNumber(e.costRate) * costFx, toNumber(e.billRate!) * billFx);
    marginRows.push({ e, m });
  }
  marginRows.sort((a, b) => (a.m.pct ?? 0) - (b.m.pct ?? 0));

  return (
    <>
      <PageHeader title="Reports" description={`Cash position and margins, in ${base}.`} />
      <PageBody className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Receivables outstanding" value={formatMoney(receivables, base)} sub={`${invoices.length} open invoices`} icon={TrendingUp} accent="emerald" delay={0} />
          <StatCard label="Payables due" value={formatMoney(payablesDue, base)} sub={`${payables.length} approved payables`} icon={TrendingDown} accent="red" delay={70} />
          {seesPayroll && (
            <StatCard label="Monthly payroll" value={formatMoney(monthlyPayroll, base)} sub={`${employees.length} employees · gratuity ${formatMoney(gratuity, base)}`} icon={PiggyBank} accent="amber" delay={140} />
          )}
          <StatCard label="Net position" value={formatMoney(netPosition, base)} sub="Receivables − payables − payroll" icon={Wallet} accent="primary" delay={210} />
        </div>

        {payables.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-lg font-bold tracking-tight">Payables due next</h2>
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              {payables.slice(0, 8).map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b px-4 py-2.5 text-sm last:border-b-0">
                  <span>{p.contractor.name} · <span className="font-mono text-xs">{p.internalNumber}</span></span>
                  <span className="font-semibold tabular">{formatMoney(p.baseTotal, base)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {marginRows.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-lg font-bold tracking-tight">Engagement margins (rate card)</h2>
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              {marginRows.map(({ e, m }) => (
                <div key={e.id} className="flex items-center justify-between border-b px-4 py-2.5 text-sm last:border-b-0">
                  <span>
                    {e.contractor.name} — {e.title}
                    <span className="text-xs text-muted-foreground"> @ {e.client?.displayName ?? "internal"}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="tabular text-xs text-muted-foreground">{formatMoney(m.amount, base)}/unit</span>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold tabular",
                      (m.pct ?? 0) >= 30 ? "bg-emerald-500/15 text-emerald-600"
                        : (m.pct ?? 0) >= 0 ? "bg-amber-500/15 text-amber-600"
                        : "bg-destructive/10 text-destructive",
                    )}>
                      {m.pct ?? "—"}%
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </PageBody>
    </>
  );
}
