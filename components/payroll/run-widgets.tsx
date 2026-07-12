"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Banknote, CheckCircle2, Loader2, Plus, Trash2, X } from "lucide-react";
import {
  createPayrollRun, approvePayrollRun, markPayrollRunPaid,
  deletePayrollRun, addAdjustment, removeAdjustment,
} from "@/lib/actions/payroll/runs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleSelect } from "@/components/ui/simple-select";
import { ConfirmButton } from "@/components/app/confirm-button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: new Date(2026, i, 1).toLocaleString("en", { month: "long" }),
}));

export function CreateRunButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="gap-2" />}>
        <Plus className="size-4" /> New payroll run
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New payroll run</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Snapshots each active employee&apos;s latest compensation for the period.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Month</Label><SimpleSelect value={month} onValueChange={setMonth} options={MONTHS} /></div>
          <div className="space-y-1.5"><Label>Year</Label><Input type="number" value={year} onChange={(e) => setYear(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button disabled={pending} className="gap-2"
            onClick={() =>
              startTransition(async () => {
                const res = await createPayrollRun({ periodYear: Number(year), periodMonth: Number(month) });
                if (res.error) { toast.error(res.error); return; }
                setOpen(false);
                router.push(`/payroll/${res.id}`);
                router.refresh();
              })
            }>
            {pending && <Loader2 className="size-4 animate-spin" />} Create draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RunActions({ runId, status }: { runId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [paidOpen, setPaidOpen] = useState(false);
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));

  const act = (fn: () => Promise<{ error?: string } | void>, msg: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) { toast.error(res.error); return; }
      toast.success(msg);
      router.refresh();
    });

  return (
    <div className="flex flex-wrap gap-2">
      {status === "DRAFT" && (
        <Button onClick={() => act(() => approvePayrollRun(runId), "Run approved")} disabled={pending} className="gap-1.5">
          <CheckCircle2 className="size-4" /> Approve
        </Button>
      )}
      {status !== "DRAFT" && (
        <Button variant="outline" render={<a href={`/api/payroll/${runId}/sif`} />} className="gap-1.5">
          <Banknote className="size-4" /> Download WPS SIF
        </Button>
      )}
      {status === "APPROVED" && (
        <Dialog open={paidOpen} onOpenChange={setPaidOpen}>
          <DialogTrigger render={<Button className="gap-1.5" />}>
            <Banknote className="size-4" /> Mark paid
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Mark run paid</DialogTitle></DialogHeader>
            <div className="space-y-1.5"><Label>Paid date</Label><Input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} /></div>
            <DialogFooter>
              <Button disabled={pending} className="gap-2"
                onClick={() => { setPaidOpen(false); act(() => markPayrollRunPaid(runId, paidDate), "Run marked paid"); }}>
                {pending && <Loader2 className="size-4 animate-spin" />} Mark paid
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {status === "DRAFT" && (
        <ConfirmButton
          trigger={<Button variant="outline" className="gap-1.5 text-destructive hover:text-destructive"><Trash2 className="size-4" /> Delete</Button>}
          title="Delete this draft run?" description="Payslips in this run will be removed."
          action={() => deletePayrollRun(runId)} />
      )}
    </div>
  );
}

export function AdjustmentControls({
  payslipId, editable, lines,
}: {
  payslipId: string;
  editable: boolean;
  lines: { id: string; type: string; label: string; amount: number }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("EARNING");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  return (
    <div className="space-y-1">
      {lines.map((l) => (
        <div key={l.id} className="flex items-center justify-between gap-2 text-xs">
          <span className={l.type === "DEDUCTION" ? "text-destructive" : "text-emerald-600"}>
            {l.type === "DEDUCTION" ? "−" : "+"} {l.label}: {l.amount.toFixed(2)}
          </span>
          {editable && (
            <button className="text-muted-foreground/50 hover:text-destructive"
              onClick={() => startTransition(async () => { await removeAdjustment(l.id); router.refresh(); })}>
              <X className="size-3" />
            </button>
          )}
        </div>
      ))}
      {editable && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<button className="text-xs text-primary hover:underline" />}>
            + adjust
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adjustment</DialogTitle></DialogHeader>
            <div className="grid gap-3 sm:grid-cols-3">
              <SimpleSelect value={type} onValueChange={setType}
                options={[{ value: "EARNING", label: "Earning" }, { value: "DEDUCTION", label: "Deduction" }]} />
              <Input placeholder="Label (e.g. bonus, unpaid leave)" value={label} onChange={(e) => setLabel(e.target.value)} />
              <Input type="number" min="0" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <DialogFooter>
              <Button disabled={pending || !label || !amount} className="gap-2"
                onClick={() =>
                  startTransition(async () => {
                    const res = await addAdjustment({ payslipId, type: type as "EARNING", label, amount: Number(amount) });
                    if (res.error) { toast.error(res.error); return; }
                    setOpen(false); setLabel(""); setAmount("");
                    router.refresh();
                  })
                }>
                {pending && <Loader2 className="size-4 animate-spin" />} Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
