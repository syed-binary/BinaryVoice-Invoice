import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { DealForm } from "@/components/crm/deal-form";

export default async function NewDealPage() {
  await requireCapability("clients:write");
  const [clients, contacts] = await Promise.all([
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

  return (
    <>
      <PageHeader title="New deal" description="Track an opportunity through the pipeline." />
      <PageBody>
        <DealForm
          clients={clients.map((c) => ({ value: c.id, label: c.displayName }))}
          contacts={contacts.map((c) => ({ value: c.id, label: c.name, clientId: c.clientId }))}
        />
      </PageBody>
    </>
  );
}
