import { addDays, differenceInCalendarDays, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { notifyRoles } from "@/lib/notify";

const ALERT_DAYS = [30, 14, 7];

/**
 * Contract lifecycle housekeeping:
 * 1. Auto-expire ACTIVE/SIGNED contracts past their end date.
 * 2. Alert at 30/14/7 days before the renewal decision point
 *    (endDate − noticePeriodDays). Re-alerts are suppressed for 6 days so
 *    daily runs fire once per threshold.
 */
export async function contractRenewalAlerts(): Promise<string> {
  const now = new Date();

  const expired = await prisma.contract.updateMany({
    where: { status: { in: ["ACTIVE", "SIGNED"] }, endDate: { lt: now } },
    data: { status: "EXPIRED" },
  });

  const upcoming = await prisma.contract.findMany({
    where: {
      status: { in: ["ACTIVE", "SIGNED"] },
      endDate: { not: null, lte: addDays(now, 60) },
    },
  });

  let alerted = 0;
  for (const c of upcoming) {
    const decisionPoint = c.noticePeriodDays
      ? subDays(c.endDate!, c.noticePeriodDays)
      : c.endDate!;
    const daysLeft = differenceInCalendarDays(decisionPoint, now);
    if (!ALERT_DAYS.some((d) => daysLeft <= d && daysLeft > d - 1) && daysLeft > 0) continue;
    if (daysLeft < 0) continue;

    const recent = await prisma.notification.findFirst({
      where: {
        type: "contract.renewal",
        body: { contains: c.id },
        createdAt: { gte: subDays(now, 6) },
      },
    });
    if (recent) continue;

    await notifyRoles(["ADMIN", "FINANCE"], {
      type: "contract.renewal",
      title: `${c.number} renewal decision in ${daysLeft}d`,
      body: `${c.title} — notice period ${c.noticePeriodDays ?? 0}d, ends ${c.endDate!.toISOString().slice(0, 10)}. [${c.id}]`,
      href: `/contracts/${c.id}`,
      email: true,
    });
    alerted++;
  }
  return `Expired ${expired.count}, alerted on ${alerted} of ${upcoming.length} upcoming`;
}
