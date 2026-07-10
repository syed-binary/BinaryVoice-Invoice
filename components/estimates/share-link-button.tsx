"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Link2, Loader2 } from "lucide-react";
import { getEstimateShareLink } from "@/lib/actions/estimate-response";
import { Button } from "@/components/ui/button";

/** Copies the public accept/decline link for this estimate. */
export function ShareLinkButton({ estimateId }: { estimateId: string }) {
  const [pending, startTransition] = useTransition();

  function copy() {
    startTransition(async () => {
      const res = await getEstimateShareLink(estimateId);
      if (res.error || !res.path) {
        toast.error(res.error ?? "Could not create link");
        return;
      }
      const url = `${window.location.origin}${res.path}`;
      await navigator.clipboard.writeText(url);
      toast.success("Acceptance link copied — send it to your client");
    });
  }

  return (
    <Button variant="outline" onClick={copy} disabled={pending} className="gap-1.5">
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
      Copy client link
    </Button>
  );
}
