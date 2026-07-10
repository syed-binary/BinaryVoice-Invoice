import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { EngagementForm } from "@/components/contractors/engagement-form";

export default async function EditEngagementPage({
  params,
}: {
  params: Promise<{ id: string; engagementId: string }>;
}) {
  await requireCapability("contractors:write");
  const { id, engagementId } = await params;
  const [engagement, clients] = await Promise.all([
    prisma.engagement.findUnique({ where: { id: engagementId } }),
    prisma.client.findMany({
      where: { archived: false },
      select: { id: true, displayName: true },
      orderBy: { displayName: "asc" },
    }),
  ]);
  if (!engagement || engagement.contractorId !== id) notFound();

  return (
    <>
      <PageHeader title="Edit engagement" description={engagement.title} />
      <PageBody>
        <EngagementForm
          contractorId={id}
          clients={clients.map((c) => ({ value: c.id, label: c.displayName }))}
          engagement={engagement}
        />
      </PageBody>
    </>
  );
}
