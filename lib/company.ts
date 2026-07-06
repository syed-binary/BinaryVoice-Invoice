import { prisma } from "./prisma";

export type Company = NonNullable<Awaited<ReturnType<typeof getCompany>>>;

/** Fetch the singleton company settings row (seeded as id="company"). */
export async function getCompany() {
  let company = await prisma.companySettings.findUnique({
    where: { id: "company" },
  });
  if (!company) {
    company = await prisma.companySettings.create({
      data: { id: "company", legalName: "My Company" },
    });
  }
  return company;
}
