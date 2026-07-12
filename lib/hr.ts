import { decryptField, isEncrypted } from "./crypto";

/** Mask an encrypted identity number to its last 4 characters for display. */
export function maskIdentity(stored: string | null): string | null {
  if (!stored) return null;
  try {
    const plain = isEncrypted(stored) ? decryptField(stored) : stored;
    return plain.length > 4 ? `•••• ${plain.slice(-4)}` : "••••";
  } catch {
    return "••••";
  }
}
