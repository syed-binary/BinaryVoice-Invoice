import type { CompanySettings, Client } from "@prisma/client";

export function companyAddressLines(c: CompanySettings): string[] {
  return [
    c.addressLine1,
    c.addressLine2,
    [c.city, c.emirate].filter(Boolean).join(", "),
    c.country,
    c.poBox ? `P.O. Box ${c.poBox}` : null,
  ].filter((s): s is string => !!s && s.trim().length > 0);
}

export function companyContactLines(c: CompanySettings): string[] {
  return [c.phone, c.email, c.website].filter(
    (s): s is string => !!s && s.trim().length > 0,
  );
}

export function clientLines(client: Client): string[] {
  const lines: string[] = [];
  if (client.companyName) lines.push(client.companyName);
  if (client.billingAddress) lines.push(...client.billingAddress.split("\n"));
  if (client.trn) lines.push(`TRN: ${client.trn}`);
  if (client.email) lines.push(client.email);
  if (client.phone) lines.push(client.phone);
  return lines.filter((s) => s && s.trim().length > 0);
}

/** Append an alpha channel to a 6-digit hex color (0-255). */
export function withAlpha(hex: string, alpha: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const a = Math.max(0, Math.min(255, alpha)).toString(16).padStart(2, "0");
  return `${hex}${a}`;
}

function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n);
}

/** Human label for the VAT line, noting zero-rating for exports. */
export function vatLabel(rate: number): string {
  if (rate === 0) return "VAT (0% · zero-rated export)";
  return `VAT (${trimNum(rate)}%)`;
}

/** Human label for the withholding line. */
export function whtLabel(rate: number): string {
  return `Withholding tax (${trimNum(rate)}%)`;
}

/** "AED 15,000 / month" style rate label. */
export function rateWithUnit(money: string, unit: string | null): string {
  return unit ? `${money} / ${unit}` : money;
}
