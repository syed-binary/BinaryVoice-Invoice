import Link from "next/link";
import { Plus, Package, Pencil, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCompany } from "@/lib/company";
import { deleteItem } from "@/lib/actions/items";
import { formatMoney, toNumber } from "@/lib/money";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/app/empty-state";
import { ConfirmButton } from "@/components/app/confirm-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function ItemsPage() {
  const [items, company] = await Promise.all([
    prisma.item.findMany({ where: { archived: false }, orderBy: { name: "asc" } }),
    getCompany(),
  ]);

  return (
    <>
      <PageHeader title="Items" description="Reusable products and services for your invoices.">
        <Button render={<Link href="/items/new" />} className="gap-2">
          <Plus className="size-4" /> New item
        </Button>
      </PageHeader>

      <PageBody>
        {items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No items yet"
            description="Save products or services you bill often so you can add them to invoices in one click."
            action={
              <Button render={<Link href="/items/new" />} className="gap-2">
                <Plus className="size-4" /> New item
              </Button>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Tax %</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <div className="line-clamp-1 text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular">
                      {formatMoney(item.unitPrice, company.baseCurrency)}
                      {item.unit && (
                        <span className="text-muted-foreground"> /{item.unit}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular">
                      {toNumber(item.taxRate)}%
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" render={<Link href={`/items/${item.id}/edit`} />}>
                          <Pencil className="size-4" />
                        </Button>
                        <ConfirmButton
                          trigger={
                            <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="size-4" />
                            </Button>
                          }
                          title="Delete this item?"
                          description="This removes it from your catalog. Existing invoices are unaffected."
                          action={deleteItem.bind(null, item.id)}
                        />
                      </div>
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
