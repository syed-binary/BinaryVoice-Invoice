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

/**
 * Milestone billing for fixed-price / SOW engagements. No rate or quantity
 * columns — each line is a milestone with a lump-sum fee; contract references
 * (custom fields) sit up front where a PO box normally would.
 */
export function FixedCostTemplate({ data }: { data: DocData }) {
  const accent = data.accentColor;
  const c = data.company;
  const money = (n: number) => <Amount value={n} currency={data.currency} />;

  return (
    <Paper className="font-sans text-[10.5px] text-[#26262b]">
      <div className="flex-1 px-[15mm] py-[14mm]">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {c.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.logoUrl} alt="" className="h-14 w-14 object-contain" />
            ) : null}
            <div>
              <div className="font-display text-[19px] font-bold tracking-tight">{c.legalName}</div>
              {c.tradeName && <div className="text-[10px] text-[#77777d]">{c.tradeName}</div>}
              <div className="mt-1 text-[9.5px] text-[#77777d]">{companyAddressLines(c).join(" · ")}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-[24px] font-bold uppercase tracking-tight" style={{ color: accent }}>
              {data.docLabel}
            </div>
            <div
              className="mt-1 inline-block rounded-sm px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.14em] text-white"
              style={{ backgroundColor: accent }}
            >
              Fixed-fee engagement
            </div>
            <table className="ml-auto mt-2 text-[10px]">
              <tbody>
                <tr><td className="pr-3 text-right text-[#8b8b91]">No.</td><td className="text-right font-mono font-semibold">{data.number}</td></tr>
                <tr><td className="pr-3 text-right text-[#8b8b91]">{data.dateLabel}</td><td className="text-right font-medium">{data.dateValue}</td></tr>
                <tr><td className="pr-3 text-right text-[#8b8b91]">{data.dueLabel}</td><td className="text-right font-medium">{data.dueValue}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 h-[3px] w-full" style={{ backgroundColor: accent }} />

        {/* Bill to / Contract reference */}
        <div className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#8b8b91]">Bill to</div>
            <div className="text-[12px] font-bold">{data.client.displayName}</div>
            <div className="mt-1 space-y-0.5 text-[#66666c]">
              {clientLines(data.client).map((l, i) => <div key={i}>{l}</div>)}
            </div>
          </div>
          <div className="rounded-md border p-4" style={{ borderColor: withAlpha(accent, 64), backgroundColor: withAlpha(accent, 8) }}>
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>
              Contract &amp; engagement
            </div>
            <div className="space-y-1 text-[#55555b]">
              {data.customFields.map((f) => (
                <div key={f.label} className="flex justify-between gap-3">
                  <span>{f.label}</span>
                  <span className="text-right font-semibold">{f.value}</span>
                </div>
              ))}
              <div className="flex justify-between gap-3"><span>Currency</span><span className="font-semibold">{data.currency}</span></div>
              {data.vatEnabled && c.vatTrn && <div className="flex justify-between gap-3"><span>VAT TRN</span><span className="font-semibold">{c.vatTrn}</span></div>}
              {!data.vatEnabled && c.corporateTaxTrn && <div className="flex justify-between gap-3"><span>Corporate Tax TRN</span><span className="font-semibold">{c.corporateTaxTrn}</span></div>}
            </div>
          </div>
        </div>

        {/* Milestone table — lump-sum fees, no rate/qty columns */}
        <table className="mt-7 w-full border-collapse text-[10px]">
          <thead>
            <tr className="border-b-2 text-left" style={{ borderColor: accent }}>
              <th className="w-8 pb-2 pr-3 text-[9px] font-bold uppercase tracking-[0.14em] text-[#8b8b91]">#</th>
              <th className="pb-2 pr-3 text-[9px] font-bold uppercase tracking-[0.14em] text-[#8b8b91]">Milestone / Deliverable</th>
              <th className="w-[26%] pb-2 text-right text-[9px] font-bold uppercase tracking-[0.14em] text-[#8b8b91]">Fee</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((l, i) => (
              <tr key={i} className="border-b border-[#ececef] align-top">
                <td className="py-3 pr-3 text-[#9b9ba1]">{String(i + 1).padStart(2, "0")}</td>
                <td className="py-3 pr-3">
                  <div className="font-medium leading-relaxed">{l.description}</div>
                  {l.quantity !== 1 && (
                    <div className="mt-0.5 text-[9px] text-[#9b9ba1]">
                      {l.quantity} × {money(l.unitPrice)}{l.unit ? ` / ${l.unit}` : ""}
                    </div>
                  )}
                </td>
                <td className="py-3 text-right font-semibold tabular-nums">{money(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-5 flex justify-end">
          <table className="w-[48%] text-[11px]">
            <tbody>
              <tr><td className="py-1 text-[#66666c]">Subtotal</td><td className="py-1 text-right tabular-nums">{money(data.subtotal)}</td></tr>
              {data.discountAmount > 0 && <tr><td className="py-1 text-[#66666c]">Discount</td><td className="py-1 text-right tabular-nums">−{money(data.discountAmount)}</td></tr>}
              {data.vatEnabled && <tr><td className="py-1 text-[#66666c]">{vatLabel(data.vatRate)}</td><td className="py-1 text-right tabular-nums">{money(data.vatAmount)}</td></tr>}
              <tr>
                <td className="border-t-2 py-2 font-bold" style={{ borderColor: accent }}>Total due {data.currency}</td>
                <td className="border-t-2 py-2 text-right font-display text-[15px] font-bold tabular-nums" style={{ borderColor: accent, color: accent }}>
                  {money(data.total)}
                </td>
              </tr>
              {data.withholdingEnabled && (
                <tr><td className="py-1 text-[#66666c]">{whtLabel(data.withholdingRate)} · over-and-above</td><td className="py-1 text-right tabular-nums">{money(data.withholdingAmount)}</td></tr>
              )}
              {data.amountPaid > 0 && (
                <>
                  <tr><td className="py-1 text-[#66666c]">Paid</td><td className="py-1 text-right tabular-nums">−{money(data.amountPaid)}</td></tr>
                  <tr><td className="py-1 font-bold">Amount due</td><td className="py-1 text-right font-bold tabular-nums">{money(data.amountDue)}</td></tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {data.withholdingEnabled && (
          <p className="mt-2 text-right text-[9px] italic text-[#8b8b91]">
            Withholding tax ({Math.round(data.withholdingRate)}%) is borne and remitted separately by the client to the tax authority, over and above the invoice value. The invoice amount is payable in full.
          </p>
        )}

        {(c.iban || c.bankName) && (
          <div className="mt-8 rounded-md border border-[#e4e4e8] p-4 text-[9.5px]">
            <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>Bank transfer</div>
            <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-[#55555b]">
              {c.bankName && <div><span className="text-[#9b9ba1]">Bank: </span>{c.bankName}</div>}
              {c.accountName && <div><span className="text-[#9b9ba1]">Name: </span>{c.accountName}</div>}
              {c.iban && <div><span className="text-[#9b9ba1]">IBAN: </span><span className="font-mono">{c.iban}</span></div>}
              {c.swift && <div><span className="text-[#9b9ba1]">SWIFT: </span><span className="font-mono">{c.swift}</span></div>}
              {c.accountNumber && <div><span className="text-[#9b9ba1]">A/C: </span><span className="font-mono">{c.accountNumber}</span></div>}
              {c.routingCode && <div><span className="text-[#9b9ba1]">Routing: </span><span className="font-mono">{c.routingCode}</span></div>}
            </div>
          </div>
        )}

        {(data.notes || data.terms) && (
          <div className="mt-5 space-y-2 text-[9.5px] text-[#66666c]">
            {data.notes && <p><span className="font-bold text-[#26262b]">Notes: </span>{data.notes}</p>}
            {data.terms && <p><span className="font-bold text-[#26262b]">Terms: </span>{data.terms}</p>}
          </div>
        )}
      </div>

      <div className="mt-auto border-t border-[#ececef] px-[15mm] py-[6mm] text-center text-[9px] text-[#9b9ba1]">
        {companyContactLines(c).join("  ·  ")}
      </div>
    </Paper>
  );
}
