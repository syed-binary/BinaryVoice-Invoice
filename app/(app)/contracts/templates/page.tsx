import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { TemplateList } from "@/components/contracts/template-list";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  await requireCapability("contracts:write");
  const templates = await prisma.contractTemplate.findMany({
    where: { archived: false },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Contract templates"
        description="Markdown bodies with merge fields; {{clauses}} pulls the jurisdiction pack."
      />
      <PageBody>
        <TemplateList templates={templates} />
      </PageBody>
    </>
  );
}
