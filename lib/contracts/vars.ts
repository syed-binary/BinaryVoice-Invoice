import type { MergeVars } from "./merge";

/**
 * Build the merge-variable tree for contract rendering from plain objects
 * (callers fetch from Prisma and convert Decimals/Dates first). Pure.
 */

export interface VarsInput {
  company: { legalName: string; city?: string | null; country?: string | null };
  contractor?: {
    name: string;
    email?: string | null;
    country: string;
    entityName?: string | null;
  } | null;
  client?: { displayName: string } | null;
  engagement?: {
    title: string;
    startDate: string; // pre-formatted
    costRate: string; // pre-formatted
    costCurrency: string;
    rateUnit: string;
  } | null;
  contract?: { noticePeriodDays?: number | null; endDate?: string | null } | null;
  today: string; // pre-formatted — no Date.now in pure modules
}

export function buildVars(input: VarsInput): MergeVars {
  return {
    company: input.company,
    contractor: input.contractor
      ? {
          ...input.contractor,
          entitySuffix: input.contractor.entityName
            ? ` (trading as ${input.contractor.entityName})`
            : "",
        }
      : undefined,
    client: input.client ?? undefined,
    engagement: input.engagement ?? undefined,
    contract: input.contract ?? undefined,
    today: input.today,
  };
}
