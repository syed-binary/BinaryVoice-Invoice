"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { endOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { nextNumber } from "@/lib/numbering";
import { toNumber, round2 } from "@/lib/money";
import { audit } from "@/lib/audit";

export type PayrollResult = { error?: string; id?: string };

async function recomputeTotals(payslipId: string) {
  const slip = await prisma.payslip.findUnique({
    where: { id: payslipId },
    include: { lines: true },
  });
  if (!slip) return;
  const base =
    toNumber(slip.basicSalary) + toNumber(slip.housingAllowance) +
    toNumber(slip.transportAllowance) + toNumber(slip.otherAllowances);
  const earnings = slip.lines
    .filter((l) => l.type === "EARNING")
    .reduce((s, l) => s + toNumber(l.amount), 0);
  const deductions = slip.lines
    .filter((l) => l.type === "DEDUCTION")
    .reduce((s, l) => s + toNumber(l.amount), 0);
  const gross = round2(base + earnings);
  await prisma.payslip.update({
    where: { id: payslipId },
    data: { gross, totalDeductions: round2(deductions), net: round2(gross - deductions) },
  });

  const slips = await prisma.payslip.findMany({ where: { payrollRunId: slip.payrollRunId } });
  await prisma.payrollRun.update({
    where: { id: slip.payrollRunId },
    data: {
      totalGross: round2(slips.reduce((s, x) => s + toNumber(x.gross), 0)),
      totalDeductions: round2(slips.reduce((s, x) => s + toNumber(x.totalDeductions), 0)),
      totalNet: round2(slips.reduce((s, x) => s + toNumber(x.net), 0)),
    },
  });
}

const createSchema = z.object({
  periodYear: z.number().int().min(2020).max(2100),
  periodMonth: z.number().int().min(1).max(12),
});

export type CreateRunInput = z.input<typeof createSchema>;

/** Snapshot every active employee's latest compensation into a draft run. */
export async function createPayrollRun(input: CreateRunInput): Promise<PayrollResult> {
  const user = await requireCapability("payroll:write");
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid period" };
  const { periodYear, periodMonth } = parsed.data;

  const periodEnd = endOfMonth(new Date(periodYear, periodMonth - 1, 1));
  const employees = await prisma.employee.findMany({
    where: { archived: false, terminationDate: null },
    include: {
      compensation: {
        where: { effectiveDate: { lte: periodEnd } },
        orderBy: { effectiveDate: "desc" },
        take: 1,
      },
    },
  });
  const payable = employees.filter((e) => e.compensation.length > 0);
  if (payable.length === 0) {
    return { error: "No active employees with compensation records for this period" };
  }

  try {
    const run = await prisma.$transaction(async (tx) => {
      const number = await nextNumber(tx, "payroll-run", "PRL");
      const created = await tx.payrollRun.create({
        data: { number, periodYear, periodMonth },
      });
      for (const e of payable) {
        const c = e.compensation[0];
        const gross = round2(
          toNumber(c.basicSalary) + toNumber(c.housingAllowance) +
          toNumber(c.transportAllowance) + toNumber(c.otherAllowances),
        );
        await tx.payslip.create({
          data: {
            payrollRunId: created.id,
            employeeId: e.id,
            basicSalary: c.basicSalary,
            housingAllowance: c.housingAllowance,
            transportAllowance: c.transportAllowance,
            otherAllowances: c.otherAllowances,
            gross,
            net: gross,
          },
        });
      }
      const total = round2(
        payable.reduce(
          (s, e) =>
            s + toNumber(e.compensation[0].basicSalary) + toNumber(e.compensation[0].housingAllowance) +
            toNumber(e.compensation[0].transportAllowance) + toNumber(e.compensation[0].otherAllowances),
          0,
        ),
      );
      return tx.payrollRun.update({
        where: { id: created.id },
        data: { totalGross: total, totalNet: total },
      });
    });
    await audit(user, "payroll.create", "PayrollRun", run.id, {
      period: `${periodYear}-${periodMonth}`,
      employees: payable.length,
    });
    revalidatePath("/payroll");
    return { id: run.id };
  } catch (err) {
    if (String(err).includes("Unique constraint")) {
      return { error: "A run for this period already exists" };
    }
    throw err;
  }
}

const adjSchema = z.object({
  payslipId: z.string().min(1),
  type: z.enum(["EARNING", "DEDUCTION"]),
  label: z.string().min(1, "Label required"),
  amount: z.number().positive("Amount must be positive"),
});

export type AdjustmentInput = z.input<typeof adjSchema>;

export async function addAdjustment(input: AdjustmentInput): Promise<PayrollResult> {
  await requireCapability("payroll:write");
  const parsed = adjSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid" };
  const p = parsed.data;
  const slip = await prisma.payslip.findUnique({
    where: { id: p.payslipId },
    include: { payrollRun: { select: { id: true, status: true } } },
  });
  if (!slip) return { error: "Payslip not found" };
  if (slip.payrollRun.status !== "DRAFT") return { error: "Run is no longer editable" };
  await prisma.payslipLine.create({
    data: { payslipId: p.payslipId, type: p.type, label: p.label, amount: p.amount },
  });
  await recomputeTotals(p.payslipId);
  revalidatePath(`/payroll/${slip.payrollRun.id}`);
  return {};
}

export async function removeAdjustment(lineId: string) {
  await requireCapability("payroll:write");
  const line = await prisma.payslipLine.findUnique({
    where: { id: lineId },
    include: { payslip: { include: { payrollRun: { select: { id: true, status: true } } } } },
  });
  if (!line || line.payslip.payrollRun.status !== "DRAFT") return;
  await prisma.payslipLine.delete({ where: { id: lineId } });
  await recomputeTotals(line.payslipId);
  revalidatePath(`/payroll/${line.payslip.payrollRun.id}`);
}

export async function approvePayrollRun(id: string): Promise<PayrollResult> {
  const user = await requireCapability("payroll:write");
  const run = await prisma.payrollRun.findUnique({ where: { id } });
  if (!run) return { error: "Run not found" };
  if (run.status !== "DRAFT") return { error: "Only drafts can be approved" };
  await prisma.payrollRun.update({
    where: { id },
    data: { status: "APPROVED", approvedById: user.id },
  });
  await audit(user, "payroll.approve", "PayrollRun", id, { number: run.number });
  revalidatePath(`/payroll/${id}`);
  revalidatePath("/payroll");
  return {};
}

export async function markPayrollRunPaid(id: string, paidDate: string): Promise<PayrollResult> {
  const user = await requireCapability("payroll:write");
  const run = await prisma.payrollRun.findUnique({ where: { id } });
  if (!run) return { error: "Run not found" };
  if (run.status !== "APPROVED") return { error: "Approve the run before marking it paid" };
  await prisma.payrollRun.update({
    where: { id },
    data: { status: "PAID", paidDate: new Date(paidDate) },
  });
  await audit(user, "payroll.paid", "PayrollRun", id, { number: run.number, paidDate });
  revalidatePath(`/payroll/${id}`);
  revalidatePath("/payroll");
  return {};
}

export async function deletePayrollRun(id: string) {
  const user = await requireCapability("payroll:write");
  const run = await prisma.payrollRun.findUnique({ where: { id } });
  if (!run || run.status !== "DRAFT") return;
  await prisma.payrollRun.delete({ where: { id } });
  await audit(user, "payroll.delete", "PayrollRun", id, { number: run.number });
  revalidatePath("/payroll");
  redirect("/payroll");
}
