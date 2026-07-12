import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { decryptField, isEncrypted } from "@/lib/crypto";
import { generateSif } from "@/lib/payroll/wps";
import { toNumber } from "@/lib/money";

export const runtime = "nodejs";

/** Download the WPS SIF bank file for an approved payroll run. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || !can(session.user.role ?? "MEMBER", "payroll:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const run = await prisma.payrollRun.findUnique({
    where: { id },
    include: { payslips: { include: { employee: true } } },
  });
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (run.status === "DRAFT") {
    return NextResponse.json({ error: "Approve the run before generating the SIF" }, { status: 400 });
  }

  const missing = run.payslips.filter(
    (p) => !p.employee.molEmployeeId || !p.employee.wpsAgentId || !p.employee.iban,
  );
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing WPS details (MOL ID / agent / IBAN) for: ${missing.map((p) => p.employee.name).join(", ")}` },
      { status: 400 },
    );
  }

  const daysInPeriod = new Date(run.periodYear, run.periodMonth, 0).getDate();
  const sif = generateSif({
    employerMolId: process.env.WPS_EMPLOYER_MOL_ID ?? "0000000000000",
    employerBankCode: process.env.WPS_BANK_CODE ?? "BANKAEXX",
    fileCreationDate: new Date(),
    periodYear: run.periodYear,
    periodMonth: run.periodMonth,
    employees: run.payslips.map((p) => {
      const iban = p.employee.iban!;
      return {
        molEmployeeId: p.employee.molEmployeeId!,
        agentId: p.employee.wpsAgentId!,
        iban: isEncrypted(iban) ? decryptField(iban) : iban,
        daysInPeriod,
        fixedPay: toNumber(p.basicSalary) + toNumber(p.housingAllowance) +
          toNumber(p.transportAllowance) + toNumber(p.otherAllowances),
        variablePay: toNumber(p.net) - (
          toNumber(p.basicSalary) + toNumber(p.housingAllowance) +
          toNumber(p.transportAllowance) + toNumber(p.otherAllowances)
        ),
      };
    }),
  });

  await prisma.payrollRun.update({ where: { id }, data: { wpsSifGeneratedAt: new Date() } });

  return new NextResponse(sif, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${run.number}-WPS.sif"`,
    },
  });
}
