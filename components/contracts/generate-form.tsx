"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { generateContract } from "@/lib/actions/contracts/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleSelect } from "@/components/ui/simple-select";

export interface Option {
  value: string;
  label: string;
}

export function GenerateContractForm({
  templates,
  contractors,
  clients,
  engagements,
}: {
  templates: (Option & { usesClauses: boolean })[];
  contractors: Option[];
  clients: Option[];
  engagements: (Option & { contractorId: string })[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [templateId, setTemplateId] = useState(templates[0]?.value ?? "");
  const [party, setParty] = useState<"contractor" | "client">("contractor");
  const [contractorId, setContractorId] = useState("");
  const [clientId, setClientId] = useState("");
  const [engagementId, setEngagementId] = useState("");
  const [title, setTitle] = useState("");

  const template = templates.find((t) => t.value === templateId);
  const contractorEngagements = engagements.filter((e) => e.contractorId === contractorId);

  function submit() {
    startTransition(async () => {
      const res = await generateContract({
        templateId,
        contractorId: party === "contractor" ? contractorId || null : null,
        clientId: party === "client" ? clientId || null : null,
        engagementId: party === "contractor" ? engagementId || null : null,
        title: title || null,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      if (res.noJurisdictionPack) {
        toast.warning(
          "No clause pack for this contractor's country — only the global pack was included. Add a pack under Contracts → Clauses.",
        );
      }
      if (res.unreviewedClauses) {
        toast.warning(
          `${res.unreviewedClauses} clause(s) in this draft have not been reviewed by counsel yet.`,
        );
      }
      if (res.missing?.length) {
        toast.warning(`Fill in: ${res.missing.join(", ")} (marked in the draft)`);
      }
      toast.success("Draft generated");
      router.push(`/contracts/${res.id}/edit`);
      router.refresh();
    });
  }

  return (
    <div className="max-w-xl space-y-5">
      <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>Template</Label>
            <SimpleSelect value={templateId} onValueChange={setTemplateId} options={templates} />
            {template?.usesClauses && (
              <p className="text-xs text-muted-foreground">
                Includes the jurisdiction clause pack for the contractor&apos;s country.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Counterparty</Label>
            <SimpleSelect
              value={party}
              onValueChange={(v) => setParty(v as "contractor" | "client")}
              options={[
                { value: "contractor", label: "Contractor" },
                { value: "client", label: "Client" },
              ]}
            />
          </div>

          {party === "contractor" ? (
            <>
              <div className="space-y-1.5">
                <Label>Contractor</Label>
                <SimpleSelect
                  value={contractorId}
                  onValueChange={(v) => {
                    setContractorId(v);
                    setEngagementId("");
                  }}
                  options={contractors}
                  placeholder="Select a contractor"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Engagement (fills role, dates and rate)</Label>
                <SimpleSelect
                  value={engagementId}
                  onValueChange={setEngagementId}
                  options={[{ value: "", label: "None" }, ...contractorEngagements]}
                />
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <Label>Client</Label>
              <SimpleSelect
                value={clientId}
                onValueChange={setClientId}
                options={clients}
                placeholder="Select a client"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Title (optional)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Defaults to template — counterparty"
            />
          </div>
        </div>
      </div>

      <Button onClick={submit} disabled={pending} className="gap-2">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        Generate draft
      </Button>
    </div>
  );
}
