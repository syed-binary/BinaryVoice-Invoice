import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { toNumber, formatMoney } from "@/lib/money";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { RunActions, AdjustmentControls } from "@/components/payroll/run-widgets";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const RUN_STYLE: Record<string, string> = {
  DRAFT: "bg-amber-500/15 text-amber-600",
  APPROVED: "bg-sky-500/15 text-sky-600",
  PAID: "bg-emerald-500/15 text-emerald-600",
};

export default async function PayrollRunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability("payroll:read");
  const { id } = await params;
  const run = await prisma.payrollRun.findUnique({
    where: { id },
    include: {
      payslips: {
        include: { employee: { select: { id: true, name: true, employeeNo: true } }, lines: true },
        orderBy: { employee: { name: "asc" } },
      },
    },
  });
  if (!run) notFound();
  const month = new Date(2026, run.periodMonth - 1, 1).toLocaleString("en", { month: "long" });
  const editable = run.status === "DRAFT";

  return (
    <>
      <PageHeader
        title={run.number}
        description={
          <span className="flex items-center gap-2">
            {month} {run.periodYear} · {run.payslips.length} payslips
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", RUN_STYLE[run.status])}>
              {run.status.toLowerCase()}
            </span>
          </span>
        }
      >
        <RunActions runId={run.id} status={run.status} />
      </PageHeader>

      <PageBody className="space-y-5">
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Employee</th>
                <th className="px-4 py-2.5 text-right font-medium">Basic</th>
                <th className="px-4 py-2.5 text-right font-medium">Allowances</th>
                <th className="px-4 py-2.5 font-medium">Adjustments</th>
                <th className="px-4 py-2.5 text-right font-medium">Gross</th>
                <th className="px-4 py-2.5 text-right font-medium">Deductions</th>
                <th className="px-4 py-2.5 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {run.payslips.map((p) => (
                <tr key={p.id} className="border-b align-top last:border-b-0">
                  <td className="px-4 py-3">
                    <Link href={`/hr/employees/${p.employee.id}`} className="font-medium hover:underline">
                      {p.employee.name}
                    </Link>
                    <div className="font-mono text-xs text-muted-foreground">{p.employee.employeeNo}</div>
                  </td>
                  <td className="px-4 py-3 text-right tabular">{formatMoney(p.basicSalary, run.currency)}</td>
                  <td className="px-4 py-3 text-right tabular">
                    {formatMoney(
                      toNumber(p.housingAllowance) + toNumber(p.transportAllowance) + toNumber(p.otherAllowances),
                      run.currency,
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <AdjustmentControls
                      payslipId={p.id}
                      editable={editable}
                      lines={p.lines.map((l) => ({ id: l.id, type: l.type, label: l.label, amount: toNumber(l.amount) }))}
                    />
                  </td>
                  <td className="px-4 py-3 text-right tabular">{formatMoney(p.gross, run.currency)}</td>
                  <td className="px-4 py-3 text-right tabular">{formatMoney(p.totalDeductions, run.currency)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular">{formatMoney(p.net, run.currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/30 font-semibold">
                <td colSpan={4} className="px-4 py-3 text-right">Totals</td>
                <td className="px-4 py-3 text-right tabular">{formatMoney(run.totalGross, run.currency)}</td>
                <td className="px-4 py-3 text-right tabular">{formatMoney(run.totalDeductions, run.currency)}</td>
                <td className="px-4 py-3 text-right tabular">{formatMoney(run.totalNet, run.currency)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          WPS SIF requires each employee&apos;s MOL ID, agent routing code and IBAN
          (employee → Bank &amp; WPS section). Validate the generated file with your
          bank&apos;s test upload before first live submission.
        </p>
      </PageBody>
    </>
  );
}
