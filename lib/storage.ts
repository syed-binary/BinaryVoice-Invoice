import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Private file storage for the Document vault (passports, contracts,
 * payslips, …). Files live OUTSIDE public/ and are only reachable through
 * /api/files/[id], which enforces capability checks. Local-disk driver for
 * now; the interface is S3-shaped so an object-store driver can slot in.
 */

const ROOT = process.env.FILE_STORAGE_DIR
  ? path.resolve(process.env.FILE_STORAGE_DIR)
  : path.join(process.cwd(), "var", "files");

function resolveKey(key: string): string {
  const abs = path.resolve(ROOT, key);
  if (!abs.startsWith(ROOT + path.sep)) throw new Error("Invalid storage key");
  return abs;
}

export async function putFile(key: string, data: Buffer): Promise<void> {
  const abs = resolveKey(key);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, data);
}

export async function getFile(key: string): Promise<Buffer> {
  return readFile(resolveKey(key));
}

export async function deleteFile(key: string): Promise<void> {
  await rm(resolveKey(key), { force: true });
}
