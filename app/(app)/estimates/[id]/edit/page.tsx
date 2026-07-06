import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCompany } from "@/lib/company";
import { getFieldDefs } from "@/lib/custom-fields";
import { getEditorClients, getEditorItems } from "@/lib/editor-data";
import { toEditorEstimate } from "@/lib/estimate-dto";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { EstimateEditor } from "@/components/estimates/estimate-editor";

export const dynamic = "force-dynamic";

export default async function EditEstimatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [estimate, clients, items, company, fieldDefs] = await Promise.all([
    prisma.estimate.findUnique({ where: { id }, include: { lineItems: true } }),
    getEditorClients(),
    getEditorItems(),
    getCompany(),
    getFieldDefs("INVOICE"),
  ]);
  if (!estimate) notFound();

  return (
    <>
      <PageHeader title={`Edit ${estimate.number}`} description="Update this estimate." />
      <PageBody>
        <EstimateEditor clients={clients} items={items} company={company} fieldDefs={fieldDefs} estimate={toEditorEstimate(estimate)} />
      </PageBody>
    </>
  );
}
