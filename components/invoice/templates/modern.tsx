import type { ReactNode } from "react";
import type { DocData } from "@/lib/document-data";
import { Paper } from "@/components/invoice/paper";
import { Amount } from "@/components/invoice/amount";
import {
  companyAddressLines,
  companyContactLines,
  clientLines,
  withAlpha,
  vatLabel,
  whtLabel,
} from "./shared";

export function ModernTemplate({ data }: { data: DocData }) {
  const accent = data.accentColor;
  const c = data.company;
  const money = (n: number) => <Amount value={n} currency={data.currency} />;

  return (
    <Paper className="font-sans text-[11px] leading-relaxed">
      {/* Header band */}
      <div className="flex items-start justify-between px-[14mm] py-[12mm] text-white" style={{ backgroundColor: accent }}>
        <div className="flex items-center gap-4">
          {c.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.logoUrl} alt="" className="h-14 w-14 rounded-lg bg-white object-contain p-1" />
          ) : null}
          <div>
            <div className="font-display text-[22px] font-extrabold leading-none tracking-tight">
              {c.tradeName || c.legalName}
            </div>
            {c.tradeName && (
              <div className="mt-1 text-[10px] text-white/80">{c.legalName}</div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-[26px] font-extrabold uppercase leading-none tracking-tight">
            {data.docLabel}
          </div>
          <div className="mt-2 font-mono text-[12px] text-white/90">{data.number}</div>
        </div>
      </div>

      <div className="flex-1 px-[14mm] py-[10mm]">
        {/* Parties + meta */}
        <div className="flex justify-between gap-8">
          <div className="max-w-[52%]">
            <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: accent }}>
              Billed to
            </div>
            <div className="text-[13px] font-bold text-[#1a1a2e]">{data.client.displayName}</div>
            <div className="mt-1 space-y-0.5 text-[#555]">
              {clientLines(data.client).map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          </div>
          <div className="text-right text-[#555]">
            <MetaRow label={data.dateLabel} value={data.dateValue} />
            <MetaRow label={data.dueLabel} value={data.dueValue} />
            <MetaRow label="Currency" value={data.currency} />
            {data.customFields.map((f) => (
              <MetaRow key={f.label} label={f.label} value={f.value} />
            ))}
          </div>
        </div>

        {/* Company details / TRN strip */}
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1 rounded-lg px-4 py-3 text-[10px] text-[#555]" style={{ backgroundColor: withAlpha(accent, 12) }}>
          <div>
            <span className="font-semibold text-[#1a1a2e]">From: </span>
            {companyAddressLines(c).join(", ")}
          </div>
          {c.corporateTaxTrn && !data.vatEnabled && (
            <div><span className="font-semibold text-[#1a1a2e]">Corporate Tax TRN: </span>{c.corporateTaxTrn}</div>
          )}
          {data.vatEnabled && c.vatTrn && (
            <div><span className="font-semibold text-[#1a1a2e]">VAT TRN: </span>{c.vatTrn}</div>
          )}
        </div>

        {/* Line items */}
        <table className="mt-6 w-full border-collapse">
          <thead>
            <tr className="text-white" style={{ backgroundColor: accent }}>
              <th className="rounded-l-md px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wide">Resource / Description</th>
              <th className="px-3 py-2 text-right text-[9px] font-semibold uppercase tracking-wide">No.</th>
              <th className="px-3 py-2 text-right text-[9px] font-semibold uppercase tracking-wide">Rate</th>
              <th className="rounded-r-md px-3 py-2 text-right text-[9px] font-semibold uppercase tracking-wide">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((l, i) => (
              <tr key={i} className="border-b border-[#eee]">
                <td className="px-3 py-2.5 align-top">
                  <div className="font-medium text-[#1a1a2e]">{l.description}</div>
                  {l.discount > 0 && (
                    <div className="text-[9px] text-[#888]">Discount: −{money(l.discount)}</div>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right align-top tabular-nums">{l.quantity}</td>
                <td className="px-3 py-2.5 text-right align-top tabular-nums">
                  {money(l.unitPrice)}
                  {l.unit && <span className="text-[#888]"> / {l.unit === "Nos" ? "month" : l.unit}</span>}
                </td>
                <td className="px-3 py-2.5 text-right align-top font-semibold tabular-nums">{money(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-5 flex justify-end">
          <div className="w-[46%] space-y-1.5 text-[11px]">
            <TotalRow label="Subtotal" value={money(data.subtotal)} />
            {data.discountAmount > 0 && <TotalRow label="Discount" value={<>−{money(data.discountAmount)}</>} />}
            {data.vatEnabled && <TotalRow label={vatLabel(data.vatRate)} value={money(data.vatAmount)} />}
            <div className="mt-1 flex items-center justify-between rounded-md px-3 py-2.5 text-white" style={{ backgroundColor: accent }}>
              <span className="text-[12px] font-semibold">Total {data.currency}</span>
              <span className="font-display text-[16px] font-extrabold tabular-nums">{money(data.total)}</span>
            </div>
            {data.withholdingEnabled && (
              <>
                <TotalRow label={`${whtLabel(data.withholdingRate)} · over-and-above`} value={money(data.withholdingAmount)} />
                <p className="px-3 pt-1 text-[8.5px] italic leading-snug text-[#999]">
                  Withholding tax ({Math.round(data.withholdingRate)}%) is borne and remitted separately by the client to the tax authority, over and above the invoice value. The invoice amount is payable in full.
                </p>
              </>
            )}
            {data.amountPaid > 0 && (
              <>
                <TotalRow label="Paid" value={<>−{money(data.amountPaid)}</>} />
                <TotalRow label="Amount due" value={money(data.amountDue)} strong />
              </>
            )}
          </div>
        </div>

        {/* Payment details */}
        {(c.iban || c.bankName) && (
          <div className="mt-8 rounded-lg border border-[#eee] p-4">
            <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: accent }}>
              Payment details
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[10px] text-[#555]">
              {c.bankName && <PayRow label="Bank" value={c.bankName} />}
              {c.accountName && <PayRow label="Account name" value={c.accountName} />}
              {c.iban && <PayRow label="IBAN" value={c.iban} />}
              {c.swift && <PayRow label="SWIFT/BIC" value={c.swift} />}
              {c.accountNumber && <PayRow label="Account no." value={c.accountNumber} />}
              {c.routingCode && <PayRow label="Routing" value={c.routingCode} />}
            </div>
          </div>
        )}

        {/* Notes & terms */}
        {(data.notes || data.terms) && (
          <div className="mt-6 grid grid-cols-2 gap-8 text-[10px] text-[#555]">
            {data.notes && (
              <div>
                <div className="mb-1 font-semibold text-[#1a1a2e]">Notes</div>
                <p className="whitespace-pre-line">{data.notes}</p>
              </div>
            )}
            {data.terms && (
              <div>
                <div className="mb-1 font-semibold text-[#1a1a2e]">Terms</div>
                <p className="whitespace-pre-line">{data.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-[#eee] px-[14mm] py-[6mm] text-center text-[9px] text-[#999]">
        {c.legalName} · {companyContactLines(c).join("  ·  ")}
      </div>
    </Paper>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-1">
      <span className="text-[9px] uppercase tracking-wide text-[#999]">{label}: </span>
      <span className="font-semibold text-[#1a1a2e]">{value}</span>
    </div>
  );
}

function TotalRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3 ${strong ? "font-bold text-[#1a1a2e]" : "text-[#555]"}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function PayRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-[#999]">{label}</span>
      <span className="font-mono font-medium text-[#1a1a2e]">{value}</span>
    </div>
  );
}
