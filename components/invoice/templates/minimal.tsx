import type { ReactNode } from "react";
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

export function MinimalTemplate({ data }: { data: DocData }) {
  const accent = data.accentColor;
  const c = data.company;
  const money = (n: number) => <Amount value={n} currency={data.currency} />;

  return (
    <Paper className="font-sans text-[11px] text-[#222]">
      <div className="h-[3mm]" style={{ backgroundColor: accent }} />
      <div className="flex-1 px-[16mm] py-[14mm]">
        {/* Head */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {c.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.logoUrl} alt="" className="h-11 w-11 object-contain" />
            ) : null}
            <div>
              <div className="font-display text-[17px] font-bold tracking-tight">
                {c.tradeName || c.legalName}
              </div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-[#999]">
                {c.emirate ? `${c.emirate}, ` : ""}
                {c.country}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] uppercase tracking-[0.24em] text-[#999]">{data.docLabel}</div>
            <div className="mt-1 font-display text-[20px] font-bold tabular-nums" style={{ color: accent }}>
              {data.number}
            </div>
          </div>
        </div>

        <div className="my-8 h-px bg-[#e6e6e6]" />

        {/* Meta grid */}
        <div className="grid grid-cols-4 gap-6 text-[10px]">
          <div className="col-span-2">
            <Label>Billed to</Label>
            <div className="text-[12px] font-semibold">{data.client.displayName}</div>
            <div className="mt-1 space-y-0.5 text-[#666]">
              {clientLines(data.client).map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          </div>
          <div>
            <Label>{data.dateLabel}</Label>
            <div className="font-medium">{data.dateValue}</div>
            <div className="mt-3">
              <Label>{data.dueLabel}</Label>
              <div className="font-medium">{data.dueValue}</div>
            </div>
          </div>
          <div>
            <Label>From</Label>
            <div className="space-y-0.5 text-[#666]">
              {companyAddressLines(c).map((l, i) => (
                <div key={i}>{l}</div>
              ))}
              {data.vatEnabled && c.vatTrn && <div>VAT TRN: {c.vatTrn}</div>}
              {!data.vatEnabled && c.corporateTaxTrn && <div>Corporate Tax TRN: {c.corporateTaxTrn}</div>}
            </div>
          </div>
        </div>

        {/* Lines */}
        <table className="mt-10 w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-[#222]">
              <th className="pb-2 text-left text-[9px] font-semibold uppercase tracking-[0.14em] text-[#999]">Resource / Description</th>
              <th className="pb-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-[#999]">No.</th>
              <th className="pb-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-[#999]">Rate</th>
              <th className="pb-2 text-right text-[9px] font-semibold uppercase tracking-[0.14em] text-[#999]">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.map((l, i) => (
              <tr key={i} className="border-b border-[#eee]">
                <td className="py-3 pr-4 align-top font-medium">{l.description}</td>
                <td className="py-3 text-right align-top tabular-nums">{l.quantity}</td>
                <td className="py-3 text-right align-top tabular-nums">
                  {money(l.unitPrice)}
                  {l.unit && <span className="text-[#999]"> / {l.unit}</span>}
                </td>
                <td className="py-3 text-right align-top tabular-nums">{money(l.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-[42%] space-y-2 text-[11px]">
            <Line label="Subtotal" value={money(data.subtotal)} />
            {data.discountAmount > 0 && <Line label="Discount" value={<>−{money(data.discountAmount)}</>} />}
            {data.vatEnabled && <Line label={vatLabel(data.vatRate)} value={money(data.vatAmount)} />}
            <div className="flex items-center justify-between border-t-2 border-[#222] pt-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Total {data.currency}</span>
              <span className="font-display text-[18px] font-bold tabular-nums" style={{ color: accent }}>
                {money(data.total)}
              </span>
            </div>
            {data.withholdingEnabled && (
              <>
                <Line label={whtLabel(data.withholdingRate)} value={<>−{money(data.withholdingAmount)}</>} />
                <div className="flex items-center justify-between border-t pt-2 font-semibold text-[#222]">
                  <span className="text-[10px] uppercase tracking-[0.14em]">Net payable {data.currency}</span>
                  <span className="tabular-nums">{money(data.netPayable)}</span>
                </div>
                <p className="pt-1 text-[8px] italic leading-snug text-[#aaa]">
                  Withholding tax is deducted at source by the client and remitted to their tax authority.
                </p>
              </>
            )}
            {data.amountPaid > 0 && <Line label="Amount due" value={money(data.amountDue)} />}
          </div>
        </div>

        {(c.iban || data.notes || data.terms) && (
          <div className="mt-12 grid grid-cols-2 gap-8 border-t border-[#e6e6e6] pt-6 text-[9.5px] text-[#666]">
            {(c.iban || c.bankName) && (
              <div>
                <Label>Payment</Label>
                {c.bankName && <div>{c.bankName}</div>}
                {c.iban && <div className="font-mono">IBAN {c.iban}</div>}
                {c.swift && <div className="font-mono">SWIFT {c.swift}</div>}
              </div>
            )}
            {(data.notes || data.terms) && (
              <div>
                {data.notes && <><Label>Notes</Label><p className="mb-2 whitespace-pre-line">{data.notes}</p></>}
                {data.terms && <><Label>Terms</Label><p className="whitespace-pre-line">{data.terms}</p></>}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto px-[16mm] pb-[10mm] text-[9px] text-[#aaa]">
        {c.legalName} · {companyContactLines(c).join("  ·  ")}
      </div>
    </Paper>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#999]">
      {children}
    </div>
  );
}

function Line({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between text-[#555]">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
