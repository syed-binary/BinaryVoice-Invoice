import type { InvoiceStatus, EstimateStatus } from "@prisma/client";

type Tone = {
  label: string;
  className: string;
  dot: string;
};

export const INVOICE_STATUS: Record<InvoiceStatus, Tone> = {
  DRAFT: {
    label: "Draft",
    className: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  },
  SENT: {
    label: "Sent",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  PARTIALLY_PAID: {
    label: "Partially paid",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  PAID: {
    label: "Paid",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  OVERDUE: {
    label: "Overdue",
    className: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-muted text-muted-foreground border-border line-through",
    dot: "bg-muted-foreground",
  },
};

export const ESTIMATE_STATUS: Record<EstimateStatus, Tone> = {
  DRAFT: {
    label: "Draft",
    className: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  },
  SENT: {
    label: "Sent",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  ACCEPTED: {
    label: "Accepted",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  DECLINED: {
    label: "Declined",
    className: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
  CONVERTED: {
    label: "Converted",
    className: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
  },
};
