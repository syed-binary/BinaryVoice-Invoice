import { PenLine, CheckCircle2, Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePortalContractor } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { CONTRACT_STYLE, CONTRACT_TYPE_LABEL } from "@/lib/contract-status";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PortalContractsPage() {
  const { contractor } = await requirePortalContractor();
  const contracts = await prisma.contract.findMany({
    where: { contractorId: contractor.id, status: { not: "DRAFT" } },
    include: { signatories: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">Your contracts</h1>
        <p className="text-sm text-muted-foreground">
          Agreements and offer letters between you and Binary Labs.
        </p>
      </div>

      {contracts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No contracts yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          {contracts.map((c) => {
            const mySignatory = c.signatories.find(
              (s) => s.email.toLowerCase() === contractor.email.toLowerCase(),
            );
            const needsSignature = mySignatory && !mySignatory.signedAt && c.status === "SENT";
            return (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{c.number}</span>
                    <span className="truncate text-sm">{c.title}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {CONTRACT_TYPE_LABEL[c.type]} · {formatDate(c.createdAt)}
                    {mySignatory?.signedAt && (
                      <span className="ml-1 inline-flex items-center gap-1 text-emerald-600">
                        <CheckCircle2 className="size-3" /> signed {formatDate(mySignatory.signedAt)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", CONTRACT_STYLE[c.status])}>
                    {c.status.toLowerCase()}
                  </span>
                  {needsSignature ? (
                    <Button size="sm" render={<a href={`/sign/${mySignatory.token}`} />} className="gap-1.5">
                      <PenLine className="size-3.5" /> Review & sign
                    </Button>
                  ) : mySignatory && !mySignatory.signedAt ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3.5" /> pending
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
