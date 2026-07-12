"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, KeyRound, Loader2, Plus, X } from "lucide-react";
import { decideLeave, requestLeave, addCompensation } from "@/lib/actions/hr/leave";
import { grantEmployeePortalAccess } from "@/lib/actions/hr/employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SimpleSelect } from "@/components/ui/simple-select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export function LeaveDecideButtons({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const act = (decision: "APPROVED" | "REJECTED") =>
    startTransition(async () => {
      const res = await decideLeave(requestId, decision);
      if (res.error) toast.error(res.error);
      else toast.success(`Leave ${decision.toLowerCase()}`);
      router.refresh();
    });
  return (
    <div className="flex gap-1.5">
      <Button size="sm" disabled={pending} onClick={() => act("APPROVED")} className="gap-1 bg-emerald-600 hover:bg-emerald-600/90">
        <Check className="size-3.5" /> Approve
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => act("REJECTED")} className="gap-1">
        <X className="size-3.5" /> Reject
      </Button>
    </div>
  );
}

export function LeaveRequestForm({
  employeeId,
  leaveTypes,
  compactTrigger = false,
}: {
  employeeId: string;
  leaveTypes: { value: string; label: string }[];
  compactTrigger?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState(leaveTypes[0]?.value ?? "");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  function submit() {
    startTransition(async () => {
      const res = await requestLeave({ employeeId, leaveTypeId, startDate, endDate, reason: reason || null });
      if (res.error) { toast.error(res.error); return; }
      toast.success("Leave requested");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size={compactTrigger ? "sm" : "default"} className="gap-1.5" />}>
        <Plus className="size-4" /> Request leave
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Request leave</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Type</Label>
            <SimpleSelect value={leaveTypeId} onValueChange={setLeaveTypeId} options={leaveTypes} />
          </div>
          <div className="space-y-1.5"><Label>From</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>To</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label>Reason (optional)</Label><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending || !startDate || !endDate} className="gap-2">
            {pending && <Loader2 className="size-4 animate-spin" />} Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CompensationForm({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ effectiveDate: "", basicSalary: "", housingAllowance: "", transportAllowance: "", otherAllowances: "", note: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  function submit() {
    startTransition(async () => {
      const res = await addCompensation({
        employeeId,
        effectiveDate: f.effectiveDate,
        basicSalary: Number(f.basicSalary || 0),
        housingAllowance: Number(f.housingAllowance || 0),
        transportAllowance: Number(f.transportAllowance || 0),
        otherAllowances: Number(f.otherAllowances || 0),
        note: f.note || null,
      });
      if (res.error) { toast.error(res.error); return; }
      toast.success("Compensation recorded");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
        <Plus className="size-4" /> New record
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New compensation record (AED/month)</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Effective date</Label><Input type="date" value={f.effectiveDate} onChange={set("effectiveDate")} /></div>
          <div className="space-y-1.5"><Label>Basic salary</Label><Input type="number" min="0" value={f.basicSalary} onChange={set("basicSalary")} /></div>
          <div className="space-y-1.5"><Label>Housing</Label><Input type="number" min="0" value={f.housingAllowance} onChange={set("housingAllowance")} /></div>
          <div className="space-y-1.5"><Label>Transport</Label><Input type="number" min="0" value={f.transportAllowance} onChange={set("transportAllowance")} /></div>
          <div className="space-y-1.5"><Label>Other</Label><Input type="number" min="0" value={f.otherAllowances} onChange={set("otherAllowances")} /></div>
          <div className="space-y-1.5"><Label>Note</Label><Input value={f.note} onChange={set("note")} /></div>
        </div>
        <p className="text-xs text-muted-foreground">Basic vs allowances split drives gratuity and WPS in the payroll phase.</p>
        <DialogFooter>
          <Button onClick={submit} disabled={pending || !f.effectiveDate} className="gap-2">
            {pending && <Loader2 className="size-4 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EmployeePortalButton({ employeeId, hasAccess, email }: { employeeId: string; hasAccess: boolean; email: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="w-full gap-2" />}>
        <KeyRound className="size-4" /> {hasAccess ? "Reset portal password" : "Grant portal access"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Employee portal access</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          {email} signs in at /login and sees only their own leave and documents.
        </p>
        <div className="space-y-1.5"><Label>Password (min 8 chars)</Label><Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" /></div>
        <DialogFooter>
          <Button
            disabled={pending || password.length < 8}
            className="gap-2"
            onClick={() =>
              startTransition(async () => {
                const res = await grantEmployeePortalAccess(employeeId, password);
                if (res.error) { toast.error(res.error); return; }
                toast.success("Portal access ready");
                setOpen(false);
                setPassword("");
                router.refresh();
              })
            }
          >
            {pending && <Loader2 className="size-4 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
