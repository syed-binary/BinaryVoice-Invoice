"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Client } from "@prisma/client";
import { saveClient, type ClientFormState } from "@/lib/actions/clients";
import type { FieldDef } from "@/lib/custom-fields";
import { CURRENCIES } from "@/lib/currencies";
import { toNumber } from "@/lib/money";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SimpleSelect } from "@/components/ui/simple-select";
import { CustomFieldsFieldset } from "@/components/custom-fields/custom-fields-fieldset";

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="gap-2">
      {pending && <Loader2 className="size-4 animate-spin" />}
      {editing ? "Save changes" : "Create client"}
    </Button>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
      <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function ClientForm({
  client,
  fieldDefs,
  defaultCurrency,
}: {
  client?: Client | null;
  fieldDefs: FieldDef[];
  defaultCurrency: string;
}) {
  const [state, formAction] = useActionState<ClientFormState, FormData>(
    saveClient,
    {},
  );
  const editing = !!client;
  const [exportClient, setExportClient] = useState(client?.exportClient ?? false);
  const [applyWht, setApplyWht] = useState(client?.withholdingRate != null);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      {editing && <input type="hidden" name="id" value={client!.id} />}

      <Section title="Details">
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Client name *</Label>
              <Input id="displayName" name="displayName" defaultValue={client?.displayName ?? ""} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="companyName">Company name</Label>
              <Input id="companyName" name="companyName" defaultValue={client?.companyName ?? ""} />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={client?.email ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={client?.phone ?? ""} />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="trn">TRN</Label>
              <Input id="trn" name="trn" defaultValue={client?.trn ?? ""} placeholder="Tax Registration Number" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <SimpleSelect
                name="currency"
                id="currency"
                defaultValue={client?.currency ?? defaultCurrency}
                options={CURRENCIES}
              />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Addresses">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="billingAddress">Billing address</Label>
            <Textarea id="billingAddress" name="billingAddress" rows={3} defaultValue={client?.billingAddress ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="shippingAddress">Shipping address</Label>
            <Textarea id="shippingAddress" name="shippingAddress" rows={3} defaultValue={client?.shippingAddress ?? ""} />
          </div>
        </div>
      </Section>

      <Section title="Tax treatment">
        <input type="hidden" name="exportClient" value={exportClient ? "on" : ""} />
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="font-medium">Export client (outside UAE)</p>
              <p className="text-sm text-muted-foreground">
                New invoices default VAT to 0% (zero-rated export of services).
              </p>
            </div>
            <Switch checked={exportClient} onCheckedChange={setExportClient} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div className="flex-1">
              <p className="font-medium">Client withholds tax at source</p>
              <p className="text-sm text-muted-foreground">
                e.g. Egypt deducts up to 20% on service fees (may be reduced by the UAE–Egypt treaty).
              </p>
            </div>
            <div className="flex items-center gap-3">
              {applyWht && (
                <div className="flex items-center gap-1.5">
                  <Input
                    name="withholdingRate"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={client?.withholdingRate != null ? String(toNumber(client.withholdingRate)) : "20"}
                    className="h-9 w-20 text-right"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              )}
              <Switch checked={applyWht} onCheckedChange={setApplyWht} />
            </div>
          </div>
          {!applyWht && <input type="hidden" name="withholdingRate" value="" />}
        </div>
      </Section>

      {fieldDefs.length > 0 && (
        <Section title="Custom fields">
          <CustomFieldsFieldset
            defs={fieldDefs}
            values={client?.customFields as Record<string, unknown> | null}
          />
        </Section>
      )}

      <Section title="Notes">
        <Textarea name="notes" rows={3} defaultValue={client?.notes ?? ""} placeholder="Internal notes (not shown on invoices)" />
      </Section>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" render={<Link href={editing ? `/clients/${client!.id}` : "/clients"} />}>
          Cancel
        </Button>
        <SubmitButton editing={editing} />
      </div>
    </form>
  );
}
