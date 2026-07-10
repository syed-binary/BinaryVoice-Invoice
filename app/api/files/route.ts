import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { DocumentEntity, DocumentKind } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { documentCapability } from "@/lib/documents";
import { putFile } from "@/lib/storage";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const entityType = form.get("entityType") as string | null;
  const entityId = form.get("entityId") as string | null;
  const kind = (form.get("kind") as string | null) ?? "GENERIC";
  const expiryDate = form.get("expiryDate") as string | null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (
    !entityType ||
    !entityId ||
    !(entityType in DocumentEntity) ||
    !(kind in DocumentKind)
  ) {
    return NextResponse.json({ error: "Invalid entity or kind" }, { status: 400 });
  }
  const entity = entityType as DocumentEntity;
  const role = session.user.role ?? "MEMBER";
  if (!can(role, documentCapability(entity, "write"))) {
    // Portal contractors may upload to their OWN compliance vault only.
    const own =
      role === "CONTRACTOR" &&
      entity === "CONTRACTOR" &&
      (await prisma.contractor.findUnique({ where: { userId: session.user.id } }))
        ?.id === entityId;
    if (!own) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use PDF, images or Office documents." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 20 MB)." }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 6);
  const storageKey = `${entity.toLowerCase()}/${entityId}/${randomUUID()}${ext}`;
  await putFile(storageKey, Buffer.from(await file.arrayBuffer()));

  const doc = await prisma.document.create({
    data: {
      entityType: entity,
      entityId,
      kind: kind as DocumentKind,
      fileName: file.name,
      storageKey,
      mimeType: file.type,
      sizeBytes: file.size,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      uploadedById: session.user.id,
    },
  });

  return NextResponse.json({ id: doc.id, fileName: doc.fileName });
}
