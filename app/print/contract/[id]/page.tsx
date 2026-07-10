import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { contractHtml } from "@/lib/contracts/markdown";
import { formatDateLong } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Print-ready contract for Playwright PDF rendering (auth via forwarded cookie). */
export default async function PrintContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contract = await prisma.contract.findUnique({
    where: { id },
    include: { signatories: { orderBy: { order: "asc" } } },
  });
  if (!contract) notFound();

  const body = contract.bodySnapshot ?? contract.body;

  return (
    <div className="mx-auto max-w-[720px] px-10 py-12 font-serif text-[13px] leading-relaxed text-neutral-900">
      <div
        className="contract-body [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-1.5 [&_h3]:mt-4 [&_h3]:text-[14px] [&_h3]:font-semibold [&_p]:mb-2.5 [&_table]:my-3 [&_table]:w-full [&_td]:border [&_td]:border-neutral-300 [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-neutral-300 [&_th]:bg-neutral-100 [&_th]:px-2 [&_th]:py-1"
        dangerouslySetInnerHTML={{ __html: contractHtml(body) }}
      />

      {contract.signatories.length > 0 && (
        <div className="mt-10 border-t border-neutral-300 pt-6">
          <h2 className="mb-4 text-lg font-semibold">Signatures</h2>
          <div className="space-y-5">
            {contract.signatories.map((s) => (
              <div key={s.id} className="rounded border border-neutral-300 p-4">
                <div className="text-base font-semibold italic">
                  {s.signatureName ?? "________________________"}
                </div>
                <div className="mt-1 text-[11px] text-neutral-600">
                  {s.name} · {s.email}
                  {s.signedAt ? (
                    <>
                      {" "}
                      · Signed electronically on {formatDateLong(s.signedAt)}
                      {s.ip ? ` · IP ${s.ip}` : ""}
                    </>
                  ) : (
                    " · Not yet signed"
                  )}
                </div>
              </div>
            ))}
          </div>
          {contract.bodyHash && (
            <p className="mt-4 text-[10px] text-neutral-500">
              Document integrity: SHA-256 {contract.bodyHash} · {contract.number}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
