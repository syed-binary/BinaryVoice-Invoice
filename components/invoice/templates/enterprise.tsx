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

export function EnterpriseTemplate({ data }: { data: DocData }) {
  const accent = data.accentColor;
  const c = data.company;
  const money = (n: number) => <Amount value={n} currency={data.currency} />;

  return (
    <Paper className="text-[10.5px] leading-relaxed" style={{ ...SANS, color: INK }}>
      {/* Header band */}
      <div className="px-[16mm] pb-[10mm] pt-[12mm] text-white" style={{ backgroundColor: INK }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            {c.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.logoUrl} alt="" className="h-12 w-12 bg-white object-contain p-1" />
            ) : null}
            <div>
              <div className="text-[19px] font-semibold leading-none tracking-tight">
                {c.tradeName || c.legalName}
              </div>
              {c.tradeName && (
                <div className="mt-1.5 text-[9px] tracking-wide text-white/55">{c.legalName}</div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-white/55">
              {data.docLabel}
            </div>
            <div className="mt-1.5 text-[15px]" style={MONO}>
              {data.number}
            </div>
          </div>
        </div>
      </div>
      <div className="h-[3px]" style={{ backgroundColor: accent }} />

      <div className="flex-1 px-[16mm] py-[9mm]">
        {/* Metadata strip */}
        <div className="grid grid-cols-4 gap-6 border-b pb-6" style={{ borderColor: RULE }}>
          <Meta label={data.dateLabel} value={data.dateValue} />
          <Meta label={data.dueLabel} value={data.dueValue} />
          <Meta label="Currency" value={data.currency} />
          {data.customFields[0] ? (
            <Meta label={data.customFields[0].label} value={data.customFields[0].value} />
          ) : (
            <Meta label="Status" value={titleCase(data.status)} />
          )}
        </div>

        {/* From / Bill to */}
        <div className="mt-7 grid grid-cols-2 gap-12">
          <Party accent={accent} label="From">
            <div className="text-[12px] font-semibold">{c.legalName}</div>
            <div className="mt-1.5 space-y-0.5" style={{ color: SUB }}>
              {companyAddressLines(c).map((l, i) => (
                <div key={i}>{l}</div>
              ))}
              {companyContactLines(c).map((l, i) => (
                <div key={`c${i}`}>{l}</div>
              ))}
              {(data.vatEnabled ? c.vatTrn : c.corporateTaxTrn) && (
                <div style={MONO} className="pt-1">
                  {data.vatEnabled ? "VAT TRN" : "Corporate Tax TRN"}{" "}
                  {data.vatEnabled ? c.vatTrn : c.corporateTaxTrn}
                </div>
              )}
            </div>
          </Party>
          <Party accent={accent} label="Bill to">
            <div className="text-[12px] font-semibold">{data.client.displayName}</div>
            <div className="mt-1.5 space-y-0.5" style={{ color: SUB }}>
              {clientLines(data.client).map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          </Party>
        </div>

        {/* Services table */}
        <div className="mt-9">
          <SectionLabel accent={accent}>Services rendered</SectionLabel>
          <table className="mt-3 w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: `1.5px solid ${INK}` }}>
                <th className="pb-2 text-left text-[8.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: FAINT }}>
                  Description
                </th>
                <th className="pb-2 text-right text-[8.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: FAINT }}>
                  Qty
                </th>
                <th className="pb-2 text-right text-[8.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: FAINT }}>
                  Unit
                </th>
                <th className="pb-2 text-right text-[8.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: FAINT }}>
                  Rate
                </th>
                <th className="pb-2 text-right text-[8.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: FAINT }}>
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((l, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${RULE}` }}>
                  <td className="py-3 pr-4 align-top">
                    <div className="font-medium">{l.description}</div>
                    {l.discount > 0 && (
                      <div className="text-[8.5px]" style={{ color: FAINT }}>
                        Less discount {money(l.discount)}
                      </div>
                    )}
                  </td>
                  <td className="py-3 text-right align-top" style={MONO}>{l.quantity}</td>
                  <td className="py-3 text-right align-top" style={{ color: SUB }}>{l.unit || "—"}</td>
                  <td className="py-3 text-right align-top" style={MONO}>{money(l.unitPrice)}</td>
                  <td className="py-3 text-right align-top font-semibold" style={MONO}>{money(l.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
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
              <TotalRow label={whtLabel(data.withholdingRate)} value={<>−{money(data.withholdingAmount)}</>} />
            )}
            {data.amountPaid > 0 && (
              <TotalRow label="Amount paid" value={<>−{money(data.amountPaid)}</>} />
            )}

            {/* Amount due — black emphasis bar */}
            <div
              className="mt-3 flex items-center justify-between px-4 py-3 text-white"
              style={{ backgroundColor: INK }}
            >
              <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/70">
                {data.withholdingEnabled && data.amountPaid === 0 ? "Net payable" : "Amount due"} · {data.currency}
              </span>
              <span className="text-[15px] font-semibold" style={MONO}>
                {money(data.amountDue)}
              </span>
            </div>
            {data.withholdingEnabled && (
              <p className="mt-2 text-right text-[8px] italic leading-snug" style={{ color: FAINT }}>
                Withholding tax is deducted at source by the client and remitted to their tax authority.
              </p>
            )}
          </div>
        </div>

        {/* Payment instructions */}
        {(c.iban || c.bankName) && (
          <div className="mt-9">
            <SectionLabel accent={accent}>Remittance details</SectionLabel>
            <div className="mt-3 grid grid-cols-4 gap-x-8 gap-y-3 border-y py-4" style={{ borderColor: RULE }}>
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
          <div className="mt-7 grid grid-cols-2 gap-12">
            {data.notes && (
              <div>
                <SectionLabel accent={accent}>Notes</SectionLabel>
                <p className="mt-2 whitespace-pre-line text-[9px]" style={{ color: SUB }}>{data.notes}</p>
              </div>
            )}
            {data.terms && (
              <div>
                <SectionLabel accent={accent}>Terms &amp; conditions</SectionLabel>
                <p className="mt-2 whitespace-pre-line text-[9px]" style={{ color: SUB }}>{data.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-end justify-between px-[16mm] py-[6mm]" style={{ borderTop: `2px solid ${INK}` }}>
        <div className="text-[8.5px]" style={{ color: FAINT }}>
          <div className="font-semibold" style={{ color: INK }}>{c.legalName}</div>
          {c.corporateTaxTrn && <div style={MONO}>Corporate Tax TRN {c.corporateTaxTrn}</div>}
        </div>
        <div className="text-right text-[8.5px]" style={{ color: FAINT }}>
          <div>{companyContactLines(c).join("  ·  ")}</div>
          <div className="mt-0.5" style={MONO}>Page 1 of 1</div>
        </div>
      </div>
    </Paper>
  );
}

function titleCase(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[8px] font-medium uppercase tracking-[0.12em]" style={{ color: FAINT }}>
        {label}
      </div>
      <div className="mt-1 text-[11px] font-medium">{value}</div>
    </div>
  );
}

function SectionLabel({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-block h-[9px] w-[3px]" style={{ backgroundColor: accent }} />
      <span className="text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: INK }}>
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
    <div className={`flex items-center justify-between py-1.5 ${strong ? "font-semibold" : ""}`}>
      <span className="text-[10px]" style={{ color: strong ? INK : SUB }}>{label}</span>
      <span className="text-[11px]" style={{ ...MONO, color: INK }}>{value}</span>
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
      <div className="text-[8px] font-medium uppercase tracking-[0.12em]" style={{ color: FAINT }}>
        {label}
      </div>
      <div className="mt-1 text-[9.5px] font-medium" style={mono ? MONO : undefined}>
        {value}
      </div>
    </div>
  );
}
