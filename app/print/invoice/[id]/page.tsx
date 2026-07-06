import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCompany } from "@/lib/company";
import { getFieldDefs } from "@/lib/custom-fields";
import { buildInvoiceDoc } from "@/lib/document-data";
import { InvoiceDocument } from "@/components/invoice/invoice-document";

export const dynamic = "force-dynamic";

export default async function PrintInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, company, defs] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: { client: true, lineItems: true },
    }),
    getCompany(),
    getFieldDefs("INVOICE"),
  ]);
  if (!invoice) notFound();

  const data = buildInvoiceDoc(invoice, company, defs);
  return <InvoiceDocument data={data} templateId={invoice.templateId} />;
}
