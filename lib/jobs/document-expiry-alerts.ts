import { addDays, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { notifyRoles } from "@/lib/notify";

const HORIZON_DAYS = 30;

/**
 * Alert on compliance documents (visas, Emirates IDs, passports, W-8BENs, …)
 * expiring within the horizon. A document is only re-alerted if the previous
 * alert is more than 7 days old, so daily runs don't spam.
 */
export async function documentExpiryAlerts(): Promise<string> {
  const expiring = await prisma.document.findMany({
    where: {
      archived: false,
      expiryDate: { not: null, lte: addDays(new Date(), HORIZON_DAYS) },
    },
  });
  if (expiring.length === 0) return "No documents expiring soon";

  let alerted = 0;
  for (const doc of expiring) {
    const recent = await prisma.notification.findFirst({
      where: {
        type: "document.expiring",
        body: { contains: doc.id },
        createdAt: { gte: subDays(new Date(), 7) },
      },
    });
    if (recent) continue;

    const roles =
      doc.entityType === "EMPLOYEE" ? ["ADMIN", "HR"] : ["ADMIN", "FINANCE"];
    const when = doc.expiryDate!.toISOString().slice(0, 10);
    await notifyRoles(roles, {
      type: "document.expiring",
      title: `${doc.kind.replaceAll("_", " ")} expiring ${when}`,
      body: `${doc.fileName} (${doc.entityType.toLowerCase()}) expires ${when}. [${doc.id}]`,
      email: true,
    });
    alerted++;
  }

  // Employee identity fields (passport/visa/EID/labour card) — the numbers
  // are encrypted but expiries are queryable.
  const horizon = addDays(new Date(), HORIZON_DAYS);
  const employees = await prisma.employee.findMany({
    where: {
      archived: false,
      terminationDate: null,
      OR: [
        { passportExpiry: { lte: horizon } },
        { visaExpiry: { lte: horizon } },
        { emiratesIdExpiry: { lte: horizon } },
        { labourCardExpiry: { lte: horizon } },
      ],
    },
  });
  for (const e of employees) {
    const items = (
      [
        ["Passport", e.passportExpiry],
        ["Visa", e.visaExpiry],
        ["Emirates ID", e.emiratesIdExpiry],
        ["Labour card", e.labourCardExpiry],
      ] as const
    ).filter(([, d]) => d && d <= horizon);
    const recent = await prisma.notification.findFirst({
      where: {
        type: "employee.identity-expiring",
        body: { contains: e.id },
        createdAt: { gte: subDays(new Date(), 7) },
      },
    });
    if (recent || items.length === 0) continue;
    await notifyRoles(["ADMIN", "HR"], {
      type: "employee.identity-expiring",
      title: `${e.name}: ${items.map(([l]) => l).join(", ")} expiring`,
      body: `${items.map(([l, d]) => `${l} ${d!.toISOString().slice(0, 10)}`).join(" · ")} [${e.id}]`,
      href: `/hr/employees/${e.id}`,
      email: true,
    });
    alerted++;
  }

  return `Alerted on ${alerted} item(s) (${expiring.length} docs, ${employees.length} employees checked)`;
}
