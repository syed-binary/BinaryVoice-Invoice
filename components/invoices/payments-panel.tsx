"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Wallet } from "lucide-react";
import { addPayment, deletePayment } from "@/lib/actions/payments";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SimpleSelect } from "@/components/ui/simple-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Payment = {
  id: string;
  amount: number;
  date: string;
  method: string | null;
  reference: string | null;
};

const METHODS = [
  { value: "Bank transfer", label: "Bank transfer" },
  { value: "Cash", label: "Cash" },
  { value: "Card", label: "Card" },
  { value: "Cheque", label: "Cheque" },
  { value: "Other", label: "Other" },
];

export function PaymentsPanel({
  invoiceId,
  currency,
  amountDue,
  payments,
}: {
  invoiceId: string;
  currency: string;
  amountDue: number;
  payments: Payment[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  const [amount, setAmount] = useState(amountDue > 0 ? String(amountDue) : "");
  const [date, setDate] = useState(today);
  const [method, setMethod] = useState("Bank transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  function submit() {
    startTransition(async () => {
      const res = await addPayment({
        invoiceId,
        amount: Number(amount) || 0,
        date,
        method,
        reference,
        notes,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Payment recorded");
      setOpen(false);
      setReference("");
      setNotes("");
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deletePayment(id);
      toast.success("Payment removed");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold">Payments</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" variant="outline" className="gap-1.5" />}>
            <Plus className="size-4" /> Record
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record payment</DialogTitle>
              <DialogDescription>
                Log a payment received against this invoice.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pay-amount">Amount</Label>
                  <Input
                    id="pay-amount"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pay-date">Date</Label>
                  <Input id="pay-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Method</Label>
                <SimpleSelect value={method} onValueChange={setMethod} options={METHODS} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-ref">Reference</Label>
                <Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction ref (optional)" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pay-notes">Notes</Label>
                <Textarea id="pay-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit} disabled={pending} className="gap-2">
                {pending && <Loader2 className="size-4 animate-spin" />}
                Save payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {payments.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <Wallet className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        </div>
      ) : (
        <ul className="divide-y">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <div className="text-sm font-semibold tabular">
                  {formatMoney(p.amount, currency)}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {formatDate(p.date)}
                  {p.method ? ` · ${p.method}` : ""}
                  {p.reference ? ` · ${p.reference}` : ""}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => remove(p.id)}
                disabled={pending}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
