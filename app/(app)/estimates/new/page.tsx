import { getCompany } from "@/lib/company";
import { getFieldDefs } from "@/lib/custom-fields";
import { getEditorClients, getEditorItems } from "@/lib/editor-data";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { EstimateEditor } from "@/components/estimates/estimate-editor";

export const dynamic = "force-dynamic";

export default async function NewEstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; deal?: string }>;
}) {
  const { client, deal } = await searchParams;
  const [clients, items, company, fieldDefs] = await Promise.all([
    getEditorClients(),
    getEditorItems(),
    getCompany(),
    getFieldDefs("INVOICE"),
  ]);

  return (
    <>
      <PageHeader title="New estimate" description="Send a quote your client can accept." />
      <PageBody>
        <EstimateEditor clients={clients} items={items} company={company} fieldDefs={fieldDefs} preselectClientId={client} dealId={deal} />
      </PageBody>
    </>
  );
}
