import type { CustomFieldDefinition, CustomFieldEntity } from "@prisma/client";
import { prisma } from "./prisma";

export type FieldDef = CustomFieldDefinition;

export async function getFieldDefs(
  entity: CustomFieldEntity,
): Promise<FieldDef[]> {
  return prisma.customFieldDefinition.findMany({
    where: { entity },
    orderBy: { sortOrder: "asc" },
  });
}

/** Parse `cf_<key>` entries from a submitted form into a JSON object. */
export function collectCustomFields(
  formData: FormData,
  defs: FieldDef[],
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const d of defs) {
    const raw = formData.get(`cf_${d.key}`);
    if (raw === null || raw === "") continue;
    out[d.key] = d.type === "NUMBER" ? Number(raw) : String(raw);
  }
  return out;
}

/** Read the select options array from a definition's JSON. */
export function fieldOptions(def: FieldDef): string[] {
  if (!Array.isArray(def.options)) return [];
  return (def.options as unknown[]).map(String);
}
