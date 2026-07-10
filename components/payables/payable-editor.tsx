"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import { savePayable, type PayableInput } from "@/lib/actions/contractors/payables";
import { fetchFxRate } from "@/lib/actions/fx";
import { calculatePayableTotals } from "@/lib/contractors/payable-calc";
import { formatMoney, toNumber } from "@/lib/money";
import { CURRENCIES } from "@/lib/currencies";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "@/components/ui/simple-select";

type Line = {
  key: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unit: string | null;
};

export interface EditorContractor {
  id: string;
  name: string;
  currency: string;
  defaultCostRate: number | null;
  defaultRateUnit: string;
}

export interface EditorEngagement {
  id: string;
  contractorId: string;
  title: string;
  costRate: number;
  costCurrency: string;
  rateUnit: string;
}

export interface EditorPayable {
  id: string;
  contractorId: string;
  engagementId: string | null;
  contractorRef: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  fxRate: number;
  notes: string | null;
  lines: Omit<Line, "key">[];
}

let counter = 0;
const uid = () => `p${counter++}`;
const blankLine = (): Line => ({
  key: uid(), description: "", quantity: 1, unitPrice: 0, unit: null,
});

export function PayableEditor({
  contractors,
  engagements,
  baseCurrency,
  payable,
  preselectContractorId,
}: {
  contractors: EditorContractor[];
  engagements: EditorEngagement[];
  baseCurrency: string;
  payable?: EditorPayable;
  preselectContractorId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editing = !!payable;
  const today = new Date().toISOString().slice(0, 10);

  const [contractorId, setContractorId] = useState(
    payable?.contractorId ?? preselectContractorId ?? "",
  );
  const [engagementId, setEngagementId] = useState(payable?.engagementId ?? "");
  const [contractorRef, setContractorRef] = useState(payable?.contractorRef ?? "");
  const [issueDate, setIssueDate] = useState(payable?.issueDate ?? today);
  const [dueDate, setDueDate] = useState(payable?.dueDate ?? "");
  const [periodStart, setPeriodStart] = useState(payable?.periodStart ?? "");
  const [periodEnd, setPeriodEnd] = useState(payable?.periodEnd ?? "");
  const [currency, setCurrency] = useState(
    payable?.currency ??
      contractors.find((c) => c.id === (preselectContractorId ?? ""))?.currency ??
      "USD",
  );
  const [fxRate, setFxRate] = useState(payable?.fxRate ?? 1);
  const [notes, setNotes] = useState(payable?.notes ?? "");
  const [lines, setLines] = useState<Line[]>(
    payable?.lines.map((l) => ({ ...l, key: uid() })) ?? [blankLine()],
  );

  const isForeign = currency !== baseCurrency;
  const contractorEngagements = engagements.filter((e) => e.contractorId === contractorId);

  useEffect(() => {
    if (!isForeign) return;
    let cancelled = false;
    fetchFxRate(currency, issueDate).then((r) => {
      if (!cancelled && r !== null) setFxRate(r);
    });
    return () => {
      cancelled = true;
    };
  }, [currency, issueDate, isForeign]);

  const totals = useMemo(
    () =>
      calculatePayableTotals(
        lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice })),
      ),
    [lines],
  );

  function onContractorChange(v: string) {
    setContractorId(v);
    setEngagementId("");
    const c = contractors.find((x) => x.id === v);
    if (c) setCurrency(c.currency);
  }

  function onEngagementChange(v: string) {
    setEngagementId(v);
    const e = contractorEngagements.find((x) => x.id === v);
    if (e && lines.length === 1 && !lines[0].description) {
      setCurrency(e.costCurrency);
      setLines([
        {
          key: uid(),
          description: e.title,
          quantity: 1,
          unitPrice: e.costRate,
          unit: e.rateUnit.toLowerCase(),
        },
      ]);
    }
  }

  const updateLine = (key: string, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  function submit() {
    if (!contractorId) {
      toast.error("Select a contractor first");
      return;
    }
    const payload: PayableInput = {
      id: payable?.id,
      contractorId,
      engagementId: engagementId || null,
      contractorRef: contractorRef || null,
      periodStart: periodStart || null,
      periodEnd: periodEnd || null,
      issueDate,
      dueDate: dueDate || null,
      currency,
      fxRate: isForeign ? fxRate : 1,
      notes: notes || null,
      lines: lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        unit: l.unit,
      })),
    };
    startTransition(async () => {
      const res = await savePayable(payload);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Payable saved" : "Payable recorded");
      router.push(`/payables/${res.id}`);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Contractor *</Label>
              <SimpleSelect
                value={contractorId}
                onValueChange={onContractorChange}
                options={contractors.map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Select a contractor"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Engagement</Label>
              <SimpleSelect
                value={engagementId}
                onValueChange={onEngagementChange}
                options={[
                  { value: "", label: "None" },
                  ...contractorEngagements.map((e) => ({ value: e.id, label: e.title })),
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contractor&apos;s invoice no.</Label>
              <Input value={contractorRef} onChange={(e) => setContractorRef(e.target.value)} placeholder="Their reference" />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <SimpleSelect value={currency} onValueChange={setCurrency} options={CURRENCIES} />
            </div>
            {isForeign && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>
                  Exchange rate · 1 {currency} = {fxRate || "…"} {baseCurrency}
                </Label>
                <Input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={fxRate || ""}
                  onChange={(e) => setFxRate(Number(e.target.value))}
                  className="max-w-48"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Issue date</Label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Period start</Label>
              <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Period end</Label>
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="border-b px-5 py-3">
            <h3 className="font-display text-sm font-semibold">Lines</h3>
          </div>
          <div className="divide-y">
            {lines.map((line) => (
              <div
                key={line.key}
                className="grid grid-cols-2 gap-2 px-5 py-3 sm:grid-cols-[1fr_70px_110px_80px_110px_32px] sm:items-center"
              >
                <div className="col-span-2 sm:col-span-1">
                  <Input
                    value={line.description}
                    onChange={(e) => updateLine(line.key, { description: e.target.value })}
                    placeholder="e.g. March 2026 — Senior ML Engineer"
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
                <Input
                  value={line.unit ?? ""}
                  onChange={(e) => updateLine(line.key, { unit: e.target.value || null })}
                  placeholder="month"
                />
                <div className="text-right text-sm font-semibold tabular">
                  {formatMoney(line.quantity * line.unitPrice, currency)}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.key !== line.key)))
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="border-t px-5 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setLines((prev) => [...prev, blankLine()])}
            >
              <Plus className="size-4" /> Add line
            </Button>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <Label className="mb-2 block">Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="mb-3 font-display text-sm font-semibold">Summary</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-semibold tabular">{formatMoney(totals.total, currency)}</dd>
            </div>
            {isForeign && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">≈ {baseCurrency}</dt>
                <dd className="tabular">{formatMoney(toNumber(totals.total) * fxRate, baseCurrency)}</dd>
              </div>
            )}
          </dl>
        </div>
        <Button onClick={submit} disabled={pending} className="w-full gap-2">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {editing ? "Save changes" : "Record payable"}
        </Button>
      </div>
    </div>
  );
}
