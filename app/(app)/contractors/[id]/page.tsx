import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Pencil,
  Plus,
  Mail,
  Phone,
  MapPin,
  Hash,
  Briefcase,
  Receipt,
  Trash2,
} from "lucide-react";
import { deleteContractor } from "@/lib/actions/contractors/contractors";
import { ConfirmButton } from "@/components/app/confirm-button";
import { getTimeline } from "@/lib/crm";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { PortalAccessButton } from "@/components/contractors/portal-access-button";
import { OnboardingLinkButton } from "@/components/contractors/onboarding-link-button";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { getCompany } from "@/lib/company";
import { getRate } from "@/lib/fx";
import { margin } from "@/lib/contractors/margin";
import { toNumber, formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import { DocumentPanel } from "@/components/documents/document-panel";
import { EngagementRowActions } from "@/components/contractors/engagement-row-actions";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  ONBOARDING: "bg-amber-500/15 text-amber-600",
  ACTIVE: "bg-emerald-500/15 text-emerald-600",
  INACTIVE: "bg-muted text-muted-foreground",
};

const PAYABLE_STYLE: Record<string, string> = {
  RECEIVED: "bg-amber-500/15 text-amber-600",
  APPROVED: "bg-sky-500/15 text-sky-600",
  SCHEDULED: "bg-violet-500/15 text-violet-600",
  PAID: "bg-emerald-500/15 text-emerald-600",
  REJECTED: "bg-destructive/10 text-destructive",
};

const IR35_LABEL: Record<string, string> = {
  INSIDE: "IR35: inside",
  OUTSIDE: "IR35: outside",
  UNDETERMINED: "IR35: undetermined",
};

