import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { gratuityAccrual } from "@/lib/payroll/gratuity";
import { toNumber, formatMoney, round2 } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PageHeader, PageBody } from "@/components/app/page-header";

export const dynamic = "force-dynamic";

export default async function GratuityPage() {
  await requireCapability("payroll:read");
  const employees = await prisma.employee.findMany({
    where: { archived: false, terminationDate: null },
    include: { compensation: { orderBy: { effectiveDate: "desc" }, take: 1 } },
    orderBy: { joinDate: "asc" },
  });

  const now = new Date();
  const rows = employees
    .filter((e) => e.compensation.length > 0)
    .map((e) => {
      const basic = toNumber(e.compensation[0].basicSalary);
      const g = gratuityAccrual(e.joinDate, now, basic);
      return { e, basic, ...g };
    });
  const total = round2(rows.reduce((s, r) => s + r.accrued, 0));

  return (
    <>
      <PageHeader
        title="Gratuity liability"
        description={`End-of-service accrual (post-2022 rules) · total ${formatMoney(total, "AED")} — indicative, confirm terminations with your accountant.`}
      />
      <PageBody>
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Employee</th>
                <th className="px-4 py-2.5 font-medium">Joined</th>
                <th className="px-4 py-2.5 text-right font-medium">Service (yrs)</th>
                <th className="px-4 py-2.5 text-right font-medium">Basic (mo)</th>
                <th className="px-4 py-2.5 text-right font-medium">Accrued</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.e.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3">
                    <Link href={`/hr/employees/${r.e.id}`} className="font-medium hover:underline">{r.e.name}</Link>
                  </td>
                  <td className="px-4 py-3">{formatDate(r.e.joinDate)}</td>
                  <td className="px-4 py-3 text-right tabular">{r.serviceYears.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right tabular">{formatMoney(r.basic, "AED")}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular">{formatMoney(r.accrued, "AED")}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No employees with compensation records.</td></tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t bg-muted/30 font-semibold">
                  <td colSpan={4} className="px-4 py-3 text-right">Total liability</td>
                  <td className="px-4 py-3 text-right tabular">{formatMoney(total, "AED")}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </PageBody>
    </>
  );
}
