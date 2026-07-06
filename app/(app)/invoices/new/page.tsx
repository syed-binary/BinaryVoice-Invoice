import { getCompany } from "@/lib/company";
import { getFieldDefs } from "@/lib/custom-fields";
import { getEditorClients, getEditorItems } from "@/lib/editor-data";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { InvoiceEditor } from "@/components/invoices/invoice-editor";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const { client } = await searchParams;
  const [clients, items, company, fieldDefs] = await Promise.all([
    getEditorClients(),
    getEditorItems(),
    getCompany(),
    getFieldDefs("INVOICE"),
  ]);

  return (
    <>
      <PageHeader title="New invoice" description="Build and send a VAT-ready invoice." />
      <PageBody>
        <InvoiceEditor
          clients={clients}
          items={items}
          company={company}
          fieldDefs={fieldDefs}
          preselectClientId={client}
        />
      </PageBody>
    </>
  );
}
