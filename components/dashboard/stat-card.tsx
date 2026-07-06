import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "primary",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  accent?: "primary" | "emerald" | "amber" | "red";
}) {
  const accents = {
    primary: "text-primary bg-primary/10",
    emerald: "text-emerald-600 bg-emerald-500/10",
    amber: "text-amber-600 bg-amber-500/10",
    red: "text-red-600 bg-red-500/10",
  };
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {label}
        </span>
        <span className={cn("grid size-9 place-items-center rounded-lg", accents[accent])}>
          <Icon className="size-[18px]" />
        </span>
      </div>
      <div className="mt-3 font-display text-2xl font-bold tracking-tight tabular">
        {value}
      </div>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
