import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { getCompany } from "@/lib/company";
import { PageHeader, PageBody } from "@/components/app/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const company = await getCompany();

  return (
    <>
      <PageHeader
        title="Settings"
        description="Company details, tax, bank and branding used across your invoices."
      >
        <Button variant="outline" render={<Link href="/settings/custom-fields" />} className="gap-2">
          <SlidersHorizontal className="size-4" /> Custom fields
        </Button>
      </PageHeader>
      <PageBody className="max-w-4xl">
        <SettingsForm company={company} />
      </PageBody>
    </>
  );
}
