import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { documentCapability } from "@/lib/documents";
import { getFile } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc || doc.archived) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const role = session.user.role ?? "MEMBER";
  if (!can(role, documentCapability(doc.entityType, "read"))) {
    // Portal contractors may read documents attached to their own record.
    const own =
      role === "CONTRACTOR" &&
      doc.entityType === "CONTRACTOR" &&
      (await prisma.contractor.findUnique({ where: { userId: session.user.id } }))
        ?.id === doc.entityId;
    if (!own) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let data: Buffer;
  try {
    data = await getFile(doc.storageKey);
  } catch {
    return NextResponse.json({ error: "File missing from storage" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(doc.sizeBytes),
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.fileName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
