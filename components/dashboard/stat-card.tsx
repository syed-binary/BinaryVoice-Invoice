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
  const dot = {
    primary: "text-primary",
    emerald: "text-success",
    amber: "text-warning",
    red: "text-destructive",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </span>
        <Icon className={cn("size-[18px]", dot[accent])} strokeWidth={1.75} />
      </div>
      <div className="mt-3 font-display text-[26px] font-semibold leading-none tracking-tight tabular">
        {value}
      </div>
      {sub && <p className="mt-2 text-[12px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
