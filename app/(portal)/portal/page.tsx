import Link from "next/link";
import { Plus, Briefcase, Receipt, Banknote } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  requirePortalContractor,
  requirePortalEmployee,
  requireUser,
} from "@/lib/session";
import { toNumber, formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { LeaveRequestForm } from "@/components/hr/hr-widgets";
import { cn } from "@/lib/utils";

const LEAVE_STYLE: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-600",
  APPROVED: "bg-emerald-500/15 text-emerald-600",
  REJECTED: "bg-destructive/10 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground",
};

async function EmployeeOverview() {
  const { employee } = await requirePortalEmployee();
  const year = new Date().getFullYear();
  const [balances, requests, leaveTypes] = await Promise.all([
    prisma.leaveBalance.findMany({
      where: { employeeId: employee.id, year },
      include: { leaveType: true },
    }),
    prisma.leaveRequest.findMany({
      where: { employeeId: employee.id },
      include: { leaveType: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.leaveType.findMany({ where: { archived: false }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">
            Welcome, {employee.name.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            {employee.jobTitle} · joined {formatDate(employee.joinDate)}
          </p>
        </div>
        <LeaveRequestForm
          employeeId={employee.id}
          leaveTypes={leaveTypes.map((t) => ({ value: t.id, label: t.name }))}
        />
      </div>

      <section>
        <h2 className="mb-3 font-display text-base font-semibold">Leave balances · {year}</h2>
        {balances.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Balances appear after your first request of the year.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            {balances.map((b) => {
              const remaining = toNumber(b.entitled) + toNumber(b.adjusted) - toNumber(b.taken);
              return (
                <div key={b.id} className="rounded-xl border bg-card px-4 py-3 shadow-sm">
                  <div className="text-xs text-muted-foreground">{b.leaveType.name}</div>
                  <div className="text-lg font-semibold tabular">
                    {remaining}
                    <span className="text-xs font-normal text-muted-foreground"> / {toNumber(b.entitled)} days left</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-base font-semibold">Your requests</h2>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leave requests yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 border-b px-4 py-3 text-sm last:border-b-0">
                <span>
                  {r.leaveType.name} · {formatDate(r.startDate)} → {formatDate(r.endDate)}
                  <span className="text-xs text-muted-foreground"> ({toNumber(r.days)}d)</span>
                </span>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", LEAVE_STYLE[r.status])}>
                  {r.status.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";

const PAYABLE_STYLE: Record<string, string> = {
  RECEIVED: "bg-amber-500/15 text-amber-600",
  APPROVED: "bg-sky-500/15 text-sky-600",
  SCHEDULED: "bg-violet-500/15 text-violet-600",
  PAID: "bg-emerald-500/15 text-emerald-600",
  REJECTED: "bg-destructive/10 text-destructive",
};

export default async function PortalOverviewPage() {
  const session = await requireUser();
  if (session.role === "EMPLOYEE") return <EmployeeOverview />;
  const { contractor } = await requirePortalContractor();
  const [engagements, payables, payouts] = await Promise.all([
    prisma.engagement.findMany({
      where: { contractorId: contractor.id, status: "ACTIVE" },
      include: { client: { select: { displayName: true } } },
      orderBy: { startDate: "desc" },
    }),
    prisma.contractorInvoice.findMany({
      where: { contractorId: contractor.id },
      orderBy: { issueDate: "desc" },
      take: 10,
    }),
    prisma.payout.findMany({
      where: { contractorId: contractor.id, paidDate: { not: null } },
      orderBy: { paidDate: "desc" },
      take: 6,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">
            Welcome, {contractor.name.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            Your engagements, invoices and payouts with Binary Labs.
          </p>
        </div>
        <Button render={<Link href="/portal/invoices/new" />} className="gap-2">
          <Plus className="size-4" /> Submit invoice
        </Button>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold">
          <Briefcase className="size-4 text-muted-foreground" /> Active engagements
        </h2>
        {engagements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active engagements.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            {engagements.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0">
                <div>
                  <div className="text-sm font-medium">{e.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {e.client?.displayName ?? "Binary Labs"} · since {formatDate(e.startDate)}
                  </div>
                </div>
                <span className="text-sm font-semibold tabular">
                  {formatMoney(toNumber(e.costRate), e.costCurrency)}/{e.rateUnit.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold">
          <Receipt className="size-4 text-muted-foreground" /> Your invoices
        </h2>
        {payables.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing submitted yet — use “Submit invoice” to send your first one.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            {payables.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0">
                <div>
                  <div className="font-mono text-sm font-medium">
                    {p.internalNumber}
                    {p.contractorRef && (
                      <span className="ml-2 font-sans text-xs text-muted-foreground">({p.contractorRef})</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{formatDate(p.issueDate)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold tabular">{formatMoney(p.total, p.currency)}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", PAYABLE_STYLE[p.status])}>
                    {p.status.toLowerCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {payouts.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold">
            <Banknote className="size-4 text-muted-foreground" /> Recent payouts
          </h2>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0">
                <div className="text-sm">
                  {formatDate(p.paidDate!)}
                  {p.reference && (
                    <span className="ml-2 font-mono text-xs text-muted-foreground">{p.reference}</span>
                  )}
                </div>
                <span className="text-sm font-semibold tabular">{formatMoney(p.amount, p.currency)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
