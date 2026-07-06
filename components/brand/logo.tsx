import { cn } from "@/lib/utils";

/**
 * Binary AI Labs brand tile — the "‹B›" monogram (brackets = code/AI, B = Binary)
 * on a dark squircle. Self-contained so it reads well on light or dark surfaces.
 */
export function LogoMark({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 180 180"
      className={cn("size-8", className)}
      style={style}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Binary AI Labs"
    >
      <rect x="2" y="2" width="176" height="176" rx="42" fill="#0a0a0a" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
      <g transform="translate(8 50)">
        <path d="M 28 10 L 10 40 L 28 70" stroke="#ededed" strokeWidth="2.4" strokeLinecap="square" strokeLinejoin="miter" transform="scale(1.04)" fill="none" />
        <text x="80" y="57" textAnchor="middle" fill="#ededed" fontFamily="var(--font-plex-sans), 'SF Pro Display', system-ui, sans-serif" fontSize="50" fontWeight="600" letterSpacing="-0.02em" transform="scale(1.04)">B</text>
        <path d="M 132 10 L 150 40 L 132 70" stroke="#ededed" strokeWidth="2.4" strokeLinecap="square" strokeLinejoin="miter" transform="scale(1.04)" fill="none" />
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
      <LogoMark className={cn(markClassName)} />
      {!compact && (
        <div className="leading-none">
          <div className="font-display text-[15px] font-semibold tracking-tight">
            Binary Labs
          </div>
          <div className="mt-1 text-[9.5px] uppercase tracking-[0.2em] text-muted-foreground">
            Invoicing
          </div>
        </div>
      )}
    </div>
  );
}
