import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCompany } from "@/lib/company";
import { getFieldDefs } from "@/lib/custom-fields";
import { buildInvoiceDoc } from "@/lib/document-data";
import { toNumber, formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { InvoiceDocument } from "@/components/invoice/invoice-document";
import { InvoiceActions } from "@/components/invoices/invoice-actions";
import { InvoiceStatusPill } from "@/components/app/status-pill";
import { PaymentsPanel } from "@/components/invoices/payments-panel";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, company, defs] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        lineItems: true,
        payments: { orderBy: { date: "desc" } },
      },
    }),
    getCompany(),
    getFieldDefs("INVOICE"),
  ]);
  if (!invoice) notFound();

  const data = buildInvoiceDoc(invoice, company, defs);
  const total = toNumber(invoice.total);
  const withholding = toNumber(invoice.withholdingAmount);
  const net = toNumber(invoice.netPayable) || total;
  const paid = toNumber(invoice.amountPaid);
  const due = net - paid;

  return (
    <>
      <PageHeader title={invoice.number} description={invoice.client.displayName}>
        <InvoiceActions id={invoice.id} status={invoice.status} />
      </PageHeader>

      <PageBody className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Document viewer */}
        <div className="min-w-0">
          <div className="overflow-x-auto rounded-xl border bg-neutral-100 p-4 sm:p-6">
            <div className="origin-top scale-[0.62] sm:scale-75 md:scale-90 lg:scale-100 [transform-box:content-box]">
              <InvoiceDocument data={data} templateId={invoice.templateId} />
            </div>
          </div>
        </div>

        {/* Rail */}
        <div className="space-y-4">
          <Link
            href="/invoices"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> All invoices
          </Link>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <InvoiceStatusPill status={invoice.status} />
            </div>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Total</dt>
                <dd className="font-semibold tabular">{formatMoney(total, invoice.currency)}</dd>
              </div>
              {invoice.withholdingEnabled && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    Withholding ({toNumber(invoice.withholdingRate)}%) · over-and-above
                  </dt>
                  <dd className="tabular">{formatMoney(withholding, invoice.currency)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Paid</dt>
                <dd className="tabular">{formatMoney(paid, invoice.currency)}</dd>
              </div>
              <div className="flex justify-between border-t pt-2.5 text-base font-bold">
                <dt>Amount due</dt>
                <dd className="tabular">{formatMoney(due, invoice.currency)}</dd>
              </div>
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-4 text-xs text-muted-foreground">
              <div>
                <div className="text-[11px] uppercase tracking-wide">Issued</div>
                <div className="font-medium text-foreground">{formatDate(invoice.issueDate)}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide">Due</div>
                <div className="font-medium text-foreground">{formatDate(invoice.dueDate)}</div>
              </div>
            </div>
          </div>

          <PaymentsPanel
            invoiceId={invoice.id}
            currency={invoice.currency}
            amountDue={due}
            payments={invoice.payments.map((p) => ({
              id: p.id,
              amount: toNumber(p.amount),
              date: p.date.toISOString(),
              method: p.method,
              reference: p.reference,
            }))}
          />
        </div>
      </PageBody>
    </>
  );
}
