"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createPayoutRun } from "@/lib/actions/contractors/payouts";
import { formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface SelectablePayable {
  id: string;
  internalNumber: string;
  contractorName: string;
  total: number;
  currency: string;
  baseTotal: number;
}

export function RunCreateForm({
  payables,
  baseCurrency,
}: {
  payables: SelectablePayable[];
  baseCurrency: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const totalBase = payables
    .filter((p) => selected.has(p.id))
    .reduce((s, p) => s + p.baseTotal, 0);

  function submit() {
    startTransition(async () => {
      const res = await createPayoutRun({
        name: name || null,
        payableIds: [...selected],
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Payout run created");
      router.push("/payouts");
      router.refresh();
    });
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="space-y-1.5">
        <Label>Run name (optional)</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='e.g. "July 2026 contractor payouts"'
          className="max-w-md"
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {payables.map((p) => (
          <label
            key={p.id}
            className="flex cursor-pointer items-center gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-accent/40"
          >
            <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
            <div className="min-w-0 flex-1">
              <div className="font-mono text-sm font-medium">{p.internalNumber}</div>
              <div className="text-xs text-muted-foreground">{p.contractorName}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold tabular">{formatMoney(p.total, p.currency)}</div>
              {p.currency !== baseCurrency && (
                <div className="text-xs text-muted-foreground tabular">
                  ≈ {formatMoney(p.baseTotal, baseCurrency)}
                </div>
              )}
            </div>
          </label>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 shadow-sm">
        <span className="text-sm text-muted-foreground">
          {selected.size} payable{selected.size === 1 ? "" : "s"} selected
        </span>
        <span className="font-semibold tabular">{formatMoney(totalBase, baseCurrency)}</span>
      </div>

      <Button onClick={submit} disabled={pending || selected.size === 0} className="gap-2">
        {pending && <Loader2 className="size-4 animate-spin" />}
        Create payout run
      </Button>
    </div>
  );
}
