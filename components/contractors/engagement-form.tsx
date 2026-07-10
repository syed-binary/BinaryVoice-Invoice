"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Engagement } from "@prisma/client";
import { saveEngagement, type EngagementInput } from "@/lib/actions/contractors/engagements";
import { CURRENCIES } from "@/lib/currencies";
import { toNumber } from "@/lib/money";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "@/components/ui/simple-select";

const RATE_UNITS = [
  { value: "HOUR", label: "Hour" },
  { value: "DAY", label: "Day" },
  { value: "MONTH", label: "Month" },
  { value: "FIXED", label: "Fixed" },
];

const IR35_OPTIONS = [
  { value: "NOT_APPLICABLE", label: "Not applicable" },
  { value: "UNDETERMINED", label: "Undetermined" },
  { value: "OUTSIDE", label: "Outside IR35" },
  { value: "INSIDE", label: "Inside IR35" },
];

export function EngagementForm({
  contractorId,
  clients,
  engagement,
}: {
  contractorId: string;
  clients: { value: string; label: string }[];
  engagement?: Engagement | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editing = !!engagement;
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    clientId: engagement?.clientId ?? "",
    title: engagement?.title ?? "",
    startDate: engagement?.startDate
      ? engagement.startDate.toISOString().slice(0, 10)
      : today,
    endDate: engagement?.endDate ? engagement.endDate.toISOString().slice(0, 10) : "",
    rateUnit: (engagement?.rateUnit ?? "DAY") as NonNullable<EngagementInput["rateUnit"]>,
    costRate: engagement ? String(toNumber(engagement.costRate)) : "",
    costCurrency: engagement?.costCurrency ?? "USD",
    billRate: engagement?.billRate != null ? String(toNumber(engagement.billRate)) : "",
    billCurrency: engagement?.billCurrency ?? "AED",
    capacity: engagement?.capacity != null ? String(toNumber(engagement.capacity)) : "",
    ir35Status: (engagement?.ir35Status ?? "NOT_APPLICABLE") as NonNullable<EngagementInput["ir35Status"]>,
    ir35Notes: engagement?.ir35Notes ?? "",
    notes: engagement?.notes ?? "",
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  function submit() {
    if (!form.costRate) {
      toast.error("Cost rate is required");
      return;
    }
    const payload: EngagementInput = {
      id: engagement?.id,
      contractorId,
      clientId: form.clientId || null,
      title: form.title,
      startDate: form.startDate,
      endDate: form.endDate || null,
      rateUnit: form.rateUnit,
      costRate: Number(form.costRate),
      costCurrency: form.costCurrency,
      billRate: form.billRate === "" ? null : Number(form.billRate),
      billCurrency: form.billCurrency || null,
      capacity: form.capacity === "" ? null : Number(form.capacity),
      ir35Status: form.ir35Status,
      ir35Notes: form.ir35Notes || null,
      notes: form.notes || null,
    };
    startTransition(async () => {
      const res = await saveEngagement(payload);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Engagement saved" : "Engagement created");
      router.push(`/contractors/${contractorId}`);
      router.refresh();
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder='e.g. "Senior ML Engineer @ Acme"'
            />
          </div>
          <div className="space-y-1.5">
            <Label>Client</Label>
            <SimpleSelect
              value={form.clientId}
              onValueChange={(v) => set({ clientId: v })}
              options={[{ value: "", label: "Internal / lab work" }, ...clients]}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Capacity (FTE fraction)</Label>
            <Input
              type="number"
              min="0.05"
              max="1"
              step="0.05"
              value={form.capacity}
              onChange={(e) => set({ capacity: e.target.value })}
              placeholder="1.0"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Start date</Label>
            <Input type="date" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>End date</Label>
            <Input type="date" value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Rates
        </h3>
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Rate unit</Label>
            <SimpleSelect
              value={form.rateUnit}
              onValueChange={(v) => set({ rateUnit: v as typeof form.rateUnit })}
              options={RATE_UNITS}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cost rate * (what we pay)</Label>
            <Input type="number" min="0" step="0.01" value={form.costRate} onChange={(e) => set({ costRate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Cost currency</Label>
            <SimpleSelect value={form.costCurrency} onValueChange={(v) => set({ costCurrency: v })} options={CURRENCIES} />
          </div>
          <div className="space-y-1.5 sm:col-start-2">
            <Label>Bill rate (what the client pays)</Label>
            <Input type="number" min="0" step="0.01" value={form.billRate} onChange={(e) => set({ billRate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Bill currency</Label>
            <SimpleSelect value={form.billCurrency} onValueChange={(v) => set({ billCurrency: v })} options={CURRENCIES} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <h3 className="mb-1 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          IR35 (UK placements)
        </h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Record-keeping only — this is not a status determination. Store the SDS
          document in the contractor&apos;s compliance documents.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <SimpleSelect
              value={form.ir35Status}
              onValueChange={(v) => set({ ir35Status: v as typeof form.ir35Status })}
              options={IR35_OPTIONS}
            />
          </div>
          <div className="space-y-1.5">
            <Label>SDS reference / notes</Label>
            <Input value={form.ir35Notes} onChange={(e) => set({ ir35Notes: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <Label className="mb-2 block">Notes</Label>
        <Textarea rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={pending} className="gap-2">
          {pending && <Loader2 className="size-4 animate-spin" />}
          {editing ? "Save changes" : "Create engagement"}
        </Button>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
