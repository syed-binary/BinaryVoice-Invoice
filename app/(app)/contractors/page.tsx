import Link from "next/link";
import { Plus, UserCog, Mail, MapPin, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/app/search-input";
import { EmptyState } from "@/components/app/empty-state";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  ONBOARDING: "bg-amber-500/15 text-amber-600",
  ACTIVE: "bg-emerald-500/15 text-emerald-600",
  INACTIVE: "bg-muted text-muted-foreground",
};

export default async function ContractorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireCapability("contractors:read");
  const { q } = await searchParams;

  const contractors = await prisma.contractor.findMany({
    where: {
      archived: false,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { country: { contains: q, mode: "insensitive" } },
              { entityName: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      _count: { select: { engagements: { where: { status: "ACTIVE" } }, payables: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeader title="Contractors" description="Your global contractor workforce.">
        <Button render={<Link href="/contractors/new" />} className="gap-2">
          <Plus className="size-4" /> New contractor
        </Button>
      </PageHeader>

      <PageBody className="space-y-5">
        <SearchInput placeholder="Search contractors…" />

        {contractors.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title={q ? "No contractors found" : "No contractors yet"}
            description={q ? "Try a different search term." : "Add your first contractor to get started."}
            action={
              !q && (
                <Button render={<Link href="/contractors/new" />} className="gap-2">
                  <Plus className="size-4" /> New contractor
                </Button>
              )
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {contractors.map((c) => (
              <Link
                key={c.id}
                href={`/contractors/${c.id}`}
                className="group hover-lift rounded-xl border bg-card p-4 hover:bg-accent/40"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{c.name}</div>
                    {c.entityName && (
                      <div className="truncate text-sm text-muted-foreground">{c.entityName}</div>
                    )}
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Mail className="size-3.5" /> <span className="truncate">{c.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" /> {c.country}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs">
                  <span className={cn("rounded-full px-2 py-0.5 font-medium", STATUS_STYLE[c.status])}>
                    {c.status.toLowerCase()}
                  </span>
                  <span className="text-muted-foreground">
                    {c._count.engagements} active · {c._count.payables} payable{c._count.payables === 1 ? "" : "s"}
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
