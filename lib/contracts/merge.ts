/**
 * Merge-field engine for contract templates and clauses. Pure — no DB.
 *
 * Fields are dot-path lookups into a plain object: {{contractor.name}},
 * {{engagement.costRate}}, {{company.legalName}}, {{today}}. Unresolved
 * fields render as **[missing: path]** so a draft can never silently omit
 * a value — the missing markers are also returned for validation.
 */

export type MergeVars = Record<string, unknown>;

const FIELD_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

function lookup(vars: MergeVars, path: string): string | undefined {
  let cur: unknown = vars;
  for (const key of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  if (cur == null) return undefined;
  return String(cur);
}

export interface MergeResult {
  text: string;
  missing: string[]; // unresolved field paths (deduped, in order)
}

export function renderTemplate(body: string, vars: MergeVars): MergeResult {
  const missing: string[] = [];
  const text = body.replace(FIELD_RE, (_, path: string) => {
    const value = lookup(vars, path);
    if (value === undefined) {
      if (!missing.includes(path)) missing.push(path);
      return `**[missing: ${path}]**`;
    }
    return value;
  });
  return { text, missing };
}

/** All merge-field paths referenced in a template body. */
export function extractFields(body: string): string[] {
  const fields: string[] = [];
  for (const m of body.matchAll(FIELD_RE)) {
    if (!fields.includes(m[1])) fields.push(m[1]);
  }
  return fields;
}
