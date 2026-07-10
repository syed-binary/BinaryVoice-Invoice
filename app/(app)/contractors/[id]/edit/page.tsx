import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { ContractorForm } from "@/components/contractors/contractor-form";

export default async function EditContractorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability("contractors:write");
  const { id } = await params;
  const contractor = await prisma.contractor.findUnique({ where: { id } });
  if (!contractor) notFound();

  return (
    <>
      <PageHeader title={`Edit ${contractor.name}`} />
      <PageBody>
        <ContractorForm contractor={contractor} />
      </PageBody>
    </>
  );
}
