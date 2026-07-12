import { prisma } from "@/lib/prisma";
import { getCompany } from "@/lib/company";
import { Logo, BrandAyah } from "@/components/brand/logo";
import { OnboardingForm } from "@/components/contractors/onboarding-form";
import { CheckCircle2, ShieldX } from "lucide-react";
import { formatDateLong } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Public contractor self-onboarding — token-authed, no login. */
export default async function OnboardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [contractor, company] = await Promise.all([
    prisma.contractor.findUnique({ where: { onboardingToken: token } }),
    getCompany(),
  ]);

  if (!contractor || contractor.archived) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <ShieldX className="size-10 text-destructive" />
        <h1 className="font-display text-xl font-semibold">Invalid onboarding link</h1>
        <p className="text-sm text-muted-foreground">Contact the person who sent you this link for a new one.</p>
      </div>
    );
  }

  const docs = await prisma.document.findMany({
    where: { entityType: "CONTRACTOR", entityId: contractor.id, archived: false },
    select: { id: true, fileName: true, kind: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-8">
      <div className="mb-8 flex items-center justify-between">
        <Logo />
        <span className="text-xs text-muted-foreground">{company.tradeName ?? company.legalName}</span>
      </div>

      {contractor.onboardingCompletedAt ? (
        <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-3 size-10 text-emerald-500" />
          <h1 className="font-display text-xl font-semibold">All set, {contractor.name.split(" ")[0]}!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your details were submitted on {formatDateLong(contractor.onboardingCompletedAt)}.
            You can still add documents below if anything was missed.
          </p>
          <div className="mt-6 text-left">
            <OnboardingForm
              token={token}
              initial={{ name: contractor.name, country: contractor.country, currency: contractor.currency }}
              existingDocs={docs}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Welcome aboard, {contractor.name.split(" ")[0]} 👋
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {company.tradeName ?? company.legalName} needs a few details to set you up as a
              contractor — takes about five minutes. Everything sensitive is encrypted.
            </p>
          </div>
          <OnboardingForm
            token={token}
            initial={{ name: contractor.name, country: contractor.country, currency: contractor.currency }}
            existingDocs={docs}
          />
        </>
      )}

      <BrandAyah className="mt-10 text-center text-muted-foreground/70" translationClassName="text-muted-foreground/50" />
    </div>
  );
}
