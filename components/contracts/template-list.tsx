"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Plus } from "lucide-react";
import {
  saveTemplate,
  archiveTemplate,
  type TemplateInput,
} from "@/lib/actions/contracts/library";
import { CONTRACT_TYPE_LABEL } from "@/lib/contract-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SimpleSelect } from "@/components/ui/simple-select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface TemplateRow {
  id: string;
  name: string;
  type: string;
  body: string;
}

const TYPE_OPTIONS = Object.entries(CONTRACT_TYPE_LABEL).map(([value, label]) => ({
  value,
  label,
}));

const EMPTY: TemplateInput = { name: "", type: "OTHER", body: "" };

export function TemplateList({ templates }: { templates: TemplateRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateInput & { id?: string }>(EMPTY);

  function openFor(t?: TemplateRow) {
    setEditing(
      t ? { id: t.id, name: t.name, type: t.type as TemplateInput["type"], body: t.body } : EMPTY,
    );
    setOpen(true);
  }

  function submit() {
    startTransition(async () => {
      const res = await saveTemplate(editing);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Template saved");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openFor()} className="gap-2">
          <Plus className="size-4" /> New template
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {templates.map((t) => (
          <div key={t.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t.name}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {CONTRACT_TYPE_LABEL[t.type] ?? t.type}
                </span>
                {t.body.includes("{{clauses}}") && (
                  <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-medium text-sky-600">
                    uses clause packs
                  </span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => openFor(t)}>
              <Pencil className="size-4" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Edit template" : "New template"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={editing.name}
                onChange={(e) => setEditing((x) => ({ ...x, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <SimpleSelect
                value={editing.type ?? "OTHER"}
                onValueChange={(v) => setEditing((x) => ({ ...x, type: v as TemplateInput["type"] }))}
                options={TYPE_OPTIONS}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>
                Body — markdown with {"{{merge.fields}}"}; use {"{{clauses}}"} where the
                jurisdiction pack should go
              </Label>
              <Textarea
                rows={18}
                value={editing.body}
                onChange={(e) => setEditing((x) => ({ ...x, body: e.target.value }))}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {editing.id && (
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() =>
                  startTransition(async () => {
                    await archiveTemplate(editing.id!, true);
                    setOpen(false);
                    router.refresh();
                  })
                }
              >
                Archive
              </Button>
            )}
            <Button onClick={submit} disabled={pending} className="gap-2">
              {pending && <Loader2 className="size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
