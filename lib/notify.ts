import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/email";

export interface NotifyInput {
  type: string; // e.g. "invoice.overdue", "document.expiring"
  title: string;
  body?: string;
  href?: string;
  email?: boolean; // also send by email (default false)
}

/**
 * Create an in-app notification for a user, optionally mirrored by email.
 * Fire-and-forget semantics: failures are logged, never thrown.
 */
export async function notify(userId: string, input: NotifyInput) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        href: input.href ?? null,
      },
    });
    if (input.email) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.email) {
        const sent = await sendMail({
          to: user.email,
          subject: input.title,
          html: `<p>${input.body ?? input.title}</p>${
            input.href
              ? `<p><a href="${process.env.APP_URL ?? ""}${input.href}">Open in Binary Labs</a></p>`
              : ""
          }`,
          text: input.body ?? input.title,
        });
        if (sent) {
          await prisma.notification.update({
            where: { id: notification.id },
            data: { emailedAt: new Date() },
          });
        }
      }
    }
  } catch (err) {
    console.error("notify: failed", err);
  }
}

/** Notify every user holding one of the given roles (for ops alerts). */
export async function notifyRoles(roles: string[], input: NotifyInput) {
  const users = await prisma.user.findMany({
    where: { role: { in: roles as never[] } },
    select: { id: true },
  });
  for (const u of users) await notify(u.id, input);
}
