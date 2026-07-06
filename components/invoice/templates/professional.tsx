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

export function ProfessionalTemplate({ data }: { data: DocData }) {
  const accent = data.accentColor;
  const c = data.company;
  const money = (n: number) => <Amount value={n} currency={data.currency} />;

  return (
    <Paper className="font-sans text-[10.5px] text-[#2a2a2a]">
      <div className="flex-1 px-[15mm] py-[14mm]">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 pb-5" style={{ borderColor: accent }}>
          <div className="flex items-center gap-3">
            {c.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.logoUrl} alt="" className="h-14 w-14 object-contain" />
            ) : null}
            <div>
              <div className="font-display text-[19px] font-bold tracking-tight">{c.legalName}</div>
              {c.tradeName && <div className="text-[10px] text-[#777]">{c.tradeName}</div>}
              <div className="mt-1 text-[9.5px] text-[#777]">{companyAddressLines(c).join(" · ")}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-[24px] font-bold uppercase tracking-tight" style={{ color: accent }}>
              {data.docLabel}
            </div>
            <table className="ml-auto mt-2 text-[10px]">
              <tbody>
                <tr><td className="pr-3 text-right text-[#888]">No.</td><td className="text-right font-mono font-semibold">{data.number}</td></tr>
                <tr><td className="pr-3 text-right text-[#888]">{data.dateLabel}</td><td className="text-right font-medium">{data.dateValue}</td></tr>
                <tr><td className="pr-3 text-right text-[#888]">{data.dueLabel}</td><td className="text-right font-medium">{data.dueValue}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Bill to / TRN */}
        <div className="mt-6 grid grid-cols-2 gap-6">
          <div className="rounded-md border border-[#e2e2e2] p-4">
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-[#888]">Bill to</div>
            <div className="text-[12px] font-bold">{data.client.displayName}</div>
            <div className="mt-1 space-y-0.5 text-[#666]">
              {clientLines(data.client).map((l, i) => <div key={i}>{l}</div>)}
            </div>
          </div>
          <div className="rounded-md p-4" style={{ backgroundColor: withAlpha(accent, 12) }}>
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>Details</div>
            <div className="space-y-1 text-[#555]">
              <div className="flex justify-between"><span>Currency</span><span className="font-semibold">{data.currency}</span></div>
              {data.vatEnabled && c.vatTrn && <div className="flex justify-between"><span>VAT TRN</span><span className="font-semibold">{c.vatTrn}</span></div>}
              {!data.vatEnabled && c.corporateTaxTrn && <div className="flex justify-between"><span>Corporate Tax TRN</span><span className="font-semibold">{c.corporateTaxTrn}</span></div>}
              {data.customFields.map((f) => (
                <div key={f.label} className="flex justify-between"><span>{f.label}</span><span className="font-semibold">{f.value}</span></div>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <table className="mt-6 w-full border-collapse text-[10px]">
          <thead>
            <tr className="text-white" style={{ backgroundColor: accent }}>
              <th className="border border-[#00000010] px-3 py-2 text-left font-semibold">#</th>
              <th className="border border-[#00000010] px-3 py-2 text-left font-semibold">Resource / Description</th>
              <th className="border border-[#00000010] px-3 py-2 text-right font-semibold">No.</th>
              <th className="border border-[#00000010] px-3 py-2 text-right font-semibold">Rate</th>
              <th className="border border-[#00000010] px-3 py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((l, i) => (
              <tr key={i} className={i % 2 ? "bg-[#fafafa]" : ""}>
                <td className="border border-[#e6e6e6] px-3 py-2 text-[#999]">{i + 1}</td>
                <td className="border border-[#e6e6e6] px-3 py-2 font-medium">{l.description}</td>
                <td className="border border-[#e6e6e6] px-3 py-2 text-right tabular-nums">{l.quantity}</td>
                <td className="border border-[#e6e6e6] px-3 py-2 text-right tabular-nums">
                  {money(l.unitPrice)}
                  {l.unit && <span className="text-[#999]"> / {l.unit}</span>}
                </td>
                <td className="border border-[#e6e6e6] px-3 py-2 text-right font-semibold tabular-nums">{money(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-5 flex justify-end">
          <table className="w-[48%] text-[11px]">
            <tbody>
              <tr><td className="py-1 text-[#666]">Subtotal</td><td className="py-1 text-right tabular-nums">{money(data.subtotal)}</td></tr>
              {data.discountAmount > 0 && <tr><td className="py-1 text-[#666]">Discount</td><td className="py-1 text-right tabular-nums">−{money(data.discountAmount)}</td></tr>}
              {data.vatEnabled && <tr><td className="py-1 text-[#666]">{vatLabel(data.vatRate)}</td><td className="py-1 text-right tabular-nums">{money(data.vatAmount)}</td></tr>}
              <tr style={{ backgroundColor: accent }} className="text-white">
                <td className="px-2 py-2 font-bold">Total {data.currency}</td>
                <td className="px-2 py-2 text-right font-display text-[14px] font-bold tabular-nums">{money(data.total)}</td>
              </tr>
              {data.withholdingEnabled && (
                <>
                  <tr><td className="py-1 text-[#666]">{whtLabel(data.withholdingRate)}</td><td className="py-1 text-right tabular-nums">−{money(data.withholdingAmount)}</td></tr>
                  <tr className="border-t-2" style={{ borderColor: accent }}>
                    <td className="py-1.5 font-bold">Net payable {data.currency}</td>
                    <td className="py-1.5 text-right font-bold tabular-nums">{money(data.netPayable)}</td>
                  </tr>
                </>
              )}
              {data.amountPaid > 0 && (
                <>
                  <tr><td className="py-1 text-[#666]">Paid</td><td className="py-1 text-right tabular-nums">−{money(data.amountPaid)}</td></tr>
                  <tr><td className="py-1 font-bold">Amount due</td><td className="py-1 text-right font-bold tabular-nums">{money(data.amountDue)}</td></tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {data.withholdingEnabled && (
          <p className="mt-2 text-right text-[9px] italic text-[#888]">
            Withholding tax is deducted at source by the client and remitted to their tax authority.
          </p>
        )}

        {(c.iban || c.bankName) && (
          <div className="mt-8 rounded-md border border-[#e2e2e2] p-4 text-[9.5px]">
            <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>Bank transfer</div>
            <div className="grid grid-cols-3 gap-x-6 gap-y-1 text-[#555]">
              {c.bankName && <div><span className="text-[#999]">Bank: </span>{c.bankName}</div>}
              {c.accountName && <div><span className="text-[#999]">Name: </span>{c.accountName}</div>}
              {c.iban && <div><span className="text-[#999]">IBAN: </span><span className="font-mono">{c.iban}</span></div>}
              {c.swift && <div><span className="text-[#999]">SWIFT: </span><span className="font-mono">{c.swift}</span></div>}
              {c.accountNumber && <div><span className="text-[#999]">A/C: </span><span className="font-mono">{c.accountNumber}</span></div>}
              {c.routingCode && <div><span className="text-[#999]">Routing: </span><span className="font-mono">{c.routingCode}</span></div>}
            </div>
          </div>
        )}

        {(data.notes || data.terms) && (
          <div className="mt-5 space-y-2 text-[9.5px] text-[#666]">
            {data.notes && <p><span className="font-bold text-[#2a2a2a]">Notes: </span>{data.notes}</p>}
            {data.terms && <p><span className="font-bold text-[#2a2a2a]">Terms: </span>{data.terms}</p>}
          </div>
        )}
      </div>

      <div className="mt-auto border-t border-[#e6e6e6] px-[15mm] py-[6mm] text-center text-[9px] text-[#999]">
        {companyContactLines(c).join("  ·  ")}
      </div>
    </Paper>
  );
}
