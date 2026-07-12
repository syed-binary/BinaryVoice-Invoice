import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { DocumentKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { putFile } from "@/lib/storage";

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

/** PUBLIC document upload for contractor self-onboarding — token-authed. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const contractor = await prisma.contractor.findUnique({
    where: { onboardingToken: token },
  });
  if (!contractor || contractor.archived) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const kind = (form.get("kind") as string | null) ?? "GENERIC";
  const expiryDate = form.get("expiryDate") as string | null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!(kind in DocumentKind)) {
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Use PDF, PNG, JPG or WEBP" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 20 MB)" }, { status: 400 });
  }

  const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "").slice(0, 6);
  const storageKey = `contractor/${contractor.id}/${randomUUID()}${ext}`;
  await putFile(storageKey, Buffer.from(await file.arrayBuffer()));

  const doc = await prisma.document.create({
    data: {
      entityType: "CONTRACTOR",
      entityId: contractor.id,
      kind: kind as DocumentKind,
      fileName: file.name,
      storageKey,
      mimeType: file.type,
      sizeBytes: file.size,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      uploadedById: `onboarding:${contractor.id}`,
    },
  });
  return NextResponse.json({ id: doc.id, fileName: doc.fileName });
}
