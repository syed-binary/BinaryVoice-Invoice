import { cn } from "@/lib/utils";

/**
 * A4 sheet wrapper. On screen it renders as a shadowed page; for print/PDF
 * it fills the A4 page exactly (see @media print in globals.css).
 */
export function Paper({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        "print-page mx-auto flex flex-col bg-white text-[#1a1a2e] shadow-[0_10px_50px_rgba(0,0,0,0.12)]",
        className,
      )}
      style={{
        width: "210mm",
        minHeight: "297mm",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
