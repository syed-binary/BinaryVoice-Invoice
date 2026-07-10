import { prisma } from "@/lib/prisma";
import { contractHtml } from "@/lib/contracts/markdown";
import { markViewed } from "@/lib/actions/contracts/signing";
import { formatDateLong } from "@/lib/format";
import { Logo } from "@/components/brand/logo";
import { SignForm } from "@/components/contracts/sign-form";
import { CheckCircle2, ShieldX } from "lucide-react";

export const dynamic = "force-dynamic";

/** Public signing page — authenticated by the unguessable token only. */
export default async function SignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const signatory = await prisma.contractSignatory.findUnique({
    where: { token },
    include: { contract: true },
  });

  if (!signatory || !signatory.contract.bodySnapshot) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <ShieldX className="size-10 text-destructive" />
        <h1 className="font-display text-xl font-semibold">Invalid signing link</h1>
        <p className="text-sm text-muted-foreground">
          This link is not valid or has been revoked. Contact the sender for a new one.
        </p>
      </div>
    );
  }

  await markViewed(token);
  const contract = signatory.contract;
  const alreadySigned = !!signatory.signedAt;
  const closed = contract.status !== "SENT" && !alreadySigned;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <div className="mb-6 flex items-center justify-between">
        <Logo />
        <span className="font-mono text-xs text-muted-foreground">{contract.number}</span>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-10">
        <div
          className="prose prose-sm max-w-none [&_h1]:font-display [&_table]:text-sm"
          dangerouslySetInnerHTML={{ __html: contractHtml(contract.bodySnapshot ?? contract.body) }}
        />
      </div>

      <div className="mt-6 rounded-xl border bg-card p-6 shadow-sm">
        {alreadySigned ? (
          <div className="flex items-center gap-3 text-emerald-600">
            <CheckCircle2 className="size-6" />
            <div>
              <div className="font-semibold">
                Signed by {signatory.signatureName}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatDateLong(signatory.signedAt!)} · a copy is retained by{" "}
                {contract.title.split("—")[0]}
              </div>
            </div>
          </div>
        ) : closed ? (
          <p className="text-sm text-muted-foreground">
            This contract is no longer open for signing.
          </p>
        ) : (
          <SignForm token={token} signatoryName={signatory.name} />
        )}
      </div>

      {contract.bodyHash && (
        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          Document integrity: SHA-256 {contract.bodyHash}
        </p>
      )}
    </div>
  );
}
