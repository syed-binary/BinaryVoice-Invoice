"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { cn } from "@/lib/utils";

export type SelectOption = { value: string; label: string };

export function SimpleSelect({
  name,
  id,
  defaultValue,
  value,
  onValueChange,
  placeholder = "Select…",
  options,
  className,
  disabled,
}: {
  name?: string;
  id?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  options: SelectOption[];
  className?: string;
  disabled?: boolean;
}) {
  const labels = Object.fromEntries(options.map((o) => [o.value, o.label]));
  return (
    <Select
      name={name}
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange as never}
      disabled={disabled}
    >
      <SelectTrigger id={id} className={cn("h-9 w-full", className)}>
        <SelectValue>
          {(v: string) =>
            v ? (
              labels[v]
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
