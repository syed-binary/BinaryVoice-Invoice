"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { respondToEstimate } from "@/lib/actions/estimate-response";
import { Button } from "@/components/ui/button";

export function EstimateRespond({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const respond = (decision: "ACCEPTED" | "DECLINED") =>
    startTransition(async () => {
      const res = await respondToEstimate(token, decision);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });

  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm text-muted-foreground">
        Ready to proceed? Your response is recorded instantly.
      </p>
      <div className="flex gap-3">
        <Button
          onClick={() => respond("ACCEPTED")}
          disabled={pending}
          className="gap-2 bg-emerald-600 hover:bg-emerald-600/90"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          Accept estimate
        </Button>
        <Button variant="outline" onClick={() => respond("DECLINED")} disabled={pending} className="gap-2">
          <XCircle className="size-4" /> Decline
        </Button>
      </div>
    </div>
  );
}
