import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { toNumber } from "@/lib/money";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { DealForm } from "@/components/crm/deal-form";

export default async function EditDealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability("clients:write");
  const { id } = await params;
  const [deal, clients, contacts] = await Promise.all([
    prisma.deal.findUnique({ where: { id } }),
    prisma.client.findMany({
      where: { archived: false },
      select: { id: true, displayName: true },
      orderBy: { displayName: "asc" },
    }),
    prisma.contact.findMany({
      where: { archived: false },
      select: { id: true, name: true, clientId: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!deal) notFound();

  return (
    <>
      <PageHeader title={`Edit ${deal.name}`} />
      <PageBody>
        <DealForm
          clients={clients.map((c) => ({ value: c.id, label: c.displayName }))}
          contacts={contacts.map((c) => ({ value: c.id, label: c.name, clientId: c.clientId }))}
          deal={{
            id: deal.id,
            name: deal.name,
            clientId: deal.clientId,
            prospectName: deal.prospectName,
            prospectEmail: deal.prospectEmail,
            contactId: deal.contactId,
            value: deal.value != null ? toNumber(deal.value) : null,
            currency: deal.currency,
            probability: deal.probability,
            expectedCloseDate: deal.expectedCloseDate?.toISOString().slice(0, 10) ?? null,
            stage: deal.stage,
          }}
        />
      </PageBody>
    </>
  );
}
