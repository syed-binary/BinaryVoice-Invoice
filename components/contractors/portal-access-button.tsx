"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";
import { grantPortalAccess } from "@/lib/actions/contractors/portal-access";
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

export function PortalAccessButton({
  contractorId,
  hasAccess,
  email,
}: {
  contractorId: string;
  hasAccess: boolean;
  email: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");

  function submit() {
    startTransition(async () => {
      const res = await grantPortalAccess({ contractorId, password });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(
        hasAccess ? "Portal password reset" : "Portal access granted — share the password securely",
      );
      setOpen(false);
      setPassword("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" className="w-full gap-2" />}>
        <KeyRound className="size-4" />
        {hasAccess ? "Reset portal password" : "Grant portal access"}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{hasAccess ? "Reset portal password" : "Grant portal access"}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          The contractor signs in at <span className="font-mono text-xs">/login</span> with{" "}
          <span className="font-medium">{email}</span> and sees only their own portal
          (invoices, documents, contracts). Share the password through a secure channel.
        </p>
        <div className="space-y-1.5">
          <Label>Password (min 8 characters)</Label>
          <Input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending || password.length < 8} className="gap-2">
            {pending && <Loader2 className="size-4 animate-spin" />}
            {hasAccess ? "Reset password" : "Create account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
