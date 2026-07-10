"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Banknote, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  approvePayable,
  rejectPayable,
  recordPayout,
  deletePayable,
} from "@/lib/actions/contractors/payables";

export function PayableActions({
  payableId,
  status,
}: {
  payableId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [fee, setFee] = useState("");

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
      {status === "RECEIVED" && (
        <>
          <Button
            onClick={() => act(() => approvePayable(payableId), "Payable approved")}
            disabled={pending}
            className="gap-1.5"
          >
            <CheckCircle2 className="size-4" /> Approve
          </Button>
          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogTrigger render={<Button variant="outline" className="gap-1.5" />}>
              <XCircle className="size-4" /> Reject
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject payable</DialogTitle>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <DialogFooter>
                <Button
                  variant="destructive"
                  disabled={pending}
                  onClick={() => {
                    setRejectOpen(false);
                    act(() => rejectPayable(payableId, reason), "Payable rejected");
                  }}
                >
                  Reject
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" render={<Link href={`/payables/${payableId}/edit`} />} className="gap-1.5">
            <Pencil className="size-4" /> Edit
          </Button>
        </>
      )}

      {(status === "APPROVED" || status === "SCHEDULED") && (
        <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
          <DialogTrigger render={<Button className="gap-1.5" />}>
            <Banknote className="size-4" /> Record payout
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record payout</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Track-only: records the transfer you made via bank/Wise.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Paid date</Label>
                <Input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Transfer fee (optional)</Label>
                <Input type="number" min="0" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Reference</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Wise/bank reference" />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={pending}
                className="gap-2"
                onClick={() => {
                  setPayoutOpen(false);
                  act(
                    () =>
                      recordPayout({
                        payableId,
                        paidDate,
                        reference: reference || null,
                        feeAmount: fee === "" ? null : Number(fee),
                      }),
                    "Payout recorded",
                  );
                }}
              >
                {pending && <Loader2 className="size-4 animate-spin" />}
                Record
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
          title="Delete this payable?"
          description="The payable and its lines will be permanently removed."
          action={() => deletePayable(payableId)}
        />
      )}
    </div>
  );
}
