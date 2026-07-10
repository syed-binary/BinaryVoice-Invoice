import { prisma } from "@/lib/prisma";
import { getCompany } from "@/lib/company";
import { getRate } from "@/lib/fx";

/** Cache today's rate → base currency for every currency in active use. */
export async function fxRefresh(): Promise<string> {
  const company = await getCompany();
  const base = company.baseCurrency;

  const clients = await prisma.client.findMany({
    where: { archived: false, currency: { not: base } },
    select: { currency: true },
    distinct: ["currency"],
  });

  const results: string[] = [];
  for (const { currency } of clients) {
    const rate = await getRate(currency, base);
    results.push(rate === null ? `${currency}: unresolved` : `${currency}: ${rate}`);
  }
  return results.length ? results.join(", ") : "No foreign-currency clients";
}
