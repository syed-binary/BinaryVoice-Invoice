import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCompany } from "@/lib/company";
import { contractHtml } from "@/lib/contracts/markdown";
import { formatDateLong } from "@/lib/format";
import { CONTRACT_TYPE_LABEL } from "@/lib/contract-status";

export const dynamic = "force-dynamic";

const INK = "#161616";

/**
 * Print-ready contract for Playwright PDF rendering (auth via forwarded
 * cookie). Styled after the Enterprise invoice template: IBM Plex type, ink
 * letterhead band, accent hairline. The PDF route adds page margins and a
 * running page-number footer, so this page only renders the flowing document.
 */
export default async function PrintContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [contract, company] = await Promise.all([
    prisma.contract.findUnique({
      where: { id },
      include: {
        signatories: { orderBy: { order: "asc" } },
        contractor: { select: { name: true } },
        client: { select: { displayName: true } },
      },
    }),
    getCompany(),
  ]);
  if (!contract) notFound();

  const body = contract.bodySnapshot ?? contract.body;
  const accent = company.accentColor;

  return (
    <div
      className="mx-auto max-w-[210mm] bg-white text-[11.5px] leading-relaxed"
      style={{ fontFamily: "var(--font-plex-sans), sans-serif", color: INK }}
    >
      {/* Letterhead band — first page only, flows with the document */}
      <div className="px-[16mm] pb-[5mm] pt-[6mm] text-white" style={{ backgroundColor: INK }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[19px] font-semibold leading-none tracking-tight">
              {company.tradeName || company.legalName}
            </div>
            {company.tradeName && (
              <div className="mt-1.5 text-[10px] tracking-wide text-white/55">{company.legalName}</div>
            )}
            {company.arabicName && (
              <div dir="rtl" className="mt-1 text-left text-[11px] leading-tight text-white/70">
                {company.arabicName}
              </div>
            )}
            <div className="mt-1.5 text-[8.5px] tracking-wide text-white/45">
              {[
                company.licenseNumber ? `Licence No. ${company.licenseNumber}` : null,
                [company.addressLine1, company.addressLine2, company.city, company.country]
                  .filter(Boolean)
                  .join(", "),
              ]
                .filter(Boolean)
                .join("  ·  ")}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
              {CONTRACT_TYPE_LABEL[contract.type] ?? contract.type}
            </div>
            <div className="mt-1.5 text-[14px]" style={{ fontFamily: "var(--font-plex-mono), monospace" }}>
              {contract.number}
            </div>
          </div>
        </div>
      </div>
      <div className="h-[3px]" style={{ backgroundColor: accent }} />

      {/* Metadata strip — mirrors the Enterprise invoice */}
      <div className="mx-[16mm] grid grid-cols-4 gap-6 border-b border-[#e0e0e0] pb-3 pt-4">
        <Meta label="Effective date" value={contract.effectiveDate ? formatDateLong(contract.effectiveDate) : "—"} />
        <Meta label="Counterparty" value={contract.contractor?.name ?? contract.client?.displayName ?? "—"} />
        <Meta label="Notice period" value={contract.noticePeriodDays != null ? `${contract.noticePeriodDays} days` : "—"} />
        <Meta label="Status" value={contract.status.charAt(0) + contract.status.slice(1).toLowerCase()} />
      </div>

      {/* Document body */}
      <div className="px-[16mm] py-[6mm]">
        <div
          className="contract-body
            [&_h1]:mb-4 [&_h1]:text-[21px] [&_h1]:font-bold [&_h1]:tracking-tight
            [&_h2]:mb-2.5 [&_h2]:mt-7 [&_h2]:border-l-[3px] [&_h2]:pl-2.5 [&_h2]:text-[13px] [&_h2]:font-semibold [&_h2]:uppercase [&_h2]:tracking-[0.12em]
            [&_h3]:mb-1.5 [&_h3]:mt-4 [&_h3]:text-[12px] [&_h3]:font-semibold
            [&_p]:mb-2.5 [&_li]:mb-1
            [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse
            [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:text-[9.5px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.1em]
            [&_td]:border-b [&_td]:border-[#e0e0e0] [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:align-top"
          dangerouslySetInnerHTML={{ __html: contractHtml(body) }}
        />

        {contract.signatories.length > 0 && (
          <div className="mt-10 pt-6" style={{ borderTop: `2px solid ${INK}` }}>
            <h2
              className="mb-4 border-l-[3px] pl-2.5 text-[13px] font-semibold uppercase tracking-[0.12em]"
              style={{ borderColor: accent }}
            >
              Electronic signatures
            </h2>
            <div className="space-y-5">
              {contract.signatories.map((s) => (
                <div key={s.id} className="border border-[#e0e0e0] p-4">
                  <div className="text-base font-semibold italic">
                    {s.signatureName ?? "________________________"}
                  </div>
                  <div className="mt-1 text-[10px] text-[#6f6f6f]">
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
          </div>
        )}

        {contract.bodyHash && (
          <p className="mt-6 text-[8.5px] text-[#9a9a9a]" style={{ fontFamily: "var(--font-plex-mono), monospace" }}>
            Document integrity: SHA-256 {contract.bodyHash} · {contract.number}
          </p>
        )}
      </div>

      <style>{`
        /* Contracts flow across pages: override the app-wide full-bleed
           @page (invoices) with real margins; the PDF footer lives in the
           bottom margin. Page 1's letterhead compensates with negative top. */
        @media print {
          @page { margin: 12mm 0 18mm 0; }
        }
        .contract-body h2 { border-color: ${accent}; }
        .contract-body th { border-bottom: 1.5px solid ${INK}; color: #6f6f6f; }
        .contract-body tr { break-inside: avoid; }
        .contract-body h2, .contract-body h3 { break-after: avoid; }
        .contract-body strong { color: ${INK}; }
        /* Key-value tables: label column styled like invoice field labels */
        .contract-body td:first-child strong {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #6f6f6f;
        }
      `}</style>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[8.5px] font-medium uppercase tracking-[0.12em] text-[#6f6f6f]">{label}</div>
      <div className="mt-0.5 text-[11px] font-medium">{value}</div>
    </div>
  );
}
