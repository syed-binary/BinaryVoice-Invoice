"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { saveContractDraft, type ContractDraftInput } from "@/lib/actions/contracts/contracts";
import { CURRENCIES } from "@/lib/currencies";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "@/components/ui/simple-select";

export interface DraftContract {
  id: string;
  title: string;
  body: string;
  effectiveDate: string | null;
  endDate: string | null;
  renewalType: "NONE" | "AUTO_RENEW" | "MANUAL";
  noticePeriodDays: number | null;
  value: number | null;
  currency: string;
  notes: string | null;
}

export function ContractEditor({ contract }: { contract: DraftContract }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    title: contract.title,
    body: contract.body,
    effectiveDate: contract.effectiveDate ?? "",
    endDate: contract.endDate ?? "",
    renewalType: contract.renewalType,
    noticePeriodDays: contract.noticePeriodDays != null ? String(contract.noticePeriodDays) : "",
    value: contract.value != null ? String(contract.value) : "",
    currency: contract.currency,
    notes: contract.notes ?? "",
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const missingCount = (form.body.match(/\[missing:/g) ?? []).length;

  function submit() {
    const payload: ContractDraftInput = {
      id: contract.id,
      title: form.title,
      body: form.body,
      effectiveDate: form.effectiveDate || null,
      endDate: form.endDate || null,
      renewalType: form.renewalType,
      noticePeriodDays: form.noticePeriodDays === "" ? null : Number(form.noticePeriodDays),
      value: form.value === "" ? null : Number(form.value),
      currency: form.currency,
      notes: form.notes || null,
    };
    startTransition(async () => {
      const res = await saveContractDraft(payload);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Draft saved");
      router.push(`/contracts/${contract.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-3">
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Effective date</Label>
            <Input type="date" value={form.effectiveDate} onChange={(e) => set({ effectiveDate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>End date</Label>
            <Input type="date" value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Notice period (days)</Label>
            <Input
              type="number"
              min="0"
              value={form.noticePeriodDays}
              onChange={(e) => set({ noticePeriodDays: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Renewal</Label>
            <SimpleSelect
              value={form.renewalType}
              onValueChange={(v) => set({ renewalType: v as typeof form.renewalType })}
              options={[
                { value: "NONE", label: "None" },
                { value: "MANUAL", label: "Manual renewal" },
                { value: "AUTO_RENEW", label: "Auto-renews" },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Contract value</Label>
            <Input type="number" min="0" step="0.01" value={form.value} onChange={(e) => set({ value: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <SimpleSelect value={form.currency} onValueChange={(v) => set({ currency: v })} options={CURRENCIES} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <Label>Body (markdown)</Label>
          {missingCount > 0 && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600">
              {missingCount} missing field{missingCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <Textarea
          value={form.body}
          onChange={(e) => set({ body: e.target.value })}
          rows={28}
          className="font-mono text-xs leading-relaxed"
        />
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <Label className="mb-2 block">Internal notes (not part of the contract)</Label>
        <Textarea rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={pending} className="gap-2">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save draft
        </Button>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
