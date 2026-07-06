import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import type { InvoiceStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/app/search-input";
import { EmptyState } from "@/components/app/empty-state";
import { InvoiceStatusPill } from "@/components/app/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "PARTIALLY_PAID", label: "Partially paid" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;

  const where: Prisma.InvoiceWhereInput = {};
  if (status && status !== "all") where.status = status as InvoiceStatus;
  if (q) {
    where.OR = [
      { number: { contains: q, mode: "insensitive" } },
      { client: { displayName: { contains: q, mode: "insensitive" } } },
    ];
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: { client: { select: { displayName: true } } },
    orderBy: { issueDate: "desc" },
  });

  return (
    <>
      <PageHeader title="Invoices" description="Create, send and track your invoices.">
        <Button render={<Link href="/invoices/new" />} className="gap-2">
          <Plus className="size-4" /> New invoice
        </Button>
      </PageHeader>

      <PageBody className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => {
              const active = (status ?? "all") === f.value;
              const params = new URLSearchParams();
              if (f.value !== "all") params.set("status", f.value);
              if (q) params.set("q", q);
              return (
                <Link
                  key={f.value}
                  href={`/invoices?${params.toString()}`}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card hover:bg-accent",
                  )}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>
          <SearchInput placeholder="Search number or client…" />
        </div>

        {invoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={q || status ? "No matching invoices" : "No invoices yet"}
            description={
              q || status
                ? "Try changing your filters."
                : "Create your first invoice to get paid."
            }
            action={
              !q &&
              !status && (
                <Button render={<Link href="/invoices/new" />} className="gap-2">
                  <Plus className="size-4" /> New invoice
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id} className="cursor-pointer">
                    <TableCell className="p-0">
                      <Link href={`/invoices/${inv.id}`} className="block px-4 py-3 font-mono text-sm font-medium">
                        {inv.number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/invoices/${inv.id}`} className="block">
                        {inv.client.displayName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(inv.issueDate)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(inv.dueDate)}</TableCell>
                    <TableCell className="text-right font-semibold tabular">
                      {formatMoney(inv.total, inv.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <InvoiceStatusPill status={inv.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageBody>
    </>
  );
}
