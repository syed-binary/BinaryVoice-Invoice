import { prisma } from "@/lib/prisma";
import { getCompany } from "@/lib/company";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { Logo } from "@/components/brand/logo";
import { EstimateRespond } from "@/components/estimates/estimate-respond";
import { CheckCircle2, ShieldX, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

/** Public estimate view — token-authed, accept/decline without login. */
export default async function PublicEstimatePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [estimate, company] = await Promise.all([
    prisma.estimate.findUnique({
      where: { publicToken: token },
      include: {
        client: { select: { displayName: true } },
        lineItems: { orderBy: { sortOrder: "asc" } },
      },
    }),
    getCompany(),
  ]);

  if (!estimate) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <ShieldX className="size-10 text-destructive" />
        <h1 className="font-display text-xl font-semibold">Invalid link</h1>
        <p className="text-sm text-muted-foreground">
          This estimate link is not valid. Contact the sender for a new one.
        </p>
      </div>
    );
  }

  const open =
    (estimate.status === "SENT" || estimate.status === "DRAFT") &&
    (!estimate.expiryDate || estimate.expiryDate >= new Date());

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8">
      <div className="mb-6 flex items-center justify-between">
        <Logo />
        <span className="font-mono text-xs text-muted-foreground">{estimate.number}</span>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <h1 className="font-display text-xl font-semibold tracking-tight">
            Estimate for {estimate.client.displayName}
          </h1>
          <p className="text-sm text-muted-foreground">
            From {company.tradeName ?? company.legalName} · issued {formatDate(estimate.issueDate)}
            {estimate.expiryDate && <> · valid until {formatDate(estimate.expiryDate)}</>}
          </p>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Rate</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {estimate.lineItems.map((l) => (
              <tr key={l.id} className="border-b last:border-b-0">
                <td className="py-2.5">{l.description}</td>
                <td className="py-2.5 text-right tabular">
                  {Number(l.quantity)} {l.unit ?? ""}
                </td>
                <td className="py-2.5 text-right tabular">{formatMoney(l.unitPrice, estimate.currency)}</td>
                <td className="py-2.5 text-right font-medium tabular">
                  {formatMoney(l.lineTotal, estimate.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-4 ml-auto max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular">{formatMoney(estimate.subtotal, estimate.currency)}</dd>
          </div>
          {Number(estimate.discountAmount) > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Discount</dt>
              <dd className="tabular">−{formatMoney(estimate.discountAmount, estimate.currency)}</dd>
            </div>
          )}
          {estimate.vatEnabled && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">VAT {Number(estimate.vatRate)}%</dt>
              <dd className="tabular">{formatMoney(estimate.vatAmount, estimate.currency)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t pt-1.5 text-base font-bold">
            <dt>Total</dt>
            <dd className="tabular">{formatMoney(estimate.total, estimate.currency)}</dd>
          </div>
        </dl>

        {estimate.notes && (
          <p className="mt-6 whitespace-pre-line border-t pt-4 text-sm text-muted-foreground">
            {estimate.notes}
          </p>
        )}
      </div>

      <div className="mt-6 rounded-xl border bg-card p-6 shadow-sm">
        {estimate.status === "ACCEPTED" || estimate.status === "CONVERTED" ? (
          <div className="flex items-center gap-3 text-emerald-600">
            <CheckCircle2 className="size-6" />
            <span className="font-semibold">Estimate accepted — thank you!</span>
          </div>
        ) : estimate.status === "DECLINED" ? (
          <div className="flex items-center gap-3 text-muted-foreground">
            <XCircle className="size-6" />
            <span className="font-semibold">Estimate declined.</span>
          </div>
        ) : !open ? (
          <p className="text-sm text-muted-foreground">
            This estimate has expired — please request a refreshed quote.
          </p>
        ) : (
          <EstimateRespond token={token} />
        )}
      </div>
    </div>
  );
}
