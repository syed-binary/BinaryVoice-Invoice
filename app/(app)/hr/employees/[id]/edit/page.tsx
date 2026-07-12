import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { maskIdentity } from "@/lib/hr";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { EmployeeForm } from "@/components/hr/employee-form";

const d = (v: Date | null) => v?.toISOString().slice(0, 10) ?? "";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCapability("hr:write");
  const { id } = await params;
  const [e, managers] = await Promise.all([
    prisma.employee.findUnique({ where: { id } }),
    prisma.employee.findMany({
      where: { archived: false, terminationDate: null, NOT: { id } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!e) notFound();

  return (
    <>
      <PageHeader title={`Edit ${e.name}`} />
      <PageBody>
        <EmployeeForm
          managers={managers.map((m) => ({ value: m.id, label: m.name }))}
          employee={{
            id: e.id,
            name: e.name,
            email: e.email,
            phone: e.phone,
            dateOfBirth: d(e.dateOfBirth),
            nationality: e.nationality,
            jobTitle: e.jobTitle,
            department: e.department,
            managerId: e.managerId,
            employmentType: e.employmentType,
            joinDate: d(e.joinDate),
            probationEndDate: d(e.probationEndDate),
            terminationDate: d(e.terminationDate),
            passportExpiry: d(e.passportExpiry),
            visaExpiry: d(e.visaExpiry),
            emiratesIdExpiry: d(e.emiratesIdExpiry),
            labourCardExpiry: d(e.labourCardExpiry),
            bankName: e.bankName,
            wpsAgentId: e.wpsAgentId,
            molEmployeeId: e.molEmployeeId,
            notes: e.notes,
            masked: {
              passport: maskIdentity(e.passportNumber),
              visa: maskIdentity(e.visaNumber),
              eid: maskIdentity(e.emiratesIdNumber),
              labour: maskIdentity(e.labourCardNumber),
              iban: maskIdentity(e.iban),
            },
          }}
        />
      </PageBody>
    </>
  );
}
