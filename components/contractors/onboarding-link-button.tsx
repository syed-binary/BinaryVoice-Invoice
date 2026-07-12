"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Link2, Loader2 } from "lucide-react";
import { generateOnboardingLink } from "@/lib/actions/contractors/onboarding";
import { Button } from "@/components/ui/button";

/** Copies the contractor's public self-onboarding link. */
export function OnboardingLinkButton({ contractorId }: { contractorId: string }) {
  const [pending, startTransition] = useTransition();

  function copy() {
    startTransition(async () => {
      const res = await generateOnboardingLink(contractorId);
      if (res.error || !res.path) { toast.error(res.error ?? "Failed"); return; }
      await navigator.clipboard.writeText(`${window.location.origin}${res.path}`);
      toast.success("Onboarding link copied — send it to the contractor");
    });
  }

  return (
    <Button variant="outline" onClick={copy} disabled={pending} className="w-full gap-2">
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
      Copy onboarding link
    </Button>
  );
}
