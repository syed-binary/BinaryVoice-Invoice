import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Mail, Phone, MapPin } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireCapability, can } from "@/lib/permissions";
import { maskIdentity } from "@/lib/hr";
import { toNumber, formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { DocumentPanel } from "@/components/documents/document-panel";
import {
  CompensationForm,
  EmployeePortalButton,
  LeaveRequestForm,
} from "@/components/hr/hr-widgets";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const LEAVE_STYLE: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-600",
  APPROVED: "bg-emerald-500/15 text-emerald-600",
  REJECTED: "bg-destructive/10 text-destructive",
  CANCELLED: "bg-muted text-muted-foreground",
};

function expiryRow(label: string, masked: string | null, expiry: Date | null) {
  if (!masked && !expiry) return null;
  const days = expiry ? differenceInCalendarDays(expiry, new Date()) : null;
  return (
    <div className="flex items-center justify-between text-sm" key={label}>
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-xs">{masked ?? "—"}</span>
        {expiry && (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-medium",
              days! < 0
                ? "bg-destructive/10 text-destructive"
                : days! <= 60
                  ? "bg-amber-500/15 text-amber-600"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {days! < 0 ? "expired" : formatDate(expiry)}
          </span>
        )}
      </span>
    </div>
  );
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireCapability("hr:read");
  const { id } = await params;
  const [e, leaveTypes, documents] = await Promise.all([
    prisma.employee.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, name: true } },
        reports: { select: { id: true, name: true, jobTitle: true } },
        compensation: { orderBy: { effectiveDate: "desc" } },
        leaveBalances: { include: { leaveType: true }, where: { year: new Date().getFullYear() } },
        leaveRequests: { include: { leaveType: true }, orderBy: { createdAt: "desc" }, take: 8 },
      },
    }),
    prisma.leaveType.findMany({ where: { archived: false }, orderBy: { sortOrder: "asc" } }),
    prisma.document.findMany({
      where: { entityType: "EMPLOYEE", entityId: id, archived: false },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!e) notFound();

  const seesComp = can(user.role ?? "MEMBER", "compensation:read");

  return (
    <>
      <PageHeader
        title={e.name}
        description={`${e.employeeNo} · ${e.jobTitle}${e.department ? ` · ${e.department}` : ""}`}
      >
        <LeaveRequestForm
          employeeId={id}
          leaveTypes={leaveTypes.map((t) => ({ value: t.id, label: t.name }))}
          compactTrigger
        />
        <Button variant="outline" render={<Link href={`/hr/employees/${id}/edit`} />} className="gap-2">
          <Pencil className="size-4" /> Edit
        </Button>
      </PageHeader>

      <PageBody className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Profile</h3>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2.5"><Mail className="size-4 text-muted-foreground" /> {e.email}</div>
              {e.phone && <div className="flex items-center gap-2.5"><Phone className="size-4 text-muted-foreground" /> {e.phone}</div>}
              {e.nationality && <div className="flex items-center gap-2.5"><MapPin className="size-4 text-muted-foreground" /> {e.nationality}</div>}
              <div className="pt-1 text-xs text-muted-foreground">
                Joined {formatDate(e.joinDate)}
                {e.probationEndDate && ` · probation ends ${formatDate(e.probationEndDate)}`}
                {e.terminationDate && ` · terminated ${formatDate(e.terminationDate)}`}
              </div>
              {e.manager && (
                <div className="text-xs text-muted-foreground">
                  Reports to{" "}
                  <Link href={`/hr/employees/${e.manager.id}`} className="font-medium hover:underline">{e.manager.name}</Link>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">UAE identity</h3>
            <div className="space-y-2.5">
              {expiryRow("Passport", maskIdentity(e.passportNumber), e.passportExpiry)}
              {expiryRow("Visa", maskIdentity(e.visaNumber), e.visaExpiry)}
              {expiryRow("Emirates ID", maskIdentity(e.emiratesIdNumber), e.emiratesIdExpiry)}
              {expiryRow("Labour card", maskIdentity(e.labourCardNumber), e.labourCardExpiry)}
              {!e.passportNumber && !e.visaNumber && !e.emiratesIdNumber && (
                <p className="text-xs text-muted-foreground">No identity records yet.</p>
              )}
            </div>
          </div>

          {e.reports.length > 0 && (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Direct reports</h3>
              <ul className="space-y-1.5 text-sm">
                {e.reports.map((r) => (
                  <li key={r.id}>
                    <Link href={`/hr/employees/${r.id}`} className="hover:underline">{r.name}</Link>
                    <span className="text-xs text-muted-foreground"> · {r.jobTitle}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <EmployeePortalButton employeeId={id} hasAccess={!!e.userId} email={e.email} />
        </div>

        <div className="space-y-6">
          {seesComp && (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold tracking-tight">Compensation</h2>
                <CompensationForm employeeId={id} />
              </div>
              {e.compensation.length === 0 ? (
                <p className="text-sm text-muted-foreground">No salary records yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 font-medium">Effective</th>
                      <th className="py-2 text-right font-medium">Basic</th>
                      <th className="py-2 text-right font-medium">Housing</th>
                      <th className="py-2 text-right font-medium">Transport</th>
                      <th className="py-2 text-right font-medium">Other</th>
                      <th className="py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.compensation.map((c) => {
                      const total =
                        toNumber(c.basicSalary) + toNumber(c.housingAllowance) +
                        toNumber(c.transportAllowance) + toNumber(c.otherAllowances);
                      return (
                        <tr key={c.id} className="border-b last:border-b-0">
                          <td className="py-2">{formatDate(c.effectiveDate)}</td>
                          <td className="py-2 text-right tabular">{formatMoney(c.basicSalary, c.currency)}</td>
                          <td className="py-2 text-right tabular">{formatMoney(c.housingAllowance, c.currency)}</td>
                          <td className="py-2 text-right tabular">{formatMoney(c.transportAllowance, c.currency)}</td>
                          <td className="py-2 text-right tabular">{formatMoney(c.otherAllowances, c.currency)}</td>
                          <td className="py-2 text-right font-semibold tabular">{formatMoney(total, c.currency)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="mb-3 font-display text-lg font-bold tracking-tight">
              Leave · {new Date().getFullYear()}
            </h2>
            <div className="mb-4 grid gap-2 sm:grid-cols-3">
              {e.leaveBalances.map((b) => {
                const remaining = toNumber(b.entitled) + toNumber(b.adjusted) - toNumber(b.taken);
                return (
                  <div key={b.id} className="rounded-lg border px-3 py-2">
                    <div className="text-xs text-muted-foreground">{b.leaveType.name}</div>
                    <div className="text-sm font-semibold tabular">
                      {remaining} <span className="text-xs font-normal text-muted-foreground">/ {toNumber(b.entitled)} left</span>
                    </div>
                  </div>
                );
              })}
              {e.leaveBalances.length === 0 && (
                <p className="text-sm text-muted-foreground sm:col-span-3">
                  Balances appear after the first request of the year.
                </p>
              )}
            </div>
            {e.leaveRequests.length > 0 && (
              <ul className="divide-y">
                {e.leaveRequests.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      {r.leaveType.name} · {formatDate(r.startDate)} → {formatDate(r.endDate)}
                      <span className="text-xs text-muted-foreground"> ({toNumber(r.days)}d)</span>
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", LEAVE_STYLE[r.status])}>
                      {r.status.toLowerCase()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="mb-3 font-display text-lg font-bold tracking-tight">Documents</h2>
            <DocumentPanel
              entityType="EMPLOYEE"
              entityId={id}
              kinds={[
                { value: "PASSPORT", label: "Passport" },
                { value: "VISA", label: "Visa" },
                { value: "EMIRATES_ID", label: "Emirates ID" },
                { value: "LABOUR_CARD", label: "Labour card" },
                { value: "CONTRACT_PDF", label: "Contract" },
                { value: "GENERIC", label: "Other" },
              ]}
              documents={documents.map((doc) => ({
                id: doc.id, kind: doc.kind, fileName: doc.fileName,
                sizeBytes: doc.sizeBytes, expiryDate: doc.expiryDate, createdAt: doc.createdAt,
              }))}
            />
          </div>
        </div>
      </PageBody>
    </>
  );
}
