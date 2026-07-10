import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { toNumber } from "@/lib/money";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { ContractEditor } from "@/components/contracts/contract-editor";

export default async function EditContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability("contracts:write");
  const { id } = await params;
  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract) notFound();
  if (contract.status !== "DRAFT") redirect(`/contracts/${id}`);

  return (
    <>
      <PageHeader title={`Edit ${contract.number}`} description="Drafts only — the body freezes when sent for signature." />
      <PageBody>
        <ContractEditor
          contract={{
            id: contract.id,
            title: contract.title,
            body: contract.body,
            effectiveDate: contract.effectiveDate?.toISOString().slice(0, 10) ?? null,
            endDate: contract.endDate?.toISOString().slice(0, 10) ?? null,
            renewalType: contract.renewalType,
            noticePeriodDays: contract.noticePeriodDays,
            value: contract.value != null ? toNumber(contract.value) : null,
            currency: contract.currency,
            notes: contract.notes,
          }}
        />
      </PageBody>
    </>
  );
}
