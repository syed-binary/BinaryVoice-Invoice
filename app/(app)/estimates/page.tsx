import Link from "next/link";
import { Plus, ScrollText } from "lucide-react";
import type { EstimateStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/app/search-input";
import { EmptyState } from "@/components/app/empty-state";
import { EstimateStatusPill } from "@/components/app/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function EstimatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const where: Prisma.EstimateWhereInput = {};
  if (status && status !== "all") where.status = status as EstimateStatus;
  if (q) {
    where.OR = [
      { number: { contains: q, mode: "insensitive" } },
      { client: { displayName: { contains: q, mode: "insensitive" } } },
    ];
  }

  const estimates = await prisma.estimate.findMany({
    where,
    include: { client: { select: { displayName: true } } },
    orderBy: { issueDate: "desc" },
  });

  return (
    <>
      <PageHeader title="Estimates" description="Quotes you can convert to invoices.">
        <Button render={<Link href="/estimates/new" />} className="gap-2">
          <Plus className="size-4" /> New estimate
        </Button>
      </PageHeader>

      <PageBody className="space-y-5">
        <SearchInput placeholder="Search number or client…" />

        {estimates.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={q ? "No matching estimates" : "No estimates yet"}
            description={q ? "Try a different search." : "Create a quote and convert it to an invoice when accepted."}
            action={
              !q && (
                <Button render={<Link href="/estimates/new" />} className="gap-2">
                  <Plus className="size-4" /> New estimate
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
                  <TableHead>Date</TableHead>
                  <TableHead>Valid until</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estimates.map((est) => (
                  <TableRow key={est.id}>
                    <TableCell className="p-0">
                      <Link href={`/estimates/${est.id}`} className="block px-4 py-3 font-mono text-sm font-medium">
                        {est.number}
                      </Link>
                    </TableCell>
                    <TableCell>{est.client.displayName}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(est.issueDate)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(est.expiryDate)}</TableCell>
                    <TableCell className="text-right font-semibold tabular">
                      {formatMoney(est.total, est.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <EstimateStatusPill status={est.status} />
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
