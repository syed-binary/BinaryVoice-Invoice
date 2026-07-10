import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { getCompany } from "@/lib/company";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { PayableActions } from "@/components/payables/payable-actions";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PAYABLE_STYLE: Record<string, string> = {
  RECEIVED: "bg-amber-500/15 text-amber-600",
  APPROVED: "bg-sky-500/15 text-sky-600",
  SCHEDULED: "bg-violet-500/15 text-violet-600",
  PAID: "bg-emerald-500/15 text-emerald-600",
  REJECTED: "bg-destructive/10 text-destructive",
};

export default async function PayableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability("contractors:read");
  const { id } = await params;
  const [payable, company] = await Promise.all([
    prisma.contractorInvoice.findUnique({
      where: { id },
      include: {
        contractor: { select: { id: true, name: true, payoutMethod: true } },
        engagement: { select: { title: true } },
        lines: { orderBy: { sortOrder: "asc" } },
        payout: true,
      },
    }),
    getCompany(),
  ]);
  if (!payable) notFound();

  const sourceDoc = payable.sourceDocumentId
    ? await prisma.document.findUnique({ where: { id: payable.sourceDocumentId } })
    : null;

  return (
    <>
      <PageHeader
        title={payable.internalNumber}
        description={
          <span className="flex items-center gap-2">
            <Link href={`/contractors/${payable.contractor.id}`} className="hover:underline">
              {payable.contractor.name}
            </Link>
            {payable.engagement && <>· {payable.engagement.title}</>}
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", PAYABLE_STYLE[payable.status])}>
              {payable.status.toLowerCase()}
            </span>
          </span>
        }
      >
        <PayableActions payableId={payable.id} status={payable.status} />
      </PageHeader>

      <PageBody className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Description</th>
                  <th className="px-4 py-2.5 text-right font-medium">Qty</th>
                  <th className="px-4 py-2.5 text-right font-medium">Rate</th>
                  <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payable.lines.map((l) => (
                  <tr key={l.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">{l.description}</td>
                    <td className="px-4 py-3 text-right tabular">
                      {Number(l.quantity)} {l.unit ?? ""}
                    </td>
                    <td className="px-4 py-3 text-right tabular">{formatMoney(l.unitPrice, payable.currency)}</td>
                    <td className="px-4 py-3 text-right font-medium tabular">
                      {formatMoney(l.lineTotal, payable.currency)}
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
                    {formatMoney(payable.total, payable.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {payable.notes && (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Notes</h3>
              <p className="whitespace-pre-line text-sm">{payable.notes}</p>
            </div>
          )}
          {payable.rejectedReason && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
              <h3 className="mb-2 text-sm font-semibold text-destructive">Rejection reason</h3>
              <p className="whitespace-pre-line text-sm">{payable.rejectedReason}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Issued</dt>
                <dd>{formatDate(payable.issueDate)}</dd>
              </div>
              {payable.dueDate && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Due</dt>
                  <dd>{formatDate(payable.dueDate)}</dd>
                </div>
              )}
              {payable.periodStart && payable.periodEnd && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Period</dt>
                  <dd>
                    {formatDate(payable.periodStart)} – {formatDate(payable.periodEnd)}
                  </dd>
                </div>
              )}
              {payable.contractorRef && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Their ref</dt>
                  <dd className="font-mono">{payable.contractorRef}</dd>
                </div>
              )}
              {payable.currency !== company.baseCurrency && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">FX rate</dt>
                    <dd className="tabular">{Number(payable.fxRate)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">≈ {company.baseCurrency}</dt>
                    <dd className="font-medium tabular">
                      {formatMoney(payable.baseTotal, company.baseCurrency)}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          {payable.payout && (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Payout</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Paid</dt>
                  <dd>{payable.payout.paidDate ? formatDate(payable.payout.paidDate) : "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Amount</dt>
                  <dd className="font-medium tabular">
                    {formatMoney(payable.payout.amount, payable.payout.currency)}
                  </dd>
                </div>
                {payable.payout.feeAmount != null && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Fee</dt>
                    <dd className="tabular">
                      {formatMoney(payable.payout.feeAmount, payable.payout.currency)}
                    </dd>
                  </div>
                )}
                {payable.payout.reference && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Reference</dt>
                    <dd className="font-mono text-xs">{payable.payout.reference}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {sourceDoc && (
            <a
              href={`/api/files/${sourceDoc.id}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border bg-card p-4 text-sm font-medium shadow-sm hover:bg-accent/40"
            >
              <FileText className="size-4 text-muted-foreground" />
              {sourceDoc.fileName}
            </a>
          )}
        </div>
      </PageBody>
    </>
  );
}
