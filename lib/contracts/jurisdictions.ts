/**
 * Map free-text contractor country names to the ISO codes used by the
 * Clause library. Unknown countries fall back to the global pack ("*")
 * only — the offer letter UI surfaces this so a pack can be added.
 */

const COUNTRY_TO_ISO: Record<string, string> = {
  "united kingdom": "GB",
  uk: "GB",
  britain: "GB",
  "great britain": "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  "northern ireland": "GB",
  india: "IN",
  "united arab emirates": "AE",
  uae: "AE",
  dubai: "AE",
  "abu dhabi": "AE",
  pakistan: "PK",
  egypt: "EG",
  "united states": "US",
  usa: "US",
  "united states of america": "US",
};

export const GLOBAL_JURISDICTION = "*";

export function jurisdictionFor(country: string): string | null {
  const key = country.trim().toLowerCase();
  if (COUNTRY_TO_ISO[key]) return COUNTRY_TO_ISO[key];
  // Already an ISO-3166 alpha-2 code?
  if (/^[A-Z]{2}$/.test(country.trim().toUpperCase()) && country.trim().length === 2) {
    return country.trim().toUpperCase();
  }
  return null;
}
