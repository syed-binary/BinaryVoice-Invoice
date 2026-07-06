"use client";

import type { FieldDef } from "@/lib/custom-fields";
import { fieldOptions } from "@/lib/custom-fields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleSelect } from "@/components/ui/simple-select";

export function CustomFieldsFieldset({
  defs,
  values,
}: {
  defs: FieldDef[];
  values?: Record<string, unknown> | null;
}) {
  if (defs.length === 0) return null;
  const v = (key: string) => {
    const val = values?.[key];
    return val === undefined || val === null ? "" : String(val);
  };

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {defs.map((def) => {
        const name = `cf_${def.key}`;
        if (def.type === "SELECT") {
          const opts = fieldOptions(def).map((o) => ({ value: o, label: o }));
          return (
            <div key={def.id} className="space-y-1.5">
              <Label htmlFor={name}>{def.label}</Label>
              <SimpleSelect
                name={name}
                id={name}
                defaultValue={v(def.key) || undefined}
                options={opts}
                placeholder="Select…"
              />
            </div>
          );
        }
        const type =
          def.type === "NUMBER" ? "number" : def.type === "DATE" ? "date" : "text";
        return (
          <div key={def.id} className="space-y-1.5">
            <Label htmlFor={name}>{def.label}</Label>
            <Input
              id={name}
              name={name}
              type={type}
              defaultValue={v(def.key)}
              required={def.required}
            />
          </div>
        );
      })}
    </div>
  );
}
