import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { EngagementForm } from "@/components/contractors/engagement-form";

export default async function NewEngagementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability("contractors:write");
  const { id } = await params;
  const [contractor, clients] = await Promise.all([
    prisma.contractor.findUnique({ where: { id }, select: { name: true } }),
    prisma.client.findMany({
      where: { archived: false },
      select: { id: true, displayName: true },
      orderBy: { displayName: "asc" },
    }),
  ]);
  if (!contractor) notFound();

  return (
    <>
      <PageHeader
        title="New engagement"
        description={`Place ${contractor.name} on client or internal work.`}
      />
      <PageBody>
        <EngagementForm
          contractorId={id}
          clients={clients.map((c) => ({ value: c.id, label: c.displayName }))}
        />
      </PageBody>
    </>
  );
}
