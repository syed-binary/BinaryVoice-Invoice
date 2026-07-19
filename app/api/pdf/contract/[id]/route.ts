import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderPdfFromUrl } from "@/lib/pdf";
import { can } from "@/lib/permissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!can(session.user.role ?? "MEMBER", "contracts:read")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const contract = await prisma.contract.findUnique({
    where: { id },
    select: { number: true },
  });
  if (!contract) return new Response("Not found", { status: 404 });

  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";

  try {
    const pdf = await renderPdfFromUrl(
      `${url.origin}/print/contract/${id}`,
      request.headers.get("cookie") ?? "",
      {
        singlePage: false,
        margin: { top: "12mm", right: "0", bottom: "18mm", left: "0" },
        footerTemplate: `
          <div style="width:100%;padding:0 16mm;display:flex;justify-content:space-between;align-items:center;font-family:Helvetica,Arial,sans-serif;font-size:8px;color:#6f6f6f;">
            <span>${contract.number}</span>
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>`,
      },
    );
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${contract.number}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Contract PDF generation failed:", err);
    return new Response("Failed to generate PDF", { status: 500 });
  }
}
