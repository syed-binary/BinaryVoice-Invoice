import { getFieldDefs } from "@/lib/custom-fields";
import { getCompany } from "@/lib/company";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { ClientForm } from "@/components/clients/client-form";

export const dynamic = "force-dynamic";

export default async function NewClientPage() {
  const [fieldDefs, company] = await Promise.all([
    getFieldDefs("CLIENT"),
    getCompany(),
  ]);

  return (
    <>
      <PageHeader title="New client" description="Add a client you can invoice." />
      <PageBody className="max-w-3xl">
        <ClientForm fieldDefs={fieldDefs} defaultCurrency={company.baseCurrency} />
      </PageBody>
    </>
  );
}
