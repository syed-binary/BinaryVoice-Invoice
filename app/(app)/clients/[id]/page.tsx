import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Pencil,
  Plus,
  Mail,
  Phone,
  MapPin,
  Hash,
  Trash2,
  FileText,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getFieldDefs } from "@/lib/custom-fields";
import { deleteClient } from "@/lib/actions/clients";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/app/confirm-button";
import { InvoiceStatusPill, EstimateStatusPill } from "@/components/app/status-pill";
import { EmptyState } from "@/components/app/empty-state";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [client, fieldDefs] = await Promise.all([
    prisma.client.findUnique({
      where: { id },
      include: {
        invoices: { orderBy: { issueDate: "desc" } },
        estimates: { orderBy: { issueDate: "desc" } },
      },
    }),
    getFieldDefs("CLIENT"),
  ]);
  if (!client) notFound();

  const cf = (client.customFields as Record<string, unknown> | null) ?? {};
  const filledFields = fieldDefs.filter(
    (d) => cf[d.key] !== undefined && cf[d.key] !== null && cf[d.key] !== "",
  );

  return (
    <>
      <PageHeader title={client.displayName} description={client.companyName ?? undefined}>
        <Button variant="outline" render={<Link href={`/clients/${client.id}/edit`} />} className="gap-2">
          <Pencil className="size-4" /> Edit
        </Button>
        <Button render={<Link href={`/invoices/new?client=${client.id}`} />} className="gap-2">
          <Plus className="size-4" /> New invoice
        </Button>
      </PageHeader>

      <PageBody className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Contact</h3>
            <dl className="space-y-2.5 text-sm">
              {client.email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="size-4 text-muted-foreground" /> {client.email}
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="size-4 text-muted-foreground" /> {client.phone}
                </div>
              )}
              {client.trn && (
                <div className="flex items-center gap-2.5">
                  <Hash className="size-4 text-muted-foreground" /> TRN {client.trn}
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                  {client.currency}
                </span>
              </div>
            </dl>
          </div>

          {(client.billingAddress || client.shippingAddress) && (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Addresses</h3>
              <div className="space-y-3 text-sm">
                {client.billingAddress && (
                  <div>
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <MapPin className="size-3.5" /> Billing
                    </div>
                    <p className="whitespace-pre-line">{client.billingAddress}</p>
                  </div>
                )}
                {client.shippingAddress && (
                  <div>
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <MapPin className="size-3.5" /> Shipping
                    </div>
                    <p className="whitespace-pre-line">{client.shippingAddress}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {filledFields.length > 0 && (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Custom fields</h3>
              <dl className="space-y-2 text-sm">
                {filledFields.map((d) => (
                  <div key={d.id} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{d.label}</dt>
                    <dd className="font-medium">{String(cf[d.key])}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {client.notes && (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Notes</h3>
              <p className="whitespace-pre-line text-sm">{client.notes}</p>
            </div>
          )}

          <ConfirmButton
            trigger={
              <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive">
                <Trash2 className="size-4" /> Delete client
              </Button>
            }
            title="Delete this client?"
            description="If the client has invoices or estimates, it will be archived instead of permanently deleted."
            confirmLabel="Delete"
            action={deleteClient.bind(null, client.id)}
          />
        </div>

        {/* Main */}
        <div className="space-y-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold tracking-tight">Invoices</h2>
            </div>
            {client.invoices.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No invoices yet"
                description="Create an invoice for this client."
                className="py-10"
                action={
                  <Button render={<Link href={`/invoices/new?client=${client.id}`} />} className="gap-2">
                    <Plus className="size-4" /> New invoice
                  </Button>
                }
              />
            ) : (
              <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                {client.invoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-accent/40"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-medium">{inv.number}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(inv.issueDate)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular">
                        {formatMoney(inv.total, inv.currency)}
                      </span>
                      <InvoiceStatusPill status={inv.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {client.estimates.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-lg font-bold tracking-tight">Estimates</h2>
              <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                {client.estimates.map((est) => (
                  <Link
                    key={est.id}
                    href={`/estimates/${est.id}`}
                    className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-accent/40"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-medium">{est.number}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(est.issueDate)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular">
                        {formatMoney(est.total, est.currency)}
                      </span>
                      <EstimateStatusPill status={est.status} />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </PageBody>
    </>
  );
}
