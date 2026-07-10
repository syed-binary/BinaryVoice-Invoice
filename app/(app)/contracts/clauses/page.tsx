import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { ClauseList } from "@/components/contracts/clause-list";

export const dynamic = "force-dynamic";

export default async function ClausesPage() {
  await requireCapability("contracts:write");
  const clauses = await prisma.clause.findMany({
    where: { archived: false },
    orderBy: [{ jurisdiction: "asc" }, { sortOrder: "asc" }],
  });

  return (
    <>
      <PageHeader
        title="Clause library"
        description="Jurisdiction packs auto-included in contractor paperwork. This is a clause manager, not legal advice — have counsel review each pack."
      />
      <PageBody>
        <ClauseList clauses={clauses} />
      </PageBody>
    </>
  );
}
