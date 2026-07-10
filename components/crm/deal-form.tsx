"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { saveDeal, type DealInput } from "@/lib/actions/crm/deals";
import { CURRENCIES } from "@/lib/currencies";
import { DEAL_STAGES, STAGE_LABEL } from "@/lib/crm";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "@/components/ui/simple-select";

export interface DealFormData {
  id: string;
  name: string;
  clientId: string | null;
  prospectName: string | null;
  prospectEmail: string | null;
  contactId: string | null;
  value: number | null;
  currency: string;
  probability: number | null;
  expectedCloseDate: string | null;
  stage: string;
}

export function DealForm({
  clients,
  contacts,
  deal,
}: {
  clients: { value: string; label: string }[];
  contacts: { value: string; label: string; clientId: string }[];
  deal?: DealFormData;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editing = !!deal;

  const [form, setForm] = useState({
    name: deal?.name ?? "",
    mode: deal?.clientId || !deal ? ("client" as "client" | "prospect") : "prospect",
    clientId: deal?.clientId ?? "",
    prospectName: deal?.prospectName ?? "",
    prospectEmail: deal?.prospectEmail ?? "",
    contactId: deal?.contactId ?? "",
    value: deal?.value != null ? String(deal.value) : "",
    currency: deal?.currency ?? "AED",
    probability: deal?.probability != null ? String(deal.probability) : "",
    expectedCloseDate: deal?.expectedCloseDate ?? "",
    stage: deal?.stage ?? "LEAD",
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const clientContacts = contacts.filter((c) => c.clientId === form.clientId);

  function submit() {
    const payload: DealInput = {
      id: deal?.id,
      name: form.name,
      clientId: form.mode === "client" ? form.clientId || null : null,
      prospectName: form.mode === "prospect" ? form.prospectName || null : null,
      prospectEmail: form.mode === "prospect" ? form.prospectEmail || null : null,
      contactId: form.mode === "client" ? form.contactId || null : null,
      value: form.value === "" ? null : Number(form.value),
      currency: form.currency,
      probability: form.probability === "" ? null : Number(form.probability),
      expectedCloseDate: form.expectedCloseDate || null,
      stage: form.stage as DealInput["stage"],
    };
    startTransition(async () => {
      const res = await saveDeal(payload);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Deal saved" : "Deal created");
      router.push(`/crm/deals/${res.id}`);
      router.refresh();
    });
  }

  return (
    <div className="max-w-xl space-y-5">
      <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Deal name *</Label>
            <Input
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder='e.g. "Acme — data platform team"'
            />
          </div>
          <div className="space-y-1.5">
            <Label>Counterparty</Label>
            <SimpleSelect
              value={form.mode}
              onValueChange={(v) => set({ mode: v as typeof form.mode })}
              options={[
                { value: "client", label: "Existing client" },
                { value: "prospect", label: "New prospect" },
              ]}
            />
          </div>
          {form.mode === "client" ? (
            <>
              <div className="space-y-1.5">
                <Label>Client</Label>
                <SimpleSelect
                  value={form.clientId}
                  onValueChange={(v) => set({ clientId: v, contactId: "" })}
                  options={clients}
                  placeholder="Select a client"
                />
              </div>
              {clientContacts.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Contact person</Label>
                  <SimpleSelect
                    value={form.contactId}
                    onValueChange={(v) => set({ contactId: v })}
                    options={[{ value: "", label: "None" }, ...clientContacts]}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Prospect name</Label>
                <Input
                  value={form.prospectName}
                  onChange={(e) => set({ prospectName: e.target.value })}
                  placeholder="Company or person"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Prospect email</Label>
                <Input
                  type="email"
                  value={form.prospectEmail}
                  onChange={(e) => set({ prospectEmail: e.target.value })}
                />
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Value</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.value}
                onChange={(e) => set({ value: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <SimpleSelect
                value={form.currency}
                onValueChange={(v) => set({ currency: v })}
                options={CURRENCIES}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Probability %</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={form.probability}
              onChange={(e) => set({ probability: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Expected close</Label>
            <Input
              type="date"
              value={form.expectedCloseDate}
              onChange={(e) => set({ expectedCloseDate: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Stage</Label>
            <SimpleSelect
              value={form.stage}
              onValueChange={(v) => set({ stage: v })}
              options={DEAL_STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s] }))}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={pending} className="gap-2">
          {pending && <Loader2 className="size-4 animate-spin" />}
          {editing ? "Save changes" : "Create deal"}
        </Button>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
