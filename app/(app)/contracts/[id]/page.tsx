import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, PenLine, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { contractHtml } from "@/lib/contracts/markdown";
import { formatDate, formatDateLong } from "@/lib/format";
import { CONTRACT_STYLE, CONTRACT_TYPE_LABEL } from "@/lib/contract-status";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { ContractActions } from "@/components/contracts/contract-actions";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability("contracts:read");
  const { id } = await params;
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      contractor: { select: { id: true, name: true, email: true } },
      client: { select: { id: true, displayName: true, email: true } },
      parent: { select: { id: true, number: true, title: true } },
      children: { select: { id: true, number: true, title: true } },
      signatories: { orderBy: { order: "asc" } },
      versions: { orderBy: { version: "desc" }, select: { version: true, changeNote: true, createdAt: true } },
      engagements: { select: { id: true, title: true, contractorId: true } },
    },
  });
  if (!contract) notFound();

  const counterparty = contract.contractor ?? null;
  const defaultSignatory = counterparty
    ? { name: counterparty.name, email: counterparty.email ?? "" }
    : contract.client?.email
      ? { name: contract.client.displayName, email: contract.client.email }
      : null;

  return (
    <>
      <PageHeader
        title={contract.number}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {contract.title}
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", CONTRACT_STYLE[contract.status])}>
              {contract.status.toLowerCase()}
            </span>
            <span className="text-xs">{CONTRACT_TYPE_LABEL[contract.type]}</span>
          </span>
        }
      >
        <ContractActions
          contractId={contract.id}
          status={contract.status}
          defaultSignatory={defaultSignatory}
        />
      </PageHeader>

      <PageBody className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-10">
          {contract.body.includes("[missing:") && contract.status === "DRAFT" && (
            <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-700">
              This draft has unresolved <code>[missing: …]</code> fields — edit before sending.
            </div>
          )}
          <div
            className="prose prose-sm max-w-none [&_h1]:font-display [&_table]:text-sm"
            dangerouslySetInnerHTML={{
              __html: contractHtml(contract.bodySnapshot ?? contract.body),
            }}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Counterparty</dt>
                <dd>
                  {contract.contractor ? (
                    <Link href={`/contractors/${contract.contractor.id}`} className="font-medium hover:underline">
                      {contract.contractor.name}
                    </Link>
                  ) : contract.client ? (
                    <Link href={`/clients/${contract.client.id}`} className="font-medium hover:underline">
                      {contract.client.displayName}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              {contract.effectiveDate && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Effective</dt>
                  <dd>{formatDate(contract.effectiveDate)}</dd>
                </div>
              )}
              {contract.endDate && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Ends</dt>
                  <dd>{formatDate(contract.endDate)}</dd>
                </div>
              )}
              {contract.noticePeriodDays != null && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Notice</dt>
                  <dd>{contract.noticePeriodDays} days</dd>
                </div>
              )}
              {contract.parent && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Parent</dt>
                  <dd>
                    <Link href={`/contracts/${contract.parent.id}`} className="font-mono text-xs hover:underline">
                      {contract.parent.number}
                    </Link>
                  </dd>
                </div>
              )}
              {contract.bodyHash && (
                <div className="pt-1">
                  <dt className="text-xs text-muted-foreground">SHA-256</dt>
                  <dd className="break-all font-mono text-[10px] text-muted-foreground">
                    {contract.bodyHash}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {contract.signatories.length > 0 && (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Signatories</h3>
              <ul className="space-y-3">
                {contract.signatories.map((s) => (
                  <li key={s.id} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{s.name}</span>
                      {s.signedAt ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600">
                          <PenLine className="size-3.5" /> signed {formatDate(s.signedAt)}
                        </span>
                      ) : s.viewedAt ? (
                        <span className="flex items-center gap-1 text-xs text-amber-600">
                          <Eye className="size-3.5" /> viewed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3.5" /> pending
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.email}</div>
                    {!s.signedAt && contract.status === "SENT" && (
                      <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                        /sign/{s.token}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {contract.engagements.length > 0 && (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Covers engagements</h3>
              <ul className="space-y-1.5 text-sm">
                {contract.engagements.map((e) => (
                  <li key={e.id}>
                    <Link href={`/contractors/${e.contractorId}`} className="hover:underline">
                      {e.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {contract.versions.length > 0 && (
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Versions</h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {contract.versions.map((v) => (
                  <li key={v.version}>
                    v{v.version} · {formatDateLong(v.createdAt)}
                    {v.changeNote ? ` — ${v.changeNote}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </PageBody>
    </>
  );
}
