import { prisma } from "@/lib/prisma";
import { notifyRoles } from "@/lib/notify";

/** Flip SENT invoices past their due date to OVERDUE and alert finance. */
export async function markOverdueInvoices(): Promise<string> {
  const overdue = await prisma.invoice.findMany({
    where: { status: "SENT", dueDate: { lt: new Date() } },
    select: { id: true, number: true },
  });
  if (overdue.length === 0) return "No newly overdue invoices";

  await prisma.invoice.updateMany({
    where: { id: { in: overdue.map((i) => i.id) } },
    data: { status: "OVERDUE" },
  });
  await notifyRoles(["ADMIN", "FINANCE"], {
    type: "invoice.overdue",
    title: `${overdue.length} invoice${overdue.length > 1 ? "s" : ""} now overdue`,
    body: overdue.map((i) => i.number).join(", "),
    href: "/invoices?status=OVERDUE",
  });
  return `Marked ${overdue.length} invoice(s) overdue`;
}
