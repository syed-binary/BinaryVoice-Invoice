import { cn } from "@/lib/utils";

/** Binary Labs monogram — a geometric "binary" mark (no logo asset exists). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect width="32" height="32" rx="9" fill="currentColor" />
      <g fill="var(--logo-fg, #fff)">
        <rect x="8" y="8" width="6" height="6" rx="1.5" />
        <rect x="18" y="8" width="6" height="6" rx="3" opacity="0.55" />
        <rect x="8" y="18" width="6" height="6" rx="3" opacity="0.55" />
        <rect x="18" y="18" width="6" height="6" rx="1.5" />
      </g>
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
  compact = false,
}: {
  className?: string;
  markClassName?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={cn("text-primary", markClassName)} />
      {!compact && (
        <div className="leading-none">
          <div className="font-display text-[15px] font-bold tracking-tight">
            Binary Labs
          </div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Invoicing
          </div>
        </div>
      )}
    </div>
  );
}
