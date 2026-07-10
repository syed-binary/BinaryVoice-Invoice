import { prisma } from "@/lib/prisma";

/**
 * Append-only audit trail. Call from server actions after state changes that
 * matter: approvals, payroll, contract signing, salary changes, deletions.
 *
 * Diffs are shallow (top-level keys only) and pass through a redaction
 * denylist — secrets, bank details and identity numbers must never land in
 * the log. Auditing is best-effort: a logging failure never breaks the
 * mutation it describes.
 */

const REDACTED_KEYS = [
  "passwordhash",
  "password",
  "iban",
  "accountnumber",
  "swift",
  "routingcode",
  "payoutdetails",
  "passportnumber",
  "emiratesidnumber",
  "visanumber",
  "labourcardnumber",
];

type Actor = { id?: string; role?: string | null };
type Snapshot = Record<string, unknown>;

function redact(obj: Snapshot): Snapshot {
  const out: Snapshot = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key] = REDACTED_KEYS.includes(key.toLowerCase()) ? "[redacted]" : value;
  }
  return out;
}

/** Shallow diff: keys whose values changed, as { key: { from, to } }. */
function shallowDiff(before: Snapshot, after: Snapshot): Snapshot {
  const diff: Snapshot = {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of keys) {
    const from = before[key];
    const to = after[key];
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      diff[key] = { from, to };
    }
  }
  return redact(diff);
}

export async function audit(
  actor: Actor,
  action: string,
  entityType: string,
  entityId: string,
  detail?: Snapshot,
  before?: Snapshot,
  after?: Snapshot,
) {
  try {
    const diff =
      before && after
        ? { ...shallowDiff(before, after), ...(detail ? redact(detail) : {}) }
        : detail
          ? redact(detail)
          : undefined;
    await prisma.auditLog.create({
      data: {
        actorId: actor.id ?? "unknown",
        actorRole: actor.role ?? "MEMBER",
        action,
        entityType,
        entityId,
        diff: diff ? JSON.parse(JSON.stringify(diff)) : undefined,
      },
    });
  } catch (err) {
    console.error("audit: failed to write log entry", err);
  }
}
