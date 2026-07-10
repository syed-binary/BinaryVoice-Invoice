"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DealStage } from "@prisma/client";
import { moveDealStage } from "@/lib/actions/crm/deals";
import { DEAL_STAGES, STAGE_LABEL } from "@/lib/crm";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface BoardDeal {
  id: string;
  name: string;
  stage: string;
  partyName: string;
  isProspect: boolean;
  value: number | null;
  currency: string;
  probability: number | null;
  expectedCloseDate: Date | null;
  hasEstimate: boolean;
}

const STAGE_ACCENT: Record<string, string> = {
  LEAD: "border-t-slate-400",
  QUALIFIED: "border-t-sky-500",
  PROPOSAL: "border-t-amber-500",
  NEGOTIATION: "border-t-violet-500",
  WON: "border-t-emerald-500",
  LOST: "border-t-red-400",
};

export function DealBoard({ deals }: { deals: BoardDeal[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function move(id: string, stage: DealStage) {
    startTransition(async () => {
      await moveDealStage(id, stage);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {DEAL_STAGES.map((stage, si) => {
        const items = deals.filter((d) => d.stage === stage);
        return (
          <div
            key={stage}
            className={cn(
              "w-64 shrink-0 rounded-xl border border-t-4 bg-muted/30",
              STAGE_ACCENT[stage],
            )}
          >
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-sm font-semibold">{STAGE_LABEL[stage]}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {items.length}
              </span>
            </div>
            <div className="space-y-2 px-2 pb-2">
              {items.map((d) => (
                <div key={d.id} className="rounded-lg border bg-card p-3 shadow-sm">
                  <Link href={`/crm/deals/${d.id}`} className="block hover:underline">
                    <div className="truncate text-sm font-medium">{d.name}</div>
                  </Link>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="truncate">{d.partyName}</span>
                    {d.isProspect && (
                      <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 text-[10px] font-medium text-amber-600">
                        prospect
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-semibold tabular">
                      {d.value != null ? formatMoney(d.value, d.currency) : "—"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {d.probability != null ? `${d.probability}%` : ""}
                      {d.hasEstimate ? " · EST" : ""}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between border-t pt-1.5">
                    <button
                      disabled={pending || si === 0}
                      onClick={() => move(d.id, DEAL_STAGES[si - 1] as DealStage)}
                      className="rounded p-0.5 text-muted-foreground hover:bg-accent disabled:opacity-30"
                      title="Move back"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      disabled={pending || si === DEAL_STAGES.length - 1}
                      onClick={() => move(d.id, DEAL_STAGES[si + 1] as DealStage)}
                      className="rounded p-0.5 text-muted-foreground hover:bg-accent disabled:opacity-30"
                      title="Move forward"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
