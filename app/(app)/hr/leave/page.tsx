import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { toNumber } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { LeaveDecideButtons } from "@/components/hr/hr-widgets";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const LEAVE_STYLE: Record<string, string> = {
  APPROVED: "bg-emerald-500/15 text-emerald-600",
  REJECTED: "bg-destructive/10 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground",
};

export default async function LeavePage() {
  await requireCapability("hr:read");
  const [pending, recent] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { status: "PENDING" },
      include: { employee: { select: { id: true, name: true } }, leaveType: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: { status: { not: "PENDING" } },
      include: { employee: { select: { id: true, name: true } }, leaveType: true },
      orderBy: { decidedAt: "desc" },
      take: 12,
    }),
  ]);

  return (
    <>
      <PageHeader title="Leave approvals" description="UAE leave types are seeded per Federal Decree-Law 33/2021." />
      <PageBody className="space-y-8">
        <section>
          <h2 className="mb-3 font-display text-lg font-bold tracking-tight">Pending</h2>
          {pending.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Nothing waiting" description="No pending leave requests." className="py-10" />
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              {pending.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0">
                  <div>
                    <Link href={`/hr/employees/${r.employee.id}`} className="text-sm font-medium hover:underline">
                      {r.employee.name}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {r.leaveType.name} · {formatDate(r.startDate)} → {formatDate(r.endDate)} ({toNumber(r.days)}d)
                      {r.reason ? ` — ${r.reason}` : ""}
                    </div>
                  </div>
                  <LeaveDecideButtons requestId={r.id} />
                </div>
              ))}
            </div>
          )}
        </section>

        {recent.length > 0 && (
          <section>
            <h2 className="mb-3 font-display text-lg font-bold tracking-tight">Recent decisions</h2>
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              {recent.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 border-b px-4 py-2.5 text-sm last:border-b-0">
                  <span>
                    {r.employee.name} · {r.leaveType.name} · {formatDate(r.startDate)} ({toNumber(r.days)}d)
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", LEAVE_STYLE[r.status])}>
                    {r.status.toLowerCase()}
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
