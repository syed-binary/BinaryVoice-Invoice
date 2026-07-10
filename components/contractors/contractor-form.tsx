"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Contractor } from "@prisma/client";
import { saveContractor, type ContractorInput } from "@/lib/actions/contractors/contractors";
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

const STATUSES = [
  { value: "ONBOARDING", label: "Onboarding" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const PAYOUT_METHODS = [
  { value: "", label: "Not set" },
  { value: "BANK", label: "Bank transfer" },
  { value: "WISE", label: "Wise" },
  { value: "PAYONEER", label: "Payoneer" },
  { value: "OTHER", label: "Other" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
      <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function ContractorForm({ contractor }: { contractor?: Contractor | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editing = !!contractor;

  const [form, setForm] = useState({
    name: contractor?.name ?? "",
    email: contractor?.email ?? "",
    phone: contractor?.phone ?? "",
    country: contractor?.country ?? "",
    taxResidency: contractor?.taxResidency ?? "",
    entityName: contractor?.entityName ?? "",
    taxId: contractor?.taxId ?? "",
    vatRegistered: contractor?.vatRegistered ?? false,
    address: contractor?.address ?? "",
    currency: contractor?.currency ?? "USD",
    payoutMethod: contractor?.payoutMethod ?? "",
    payoutDetails: "", // never prefilled — stored encrypted
    defaultCostRate:
      contractor?.defaultCostRate != null ? String(toNumber(contractor.defaultCostRate)) : "",
    defaultRateUnit: (contractor?.defaultRateUnit ?? "DAY") as ContractorInput["defaultRateUnit"],
    status: (contractor?.status ?? "ONBOARDING") as ContractorInput["status"],
    notes: contractor?.notes ?? "",
  });

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  function submit() {
    const payload: ContractorInput = {
      id: contractor?.id,
      name: form.name,
      email: form.email,
      phone: form.phone || null,
      country: form.country,
      taxResidency: form.taxResidency || null,
      entityName: form.entityName || null,
      taxId: form.taxId || null,
      vatRegistered: form.vatRegistered,
      address: form.address || null,
      currency: form.currency,
      payoutMethod: form.payoutMethod || null,
      payoutDetails: form.payoutDetails || null,
      defaultCostRate: form.defaultCostRate === "" ? null : Number(form.defaultCostRate),
      defaultRateUnit: form.defaultRateUnit,
      status: form.status,
      notes: form.notes || null,
    };
    startTransition(async () => {
      const res = await saveContractor(payload);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Contractor saved" : "Contractor created");
      router.push(`/contractors/${res.id}`);
      router.refresh();
    });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Section title="Identity">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Priya Sharma" />
          </div>
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Country *</Label>
            <Input value={form.country} onChange={(e) => set({ country: e.target.value })} placeholder="e.g. India, United Kingdom" />
          </div>
          <div className="space-y-1.5">
            <Label>Billing entity (if any)</Label>
            <Input value={form.entityName} onChange={(e) => set({ entityName: e.target.value })} placeholder="Their LLC / Ltd" />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <SimpleSelect value={form.status ?? "ONBOARDING"} onValueChange={(v) => set({ status: v as typeof form.status })} options={STATUSES} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Address</Label>
            <Textarea rows={2} value={form.address} onChange={(e) => set({ address: e.target.value })} />
          </div>
        </div>
      </Section>

      <Section title="Tax">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tax residency</Label>
            <Input value={form.taxResidency} onChange={(e) => set({ taxResidency: e.target.value })} placeholder="Country of tax residence" />
          </div>
          <div className="space-y-1.5">
            <Label>Tax ID (PAN / UTR / TRN …)</Label>
            <Input value={form.taxId} onChange={(e) => set({ taxId: e.target.value })} />
          </div>
        </div>
      </Section>

      <Section title="Rates & payout">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <SimpleSelect value={form.currency} onValueChange={(v) => set({ currency: v })} options={CURRENCIES} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Default cost rate</Label>
              <Input type="number" min="0" step="0.01" value={form.defaultCostRate} onChange={(e) => set({ defaultCostRate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Per</Label>
              <SimpleSelect value={form.defaultRateUnit ?? "DAY"} onValueChange={(v) => set({ defaultRateUnit: v as typeof form.defaultRateUnit })} options={RATE_UNITS} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Payout method</Label>
            <SimpleSelect value={form.payoutMethod} onValueChange={(v) => set({ payoutMethod: v })} options={PAYOUT_METHODS} />
          </div>
          <div className="space-y-1.5">
            <Label>Payout details {editing && "(leave blank to keep current)"}</Label>
            <Input
              value={form.payoutDetails}
              onChange={(e) => set({ payoutDetails: e.target.value })}
              placeholder="IBAN / Wise email / account no."
            />
            <p className="text-xs text-muted-foreground">Encrypted at rest.</p>
          </div>
        </div>
      </Section>

      <Section title="Notes">
        <Textarea rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
      </Section>

      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={pending} className="gap-2">
          {pending && <Loader2 className="size-4 animate-spin" />}
          {editing ? "Save changes" : "Create contractor"}
        </Button>
        <Button variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