export default async function ContractorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireCapability("contractors:read");
  const { id } = await params;

  const [contractor, company] = await Promise.all([
    prisma.contractor.findUnique({
      where: { id },
      include: {
        engagements: {
          orderBy: { startDate: "desc" },
          include: { client: { select: { displayName: true } } },
        },
        payables: { orderBy: { issueDate: "desc" }, take: 8 },
      },
    }),
    getCompany(),
  ]);
  if (!contractor) notFound();

  const [documents, timeline] = await Promise.all([
    prisma.document.findMany({
      where: { entityType: "CONTRACTOR", entityId: id, archived: false },
      orderBy: { createdAt: "desc" },
    }),
    getTimeline("CONTRACTOR", id, user),
  ]);

  // Rate-card margin per engagement, in base currency (actual billed-vs-paid
  // margin lands once invoice lines are linked to engagements).
  const base = company.baseCurrency;
  const engagementMargins = await Promise.all(
    contractor.engagements.map(async (e) => {
      if (e.billRate == null) return null;
      const costFx = await getRate(e.costCurrency, base);
      const billFx = await getRate(e.billCurrency ?? e.costCurrency, base);
      if (costFx === null || billFx === null) return null;
      return margin(toNumber(e.costRate) * costFx, toNumber(e.billRate) * billFx);
    }),
  );

  return (
    <>
      <PageHeader
        title={contractor.name}
        description={`${contractor.country}${contractor.entityName ? ` · ${contractor.entityName}` : ""}`}
      >
        <Button variant="outline" render={<Link href={`/contractors/${id}/edit`} />} className="gap-2">
          <Pencil className="size-4" /> Edit
        </Button>
        <Button render={<Link href={`/payables/new?contractor=${id}`} />} className="gap-2">
          <Plus className="size-4" /> New payable
        </Button>
      </PageHeader>

      <PageBody className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">Profile</h3>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLE[contractor.status])}>
                {contractor.status.toLowerCase()}
              </span>
            </div>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2.5">
                <Mail className="size-4 text-muted-foreground" /> {contractor.email}
              </div>
              {contractor.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="size-4 text-muted-foreground" /> {contractor.phone}
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <MapPin className="size-4 text-muted-foreground" /> {contractor.country}
                {contractor.taxResidency && contractor.taxResidency !== contractor.country && (
                  <span className="text-xs text-muted-foreground">(tax: {contractor.taxResidency})</span>
                )}
              </div>
              {contractor.taxId && (
                <div className="flex items-center gap-2.5">
                  <Hash className="size-4 text-muted-foreground" /> {contractor.taxId}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{contractor.currency}</span>
                {contractor.defaultCostRate != null && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {formatMoney(contractor.defaultCostRate, contractor.currency)}/{contractor.defaultRateUnit.toLowerCase()}
                  </span>
                )}
                {contractor.payoutMethod && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                    {contractor.payoutMethod.toLowerCase()}
                  </span>
                )}
              </div>
            </dl>
          </div>

          {contractor.notes && (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Notes</h3>
              <p className="whitespace-pre-line text-sm">{contractor.notes}</p>
            </div>
          )}

          {contractor.status === "ONBOARDING" && (
            <OnboardingLinkButton contractorId={id} />
          )}
          <PortalAccessButton
            contractorId={id}
            hasAccess={!!contractor.userId}
            email={contractor.email}
          />

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Activity</h3>
            <ActivityTimeline entityType="CONTRACTOR" entityId={id} activities={timeline} />
          </div>

          <ConfirmButton
            trigger={
              <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive">
                <Trash2 className="size-4" /> Delete contractor
              </Button>
            }
            title="Delete this contractor?"
            description="If the contractor has engagements, payables, payouts or contracts, the record is archived instead of permanently deleted."
            action={deleteContractor.bind(null, id)}
          />
        </div>

        {/* Main */}
        <div className="space-y-6">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold tracking-tight">Engagements</h2>
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/contractors/${id}/engagements/new`} />}
                className="gap-1.5"
              >
                <Plus className="size-4" /> Add engagement
              </Button>
            </div>
            {contractor.engagements.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No engagements yet"
                description="Add an engagement to track rates, margin and IR35 status."
                className="py-10"
              />
            ) : (
              <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                {contractor.engagements.map((e, i) => {
                  const m = engagementMargins[i];
                  return (
                    <div
                      key={e.id}
                      className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">{e.title}</span>
                          {e.status === "ENDED" && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                              ended
                            </span>
                          )}
                          {e.ir35Status !== "NOT_APPLICABLE" && (
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                                e.ir35Status === "OUTSIDE"
                                  ? "bg-emerald-500/15 text-emerald-600"
                                  : e.ir35Status === "INSIDE"
                                    ? "bg-destructive/10 text-destructive"
                                    : "bg-amber-500/15 text-amber-600",
                              )}
                            >
                              {IR35_LABEL[e.ir35Status]}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {e.client?.displayName ?? "Internal"} · {formatDate(e.startDate)}
                          {e.endDate ? ` → ${formatDate(e.endDate)}` : " → ongoing"}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-xs">
                          <div className="font-medium tabular">
                            cost {formatMoney(e.costRate, e.costCurrency)}/{e.rateUnit.toLowerCase()}
                          </div>
                          {e.billRate != null && (
                            <div className="text-muted-foreground tabular">
                              bill {formatMoney(e.billRate, e.billCurrency ?? e.costCurrency)}/{e.rateUnit.toLowerCase()}
                            </div>
                          )}
                        </div>
                        {m && m.pct !== null && (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-semibold tabular",
                              m.pct >= 30
                                ? "bg-emerald-500/15 text-emerald-600"
                                : m.pct >= 0
                                  ? "bg-amber-500/15 text-amber-600"
                                  : "bg-destructive/10 text-destructive",
                            )}
                          >
                            {m.pct}%
                          </span>
                        )}
                        <EngagementRowActions
                          engagementId={e.id}
                          contractorId={id}
                          status={e.status}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 font-display text-lg font-bold tracking-tight">Compliance documents</h2>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <DocumentPanel
                entityType="CONTRACTOR"
                entityId={id}
                documents={documents.map((d) => ({
                  id: d.id,
                  kind: d.kind,
                  fileName: d.fileName,
                  sizeBytes: d.sizeBytes,
                  expiryDate: d.expiryDate,
                  createdAt: d.createdAt,
                }))}
              />
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-display text-lg font-bold tracking-tight">Recent payables</h2>
            {contractor.payables.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No payables yet"
                description="Record the contractor's invoices as payables."
                className="py-10"
              />
            ) : (
              <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                {contractor.payables.map((p) => (
                  <Link
                    key={p.id}
                    href={`/payables/${p.id}`}
                    className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-accent/40"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-medium">{p.internalNumber}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(p.issueDate)}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold tabular">
                        {formatMoney(p.total, p.currency)}
                      </span>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", PAYABLE_STYLE[p.status])}>
                        {p.status.toLowerCase()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </PageBody>
    </>
  );
}
