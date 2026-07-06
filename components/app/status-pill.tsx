import { cn } from "@/lib/utils";
import { INVOICE_STATUS, ESTIMATE_STATUS } from "@/lib/status";
import type { InvoiceStatus, EstimateStatus } from "@prisma/client";

export function InvoiceStatusPill({ status }: { status: InvoiceStatus }) {
  return <Pill tone={INVOICE_STATUS[status]} />;
}

export function EstimateStatusPill({ status }: { status: EstimateStatus }) {
  return <Pill tone={ESTIMATE_STATUS[status]} />;
}

function Pill({
  tone,
}: {
  tone: { label: string; className: string; dot: string };
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tone.className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", tone.dot)} />
      {tone.label}
    </span>
  );
}
