"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, FileText, Loader2, Send, Upload } from "lucide-react";
import { submitOnboarding, type OnboardingInput } from "@/lib/actions/contractors/onboarding";
import { CURRENCIES } from "@/lib/currencies";
import { COUNTRIES } from "@/lib/countries";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "@/components/ui/simple-select";

const DOC_KINDS = [
  { value: "PASSPORT", label: "Passport" },
  { value: "KYC_ID", label: "National ID" },
  { value: "KYC_ADDRESS", label: "Proof of address" },
  { value: "W8BEN", label: "Tax form (e.g. W-8BEN)" },
  { value: "GENERIC", label: "Other" },
];

const PAYOUT_METHODS = [
  { value: "BANK", label: "Bank transfer" },
  { value: "WISE", label: "Wise" },
  { value: "PAYONEER", label: "Payoneer" },
  { value: "OTHER", label: "Other" },
];

function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-base font-semibold">
        <span className="mr-2 inline-grid size-6 place-items-center rounded-full bg-primary/10 text-xs text-primary">{n}</span>
        {title}
      </h2>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function OnboardingForm({
  token,
  initial,
  existingDocs,
}: {
  token: string;
  initial: { name: string; country: string; currency: string };
  existingDocs: { id: string; fileName: string; kind: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [docKind, setDocKind] = useState("PASSPORT");
  const [docExpiry, setDocExpiry] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({
    name: initial.name,
    email: "",
    phone: "",
    address: "",
    taxResidency: initial.country,
    entityName: "",
    taxId: "",
    currency: initial.currency,
    payoutMethod: "BANK",
    payoutDetails: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error("Choose a file first"); return; }
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("kind", docKind);
      if (docExpiry) form.set("expiryDate", docExpiry);
      const res = await fetch(`/api/onboard/${token}/upload`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Upload failed"); return; }
      toast.success(`Uploaded ${data.fileName}`);
      if (fileRef.current) fileRef.current.value = "";
      setDocExpiry("");
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    const payload: OnboardingInput = {
      token,
      name: f.name,
      email: f.email,
      phone: f.phone || null,
      address: f.address,
      taxResidency: f.taxResidency || null,
      entityName: f.entityName || null,
      taxId: f.taxId || null,
      vatRegistered: false,
      currency: f.currency,
      payoutMethod: f.payoutMethod || null,
      payoutDetails: f.payoutDetails || null,
    };
    startTransition(async () => {
      const res = await submitOnboarding(payload);
      if (res.error) { toast.error(res.error); return; }
      toast.success("Thank you — your details were submitted.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Section n={1} title="About you">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Full legal name *</Label><Input value={f.name} onChange={set("name")} /></div>
          <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={f.email} onChange={set("email")} placeholder="you@example.com" /></div>
          <div className="space-y-1.5"><Label>Phone (with country code)</Label><Input value={f.phone} onChange={set("phone")} placeholder="+44…" /></div>
          <div className="space-y-1.5">
            <Label>Company (if you invoice via one)</Label>
            <Input value={f.entityName} onChange={set("entityName")} placeholder="Your Ltd / LLP — optional" />
          </div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Residential address *</Label><Textarea rows={2} value={f.address} onChange={set("address")} /></div>
        </div>
      </Section>

      <Section n={2} title="Tax" hint="Used for withholding and your contract's clause pack.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Country of tax residence</Label>
            <Input value={f.taxResidency} onChange={set("taxResidency")} list="ob-countries" />
            <datalist id="ob-countries">{COUNTRIES.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div className="space-y-1.5"><Label>Tax ID (PAN / UTR / NTN …)</Label><Input value={f.taxId} onChange={set("taxId")} /></div>
        </div>
      </Section>

      <Section n={3} title="Getting paid" hint="Your account details are encrypted — only finance can decrypt them.">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Billing currency</Label>
            <SimpleSelect value={f.currency} onValueChange={(v) => setF((p) => ({ ...p, currency: v }))} options={CURRENCIES} />
          </div>
          <div className="space-y-1.5">
            <Label>Payout method</Label>
            <SimpleSelect value={f.payoutMethod} onValueChange={(v) => setF((p) => ({ ...p, payoutMethod: v }))} options={PAYOUT_METHODS} />
          </div>
          <div className="space-y-1.5">
            <Label>Account details</Label>
            <Input value={f.payoutDetails} onChange={set("payoutDetails")} placeholder="IBAN / account no. / Wise email" autoComplete="off" />
          </div>
        </div>
      </Section>

      <Section n={4} title="Documents" hint="Passport or national ID and a proof of address, plus any tax forms.">
        <div className="grid gap-3 sm:grid-cols-[1fr_170px_140px_auto] sm:items-end">
          <div className="space-y-1.5"><Label>File</Label><Input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" /></div>
          <div className="space-y-1.5"><Label>Type</Label><SimpleSelect value={docKind} onValueChange={setDocKind} options={DOC_KINDS} /></div>
          <div className="space-y-1.5"><Label>Expiry (if any)</Label><Input type="date" value={docExpiry} onChange={(e) => setDocExpiry(e.target.value)} /></div>
          <Button type="button" variant="outline" onClick={upload} disabled={uploading} className="gap-1.5">
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Upload
          </Button>
        </div>
        {existingDocs.length > 0 && (
          <ul className="mt-4 space-y-1.5">
            {existingDocs.map((d) => (
              <li key={d.id} className="flex items-center gap-2 text-sm">
                <FileText className="size-4 text-muted-foreground" />
                <span className="truncate">{d.fileName}</span>
                <span className="text-xs text-muted-foreground">({DOC_KINDS.find((k) => k.value === d.kind)?.label ?? d.kind})</span>
                <CheckCircle2 className="size-3.5 text-emerald-500" />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Button onClick={submit} disabled={pending} size="lg" className="w-full gap-2 sm:w-auto">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Submit my details
      </Button>
    </div>
  );
}
