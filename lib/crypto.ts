import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

/**
 * App-level field encryption for sensitive values persisted in Postgres
 * (contractor payout details; employee identity numbers in the HR phase).
 *
 * AES-256-GCM with a versioned key id prefix so keys can rotate:
 *   "v1:<iv b64>:<ciphertext b64>:<authTag b64>"
 *
 * Key: FIELD_ENCRYPTION_KEY env — 64 hex chars (32 bytes). Generate with:
 *   openssl rand -hex 32
 */

const KEYS: Record<string, () => Buffer> = {
  v1: () => {
    const hex = process.env.FIELD_ENCRYPTION_KEY;
    if (!hex || hex.length !== 64) {
      throw new Error(
        "FIELD_ENCRYPTION_KEY must be set to 64 hex chars (openssl rand -hex 32)",
      );
    }
    return Buffer.from(hex, "hex");
  },
};

const CURRENT_KEY_ID = "v1";

export function encryptField(plaintext: string): string {
  const key = KEYS[CURRENT_KEY_ID]();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${CURRENT_KEY_ID}:${iv.toString("base64")}:${ciphertext.toString("base64")}:${tag.toString("base64")}`;
}

export function decryptField(stored: string): string {
  const [keyId, ivB64, dataB64, tagB64] = stored.split(":");
  const getKey = KEYS[keyId];
  if (!getKey || !ivB64 || !dataB64 || !tagB64) {
    throw new Error("Malformed encrypted field");
  }
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/** True if the value looks like one of our encrypted blobs. */
export function isEncrypted(value: string): boolean {
  const [keyId, ...rest] = value.split(":");
  return keyId in KEYS && rest.length === 3;
}
