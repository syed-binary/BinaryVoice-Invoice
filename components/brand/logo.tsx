import { cn } from "@/lib/utils";

/**
 * فَلَك FALAK × BINARY AI — brand mark.
 *
 * The orbit between brackets: a core (the company) with an elliptical orbit
 * and a satellite swimming on it (Yā-Sīn 36:40), flanked by the ‹ › code
 * brackets carried over from the Binary AI monogram — cosmos wrapped in code.
 * Dark squircle tile so it reads on light or dark surfaces, down to 16px.
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
      aria-label="Falak by Binary AI"
    >
      <defs>
        <linearGradient id="falak-orbit" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ededed" stopOpacity="0.25" />
          <stop offset="55%" stopColor="#ededed" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
        <radialGradient id="falak-core" cx="38%" cy="32%" r="80%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#c7d2fe" />
        </radialGradient>
      </defs>

      <rect x="2" y="2" width="176" height="176" rx="42" fill="#0a0a0a" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />

      {/* ‹ › — the Binary AI brackets */}
      <path d="M 34 62 L 18 90 L 34 118" stroke="#ededed" strokeWidth="4.5" strokeLinecap="square" strokeLinejoin="miter" fill="none" opacity="0.85" />
      <path d="M 146 62 L 162 90 L 146 118" stroke="#ededed" strokeWidth="4.5" strokeLinecap="square" strokeLinejoin="miter" fill="none" opacity="0.85" />

      {/* outer whisper orbit for depth */}
      <ellipse cx="90" cy="90" rx="58" ry="23" transform="rotate(-28 90 90)" fill="none" stroke="#ededed" strokeWidth="1" opacity="0.14" />

      {/* the orbit */}
      <ellipse cx="90" cy="90" rx="46" ry="17.5" transform="rotate(-28 90 90)" fill="none" stroke="url(#falak-orbit)" strokeWidth="3" strokeLinecap="round" />

      {/* the core */}
      <circle cx="90" cy="90" r="13.5" fill="url(#falak-core)" />

      {/* the swimmer — وَكُلٌّ فِي فَلَكٍ يَسْبَحُونَ */}
      <circle cx="103" cy="65.6" r="6" fill="#818cf8" />
      <circle cx="103" cy="65.6" r="9.5" fill="#818cf8" opacity="0.25" />
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
          <div className="flex items-baseline gap-1.5 font-display text-[16px] font-semibold tracking-tight">
            <span lang="ar" dir="rtl" className="text-[18px] leading-none">فَلَك</span>
            <span className="uppercase tracking-[0.1em]">Falak</span>
          </div>
          <div className="mt-1.5 flex items-center gap-1 text-[10.5px] font-medium uppercase tracking-[0.18em]">
            <span className="text-indigo-400">×</span>
            <span className="text-foreground/70">Binary AI</span>
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
