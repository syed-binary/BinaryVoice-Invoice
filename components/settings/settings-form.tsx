"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Upload, Building2, Receipt, Landmark, Palette } from "lucide-react";
import type { CompanySettings } from "@prisma/client";
import { updateCompanySettings, type ActionState } from "@/lib/actions/settings";
import { toNumber } from "@/lib/money";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TEMPLATE_OPTIONS } from "@/lib/templates";
import { cn } from "@/lib/utils";

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  className,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  type?: string;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

function SaveBar() {
  const { pending } = useFormStatus();
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-8 flex items-center justify-end gap-3 border-t bg-background/85 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-b-xl">
      <p className="mr-auto text-xs text-muted-foreground">
        Changes apply to new invoices and PDFs.
      </p>
      <Button type="submit" disabled={pending} className="gap-2">
        {pending && <Loader2 className="size-4 animate-spin" />}
        Save changes
      </Button>
    </div>
  );
}

export function SettingsForm({ company }: { company: CompanySettings }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateCompanySettings,
    {},
  );
  const [logoUrl, setLogoUrl] = useState(company.logoUrl ?? "");
  const [vatEnabled, setVatEnabled] = useState(company.vatEnabled);
  const [accent, setAccent] = useState(company.accentColor);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok) toast.success("Settings saved");
    if (state.error) toast.error(state.error);
  }, [state]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setLogoUrl(data.url);
      toast.success("Logo uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={formAction}>
      {/* Hidden controlled values */}
      <input type="hidden" name="logoUrl" value={logoUrl} />
      <input type="hidden" name="vatEnabled" value={vatEnabled ? "on" : ""} />

      <Tabs defaultValue="company">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="company" className="gap-2">
            <Building2 className="size-4" /> Company
          </TabsTrigger>
          <TabsTrigger value="tax" className="gap-2">
            <Receipt className="size-4" /> Tax &amp; VAT
          </TabsTrigger>
          <TabsTrigger value="bank" className="gap-2">
            <Landmark className="size-4" /> Bank
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="size-4" /> Branding
          </TabsTrigger>
        </TabsList>

        {/* COMPANY */}
        <TabsContent value="company" className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Legal name" name="legalName" defaultValue={company.legalName} required />
            <Field label="Trade name" name="tradeName" defaultValue={company.tradeName} />
          </div>
          <Field label="Arabic name" name="arabicName" defaultValue={company.arabicName} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Address line 1" name="addressLine1" defaultValue={company.addressLine1} />
            <Field label="Address line 2" name="addressLine2" defaultValue={company.addressLine2} />
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="City" name="city" defaultValue={company.city} />
            <Field label="Emirate" name="emirate" defaultValue={company.emirate} />
            <Field label="Country" name="country" defaultValue={company.country} />
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="P.O. Box" name="poBox" defaultValue={company.poBox} />
            <Field label="Phone" name="phone" defaultValue={company.phone} />
            <Field label="Email" name="email" type="email" defaultValue={company.email} />
          </div>
          <Field label="Website" name="website" defaultValue={company.website} placeholder="https://" />
        </TabsContent>

        {/* TAX */}
        <TabsContent value="tax" className="space-y-5">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Charge VAT on invoices</p>
                <p className="text-sm text-muted-foreground">
                  Turn on once you are VAT-registered. New lines default to your VAT rate.
                </p>
              </div>
              <Switch checked={vatEnabled} onCheckedChange={setVatEnabled} />
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Corporate Tax TRN" name="corporateTaxTrn" defaultValue={company.corporateTaxTrn} />
            <Field label="VAT TRN" name="vatTrn" defaultValue={company.vatTrn} placeholder="15-digit VAT TRN" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Default VAT rate (%)"
              name="defaultVatRate"
              type="number"
              defaultValue={String(toNumber(company.defaultVatRate))}
            />
            <Field
              label="Default withholding rate (%)"
              name="defaultWithholdingRate"
              type="number"
              defaultValue={String(toNumber(company.defaultWithholdingRate))}
            />
          </div>
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            UAE imposes 0% withholding tax. A non-zero rate here is for foreign clients (e.g. Egypt up to 20%) who deduct tax at source — it appears as a deduction and &ldquo;net payable&rdquo; on invoices, and can be set per client.
          </p>
        </TabsContent>

        {/* BANK */}
        <TabsContent value="bank" className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Bank name" name="bankName" defaultValue={company.bankName} />
            <Field label="Account name" name="accountName" defaultValue={company.accountName} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="IBAN" name="iban" defaultValue={company.iban} />
            <Field label="SWIFT / BIC" name="swift" defaultValue={company.swift} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Account number" name="accountNumber" defaultValue={company.accountNumber} />
            <Field label="Routing code" name="routingCode" defaultValue={company.routingCode} />
          </div>
        </TabsContent>

        {/* BRANDING */}
        <TabsContent value="branding" className="space-y-6">
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              <div className="grid size-20 place-items-center overflow-hidden rounded-xl border bg-muted/40">
                {logoUrl ? (
                  <Image src={logoUrl} alt="Logo" width={80} height={80} className="size-full object-contain p-1.5" />
                ) : (
                  <span className="text-xs text-muted-foreground">No logo</span>
                )}
              </div>
              <div className="space-y-2">
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
                <Button type="button" variant="outline" className="gap-2" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  Upload logo
                </Button>
                {logoUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setLogoUrl("")}>
                    Remove
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">PNG, JPG, WEBP or SVG. Max 3 MB.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="accentColor">Accent color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent"
                  aria-label="Accent color"
                />
                <Input name="accentColor" value={accent} onChange={(e) => setAccent(e.target.value)} className="font-mono" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="defaultTemplate">Default template</Label>
              <SimpleSelect
                name="defaultTemplate"
                defaultValue={company.defaultTemplate}
                options={TEMPLATE_OPTIONS}
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-4">
            <Field label="Invoice prefix" name="invoicePrefix" defaultValue={company.invoicePrefix} />
            <Field label="Estimate prefix" name="estimatePrefix" defaultValue={company.estimatePrefix} />
            <Field label="Number padding" name="numberPadding" type="number" defaultValue={String(company.numberPadding)} />
            <Field label="Default due (days)" name="defaultDueDays" type="number" defaultValue={String(company.defaultDueDays)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="baseCurrency">Base currency</Label>
            <Input id="baseCurrency" name="baseCurrency" defaultValue={company.baseCurrency} className="sm:max-w-xs" />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="defaultNotes">Default notes</Label>
              <Textarea id="defaultNotes" name="defaultNotes" defaultValue={company.defaultNotes ?? ""} rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="defaultTerms">Default terms</Label>
              <Textarea id="defaultTerms" name="defaultTerms" defaultValue={company.defaultTerms ?? ""} rows={3} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <SaveBar />
    </form>
  );
}
