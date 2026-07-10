"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Send, Save } from "lucide-react";
import type { CompanySettings, Item } from "@prisma/client";
import type { FieldDef } from "@/lib/custom-fields";
import type { EditorClient } from "@/components/invoices/invoice-editor";
import { saveEstimate, type EstimatePayload } from "@/lib/actions/estimates";
import { fetchFxRate } from "@/lib/actions/fx";
import { calculateTotals } from "@/lib/calculations";
import { formatMoney, toNumber } from "@/lib/money";
import { CURRENCIES } from "@/lib/currencies";
import { TEMPLATE_OPTIONS } from "@/lib/templates";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SimpleSelect } from "@/components/ui/simple-select";

type Line = {
  key: string;
  itemId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  unit: string | null;
  discount: number;
};

export type EditorEstimate = {
  id: string;
  clientId: string;
  issueDate: string;
  expiryDate: string | null;
  currency: string;
  fxRate: number;
  vatEnabled: boolean;
  vatRate: number;
  withholdingEnabled: boolean;
  withholdingRate: number;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  notes: string | null;
  terms: string | null;
  templateId: string;
  accentColor: string | null;
  status: string;
  customFields: Record<string, unknown> | null;
  lineItems: Omit<Line, "key">[];
};

let counter = 0;
const uid = () => `e${counter++}`;
const blankLine = (): Line => ({
  key: uid(), itemId: null, description: "", quantity: 1, unitPrice: 0, unit: "Nos", discount: 0,
});

