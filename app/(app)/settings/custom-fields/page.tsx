import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getFieldDefs } from "@/lib/custom-fields";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { CustomFieldsManager } from "@/components/settings/custom-fields-manager";

export const dynamic = "force-dynamic";

export default async function CustomFieldsPage() {
  const [clientFields, invoiceFields] = await Promise.all([
    getFieldDefs("CLIENT"),
    getFieldDefs("INVOICE"),
  ]);

  return (
    <>
      <PageHeader
        title="Custom fields"
        description="Add your own fields to clients, invoices and estimates."
      />
      <PageBody className="space-y-5">
        <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to settings
        </Link>
        <CustomFieldsManager clientFields={clientFields} invoiceFields={invoiceFields} />
      </PageBody>
    </>
  );
}
