import { prisma } from "@/lib/prisma";
import {
  requirePortalContractor,
  requirePortalEmployee,
  requireUser,
} from "@/lib/session";
import { DocumentPanel } from "@/components/documents/document-panel";

export const dynamic = "force-dynamic";

export default async function PortalDocumentsPage() {
  const session = await requireUser();
  let entityType: "CONTRACTOR" | "EMPLOYEE";
  let entityId: string;
  if (session.role === "EMPLOYEE") {
    const { employee } = await requirePortalEmployee();
    entityType = "EMPLOYEE";
    entityId = employee.id;
  } else {
    const { contractor } = await requirePortalContractor();
    entityType = "CONTRACTOR";
    entityId = contractor.id;
  }
  const documents = await prisma.document.findMany({
    where: { entityType, entityId, archived: false },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-semibold tracking-tight">Your documents</h1>
        <p className="text-sm text-muted-foreground">
          Upload identity and compliance documents (passport, tax forms, proof of address).
          Set the expiry date where applicable — we&apos;ll remind you before renewal.
        </p>
      </div>
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <DocumentPanel
          entityType={entityType}
          entityId={entityId}
          allowDelete={false}
          documents={documents.map((d) => ({
            id: d.id,
            kind: d.kind,
            fileName: d.fileName,
            sizeBytes: d.sizeBytes,
            expiryDate: d.expiryDate,
            createdAt: d.createdAt,
          }))}
        />
      </div>
    </div>
  );
}
