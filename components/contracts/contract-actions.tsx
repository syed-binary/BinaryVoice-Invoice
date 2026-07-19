"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Send,
  Pencil,
  Trash2,
  Loader2,
  FileDown,
  CheckCircle2,
  Ban,
  Plus,
  X,
} from "lucide-react";
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
  sendContract,
  setContractStatus,
  deleteContract,
} from "@/lib/actions/contracts/contracts";

type Sig = { name: string; email: string };

export function ContractActions({
  contractId,
  status,
  defaultSignatory,
}: {
  contractId: string;
  status: string;
  defaultSignatory?: Sig | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sendOpen, setSendOpen] = useState(false);
  const [sigs, setSigs] = useState<Sig[]>(
    defaultSignatory ? [defaultSignatory] : [{ name: "", email: "" }],
  );

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
        <>
          <Button variant="outline" render={<Link href={`/contracts/${contractId}/edit`} />} className="gap-1.5">
            <Pencil className="size-4" /> Edit draft
          </Button>
          <Dialog open={sendOpen} onOpenChange={setSendOpen}>
            <DialogTrigger render={<Button className="gap-1.5" />}>
              <Send className="size-4" /> Send for signature
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Send for signature</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                The body is frozen and hashed; each signatory gets a private
                signing link by email.
              </p>
              <div className="space-y-3">
                {sigs.map((s, i) => (
                  <div key={i} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1.5">
                      {i === 0 && <Label>Name</Label>}
                      <Input
                        value={s.name}
                        onChange={(e) =>
                          setSigs((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {i === 0 && <Label>Email</Label>}
                      <Input
                        type="email"
                        value={s.email}
                        onChange={(e) =>
                          setSigs((prev) => prev.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))
                        }
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={sigs.length === 1}
                      onClick={() => setSigs((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setSigs((prev) => [...prev, { name: "", email: "" }])}
                >
                  <Plus className="size-4" /> Add signatory
                </Button>
              </div>
              <DialogFooter>
                <Button
                  disabled={pending}
                  className="gap-2"
                  onClick={() => {
                    setSendOpen(false);
                    act(() => sendContract({ id: contractId, signatories: sigs }), "Sent for signature");
                  }}
                >
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  Freeze & send
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {(status === "SIGNED" || status === "SENT") && (
        <Button
          variant="outline"
          onClick={() => act(() => setContractStatus(contractId, "ACTIVE"), "Contract active")}
          disabled={pending}
          className="gap-1.5"
        >
          <CheckCircle2 className="size-4" /> Mark active
        </Button>
      )}

      <Button variant="outline" render={<a href={`/api/pdf/contract/${contractId}?download=1`} />} className="gap-1.5">
        <FileDown className="size-4" /> PDF
      </Button>

      {["SENT", "SIGNED", "ACTIVE"].includes(status) && (
        <ConfirmButton
          trigger={
            <Button variant="outline" className="gap-1.5 text-destructive hover:text-destructive">
              <Ban className="size-4" /> Terminate
            </Button>
          }
          title="Terminate this contract?"
          description="The contract is marked terminated; the signed record is retained."
          confirmLabel="Terminate"
          action={() => setContractStatus(contractId, "TERMINATED")}
          onDone={() => router.refresh()}
        />
      )}

      {status === "DRAFT" && (
        <ConfirmButton
          trigger={
            <Button variant="outline" className="gap-1.5 text-destructive hover:text-destructive">
              <Trash2 className="size-4" /> Delete
            </Button>
          }
          title="Delete this draft?"
          description="The draft and its versions will be permanently removed."
          action={() => deleteContract(contractId)}
        />
      )}
    </div>
  );
}
