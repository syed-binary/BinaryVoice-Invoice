"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Banknote, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmButton } from "@/components/app/confirm-button";
import {
  approvePayoutRun,
  markPayoutRunPaid,
  deletePayoutRun,
} from "@/lib/actions/contractors/payouts";

export function RunActions({ runId, status }: { runId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [paidOpen, setPaidOpen] = useState(false);
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");

  const act = (fn: () => Promise<{ error?: string } | void>, success: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(success);
      router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "DRAFT" && (
        <Button
          onClick={() => act(() => approvePayoutRun(runId), "Run approved")}
          disabled={pending}
          className="gap-1.5"
        >
          <CheckCircle2 className="size-4" /> Approve
        </Button>
      )}

      {status === "APPROVED" && (
        <Dialog open={paidOpen} onOpenChange={setPaidOpen}>
          <DialogTrigger render={<Button className="gap-1.5" />}>
            <Banknote className="size-4" /> Mark paid
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark run as paid</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Records the batch you sent via bank/Wise. Payout FX rates are
              re-snapshotted at the paid date.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Paid date</Label>
                <Input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Method</Label>
                <Input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Wise / bank" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Reference</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={pending}
                className="gap-2"
                onClick={() => {
                  setPaidOpen(false);
                  act(
                    () =>
                      markPayoutRunPaid({
                        id: runId,
                        paidDate,
                        method: method || null,
                        reference: reference || null,
                      }),
                    "Run marked paid",
                  );
                }}
              >
                {pending && <Loader2 className="size-4 animate-spin" />}
                Mark paid
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {status !== "PAID" && (
        <ConfirmButton
          trigger={
            <Button variant="outline" className="gap-1.5 text-destructive hover:text-destructive">
              <Trash2 className="size-4" /> Delete
            </Button>
          }
          title="Delete this payout run?"
          description="Scheduled payables will return to approved."
          action={() => deletePayoutRun(runId)}
          onDone={() => router.push("/payouts")}
        />
      )}
    </div>
  );
}
