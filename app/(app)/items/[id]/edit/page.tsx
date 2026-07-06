import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { ItemForm } from "@/components/items/item-form";

export const dynamic = "force-dynamic";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) notFound();

  return (
    <>
      <PageHeader title="Edit item" description={item.name} />
      <PageBody className="max-w-2xl">
        <ItemForm item={item} />
      </PageBody>
    </>
  );
}
