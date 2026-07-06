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

export function BoldTemplate({ data }: { data: DocData }) {
  const accent = data.accentColor;
  const c = data.company;
  const money = (n: number) => <Amount value={n} currency={data.currency} />;

  return (
    <Paper className="flex-row font-sans text-[11px] text-[#1e1e2e]">
      {/* Sidebar */}
      <div className="flex w-[62mm] shrink-0 flex-col justify-between px-[10mm] py-[14mm] text-white" style={{ backgroundColor: accent }}>
        <div>
          {c.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.logoUrl} alt="" className="mb-4 h-14 w-14 rounded-lg bg-white/95 object-contain p-1" />
          ) : null}
          <div className="font-display text-[20px] font-extrabold leading-tight tracking-tight">
            {c.tradeName || c.legalName}
          </div>
          {c.tradeName && <div className="mt-1 text-[9px] text-white/70">{c.legalName}</div>}

          <div className="mt-8 space-y-0.5 text-[9.5px] text-white/85">
            {companyAddressLines(c).map((l, i) => <div key={i}>{l}</div>)}
          </div>
          <div className="mt-4 space-y-0.5 text-[9.5px] text-white/85">
            {companyContactLines(c).map((l, i) => <div key={i}>{l}</div>)}
          </div>
          {(data.vatEnabled ? c.vatTrn : c.corporateTaxTrn) && (
            <div className="mt-4 text-[9.5px] text-white/85">
              {data.vatEnabled ? "VAT TRN" : "Tax TRN"}: {data.vatEnabled ? c.vatTrn : c.corporateTaxTrn}
            </div>
          )}
        </div>

        {(c.iban || c.bankName) && (
          <div className="mt-8 border-t border-white/25 pt-4 text-[9px] text-white/85">
            <div className="mb-1.5 font-bold uppercase tracking-[0.14em] text-white/70">Payment</div>
            {c.bankName && <div>{c.bankName}</div>}
            {c.iban && <div className="font-mono">IBAN {c.iban}</div>}
            {c.swift && <div className="font-mono">SWIFT {c.swift}</div>}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col px-[12mm] py-[14mm]">
        <div className="font-display text-[40px] font-extrabold uppercase leading-none tracking-tight" style={{ color: accent }}>
          {data.docLabel}
        </div>
        <div className="mt-2 font-mono text-[13px] text-[#888]">{data.number}</div>

        <div className="mt-8 grid grid-cols-2 gap-6 text-[10px]">
          <div>
            <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#999]">Billed to</div>
            <div className="text-[13px] font-bold">{data.client.displayName}</div>
            <div className="mt-1 space-y-0.5 text-[#666]">
              {clientLines(data.client).map((l, i) => <div key={i}>{l}</div>)}
            </div>
          </div>
          <div className="text-right">
            <div className="mb-1"><span className="text-[#999]">{data.dateLabel}: </span><span className="font-semibold">{data.dateValue}</span></div>
            <div className="mb-1"><span className="text-[#999]">{data.dueLabel}: </span><span className="font-semibold">{data.dueValue}</span></div>
            {data.customFields.map((f) => (
              <div key={f.label} className="mb-1"><span className="text-[#999]">{f.label}: </span><span className="font-semibold">{f.value}</span></div>
            ))}
          </div>
        </div>

        <table className="mt-8 w-full border-collapse">
          <thead>
            <tr className="border-b-2" style={{ borderColor: accent }}>
              <th className="pb-2 text-left text-[9px] font-bold uppercase tracking-[0.12em] text-[#999]">Resource / Description</th>
              <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-[#999]">No.</th>
              <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-[#999]">Rate</th>
              <th className="pb-2 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-[#999]">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((l, i) => (
              <tr key={i} className="border-b border-[#eee]">
                <td className="py-2.5 pr-3 align-top font-medium">{l.description}</td>
                <td className="py-2.5 text-right align-top tabular-nums">{l.quantity}</td>
                <td className="py-2.5 text-right align-top tabular-nums">
                  {money(l.unitPrice)}
                  {l.unit && <span className="text-[#999]"> / {l.unit}</span>}
                </td>
                <td className="py-2.5 text-right align-top font-semibold tabular-nums">{money(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-5 flex justify-end">
          <div className="w-[55%] space-y-1.5 text-[11px]">
            <div className="flex justify-between text-[#666]"><span>Subtotal</span><span className="tabular-nums">{money(data.subtotal)}</span></div>
            {data.discountAmount > 0 && <div className="flex justify-between text-[#666]"><span>Discount</span><span className="tabular-nums">−{money(data.discountAmount)}</span></div>}
            {data.vatEnabled && <div className="flex justify-between text-[#666]"><span>{vatLabel(data.vatRate)}</span><span className="tabular-nums">{money(data.vatAmount)}</span></div>}
            <div className="mt-2 flex items-end justify-between border-t-2 pt-2" style={{ borderColor: accent }}>
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]">Total {data.currency}</span>
              <span className="font-display text-[22px] font-extrabold leading-none tabular-nums" style={{ color: accent }}>{money(data.total)}</span>
            </div>
            {data.withholdingEnabled && (
              <>
                <div className="flex justify-between pt-1 text-[#666]"><span>{whtLabel(data.withholdingRate)}</span><span className="tabular-nums">−{money(data.withholdingAmount)}</span></div>
                <div className="flex justify-between border-t pt-2 font-bold"><span>Net payable {data.currency}</span><span className="tabular-nums">{money(data.netPayable)}</span></div>
                <p className="pt-1 text-[8px] italic leading-snug text-[#aaa]">Withholding tax is deducted at source by the client and remitted to their tax authority.</p>
              </>
            )}
            {data.amountPaid > 0 && (
              <div className="flex justify-between pt-1 font-bold"><span>Amount due</span><span className="tabular-nums">{money(data.amountDue)}</span></div>
            )}
          </div>
        </div>

        <div className="mt-auto pt-8">
          {(data.notes || data.terms) && (
            <div className="space-y-1.5 text-[9.5px] text-[#666]">
              {data.notes && <p><span className="font-bold text-[#1e1e2e]">Notes: </span>{data.notes}</p>}
              {data.terms && <p><span className="font-bold text-[#1e1e2e]">Terms: </span>{data.terms}</p>}
            </div>
          )}
          <div className="mt-4 text-[9px] text-[#aaa]">Thank you for your business.</div>
        </div>
      </div>
    </Paper>
  );
}
