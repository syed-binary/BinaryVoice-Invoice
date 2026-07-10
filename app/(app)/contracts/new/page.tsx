import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { GenerateContractForm } from "@/components/contracts/generate-form";

export default async function NewContractPage() {
  await requireCapability("contracts:write");
  const [templates, contractors, clients, engagements] = await Promise.all([
    prisma.contractTemplate.findMany({ where: { archived: false }, orderBy: { name: "asc" } }),
    prisma.contractor.findMany({
      where: { archived: false },
      select: { id: true, name: true, country: true },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({
      where: { archived: false },
      select: { id: true, displayName: true },
      orderBy: { displayName: "asc" },
    }),
    prisma.engagement.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, title: true, contractorId: true },
      orderBy: { startDate: "desc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="New contract"
        description="Generate a draft from a template — contractor paperwork picks up the clause pack for their country."
      />
      <PageBody>
        <GenerateContractForm
          templates={templates.map((t) => ({
            value: t.id,
            label: t.name,
            usesClauses: t.body.includes("{{clauses}}"),
          }))}
          contractors={contractors.map((c) => ({
            value: c.id,
            label: `${c.name} (${c.country})`,
          }))}
          clients={clients.map((c) => ({ value: c.id, label: c.displayName }))}
          engagements={engagements.map((e) => ({
            value: e.id,
            label: e.title,
            contractorId: e.contractorId,
          }))}
        />
      </PageBody>
    </>
  );
}
