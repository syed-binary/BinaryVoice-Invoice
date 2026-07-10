"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, PenLine } from "lucide-react";
import { signContract } from "@/lib/actions/contracts/signing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export function SignForm({
  token,
  signatoryName,
}: {
  token: string;
  signatoryName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);

  function submit() {
    if (!agreed) {
      toast.error("Tick the agreement box first");
      return;
    }
    startTransition(async () => {
      const res = await signContract({ token, signatureName: name, agreed: true });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Signed — thank you");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold">Sign as {signatoryName}</h2>
        <p className="text-sm text-muted-foreground">
          Type your full legal name below. Your signature, IP address and
          timestamp are recorded against this document&apos;s hash.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signatureName">Full legal name</Label>
        <Input
          id="signatureName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={signatoryName}
          className="max-w-sm font-serif text-lg italic"
        />
      </div>
      <label className="flex items-start gap-2.5 text-sm">
        <Checkbox
          checked={agreed}
          onCheckedChange={(v) => setAgreed(v === true)}
          className="mt-0.5"
        />
        <span>
          I have read and agree to the terms above, and I intend my typed name
          to be my electronic signature.
        </span>
      </label>
      <Button onClick={submit} disabled={pending || name.trim().length < 2} className="gap-2">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <PenLine className="size-4" />}
        Sign contract
      </Button>
    </div>
  );
}
