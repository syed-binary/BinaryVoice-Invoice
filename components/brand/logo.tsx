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

/**
 * Falak (فَلَك) — "orbit", from Yā-Sīn 36:40: وَكُلٌّ فِي فَلَكٍ يَسْبَحُونَ
 * "…and each, in an orbit, is swimming." The company OS by Binary AI.
 */
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
          <div className="flex items-baseline gap-1.5 font-display text-[15px] font-semibold tracking-tight">
            <span lang="ar" dir="rtl" className="text-[17px] leading-none">فَلَك</span>
            <span className="uppercase tracking-[0.08em]">Falak</span>
          </div>
          <div className="mt-1 text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
            × Binary AI
          </div>
        </div>
      )}
    </div>
  );
}

/** The brand ayah — Yā-Sīn 36:40 — for login and public surfaces. */
export function BrandAyah({
  className,
  translationClassName,
}: {
  className?: string;
  translationClassName?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <p lang="ar" dir="rtl" className="font-serif text-2xl leading-relaxed">
        وَكُلٌّ فِي فَلَكٍ يَسْبَحُونَ
      </p>
      <p className={cn("text-xs italic", translationClassName)}>
        “…and each, in an orbit, is swimming.” — Yā-Sīn 36:40
      </p>
    </div>
  );
}
