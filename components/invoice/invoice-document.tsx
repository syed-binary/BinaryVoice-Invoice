import type { DocData } from "@/lib/document-data";
import { EnterpriseTemplate } from "./templates/enterprise";
import { ModernTemplate } from "./templates/modern";
import { MinimalTemplate } from "./templates/minimal";
import { ProfessionalTemplate } from "./templates/professional";
import { BoldTemplate } from "./templates/bold";

export function InvoiceDocument({
  data,
  templateId,
}: {
  data: DocData;
  templateId: string;
}) {
  switch (templateId) {
    case "enterprise":
      return <EnterpriseTemplate data={data} />;
    case "modern":
      return <ModernTemplate data={data} />;
    case "minimal":
      return <MinimalTemplate data={data} />;
    case "professional":
      return <ProfessionalTemplate data={data} />;
    case "bold":
      return <BoldTemplate data={data} />;
    default:
      return <EnterpriseTemplate data={data} />;
  }
}
