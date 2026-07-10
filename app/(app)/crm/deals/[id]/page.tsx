import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { getTimeline, STAGE_LABEL } from "@/lib/crm";
import { toNumber, formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { DealActions } from "@/components/crm/deal-actions";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { EstimateStatusPill } from "@/components/app/status-pill";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STAGE_STYLE: Record<string, string> = {
  LEAD: "bg-muted text-muted-foreground",
  QUALIFIED: "bg-sky-500/15 text-sky-600",
  PROPOSAL: "bg-amber-500/15 text-amber-600",
  NEGOTIATION: "bg-violet-500/15 text-violet-600",
  WON: "bg-emerald-500/15 text-emerald-600",
  LOST: "bg-destructive/10 text-destructive",
};

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireCapability("clients:read");
  const { id } = await params;
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, displayName: true } },
      contact: { select: { name: true, email: true, phone: true, title: true } },
      estimate: {
        select: { id: true, number: true, status: true, total: true, currency: true, invoice: { select: { id: true, number: true, status: true } } },
      },
    },
  });
  if (!deal) notFound();

  const timeline = await getTimeline("DEAL", id, user);
  const owner = await prisma.user.findUnique({
    where: { id: deal.ownerId },
    select: { name: true },
  });

  return (
    <>
      <PageHeader
        title={deal.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {deal.client ? (
              <Link href={`/clients/${deal.client.id}`} className="hover:underline">
                {deal.client.displayName}
              </Link>
            ) : (
              <>
                {deal.prospectName}
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600">
                  prospect
                </span>
              </>
            )}
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STAGE_STYLE[deal.stage])}>
              {STAGE_LABEL[deal.stage]}
            </span>
          </span>
        }
      >
        <DealActions
          dealId={deal.id}
          stage={deal.stage}
          isProspect={!deal.clientId}
          clientId={deal.clientId}
          hasEstimate={!!deal.estimateId}
        />
      </PageHeader>

      <PageBody className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-display text-lg font-bold tracking-tight">Activity</h2>
          <ActivityTimeline entityType="DEAL" entityId={deal.id} activities={timeline} />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Value</dt>
                <dd className="font-semibold tabular">
                  {deal.value != null ? formatMoney(toNumber(deal.value), deal.currency) : "—"}
                </dd>
              </div>
              {deal.probability != null && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Probability</dt>
                  <dd>{deal.probability}%</dd>
                </div>
              )}
              {deal.expectedCloseDate && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Expected close</dt>
                  <dd>{formatDate(deal.expectedCloseDate)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Owner</dt>
                <dd>{owner?.name ?? "—"}</dd>
              </div>
              {deal.lostReason && (
                <div className="pt-1">
                  <dt className="text-xs text-muted-foreground">Lost reason</dt>
                  <dd className="text-sm">{deal.lostReason}</dd>
                </div>
              )}
            </dl>
          </div>

          {deal.contact && (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Contact</h3>
              <div className="text-sm font-medium">{deal.contact.name}</div>
              <div className="text-xs text-muted-foreground">
                {[deal.contact.title, deal.contact.email, deal.contact.phone]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </div>
          )}

          {deal.estimate && (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Paper trail</h3>
              <Link
                href={`/estimates/${deal.estimate.id}`}
                className="flex items-center justify-between text-sm hover:underline"
              >
                <span className="font-mono">{deal.estimate.number}</span>
                <span className="flex items-center gap-2">
                  <span className="tabular">
                    {formatMoney(deal.estimate.total, deal.estimate.currency)}
                  </span>
                  <EstimateStatusPill status={deal.estimate.status} />
                </span>
              </Link>
              {deal.estimate.invoice && (
                <Link
                  href={`/invoices/${deal.estimate.invoice.id}`}
                  className="mt-2 flex items-center justify-between text-sm hover:underline"
                >
                  <span className="font-mono">{deal.estimate.invoice.number}</span>
                  <span className="text-xs text-muted-foreground">invoice</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </PageBody>
    </>
  );
}
