"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { can } from "@/lib/capabilities";

export interface SearchHit {
  group: string;
  label: string;
  sub: string;
  href: string;
}

/** Global search across Falak entities, filtered by the caller's capabilities. */
export async function globalSearch(q: string): Promise<SearchHit[]> {
  const user = await requireUser();
  const role = user.role ?? "MEMBER";
  const term = q.trim();
  if (term.length < 2) return [];
  const c = { contains: term, mode: "insensitive" as const };
  const hits: SearchHit[] = [];

  if (can(role, "clients:read")) {
    const [clients, deals] = await Promise.all([
      prisma.client.findMany({
        where: { archived: false, OR: [{ displayName: c }, { companyName: c }, { email: c }] },
        take: 5,
      }),
      prisma.deal.findMany({
        where: { archived: false, OR: [{ name: c }, { prospectName: c }] },
        take: 5,
      }),
    ]);
    hits.push(
      ...clients.map((x) => ({ group: "Clients", label: x.displayName, sub: x.email ?? "", href: `/clients/${x.id}` })),
      ...deals.map((x) => ({ group: "Deals", label: x.name, sub: x.stage.toLowerCase(), href: `/crm/deals/${x.id}` })),
    );
  }
  if (can(role, "billing:read")) {
    const [invoices, estimates] = await Promise.all([
      prisma.invoice.findMany({ where: { number: c }, include: { client: { select: { displayName: true } } }, take: 5 }),
      prisma.estimate.findMany({ where: { number: c }, include: { client: { select: { displayName: true } } }, take: 3 }),
    ]);
    hits.push(
      ...invoices.map((x) => ({ group: "Invoices", label: x.number, sub: x.client.displayName, href: `/invoices/${x.id}` })),
      ...estimates.map((x) => ({ group: "Estimates", label: x.number, sub: x.client.displayName, href: `/estimates/${x.id}` })),
    );
  }
  if (can(role, "contractors:read")) {
    const [contractors, payables] = await Promise.all([
      prisma.contractor.findMany({ where: { archived: false, OR: [{ name: c }, { email: c }, { entityName: c }] }, take: 5 }),
      prisma.contractorInvoice.findMany({
        where: { OR: [{ internalNumber: c }, { contractorRef: c }] },
        include: { contractor: { select: { name: true } } },
        take: 3,
      }),
    ]);
    hits.push(
      ...contractors.map((x) => ({ group: "Contractors", label: x.name, sub: x.country, href: `/contractors/${x.id}` })),
      ...payables.map((x) => ({ group: "Payables", label: x.internalNumber, sub: x.contractor.name, href: `/payables/${x.id}` })),
    );
  }
  if (can(role, "contracts:read")) {
    const contracts = await prisma.contract.findMany({
      where: { OR: [{ number: c }, { title: c }] },
      take: 5,
    });
    hits.push(
      ...contracts.map((x) => ({ group: "Contracts", label: x.number, sub: x.title, href: `/contracts/${x.id}` })),
    );
  }
  if (can(role, "hr:read")) {
    const employees = await prisma.employee.findMany({
      where: { archived: false, OR: [{ name: c }, { email: c }, { employeeNo: c }] },
      take: 5,
    });
    hits.push(
      ...employees.map((x) => ({ group: "Employees", label: x.name, sub: x.jobTitle, href: `/hr/employees/${x.id}` })),
    );
  }
  return hits.slice(0, 25);
}