export function EstimateEditor({
  clients,
  items,
  company,
  fieldDefs,
  estimate,
  preselectClientId,
  dealId,
}: {
  clients: EditorClient[];
  items: Pick<Item, "id" | "name" | "description" | "unitPrice" | "unit">[];
  company: CompanySettings;
  fieldDefs: FieldDef[];
  estimate?: EditorEstimate;
  preselectClientId?: string;
  dealId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editing = !!estimate;
  const today = new Date().toISOString().slice(0, 10);

  const initialClient = clients.find(
    (c) => c.id === (estimate?.clientId ?? preselectClientId),
  );

  const [clientId, setClientId] = useState(estimate?.clientId ?? preselectClientId ?? "");
  const [issueDate, setIssueDate] = useState(estimate?.issueDate ?? today);
  const [expiryDate, setExpiryDate] = useState(
    estimate?.expiryDate ??
      (() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().slice(0, 10);
      })(),
  );
  const [currency, setCurrency] = useState(estimate?.currency ?? initialClient?.currency ?? company.baseCurrency);
  const [fxRate, setFxRate] = useState(estimate?.fxRate ?? 1);
  const isForeign = currency !== company.baseCurrency;

  // Prefill the FX rate when currency or issue date changes (manual override
  // stays possible — this only replaces the value on those changes). For the
  // base currency the payload always sends 1, so no reset is needed.
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
  const [vatEnabled, setVatEnabled] = useState(estimate?.vatEnabled ?? company.vatEnabled);
  const [vatRate, setVatRate] = useState(
    estimate?.vatRate ?? (initialClient?.exportClient ? 0 : toNumber(company.defaultVatRate)),
  );
  const [withholdingEnabled, setWithholdingEnabled] = useState(
    estimate?.withholdingEnabled ?? initialClient?.withholdingRate != null,
  );
  const [withholdingRate, setWithholdingRate] = useState(
    estimate?.withholdingRate ?? initialClient?.withholdingRate ?? toNumber(company.defaultWithholdingRate),
  );
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">(estimate?.discountType ?? "FIXED");
  const [discountValue, setDiscountValue] = useState(estimate?.discountValue ?? 0);
  const [notes, setNotes] = useState(estimate?.notes ?? company.defaultNotes ?? "");
  const [terms, setTerms] = useState(estimate?.terms ?? company.defaultTerms ?? "");
  const [templateId, setTemplateId] = useState(estimate?.templateId ?? company.defaultTemplate);
  const [accentColor, setAccentColor] = useState(estimate?.accentColor ?? company.accentColor);
  const [customFields, setCustomFields] = useState<Record<string, string>>(() => {
    const cf = estimate?.customFields ?? {};
    const out: Record<string, string> = {};
    for (const d of fieldDefs) out[d.key] = cf[d.key] != null ? String(cf[d.key]) : "";
    return out;
  });
  const [lines, setLines] = useState<Line[]>(
    estimate?.lineItems.map((l) => ({ ...l, key: uid() })) ?? [blankLine()],
  );

  const totals = useMemo(
    () =>
      calculateTotals({
        lines: lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice, discount: l.discount })),
        discountType,
        discountValue,
        vatEnabled,
        vatRate,
        withholdingEnabled,
        withholdingRate,
      }),
    [lines, discountType, discountValue, vatEnabled, vatRate, withholdingEnabled, withholdingRate],
  );

  function onClientChange(v: string) {
    setClientId(v);
    const c = clients.find((x) => x.id === v);
    if (!c) return;
    setCurrency(c.currency);
    setVatRate(c.exportClient ? 0 : toNumber(company.defaultVatRate));
    if (c.withholdingRate != null) {
      setWithholdingEnabled(true);
      setWithholdingRate(c.withholdingRate);
    }
  }

  const updateLine = (key: string, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key: string) =>
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((l) => l.key !== key)));
  const addBlank = () => setLines((prev) => [...prev, blankLine()]);
  function addFromCatalog(itemId: string) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    setLines((prev) => [
      ...prev,
      {
        key: uid(),
        itemId: item.id,
        description: item.name + (item.description ? ` — ${item.description}` : ""),
        quantity: 1,
        unitPrice: toNumber(item.unitPrice),
        unit: item.unit ?? "Nos",
        discount: 0,
      },
    ]);
  }

  function submit(markSent: boolean) {
    if (!clientId) {
      toast.error("Select a client first");
      return;
    }
    const payload: EstimatePayload = {
      id: estimate?.id,
      clientId,
      issueDate,
      expiryDate: expiryDate || null,
      currency,
      fxRate: isForeign ? fxRate : 1,
      dealId: dealId ?? null,
      vatEnabled,
      vatRate,
      withholdingEnabled,
      withholdingRate,
      discountType,
      discountValue,
      notes,
      terms,
      templateId,
      accentColor,
      markSent,
      customFields: Object.fromEntries(Object.entries(customFields).filter(([, v]) => v !== "")),
      lineItems: lines.map((l) => ({
        itemId: l.itemId,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        unit: l.unit,
        discount: l.discount,
      })),
    };
    startTransition(async () => {
      const res = await saveEstimate(payload);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Estimate saved" : "Estimate created");
      router.push(`/estimates/${res.id}`);
      router.refresh();
    });
  }

  const clientOptions = clients.map((c) => ({ value: c.id, label: c.displayName }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Client *</Label>
              {clients.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No clients yet.{" "}
                  <Link href="/clients/new" className="text-primary underline">Add one</Link>.
                </p>
              ) : (
                <SimpleSelect value={clientId} onValueChange={onClientChange} options={clientOptions} placeholder="Select a client" />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <SimpleSelect value={currency} onValueChange={setCurrency} options={CURRENCIES} />
            </div>
            {isForeign && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="fxRate">
                  Exchange rate · 1 {currency} = {fxRate || "…"} {company.baseCurrency}
                </Label>
                <Input
                  id="fxRate"
                  type="number"
                  step="0.000001"
                  min="0"
                  value={fxRate || ""}
                  onChange={(e) => setFxRate(Number(e.target.value))}
                  className="max-w-48"
                />
                <p className="text-xs text-muted-foreground">
                  Used for {company.baseCurrency} reporting. Prefilled from ECB
                  reference rates — override if your bank rate differs.
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="issueDate">Estimate date</Label>
              <Input id="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expiryDate">Valid until</Label>
              <Input id="expiryDate" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="border-b px-5 py-3">
            <h3 className="font-display text-sm font-semibold">Resources</h3>
            <p className="text-xs text-muted-foreground">Add each role: type, number of resources, rate and unit.</p>
          </div>
          <div className="divide-y">
            <div className="hidden gap-2 px-5 py-2 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[1fr_64px_100px_76px_100px_32px]">
              <span>Resource type</span>
              <span className="text-right">No.</span>
              <span className="text-right">Rate</span>
              <span className="text-right">Unit</span>
              <span className="text-right">Amount</span>
              <span />
            </div>
            {lines.map((line) => {
              const amount = line.quantity * line.unitPrice - line.discount;
              return (
                <div key={line.key} className="grid grid-cols-2 gap-2 px-5 py-3 sm:grid-cols-[1fr_64px_100px_76px_100px_32px] sm:items-center">
                  <div className="col-span-2 sm:col-span-1">
                    <Input value={line.description} onChange={(e) => updateLine(line.key, { description: e.target.value })} placeholder="e.g. Senior Data Engineer" />
                  </div>
                  <NumCell label="No." value={line.quantity} onChange={(n) => updateLine(line.key, { quantity: n })} />
                  <NumCell label="Rate" value={line.unitPrice} onChange={(n) => updateLine(line.key, { unitPrice: n })} />
                  <div className="flex items-center gap-2 sm:block">
                    <span className="w-12 text-xs text-muted-foreground sm:hidden">Unit</span>
                    <Input value={line.unit ?? ""} onChange={(e) => updateLine(line.key, { unit: e.target.value || null })} placeholder="Nos" className="h-9 flex-1 sm:w-full" />
                  </div>
                  <div className="flex items-center justify-between sm:justify-end">
                    <span className="text-xs text-muted-foreground sm:hidden">Amount</span>
                    <span className="text-sm font-semibold tabular">{formatMoney(amount, currency)}</span>
                  </div>
                  <div className="col-span-2 flex justify-end sm:col-span-1">
                    <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-destructive" onClick={() => removeLine(line.key)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t px-5 py-3">
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addBlank}>
              <Plus className="size-4" /> Add resource
            </Button>
            {items.length > 0 && (
              <div className="w-56">
                <SimpleSelect placeholder="Add saved item…" options={items.map((i) => ({ value: i.id, label: i.name }))} onValueChange={addFromCatalog} value="" />
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="terms">Terms</Label>
            <Textarea id="terms" value={terms} onChange={(e) => setTerms(e.target.value)} rows={4} />
          </div>
        </div>

        {fieldDefs.length > 0 && (
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-4 font-display text-sm font-semibold">Custom fields</h3>
            <div className="grid gap-5 sm:grid-cols-2">
              {fieldDefs.map((d) => (
                <div key={d.id} className="space-y-1.5">
                  <Label htmlFor={`cf-${d.key}`}>{d.label}</Label>
                  <Input id={`cf-${d.key}`} type={d.type === "NUMBER" ? "number" : d.type === "DATE" ? "date" : "text"} value={customFields[d.key] ?? ""} onChange={(e) => setCustomFields((prev) => ({ ...prev, [d.key]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">VAT</p>
              <p className="text-xs text-muted-foreground">UAE output VAT (added)</p>
            </div>
            <Switch checked={vatEnabled} onCheckedChange={setVatEnabled} />
          </div>
          {vatEnabled && (
            <div className="mt-3 flex items-center gap-2">
              <Input type="number" step="any" value={String(vatRate)} onChange={(e) => setVatRate(Number(e.target.value) || 0)} className="h-8 w-20 text-right" />
              <span className="text-sm text-muted-foreground">% {vatRate === 0 && "· zero-rated export"}</span>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between border-t pt-4">
            <div>
              <p className="font-medium">Withholding tax</p>
              <p className="text-xs text-muted-foreground">Deducted by client at source</p>
            </div>
            <Switch checked={withholdingEnabled} onCheckedChange={setWithholdingEnabled} />
          </div>
          {withholdingEnabled && (
            <div className="mt-3 flex items-center gap-2">
              <Input type="number" step="any" value={String(withholdingRate)} onChange={(e) => setWithholdingRate(Number(e.target.value) || 0)} className="h-8 w-20 text-right" />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          )}

          <div className="mt-5 space-y-2.5 border-t pt-4 text-sm">
            <Row label="Subtotal" value={formatMoney(totals.subtotal, currency)} />
            <div className="flex items-center gap-2">
              <div className="w-24">
                <SimpleSelect value={discountType} onValueChange={(v) => setDiscountType(v as "PERCENT" | "FIXED")} options={[{ value: "FIXED", label: "Disc." }, { value: "PERCENT", label: "Disc. %" }]} className="h-8" />
              </div>
              <Input type="number" value={String(discountValue)} onChange={(e) => setDiscountValue(Number(e.target.value) || 0)} className="h-8 flex-1 text-right" />
              <span className="w-24 shrink-0 text-right text-muted-foreground tabular">−{formatMoney(totals.discountAmount, currency)}</span>
            </div>
            {vatEnabled && <Row label={`VAT (${vatRate}%)`} value={formatMoney(totals.vatAmount, currency)} />}
            <div className="flex items-center justify-between border-t pt-3 text-base font-bold">
              <span>Total</span>
              <span className="tabular">{formatMoney(totals.total, currency)}</span>
            </div>
            {withholdingEnabled && (
              <div className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                <span>Withholding ({withholdingRate}%) · over-and-above</span>
                <span className="tabular">{formatMoney(totals.withholdingAmount, currency)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <Label className="mb-1.5 block">Template</Label>
          <SimpleSelect value={templateId} onValueChange={setTemplateId} options={TEMPLATE_OPTIONS} />
          <div className="mt-4">
            <Label className="mb-1.5 block">Accent color</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent" />
              <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-9 font-mono" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={() => submit(true)} disabled={pending} className="gap-2">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {editing ? "Save & mark sent" : "Create & mark sent"}
          </Button>
          <Button onClick={() => submit(false)} variant="outline" disabled={pending} className="gap-2">
            <Save className="size-4" /> Save as draft
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}

function NumCell({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2 sm:block">
      <span className="w-12 text-xs text-muted-foreground sm:hidden">{label}</span>
      <Input type="number" step="any" value={String(value)} onChange={(e) => onChange(Number(e.target.value) || 0)} className="h-9 flex-1 text-right sm:w-full" />
    </div>
  );
}
