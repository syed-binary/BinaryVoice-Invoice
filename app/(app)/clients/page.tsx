import Link from "next/link";
import { Plus, Users, Mail, Phone, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/app/search-input";
import { EmptyState } from "@/components/app/empty-state";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const clients = await prisma.client.findMany({
    where: {
      archived: false,
      ...(q
        ? {
            OR: [
              { displayName: { contains: q, mode: "insensitive" } },
              { companyName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { invoices: true } } },
    orderBy: { displayName: "asc" },
  });

  return (
    <>
      <PageHeader title="Clients" description="People and companies you invoice.">
        <Button render={<Link href="/clients/new" />} className="gap-2">
          <Plus className="size-4" /> New client
        </Button>
      </PageHeader>

      <PageBody className="space-y-5">
        <SearchInput placeholder="Search clients…" />

        {clients.length === 0 ? (
          <EmptyState
            icon={Users}
            title={q ? "No clients found" : "No clients yet"}
            description={
              q
                ? "Try a different search term."
                : "Add your first client to start invoicing."
            }
            action={
              !q && (
                <Button render={<Link href="/clients/new" />} className="gap-2">
                  <Plus className="size-4" /> New client
                </Button>
              )
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((c) => (
              <Link
                key={c.id}
                href={`/clients/${c.id}`}
                className="group hover-lift rounded-xl border bg-card p-4 hover:bg-accent/40"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{c.displayName}</div>
                    {c.companyName && (
                      <div className="truncate text-sm text-muted-foreground">
                        {c.companyName}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {c.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="size-3.5" /> <span className="truncate">{c.email}</span>
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="size-3.5" /> {c.phone}
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs">
                  <span className="rounded-full bg-muted px-2 py-0.5 font-medium">
                    {c.currency}
                  </span>
                  <span className="text-muted-foreground">
                    {c._count.invoices} invoice{c._count.invoices === 1 ? "" : "s"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}
