import { PageHeader, PageBody } from "@/components/app/page-header";
import { ItemForm } from "@/components/items/item-form";

export default function NewItemPage() {
  return (
    <>
      <PageHeader title="New item" description="Add a reusable product or service." />
      <PageBody className="max-w-2xl">
        <ItemForm />
      </PageBody>
    </>
  );
}
