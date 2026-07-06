"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Item } from "@prisma/client";
import { saveItem, type ItemFormState } from "@/lib/actions/items";
import { toNumber } from "@/lib/money";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="gap-2">
      {pending && <Loader2 className="size-4 animate-spin" />}
      {editing ? "Save changes" : "Create item"}
    </Button>
  );
}

export function ItemForm({ item }: { item?: Item | null }) {
  const [state, formAction] = useActionState<ItemFormState, FormData>(saveItem, {});
  const editing = !!item;

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      {editing && <input type="hidden" name="id" value={item!.id} />}

      <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name">Item name *</Label>
            <Input id="name" name="name" defaultValue={item?.name ?? ""} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={2} defaultValue={item?.description ?? ""} />
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="unitPrice">Unit price</Label>
              <Input id="unitPrice" name="unitPrice" type="number" step="0.01" min="0" defaultValue={item ? String(toNumber(item.unitPrice)) : "0"} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="taxRate">Tax rate (%)</Label>
              <Input id="taxRate" name="taxRate" type="number" step="0.01" min="0" defaultValue={item ? String(toNumber(item.taxRate)) : "0"} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" name="unit" placeholder="e.g. hour, item" defaultValue={item?.unit ?? ""} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" render={<Link href="/items" />}>
          Cancel
        </Button>
        <SubmitButton editing={editing} />
      </div>
    </form>
  );
}
