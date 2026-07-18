import type { CSSProperties } from "react";
import type { DocData } from "@/lib/document-data";
import { Paper } from "@/components/invoice/paper";
import { Amount } from "@/components/invoice/amount";
import {
  companyAddressLines,
  companyContactLines,
  clientLines,
  vatLabel,
  whtLabel,
} from "./shared";

const SANS: CSSProperties = { fontFamily: "var(--font-plex-sans), sans-serif" };
const MONO: CSSProperties = { fontFamily: "var(--font-plex-mono), monospace" };

const INK = "#161616";
const SUB = "#525252";
const FAINT = "#6f6f6f";
const RULE = "#e0e0e0";

/**
 * Milestone billing for fixed-price / SOW engagements, in the same visual
 * language as the Enterprise template (Plex type, ink header band, accent
 * hairline). No rate or quantity columns — each line is a milestone with a
 * lump-sum fee; contract references (custom fields) lead the metadata strip.
 */
export function FixedCostTemplate({ data }: { data: DocData }) {
  const accent = data.accentColor;
  const c = data.company;
  const money = (n: number) => <Amount value={n} currency={data.currency} />;

  return (
    <Paper className="text-[11.5px] leading-snug" style={{ ...SANS, color: INK }}>
      {/* Header band */}
      <div className="px-[16mm] pb-[5mm] pt-[7mm] text-white" style={{ backgroundColor: INK }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            {c.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.logoUrl} alt="" className="h-12 w-12 bg-white object-contain p-1" />
            ) : null}
            <div>
              <div className="text-[20px] font-semibold leading-none tracking-tight">
                {c.tradeName || c.legalName}
              </div>
              {c.tradeName && (
                <div className="mt-1.5 text-[10px] tracking-wide text-white/55">{c.legalName}</div>
              )}
              {c.arabicName && (
                <div dir="rtl" className="mt-1 text-[12px] leading-tight text-white/70">
                  {c.arabicName}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/55">
              {data.docLabel}
            </div>
            <div className="mt-1.5 text-[16px]" style={MONO}>
              {data.number}
            </div>
            <div className="mt-1.5 text-[8.5px] font-medium uppercase tracking-[0.18em] text-white/45">
              Fixed-fee engagement
            </div>
          </div>
        </div>
      </div>
      <div className="h-[3px]" style={{ backgroundColor: accent }} />

      <div className="flex-1 px-[16mm] py-[6mm]">
        {/* Metadata strip — contract references lead */}
        <div className="grid grid-cols-4 gap-6 border-b pb-4" style={{ borderColor: RULE }}>
          <Meta label={data.dateLabel} value={data.dateValue} />
          <Meta label={data.dueLabel} value={data.dueValue} />
          {data.customFields.length > 0 ? (
            data.customFields.slice(0, 2).map((f) => <Meta key={f.label} label={f.label} value={f.value} />)
          ) : (
            <Meta label="Currency" value={data.currency} />
          )}
        </div>

        {/* From / Bill to */}
        <div className="mt-4 grid grid-cols-2 gap-12">
          <Party accent={accent} label="From">
            <div className="text-[13px] font-semibold">{c.legalName}</div>
            <div className="mt-1.5 space-y-0.5" style={{ color: SUB }}>
              {companyAddressLines(c).map((l, i) => (
                <div key={i}>{l}</div>
              ))}
              {companyContactLines(c).map((l, i) => (
                <div key={`c${i}`}>{l}</div>
              ))}
              {c.licenseNumber && (
                <div style={MONO} className="pt-1">Licence No. {c.licenseNumber}</div>
              )}
              {(data.vatEnabled ? c.vatTrn : c.corporateTaxTrn) && (
                <div style={MONO}>
                  {data.vatEnabled ? "VAT TRN" : "Corporate Tax TRN"}{" "}
                  {data.vatEnabled ? c.vatTrn : c.corporateTaxTrn}
                </div>
              )}
            </div>
          </Party>
          <Party accent={accent} label="Bill to">
            <div className="text-[13px] font-semibold">{data.client.displayName}</div>
            <div className="mt-1.5 space-y-0.5" style={{ color: SUB }}>
              {clientLines(data.client).map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          </Party>
        </div>

        {/* Milestone table — lump-sum fees, no rate/qty columns */}
        <div className="mt-5">
          <SectionLabel accent={accent}>Milestones &amp; deliverables</SectionLabel>
          <table className="mt-3 w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: `1.5px solid ${INK}` }}>
                <th className="w-8 pb-2 text-left text-[9.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: FAINT }}>
                  #
                </th>
                <th className="pb-2 text-left text-[9.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: FAINT }}>
                  Milestone / Deliverable
                </th>
                <th className="w-[24%] pb-2 text-right text-[9.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: FAINT }}>
                  Fee
                </th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((l, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${RULE}` }}>
                  <td className="py-2 pr-3 align-top" style={{ ...MONO, color: FAINT }}>
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <td className="py-2 pr-4 align-top">
                    <div className="font-medium leading-relaxed">{l.description}</div>
                    {l.quantity !== 1 && (
                      <div className="text-[9.5px]" style={{ color: FAINT }}>
                        {l.quantity} × {money(l.unitPrice)}
                        {l.unit ? ` / ${l.unit}` : ""}
                      </div>
                    )}
                    {l.discount > 0 && (
                      <div className="text-[9.5px]" style={{ color: FAINT }}>
                        Less discount {money(l.discount)}
                      </div>
                    )}
                  </td>
                  <td className="py-2 text-right align-top font-semibold" style={MONO}>
                    {money(l.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-3 flex justify-end">
          <div className="w-[52%]">
            <TotalRow label="Subtotal" value={money(data.subtotal)} />
            {data.discountAmount > 0 && (
              <TotalRow label="Discount" value={<>−{money(data.discountAmount)}</>} />
            )}
            {data.vatEnabled && (
              <TotalRow label={vatLabel(data.vatRate)} value={money(data.vatAmount)} />
            )}
            <div style={{ borderTop: `1.5px solid ${INK}` }} className="mt-1">
              <TotalRow label={`Total (${data.currency})`} value={money(data.total)} strong />
            </div>
            {data.withholdingEnabled && (
              <TotalRow label={whtLabel(data.withholdingRate)} value={money(data.withholdingAmount)} />
            )}
            {data.amountPaid > 0 && (
              <TotalRow label="Amount paid" value={<>−{money(data.amountPaid)}</>} />
            )}

            {/* Amount due — black emphasis bar */}
            <div
              className="mt-3 flex items-center justify-between px-4 py-3 text-white"
              style={{ backgroundColor: INK }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                Amount due · {data.currency}
              </span>
              <span className="text-[16px] font-semibold" style={MONO}>
                {money(data.amountDue)}
              </span>
            </div>
            {data.withholdingEnabled && (
              <p className="mt-2 text-right text-[9px] italic leading-snug" style={{ color: FAINT }}>
                Withholding tax ({Math.round(data.withholdingRate)}%) is borne and remitted
                separately by the client to the tax authority, over and above the invoice
                value. The invoice amount is payable in full.
              </p>
            )}
          </div>
        </div>

        {/* Payment instructions */}
        {(c.iban || c.bankName) && (
          <div className="mt-5">
            <SectionLabel accent={accent}>Remittance details</SectionLabel>
            <div className="mt-2.5 grid grid-cols-4 gap-x-8 gap-y-2.5 border-y py-2.5" style={{ borderColor: RULE }}>
              {c.bankName && <Field label="Bank" value={c.bankName} />}
              {c.accountName && <Field label="Account name" value={c.accountName} wide />}
              {c.iban && <Field label="IBAN" value={c.iban} mono />}
              {c.swift && <Field label="SWIFT / BIC" value={c.swift} mono />}
              {c.accountNumber && <Field label="Account no." value={c.accountNumber} mono />}
              {c.routingCode && <Field label="Routing" value={c.routingCode} mono />}
            </div>
          </div>
        )}

        {/* Notes & terms */}
        {(data.notes || data.terms) && (
          <div className="mt-4 grid grid-cols-2 gap-12">
            {data.notes && (
              <div>
                <SectionLabel accent={accent}>Notes</SectionLabel>
                <p className="mt-2 whitespace-pre-line text-[10px]" style={{ color: SUB }}>{data.notes}</p>
              </div>
            )}
            {data.terms && (
              <div>
                <SectionLabel accent={accent}>Terms &amp; conditions</SectionLabel>
                <p className="mt-2 whitespace-pre-line text-[10px]" style={{ color: SUB }}>{data.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-end justify-between px-[16mm] py-[4mm]" style={{ borderTop: `2px solid ${INK}` }}>
        <div className="text-[9.5px]" style={{ color: FAINT }}>
          <div className="font-semibold" style={{ color: INK }}>{c.legalName}</div>
          {c.licenseNumber && <div style={MONO}>Licence No. {c.licenseNumber}</div>}
          {c.corporateTaxTrn && <div style={MONO}>Corporate Tax TRN {c.corporateTaxTrn}</div>}
        </div>
        <div className="text-right text-[9.5px]" style={{ color: FAINT }}>
          <div>{companyContactLines(c).join("  ·  ")}</div>
          <div className="mt-0.5" style={MONO}>Page 1 of 1</div>
        </div>
      </div>
    </Paper>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] font-medium uppercase tracking-[0.12em]" style={{ color: FAINT }}>
        {label}
      </div>
      <div className="mt-1 text-[12px] font-medium">{value}</div>
    </div>
  );
}

function SectionLabel({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-[9px] w-[3px]" style={{ backgroundColor: accent }} />
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: INK }}>
        {children}
      </span>
    </div>
  );
}

function Party({
  label,
  accent,
  children,
}: {
  label: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <SectionLabel accent={accent}>{label}</SectionLabel>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-1 ${strong ? "font-semibold" : ""}`}>
      <span className="text-[11px]" style={{ color: strong ? INK : SUB }}>{label}</span>
      <span className="text-[12px]" style={{ ...MONO, color: INK }}>{value}</span>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  wide,
}: {
  label: string;
  value: string;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <div className="text-[9px] font-medium uppercase tracking-[0.12em]" style={{ color: FAINT }}>
        {label}
      </div>
      <div className="mt-1 text-[10.5px] font-medium" style={mono ? MONO : undefined}>
        {value}
      </div>
    </div>
  );
}
