"use server";

import { requireUser } from "@/lib/session";
import { getCompany } from "@/lib/company";
import { getRate } from "@/lib/fx";

/**
 * Prefill helper for editors: document currency → base currency on a date.
 * Returns null when no rate could be resolved (user enters one manually).
 */
export async function fetchFxRate(
  currency: string,
  date: string,
): Promise<number | null> {
  await requireUser();
  const company = await getCompany();
  if (currency === company.baseCurrency) return 1;
  return getRate(currency, company.baseCurrency, date ? new Date(date) : new Date());
}
