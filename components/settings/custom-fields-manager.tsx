"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, TextCursorInput } from "lucide-react";
import type { CustomFieldDefinition } from "@prisma/client";
import { saveFieldDef, deleteFieldDef } from "@/lib/actions/custom-fields";
import { fieldOptions } from "@/lib/custom-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { SimpleSelect } from "@/components/ui/simple-select";
import { EmptyState } from "@/components/app/empty-state";
import { ConfirmButton } from "@/components/app/confirm-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Entity = "CLIENT" | "INVOICE";
type FieldType = "TEXT" | "NUMBER" | "DATE" | "SELECT";

const TYPE_OPTIONS = [
  { value: "TEXT", label: "Text" },
  { value: "NUMBER", label: "Number" },
  { value: "DATE", label: "Date" },
  { value: "SELECT", label: "Dropdown" },
];

function FieldDialog({
  entity,
  field,
  trigger,
}: {
  entity: Entity;
  field?: CustomFieldDefinition;
  trigger: React.ReactElement;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState(field?.label ?? "");
  const [type, setType] = useState<FieldType>((field?.type as FieldType) ?? "TEXT");
  const [required, setRequired] = useState(field?.required ?? false);
  const [optionsText, setOptionsText] = useState(
    field ? fieldOptions(field).join("\n") : "",
  );

  function submit() {
    startTransition(async () => {
      const res = await saveFieldDef({
        id: field?.id,
        entity,
        label,
        type,
        required,
        options: optionsText.split("\n").map((s) => s.trim()).filter(Boolean),
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(field ? "Field updated" : "Field added");
      setOpen(false);
      if (!field) setLabel("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{field ? "Edit field" : "Add custom field"}</DialogTitle>
          <DialogDescription>
            Custom fields appear on {entity === "CLIENT" ? "clients" : "invoices & estimates"}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="cf-label">Label</Label>
            <Input id="cf-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. PO Number" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <SimpleSelect value={type} onValueChange={(v) => setType(v as FieldType)} options={TYPE_OPTIONS} />
            </div>
            <div className="flex items-end justify-between rounded-lg border px-3 py-2">
              <Label htmlFor="cf-req" className="cursor-pointer">Required</Label>
              <Switch id="cf-req" checked={required} onCheckedChange={setRequired} />
            </div>
          </div>
          {type === "SELECT" && (
            <div className="space-y-1.5">
              <Label htmlFor="cf-opts">Options (one per line)</Label>
              <Textarea id="cf-opts" rows={4} value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder={"Option A\nOption B"} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={pending} className="gap-2">
            {pending && <Loader2 className="size-4 animate-spin" />}
            {field ? "Save" : "Add field"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldList({
  entity,
  title,
  fields,
}: {
  entity: Entity;
  title: string;
  fields: CustomFieldDefinition[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <h3 className="font-display text-sm font-semibold">{title}</h3>
        <FieldDialog
          entity={entity}
          trigger={
            <Button size="sm" variant="outline" className="gap-1.5">
              <Plus className="size-4" /> Add
            </Button>
          }
        />
      </div>
      {fields.length === 0 ? (
        <EmptyState icon={TextCursorInput} title="No custom fields" description="Add fields to capture extra data." className="border-0 py-10" />
      ) : (
        <ul className="divide-y">
          {fields.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-2 px-5 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{f.label}</span>
                  {f.required && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Required</span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {f.type.charAt(0) + f.type.slice(1).toLowerCase()}
                  {f.type === "SELECT" && ` · ${fieldOptions(f).length} options`}
                  {" · "}
                  <span className="font-mono">{f.key}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <FieldDialog
                  entity={entity}
                  field={f}
                  trigger={
                    <Button variant="ghost" size="icon-sm">
                      <Pencil className="size-4" />
                    </Button>
                  }
                />
                <ConfirmButton
                  trigger={
                    <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="size-4" />
                    </Button>
                  }
                  title="Delete this field?"
                  description="Existing records keep their saved values, but the field won't appear on forms anymore."
                  action={() => startTransition(() => deleteFieldDef(f.id).then(() => router.refresh()))}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CustomFieldsManager({
  clientFields,
  invoiceFields,
}: {
  clientFields: CustomFieldDefinition[];
  invoiceFields: CustomFieldDefinition[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <FieldList entity="INVOICE" title="Invoice & estimate fields" fields={invoiceFields} />
      <FieldList entity="CLIENT" title="Client fields" fields={clientFields} />
    </div>
  );
}
