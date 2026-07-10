"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Star, Trash2, UserRound } from "lucide-react";
import { saveContact, deleteContact, type ContactInput } from "@/lib/actions/crm/contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ContactRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  isPrimary: boolean;
}

export function ContactsCard({
  clientId,
  contacts,
}: {
  clientId: string;
  contacts: ContactRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ContactInput & { id?: string }>({
    clientId,
    name: "",
    isPrimary: false,
  });

  function openFor(c?: ContactRow) {
    setEditing(
      c
        ? {
            id: c.id,
            clientId,
            name: c.name,
            email: c.email ?? "",
            phone: c.phone ?? "",
            title: c.title ?? "",
            isPrimary: c.isPrimary,
          }
        : { clientId, name: "", isPrimary: contacts.length === 0 },
    );
    setOpen(true);
  }

  function submit() {
    startTransition(async () => {
      const res = await saveContact(editing);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">Contacts</h3>
        <Button variant="ghost" size="icon-sm" onClick={() => openFor()}>
          <Plus className="size-4" />
        </Button>
      </div>

      {contacts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No contact persons yet.</p>
      ) : (
        <ul className="space-y-3">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-start gap-2.5">
              <UserRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{c.name}</span>
                  {c.isPrimary && <Star className="size-3 fill-amber-400 text-amber-400" />}
                </div>
                <div className="text-xs text-muted-foreground">
                  {[c.title, c.email, c.phone].filter(Boolean).join(" · ")}
                </div>
              </div>
              <button className="text-muted-foreground/60 hover:text-foreground" onClick={() => openFor(c)}>
                <Pencil className="size-3.5" />
              </button>
              <button
                className="text-muted-foreground/60 hover:text-destructive"
                onClick={() =>
                  startTransition(async () => {
                    await deleteContact(c.id);
                    router.refresh();
                  })
                }
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing.id ? "Edit contact" : "New contact"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={editing.name}
                onChange={(e) => setEditing((x) => ({ ...x, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Job title</Label>
              <Input
                value={editing.title ?? ""}
                onChange={(e) => setEditing((x) => ({ ...x, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={editing.email ?? ""}
                onChange={(e) => setEditing((x) => ({ ...x, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={editing.phone ?? ""}
                onChange={(e) => setEditing((x) => ({ ...x, phone: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editing.isPrimary ?? false}
                onCheckedChange={(v) => setEditing((x) => ({ ...x, isPrimary: v }))}
              />
              <Label>Primary contact</Label>
            </div>
          </div>
          <DialogFooter>
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
