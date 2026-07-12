import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { EmployeeForm } from "@/components/hr/employee-form";

export default async function NewEmployeePage() {
  await requireCapability("hr:write");
  const managers = await prisma.employee.findMany({
    where: { archived: false, terminationDate: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return (
    <>
      <PageHeader title="New employee" description="Identity numbers are encrypted at rest." />
      <PageBody>
        <EmployeeForm managers={managers.map((m) => ({ value: m.id, label: m.name }))} />
      </PageBody>
    </>
  );
}
