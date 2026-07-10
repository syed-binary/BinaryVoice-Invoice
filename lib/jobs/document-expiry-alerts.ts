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
  return `Alerted on ${alerted} of ${expiring.length} expiring document(s)`;
}
