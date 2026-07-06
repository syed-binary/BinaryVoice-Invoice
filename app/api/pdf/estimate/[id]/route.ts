import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderPdfFromUrl } from "@/lib/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const estimate = await prisma.estimate.findUnique({
    where: { id },
    select: { number: true },
  });
  if (!estimate) return new Response("Not found", { status: 404 });

  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";

  try {
    const pdf = await renderPdfFromUrl(
      `${url.origin}/print/estimate/${id}`,
      request.headers.get("cookie") ?? "",
    );
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${estimate.number}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF generation failed:", err);
    return new Response("Failed to generate PDF", { status: 500 });
  }
}
