"use server";

import { revalidatePath } from "next/cache";
import { differenceInCalendarDays } from "date-fns";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { toNumber } from "@/lib/money";
import { audit } from "@/lib/audit";
import { notifyRoles, notify } from "@/lib/notify";

export type LeaveResult = { error?: string; id?: string };

async function getOrCreateBalance(employeeId: string, leaveTypeId: string, year: number) {
  const type = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
  if (!type) throw new Error("Leave type not found");
  return prisma.leaveBalance.upsert({
    where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
    create: { employeeId, leaveTypeId, year, entitled: type.daysPerYear },
    update: {},
  });
}

const requestSchema = z.object({
  employeeId: z.string().min(1),
  leaveTypeId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().nullish(),
});

export type LeaveRequestInput = z.input<typeof requestSchema>;

/** Used by HR (on behalf) and by the employee portal (own record only). */
export async function requestLeave(input: LeaveRequestInput): Promise<LeaveResult> {
  const user = await requireUser();
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid request" };
  }
  const p = parsed.data;

  // Employees may only request for themselves; staff need hr:write.
  const employee = await prisma.employee.findUnique({ where: { id: p.employeeId } });
  if (!employee) return { error: "Employee not found" };
  const isSelf = employee.userId === user.id;
  if (!isSelf) await requireCapability("hr:write");

  const start = new Date(p.startDate);
  const end = new Date(p.endDate);
  const days = differenceInCalendarDays(end, start) + 1;
  if (days <= 0) return { error: "End date must be after start date" };

  const balance = await getOrCreateBalance(p.employeeId, p.leaveTypeId, start.getFullYear());
  const remaining =
    toNumber(balance.entitled) + toNumber(balance.adjusted) - toNumber(balance.taken);
  if (days > remaining) {
    return { error: `Only ${remaining} day(s) remaining for this leave type` };
  }

  const request = await prisma.leaveRequest.create({
    data: {
      employeeId: p.employeeId,
      leaveTypeId: p.leaveTypeId,
      startDate: start,
      endDate: end,
      days,
      reason: p.reason ?? null,
    },
  });
  await notifyRoles(["ADMIN", "HR"], {
    type: "leave.requested",
    title: `Leave request from ${employee.name}`,
    body: `${days} day(s) · ${p.startDate} → ${p.endDate}`,
    href: `/hr/leave`,
  });

  revalidatePath("/hr/leave");
  revalidatePath("/portal");
  return { id: request.id };
}

export async function decideLeave(
  id: string,
  decision: "APPROVED" | "REJECTED",
): Promise<LeaveResult> {
  const user = await requireCapability("hr:write");
  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: true, leaveType: true },
  });
  if (!request) return { error: "Request not found" };
  if (request.status !== "PENDING") return { error: "Already decided" };

  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id },
      data: { status: decision, approverId: user.id, decidedAt: new Date() },
    });
    if (decision === "APPROVED") {
      await tx.leaveBalance.update({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            year: request.startDate.getFullYear(),
          },
        },
        data: { taken: { increment: toNumber(request.days) } },
      });
    }
  });
  await audit(user, `leave.${decision.toLowerCase()}`, "LeaveRequest", id, {
    employee: request.employee.name,
    days: toNumber(request.days),
    type: request.leaveType.name,
  });
  if (request.employee.userId) {
    await notify(request.employee.userId, {
      type: "leave.decided",
      title: `Leave ${decision.toLowerCase()}`,
      body: `${request.leaveType.name}: ${toNumber(request.days)} day(s)`,
      email: true,
    });
  }

  revalidatePath("/hr/leave");
  revalidatePath(`/hr/employees/${request.employeeId}`);
  revalidatePath("/portal");
  return { id };
}

const compSchema = z.object({
  employeeId: z.string().min(1),
  effectiveDate: z.string().min(1),
  basicSalary: z.number().nonnegative(),
  housingAllowance: z.number().nonnegative().default(0),
  transportAllowance: z.number().nonnegative().default(0),
  otherAllowances: z.number().nonnegative().default(0),
  note: z.string().nullish(),
});

export type CompensationInput = z.input<typeof compSchema>;

/** Salary changes require compensation visibility (ADMIN/FINANCE). */
export async function addCompensation(input: CompensationInput): Promise<LeaveResult> {
  const user = await requireCapability("compensation:read");
  const parsed = compSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid record" };
  }
  const p = parsed.data;
  const created = await prisma.compensationRecord.create({
    data: {
      employeeId: p.employeeId,
      effectiveDate: new Date(p.effectiveDate),
      basicSalary: p.basicSalary,
      housingAllowance: p.housingAllowance,
      transportAllowance: p.transportAllowance,
      otherAllowances: p.otherAllowances,
      note: p.note ?? null,
      createdById: user.id,
    },
  });
  await audit(user, "compensation.add", "Employee", p.employeeId, {
    effectiveDate: p.effectiveDate,
    // amounts deliberately not logged — salary stays out of the audit diff
  });
  revalidatePath(`/hr/employees/${p.employeeId}`);
  return { id: created.id };
}
