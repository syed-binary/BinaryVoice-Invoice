"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Trophy,
  XCircle,
  UserPlus,
  ScrollText,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  moveDealStage,
  convertProspectToClient,
  deleteDeal,
} from "@/lib/actions/crm/deals";
import { Button } from "@/components/ui/button";
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

export function DealActions({
  dealId,
  stage,
  isProspect,
  clientId,
  hasEstimate,
}: {
  dealId: string;
  stage: string;
  isProspect: boolean;
  clientId: string | null;
  hasEstimate: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [lostOpen, setLostOpen] = useState(false);
  const [reason, setReason] = useState("");
  const open = stage !== "WON" && stage !== "LOST";

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
      {isProspect && (
        <Button
          variant="outline"
          onClick={() => act(() => convertProspectToClient(dealId), "Prospect converted to client")}
          disabled={pending}
          className="gap-1.5"
        >
          <UserPlus className="size-4" /> Convert to client
        </Button>
      )}

      {clientId && !hasEstimate && open && (
        <Button
          variant="outline"
          render={<Link href={`/estimates/new?client=${clientId}&deal=${dealId}`} />}
          className="gap-1.5"
        >
          <ScrollText className="size-4" /> Create estimate
        </Button>
      )}

      {open && (
        <>
          <Button
            onClick={() => act(() => moveDealStage(dealId, "WON"), "Deal won 🎉")}
            disabled={pending}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-600/90"
          >
            <Trophy className="size-4" /> Mark won
          </Button>
          <Dialog open={lostOpen} onOpenChange={setLostOpen}>
            <DialogTrigger render={<Button variant="outline" className="gap-1.5" />}>
              <XCircle className="size-4" /> Mark lost
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mark deal lost</DialogTitle>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label>Reason (optional)</Label>
                <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <DialogFooter>
                <Button
                  variant="destructive"
                  disabled={pending}
                  className="gap-2"
                  onClick={() => {
                    setLostOpen(false);
                    act(() => moveDealStage(dealId, "LOST", reason), "Deal marked lost");
                  }}
                >
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  Mark lost
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      <Button variant="outline" render={<Link href={`/crm/deals/${dealId}/edit`} />} className="gap-1.5">
        <Pencil className="size-4" /> Edit
      </Button>

      <ConfirmButton
        trigger={
          <Button variant="outline" className="gap-1.5 text-destructive hover:text-destructive">
            <Trash2 className="size-4" /> Delete
          </Button>
        }
        title="Delete this deal?"
        description="The deal and its timeline reference will be removed. Linked estimates are kept."
        action={() => deleteDeal(dealId)}
      />
    </div>
  );
}
