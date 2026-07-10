"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, ShieldCheck, ShieldAlert } from "lucide-react";
import {
  saveClause,
  markClauseReviewed,
  archiveClause,
  type ClauseInput,
} from "@/lib/actions/contracts/library";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { SimpleSelect } from "@/components/ui/simple-select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface ClauseRow {
  id: string;
  jurisdiction: string;
  category: string;
  title: string;
  body: string;
  mandatory: boolean;
  sortOrder: number;
  version: number;
  reviewedBy: string | null;
  reviewedAt: Date | null;
}

const CATEGORIES = [
  "ENGAGEMENT_STATUS",
  "TAX_WITHHOLDING",
  "IP_ASSIGNMENT",
  "CONFIDENTIALITY",
  "DATA_PROTECTION",
  "TERMINATION",
  "NON_SOLICIT",
  "DISPUTE_LAW",
  "COMPLIANCE",
  "PAYMENT",
  "OTHER",
].map((c) => ({ value: c, label: c.replaceAll("_", " ").toLowerCase() }));

const EMPTY: ClauseInput = {
  jurisdiction: "*",
  category: "OTHER",
  title: "",
  body: "",
  mandatory: true,
  sortOrder: 0,
};

export function ClauseList({ clauses }: { clauses: ClauseRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClauseInput & { id?: string }>(EMPTY);

  const groups = [...new Set(clauses.map((c) => c.jurisdiction))].sort((a, b) =>
    a === "*" ? -1 : b === "*" ? 1 : a.localeCompare(b),
  );

  function openFor(c?: ClauseRow) {
    setEditing(
      c
        ? {
            id: c.id,
            jurisdiction: c.jurisdiction,
            category: c.category as ClauseInput["category"],
            title: c.title,
            body: c.body,
            mandatory: c.mandatory,
            sortOrder: c.sortOrder,
          }
        : EMPTY,
    );
    setOpen(true);
  }

  function submit() {
    startTransition(async () => {
      const res = await saveClause(editing);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Clause saved (marked unreviewed until counsel sign-off)");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => openFor()} className="gap-2">
          <Plus className="size-4" /> New clause
        </Button>
      </div>

      {groups.map((j) => (
        <div key={j}>
          <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {j === "*" ? "Global (all jurisdictions)" : j}
          </h2>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            {clauses
              .filter((c) => c.jurisdiction === j)
              .map((c) => (
                <div key={c.id} className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{c.title}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {c.category.replaceAll("_", " ").toLowerCase()}
                      </span>
                      {!c.mandatory && (
                        <span className="text-[10px] text-muted-foreground">optional</span>
                      )}
                      <span
                        className={cn(
                          "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                          c.reviewedAt
                            ? "bg-emerald-500/15 text-emerald-600"
                            : "bg-amber-500/15 text-amber-600",
                        )}
                      >
                        {c.reviewedAt ? (
                          <>
                            <ShieldCheck className="size-3" /> reviewed · {c.reviewedBy}
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="size-3" /> awaiting counsel review
                          </>
                        )}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{c.body}</p>
                  </div>
                  {!c.reviewedAt && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const name = window.prompt("Reviewed by (counsel name)?");
                          if (!name) return;
                          await markClauseReviewed(c.id, name);
                          router.refresh();
                        })
                      }
                    >
                      Mark reviewed
                    </Button>
                  )}
                  <Button variant="ghost" size="icon-sm" onClick={() => openFor(c)}>
                    <Pencil className="size-4" />
                  </Button>
                </div>
              ))}
          </div>
        </div>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Edit clause" : "New clause"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Jurisdiction (ISO or *)</Label>
              <Input
                value={editing.jurisdiction}
                onChange={(e) => setEditing((x) => ({ ...x, jurisdiction: e.target.value }))}
                placeholder="GB / IN / *"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <SimpleSelect
                value={editing.category ?? "OTHER"}
                onValueChange={(v) => setEditing((x) => ({ ...x, category: v as ClauseInput["category"] }))}
                options={CATEGORIES}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch
                checked={editing.mandatory ?? true}
                onCheckedChange={(v) => setEditing((x) => ({ ...x, mandatory: v }))}
              />
              <Label>Mandatory</Label>
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label>Title</Label>
              <Input
                value={editing.title}
                onChange={(e) => setEditing((x) => ({ ...x, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label>Body (markdown, merge fields allowed)</Label>
              <Textarea
                rows={8}
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
                    await archiveClause(editing.id!, true);
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
