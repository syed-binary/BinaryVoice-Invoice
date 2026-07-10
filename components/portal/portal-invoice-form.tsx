"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Send, Trash2 } from "lucide-react";
import { submitPortalInvoice, type PortalInvoiceInput } from "@/lib/actions/portal";
import { calculatePayableTotals } from "@/lib/contractors/payable-calc";
import { formatMoney } from "@/lib/money";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "@/components/ui/simple-select";

type Line = { key: string; description: string; quantity: number; unitPrice: number; unit: string | null };
let counter = 0;
const uid = () => `pl${counter++}`;

export function PortalInvoiceForm({
  currency,
  engagements,
}: {
  currency: string;
  engagements: { value: string; label: string; rate: number; unit: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [engagementId, setEngagementId] = useState("");
  const [contractorRef, setContractorRef] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { key: uid(), description: "", quantity: 1, unitPrice: 0, unit: null },
  ]);

  const totals = useMemo(
    () => calculatePayableTotals(lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice }))),
    [lines],
  );

  function pickEngagement(v: string) {
    setEngagementId(v);
    const e = engagements.find((x) => x.value === v);
    if (e && lines.length === 1 && !lines[0].description) {
      setLines([
        { key: uid(), description: e.label, quantity: 1, unitPrice: e.rate, unit: e.unit.toLowerCase() },
      ]);
    }
  }

  const updateLine = (key: string, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  function submit() {
    const payload: PortalInvoiceInput = {
      engagementId: engagementId || null,
      contractorRef: contractorRef || null,
      periodStart: periodStart || null,
      periodEnd: periodEnd || null,
      notes: notes || null,
      lines: lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        unit: l.unit,
      })),
    };
    startTransition(async () => {
      const res = await submitPortalInvoice(payload);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Invoice submitted as ${res.internalNumber} — you'll hear back after review.`);
      router.push("/portal");
      router.refresh();
    });
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-2">
          {engagements.length > 0 && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Engagement</Label>
              <SimpleSelect
                value={engagementId}
                onValueChange={pickEngagement}
                options={[{ value: "", label: "None / other work" }, ...engagements]}
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Your invoice number</Label>
            <Input value={contractorRef} onChange={(e) => setContractorRef(e.target.value)} placeholder="e.g. INV-042" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Period from</Label>
              <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>to</Label>
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-5 py-3">
          <h3 className="font-display text-sm font-semibold">Lines ({currency})</h3>
        </div>
        <div className="divide-y">
          {lines.map((line) => (
            <div key={line.key} className="grid grid-cols-2 gap-2 px-5 py-3 sm:grid-cols-[1fr_70px_110px_110px_32px] sm:items-center">
              <div className="col-span-2 sm:col-span-1">
                <Input
                  value={line.description}
                  onChange={(e) => updateLine(line.key, { description: e.target.value })}
                  placeholder="e.g. July 2026 services"
                />
              </div>
              <Input
                type="number"
                step="0.5"
                value={line.quantity}
                onChange={(e) => updateLine(line.key, { quantity: Number(e.target.value) })}
              />
              <Input
                type="number"
                step="0.01"
                value={line.unitPrice}
                onChange={(e) => updateLine(line.key, { unitPrice: Number(e.target.value) })}
              />
              <div className="text-right text-sm font-semibold tabular">
                {formatMoney(line.quantity * line.unitPrice, currency)}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.key !== line.key)))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setLines((prev) => [...prev, { key: uid(), description: "", quantity: 1, unitPrice: 0, unit: null }])}
          >
            <Plus className="size-4" /> Add line
          </Button>
          <span className="font-semibold tabular">{formatMoney(totals.total, currency)}</span>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <Label className="mb-2 block">Notes (optional)</Label>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <Button onClick={submit} disabled={pending} className="gap-2">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Submit for approval
      </Button>
    </div>
  );
}
