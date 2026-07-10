import nodemailer from "nodemailer";

/**
 * Outbound email. Configured entirely by env:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 * When SMTP_HOST is unset (dev), mails are logged instead of sent — callers
 * never need to care. Every user-facing email should also write a
 * Notification row (lib/notify.ts does both).
 */

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function transport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

/** Send an email. Returns true if actually sent, false if logged/failed. */
export async function sendMail(mail: Mail): Promise<boolean> {
  const t = transport();
  if (!t) {
    console.log(`email (SMTP not configured): to=${mail.to} subject="${mail.subject}"`);
    return false;
  }
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    return true;
  } catch (err) {
    console.error("email: send failed", err);
    return false;
  }
}
