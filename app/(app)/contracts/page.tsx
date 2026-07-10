import Link from "next/link";
import { Plus, FileSignature, BookText, Scale } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { ContractStatus, Prisma } from "@prisma/client";
import { requireCapability } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { CONTRACT_STYLE, CONTRACT_TYPE_LABEL } from "@/lib/contract-status";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FILTERS = ["", "DRAFT", "SENT", "SIGNED", "ACTIVE", "EXPIRED", "TERMINATED"];

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireCapability("contracts:read");
  const { status } = await searchParams;

  const where: Prisma.ContractWhereInput = status
    ? { status: status as ContractStatus }
    : {};
  const contracts = await prisma.contract.findMany({
    where,
    include: {
      contractor: { select: { name: true } },
      client: { select: { displayName: true } },
      signatories: { select: { signedAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader title="Contracts" description="Offer letters, agreements, MSAs and SOWs — with e-sign.">
        <Button variant="outline" render={<Link href="/contracts/clauses" />} className="gap-2">
          <Scale className="size-4" /> Clauses
        </Button>
        <Button variant="outline" render={<Link href="/contracts/templates" />} className="gap-2">
          <BookText className="size-4" /> Templates
        </Button>
        <Button render={<Link href="/contracts/new" />} className="gap-2">
          <Plus className="size-4" /> New contract
        </Button>
      </PageHeader>

      <PageBody className="space-y-5">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((s) => (
            <Link
              key={s}
              href={s ? `/contracts?status=${s}` : "/contracts"}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                (status ?? "") === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {s ? s.charAt(0) + s.slice(1).toLowerCase() : "All"}
            </Link>
          ))}
        </div>

        {contracts.length === 0 ? (
          <EmptyState
            icon={FileSignature}
            title="No contracts"
            description="Generate an offer letter or agreement from a template."
            action={
              <Button render={<Link href="/contracts/new" />} className="gap-2">
                <Plus className="size-4" /> New contract
              </Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            {contracts.map((c) => {
              const signed = c.signatories.filter((s) => s.signedAt).length;
              return (
                <Link
                  key={c.id}
                  href={`/contracts/${c.id}`}
                  className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-accent/40"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{c.number}</span>
                      <span className="truncate text-sm">{c.title}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {CONTRACT_TYPE_LABEL[c.type]} ·{" "}
                      {c.contractor?.name ?? c.client?.displayName ?? "—"}
                      {c.endDate ? ` · ends ${formatDate(c.endDate)}` : ""}
                      {c.signatories.length > 0
                        ? ` · ${signed}/${c.signatories.length} signed`
                        : ""}
                    </div>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", CONTRACT_STYLE[c.status])}>
                    {c.status.toLowerCase()}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </PageBody>
    </>
  );
}
