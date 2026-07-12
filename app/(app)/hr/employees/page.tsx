import Link from "next/link";
import { Plus, Users, ChevronRight, CalendarClock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import { cn } from "@/lib/utils";
import { addDays } from "date-fns";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  await requireCapability("hr:read");
  const [employees, pendingLeave] = await Promise.all([
    prisma.employee.findMany({
      where: { archived: false },
      include: { manager: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
  ]);

  const soon = addDays(new Date(), 60);
  const expiring = (e: (typeof employees)[number]) =>
    [e.passportExpiry, e.visaExpiry, e.emiratesIdExpiry, e.labourCardExpiry].some(
      (d) => d && d <= soon,
    );

  return (
    <>
      <PageHeader title="Employees" description="Your team — identity compliance, compensation and leave.">
        <Button variant="outline" render={<Link href="/hr/leave" />} className="gap-2">
          <CalendarClock className="size-4" /> Leave
          {pendingLeave > 0 && (
            <span className="rounded-full bg-amber-500/20 px-1.5 text-xs font-semibold text-amber-600">{pendingLeave}</span>
          )}
        </Button>
        <Button render={<Link href="/hr/employees/new" />} className="gap-2">
          <Plus className="size-4" /> New employee
        </Button>
      </PageHeader>

      <PageBody>
        {employees.length === 0 ? (
          <EmptyState icon={Users} title="No employees yet" description="Add your first team member."
            action={<Button render={<Link href="/hr/employees/new" />} className="gap-2"><Plus className="size-4" /> New employee</Button>} />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            {employees.map((e) => (
              <Link key={e.id} href={`/hr/employees/${e.id}`}
                className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-accent/40">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{e.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{e.employeeNo}</span>
                    {e.terminationDate && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">terminated</span>
                    )}
                    {expiring(e) && !e.terminationDate && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-600">docs expiring</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {e.jobTitle}
                    {e.department ? ` · ${e.department}` : ""}
                    {e.manager ? ` · reports to ${e.manager.name}` : ""}
                  </div>
                </div>
                <div className={cn("flex items-center gap-3 text-xs text-muted-foreground")}>
                  since {formatDate(e.joinDate)}
                  <ChevronRight className="size-4" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}
