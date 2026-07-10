/** Minimal chrome for token-authenticated public pages (contract signing). */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-muted/30">{children}</div>;
}
