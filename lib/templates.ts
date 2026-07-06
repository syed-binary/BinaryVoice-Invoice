import type { SelectOption } from "@/components/ui/simple-select";

export type TemplateId =
  | "enterprise"
  | "modern"
  | "minimal"
  | "professional"
  | "bold";

export const TEMPLATES: { id: TemplateId; name: string; description: string }[] = [
  { id: "enterprise", name: "Enterprise", description: "IBM-grade consulting invoice — Plex type, black header, precise grid." },
  { id: "modern", name: "Modern", description: "Clean accent header with a soft, contemporary layout." },
  { id: "minimal", name: "Minimal", description: "Understated, typographic, lots of whitespace." },
  { id: "professional", name: "Professional", description: "Classic corporate structure with ruled tables." },
  { id: "bold", name: "Bold", description: "Big display type and a striking colored sidebar." },
];

export const TEMPLATE_OPTIONS: SelectOption[] = TEMPLATES.map((t) => ({
  value: t.id,
  label: t.name,
}));

export function isTemplateId(v: string): v is TemplateId {
  return TEMPLATES.some((t) => t.id === v);
}
