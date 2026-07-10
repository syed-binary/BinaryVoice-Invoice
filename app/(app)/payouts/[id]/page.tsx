import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { getCompany } from "@/lib/company";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { RunActions } from "@/components/payouts/run-actions";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const RUN_STYLE: Record<string, string> = {
  DRAFT: "bg-amber-500/15 text-amber-600",
  APPROVED: "bg-sky-500/15 text-sky-600",
  PAID: "bg-emerald-500/15 text-emerald-600",
};

export default async function PayoutRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability("contractors:read");
  const { id } = await params;
  const [run, company] = await Promise.all([
    prisma.payoutRun.findUnique({
      where: { id },
      include: {
        payouts: {
          include: {
            contractor: { select: { id: true, name: true } },
            contractorInvoice: { select: { id: true, internalNumber: true } },
          },
        },
      },
    }),
    getCompany(),
  ]);
  if (!run) notFound();

  return (
    <>
      <PageHeader
        title={run.number}
        description={
          <span className="flex items-center gap-2">
            {run.name ?? "Payout run"}
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", RUN_STYLE[run.status])}>
              {run.status.toLowerCase()}
            </span>
            {run.paidDate && <>· paid {formatDate(run.paidDate)}</>}
          </span>
        }
      >
        <RunActions runId={run.id} status={run.status} />
      </PageHeader>

      <PageBody className="space-y-5">
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Contractor</th>
                <th className="px-4 py-2.5 font-medium">Payable</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="px-4 py-2.5 text-right font-medium">≈ {company.baseCurrency}</th>
              </tr>
            </thead>
            <tbody>
              {run.payouts.map((p) => (
                <tr key={p.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3">
                    <Link href={`/contractors/${p.contractor.id}`} className="font-medium hover:underline">
                      {p.contractor.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {p.contractorInvoice ? (
                      <Link
                        href={`/payables/${p.contractorInvoice.id}`}
                        className="font-mono text-xs hover:underline"
                      >
                        {p.contractorInvoice.internalNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular">{formatMoney(p.amount, p.currency)}</td>
                  <td className="px-4 py-3 text-right font-medium tabular">
                    {formatMoney(p.baseAmount, company.baseCurrency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t bg-muted/30">
                <td colSpan={3} className="px-4 py-3 text-right font-semibold">
                  Total
                </td>
                <td className="px-4 py-3 text-right font-bold tabular">
                  {formatMoney(run.totalBase, company.baseCurrency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {(run.method || run.reference) && (
          <div className="rounded-xl border bg-card p-5 text-sm shadow-sm">
            {run.method && (
              <div>
                <span className="text-muted-foreground">Method:</span> {run.method}
              </div>
            )}
            {run.reference && (
              <div>
                <span className="text-muted-foreground">Reference:</span>{" "}
                <span className="font-mono">{run.reference}</span>
              </div>
            )}
          </div>
        )}
      </PageBody>
    </>
  );
}
