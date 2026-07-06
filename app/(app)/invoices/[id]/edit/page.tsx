import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCompany } from "@/lib/company";
import { getFieldDefs } from "@/lib/custom-fields";
import { getEditorClients, getEditorItems } from "@/lib/editor-data";
import { toEditorInvoice } from "@/lib/invoice-dto";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { InvoiceEditor } from "@/components/invoices/invoice-editor";

export const dynamic = "force-dynamic";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, clients, items, company, fieldDefs] = await Promise.all([
    prisma.invoice.findUnique({ where: { id }, include: { lineItems: true } }),
    getEditorClients(),
    getEditorItems(),
    getCompany(),
    getFieldDefs("INVOICE"),
  ]);
  if (!invoice) notFound();

  return (
    <>
      <PageHeader title={`Edit ${invoice.number}`} description="Update this invoice." />
      <PageBody>
        <InvoiceEditor
          clients={clients}
          items={items}
          company={company}
          fieldDefs={fieldDefs}
          invoice={toEditorInvoice(invoice)}
        />
      </PageBody>
    </>
  );
}
