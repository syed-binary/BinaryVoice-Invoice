export default function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh justify-center bg-neutral-100 py-8 print:block print:bg-white print:py-0">
      {children}
    </div>
  );
}
