"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { saveEmployee, type EmployeeInput } from "@/lib/actions/hr/employees";
import { COUNTRIES } from "@/lib/countries";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "@/components/ui/simple-select";

export interface EmployeeFormData extends Omit<EmployeeInput, "id"> {
  id: string;
  masked: Record<"passport" | "visa" | "eid" | "labour" | "iban", string | null>;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {hint && <p className="mb-4 mt-1 text-xs text-muted-foreground">{hint}</p>}
      <div className={hint ? "" : "mt-4"}>{children}</div>
    </div>
  );
}

export function EmployeeForm({
  employee,
  managers,
}: {
  employee?: EmployeeFormData;
  managers: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editing = !!employee;
  const [f, setF] = useState<Record<string, string>>({
    name: employee?.name ?? "",
    email: employee?.email ?? "",
    phone: employee?.phone ?? "",
    dateOfBirth: employee?.dateOfBirth ?? "",
    nationality: employee?.nationality ?? "",
    jobTitle: employee?.jobTitle ?? "",
    department: employee?.department ?? "",
    managerId: employee?.managerId ?? "",
    employmentType: employee?.employmentType ?? "FULL_TIME",
    joinDate: employee?.joinDate ?? new Date().toISOString().slice(0, 10),
    probationEndDate: employee?.probationEndDate ?? "",
    terminationDate: employee?.terminationDate ?? "",
    passportNumber: "",
    passportExpiry: employee?.passportExpiry ?? "",
    visaNumber: "",
    visaExpiry: employee?.visaExpiry ?? "",
    emiratesIdNumber: "",
    emiratesIdExpiry: employee?.emiratesIdExpiry ?? "",
    labourCardNumber: "",
    labourCardExpiry: employee?.labourCardExpiry ?? "",
    bankName: employee?.bankName ?? "",
    iban: "",
    wpsAgentId: employee?.wpsAgentId ?? "",
    molEmployeeId: employee?.molEmployeeId ?? "",
    notes: employee?.notes ?? "",
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  function submit() {
    const n = (v: string) => v || null;
    startTransition(async () => {
      const res = await saveEmployee({
        id: employee?.id,
        name: f.name,
        email: f.email,
        phone: n(f.phone),
        dateOfBirth: n(f.dateOfBirth),
        nationality: n(f.nationality),
        jobTitle: f.jobTitle,
        department: n(f.department),
        managerId: n(f.managerId),
        employmentType: f.employmentType as EmployeeInput["employmentType"],
        joinDate: f.joinDate,
        probationEndDate: n(f.probationEndDate),
        terminationDate: n(f.terminationDate),
        passportNumber: n(f.passportNumber),
        passportExpiry: n(f.passportExpiry),
        visaNumber: n(f.visaNumber),
        visaExpiry: n(f.visaExpiry),
        emiratesIdNumber: n(f.emiratesIdNumber),
        emiratesIdExpiry: n(f.emiratesIdExpiry),
        labourCardNumber: n(f.labourCardNumber),
        labourCardExpiry: n(f.labourCardExpiry),
        bankName: n(f.bankName),
        iban: n(f.iban),
        wpsAgentId: n(f.wpsAgentId),
        molEmployeeId: n(f.molEmployeeId),
        notes: n(f.notes),
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(editing ? "Employee saved" : "Employee created");
      router.push(`/hr/employees/${res.id}`);
      router.refresh();
    });
  }

  const idField = (
    label: string,
    numKey: string,
    expKey: string,
    masked: string | null | undefined,
  ) => (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label>{label} number</Label>
        <Input
          value={f[numKey]}
          onChange={set(numKey)}
          placeholder={masked ?? "—"}
          autoComplete="off"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Expiry</Label>
        <Input type="date" value={f[expKey]} onChange={set(expKey)} />
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <Section title="Person">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Name *</Label><Input value={f.name} onChange={set("name")} /></div>
          <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={f.email} onChange={set("email")} /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input value={f.phone} onChange={set("phone")} /></div>
          <div className="space-y-1.5">
            <Label>Nationality</Label>
            <Input value={f.nationality} onChange={set("nationality")} list="country-suggestions" />
            <datalist id="country-suggestions">{COUNTRIES.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div className="space-y-1.5"><Label>Date of birth</Label><Input type="date" value={f.dateOfBirth} onChange={set("dateOfBirth")} /></div>
        </div>
      </Section>

      <Section title="Employment">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Job title *</Label><Input value={f.jobTitle} onChange={set("jobTitle")} /></div>
          <div className="space-y-1.5"><Label>Department</Label><Input value={f.department} onChange={set("department")} /></div>
          <div className="space-y-1.5">
            <Label>Manager</Label>
            <SimpleSelect value={f.managerId} onValueChange={(v) => setF((p) => ({ ...p, managerId: v }))}
              options={[{ value: "", label: "None" }, ...managers]} />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <SimpleSelect value={f.employmentType} onValueChange={(v) => setF((p) => ({ ...p, employmentType: v }))}
              options={[{ value: "FULL_TIME", label: "Full-time" }, { value: "PART_TIME", label: "Part-time" }]} />
          </div>
          <div className="space-y-1.5"><Label>Join date *</Label><Input type="date" value={f.joinDate} onChange={set("joinDate")} /></div>
          <div className="space-y-1.5"><Label>Probation ends</Label><Input type="date" value={f.probationEndDate} onChange={set("probationEndDate")} /></div>
          {editing && (
            <div className="space-y-1.5"><Label>Termination date</Label><Input type="date" value={f.terminationDate} onChange={set("terminationDate")} /></div>
          )}
        </div>
      </Section>

      <Section
        title="UAE identity"
        hint="Numbers are encrypted at rest — leave blank to keep the stored value. Expiry dates drive renewal alerts."
      >
        <div className="space-y-4">
          {idField("Passport", "passportNumber", "passportExpiry", employee?.masked.passport)}
          {idField("Visa", "visaNumber", "visaExpiry", employee?.masked.visa)}
          {idField("Emirates ID", "emiratesIdNumber", "emiratesIdExpiry", employee?.masked.eid)}
          {idField("Labour card", "labourCardNumber", "labourCardExpiry", employee?.masked.labour)}
        </div>
      </Section>

      <Section title="Bank & WPS" hint="Used for WPS SIF payroll files. IBAN is encrypted at rest.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Bank</Label><Input value={f.bankName} onChange={set("bankName")} /></div>
          <div className="space-y-1.5"><Label>IBAN</Label><Input value={f.iban} onChange={set("iban")} placeholder={employee?.masked.iban ?? "—"} autoComplete="off" /></div>
          <div className="space-y-1.5"><Label>WPS agent ID</Label><Input value={f.wpsAgentId} onChange={set("wpsAgentId")} /></div>
          <div className="space-y-1.5"><Label>MOL employee ID</Label><Input value={f.molEmployeeId} onChange={set("molEmployeeId")} /></div>
        </div>
      </Section>

      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={pending} className="gap-2">
          {pending && <Loader2 className="size-4 animate-spin" />}
          {editing ? "Save changes" : "Create employee"}
        </Button>
        <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
      </div>
    </div>
  );
}
