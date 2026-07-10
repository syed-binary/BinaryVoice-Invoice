import { requireCapability } from "@/lib/permissions";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { ContractorForm } from "@/components/contractors/contractor-form";

export default async function NewContractorPage() {
  await requireCapability("contractors:write");
  return (
    <>
      <PageHeader title="New contractor" description="Onboard a contractor to your workforce." />
      <PageBody>
        <ContractorForm />
      </PageBody>
    </>
  );
}
