import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCompany } from "@/lib/company";
import { getFieldDefs } from "@/lib/custom-fields";
import { buildEstimateDoc } from "@/lib/document-data";
import { InvoiceDocument } from "@/components/invoice/invoice-document";

export const dynamic = "force-dynamic";

export default async function PrintEstimatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [estimate, company, defs] = await Promise.all([
    prisma.estimate.findUnique({
      where: { id },
      include: { client: true, lineItems: true },
    }),
    getCompany(),
    getFieldDefs("INVOICE"),
  ]);
  if (!estimate) notFound();

  const data = buildEstimateDoc(estimate, company, defs);
  return <InvoiceDocument data={data} templateId={estimate.templateId} />;
}
