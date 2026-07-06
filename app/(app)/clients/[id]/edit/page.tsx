import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getFieldDefs } from "@/lib/custom-fields";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { ClientForm } from "@/components/clients/client-form";

export const dynamic = "force-dynamic";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [client, fieldDefs] = await Promise.all([
    prisma.client.findUnique({ where: { id } }),
    getFieldDefs("CLIENT"),
  ]);
  if (!client) notFound();

  return (
    <>
      <PageHeader title="Edit client" description={client.displayName} />
      <PageBody className="max-w-3xl">
        <ClientForm client={client} fieldDefs={fieldDefs} defaultCurrency={client.currency} />
      </PageBody>
    </>
  );
}
