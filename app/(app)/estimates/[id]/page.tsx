import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCompany } from "@/lib/company";
import { getFieldDefs } from "@/lib/custom-fields";
import { buildEstimateDoc } from "@/lib/document-data";
import { toNumber, formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { InvoiceDocument } from "@/components/invoice/invoice-document";
import { EstimateActions } from "@/components/estimates/estimate-actions";
import { EstimateStatusPill } from "@/components/app/status-pill";

export const dynamic = "force-dynamic";

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [estimate, company, defs] = await Promise.all([
    prisma.estimate.findUnique({
      where: { id },
      include: { client: true, lineItems: true, invoice: { select: { id: true, number: true } } },
    }),
    getCompany(),
    getFieldDefs("INVOICE"),
  ]);
  if (!estimate) notFound();

  const data = buildEstimateDoc(estimate, company, defs);

  return (
    <>
      <PageHeader title={estimate.number} description={estimate.client.displayName}>
        <EstimateActions id={estimate.id} status={estimate.status} converted={!!estimate.invoice} />
      </PageHeader>

      <PageBody className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <div className="overflow-x-auto rounded-xl border bg-neutral-100 p-4 sm:p-6">
            <div className="origin-top scale-[0.62] sm:scale-75 md:scale-90 lg:scale-100">
              <InvoiceDocument data={data} templateId={estimate.templateId} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Link href="/estimates" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> All estimates
          </Link>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <EstimateStatusPill status={estimate.status} />
            </div>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total</dt>
                <dd className="font-semibold tabular">{formatMoney(toNumber(estimate.total), estimate.currency)}</dd>
              </div>
              {estimate.withholdingEnabled && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Net payable</dt>
                  <dd className="font-medium tabular">
                    {formatMoney(toNumber(estimate.netPayable) || toNumber(estimate.total), estimate.currency)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Date</dt>
                <dd>{formatDate(estimate.issueDate)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Valid until</dt>
                <dd>{formatDate(estimate.expiryDate)}</dd>
              </div>
            </dl>
          </div>

          {estimate.invoice && (
            <Link
              href={`/invoices/${estimate.invoice.id}`}
              className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm hover:border-primary/40"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                <FileText className="size-4" />
              </span>
              <div>
                <div className="text-sm font-medium">Converted to invoice</div>
                <div className="font-mono text-xs text-muted-foreground">{estimate.invoice.number}</div>
              </div>
            </Link>
          )}
        </div>
      </PageBody>
    </>
  );
}
