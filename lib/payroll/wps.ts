import { round2 } from "../money";

/**
 * WPS SIF (Salary Information File) generation — the CSV a UAE employer
 * uploads to its bank/exchange house. Standard MOHRE layout: one EDR
 * (Employee Detail Record) per employee + one SCR (Salary Control Record).
 * Field order follows the common bank template; VALIDATE the exact variant
 * with the receiving bank's test upload before first live use.
 */

export interface SifEmployee {
  molEmployeeId: string; // 14-digit MOHRE person code
  agentId: string; // routing code of the employee's bank
  iban: string;
  daysInPeriod: number;
  fixedPay: number; // basic + fixed allowances
  variablePay: number; // bonuses / adjustments
  leaveDays?: number;
}

export interface SifInput {
  employerMolId: string; // 13-digit MOHRE establishment ID
  employerBankCode: string;
  fileCreationDate: Date;
  periodYear: number;
  periodMonth: number;
  employees: SifEmployee[];
}

const d8 = (d: Date) => d.toISOString().slice(0, 10).replaceAll("-", "");
const t4 = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;

export function generateSif(input: SifInput): string {
  const rows: string[] = [];
  let total = 0;
  for (const e of input.employees) {
    const pay = round2(e.fixedPay + e.variablePay);
    total = round2(total + pay);
    rows.push(
      [
        "EDR",
        e.molEmployeeId,
        e.agentId,
        e.iban,
        d8(input.fileCreationDate),
        String(e.daysInPeriod),
        e.fixedPay.toFixed(2),
        e.variablePay.toFixed(2),
        String(e.leaveDays ?? 0),
      ].join(","),
    );
  }
  const month = `${input.periodYear}${String(input.periodMonth).padStart(2, "0")}`;
  rows.push(
    [
      "SCR",
      input.employerMolId,
      input.employerBankCode,
      d8(input.fileCreationDate),
      t4(input.fileCreationDate),
      month,
      String(input.employees.length),
      total.toFixed(2),
      "AED",
    ].join(","),
  );
  return rows.join("\n") + "\n";
}
