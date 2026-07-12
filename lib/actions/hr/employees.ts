"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";
import { nextNumber } from "@/lib/numbering";
import { encryptField } from "@/lib/crypto";
import { audit } from "@/lib/audit";

const dateStr = z.string().nullish();

const employeeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().nullish(),
  dateOfBirth: dateStr,
  nationality: z.string().nullish(),
  jobTitle: z.string().min(1, "Job title is required"),
  department: z.string().nullish(),
  managerId: z.string().nullish(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME"]).default("FULL_TIME"),
  joinDate: z.string().min(1),
  probationEndDate: dateStr,
  terminationDate: dateStr,
  // identity numbers arrive plaintext from the form; empty = keep current
  passportNumber: z.string().nullish(),
  passportExpiry: dateStr,
  visaNumber: z.string().nullish(),
  visaExpiry: dateStr,
  emiratesIdNumber: z.string().nullish(),
  emiratesIdExpiry: dateStr,
  labourCardNumber: z.string().nullish(),
  labourCardExpiry: dateStr,
  bankName: z.string().nullish(),
  iban: z.string().nullish(),
  wpsAgentId: z.string().nullish(),
  molEmployeeId: z.string().nullish(),
  notes: z.string().nullish(),
});

export type EmployeeInput = z.input<typeof employeeSchema>;
export type EmployeeResult = { error?: string; id?: string };

const d = (v: string | null | undefined) => (v ? new Date(v) : null);
const enc = (v: string | null | undefined) => (v ? encryptField(v) : undefined);

export async function saveEmployee(input: EmployeeInput): Promise<EmployeeResult> {
  const user = await requireCapability("hr:write");
  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid employee" };
  }
  const p = parsed.data;

  const data = {
    name: p.name,
    email: p.email,
    phone: p.phone ?? null,
    dateOfBirth: d(p.dateOfBirth),
    nationality: p.nationality ?? null,
    jobTitle: p.jobTitle,
    department: p.department ?? null,
    managerId: p.managerId || null,
    employmentType: p.employmentType,
    joinDate: new Date(p.joinDate),
    probationEndDate: d(p.probationEndDate),
    terminationDate: d(p.terminationDate),
    // encrypted at rest; blank keeps the stored value on update
    ...(enc(p.passportNumber) ? { passportNumber: enc(p.passportNumber) } : {}),
    ...(enc(p.visaNumber) ? { visaNumber: enc(p.visaNumber) } : {}),
    ...(enc(p.emiratesIdNumber) ? { emiratesIdNumber: enc(p.emiratesIdNumber) } : {}),
    ...(enc(p.labourCardNumber) ? { labourCardNumber: enc(p.labourCardNumber) } : {}),
    ...(enc(p.iban) ? { iban: enc(p.iban) } : {}),
    passportExpiry: d(p.passportExpiry),
    visaExpiry: d(p.visaExpiry),
    emiratesIdExpiry: d(p.emiratesIdExpiry),
    labourCardExpiry: d(p.labourCardExpiry),
    bankName: p.bankName ?? null,
    wpsAgentId: p.wpsAgentId ?? null,
    molEmployeeId: p.molEmployeeId ?? null,
    notes: p.notes ?? null,
  };

  let id: string;
  if (p.id) {
    await prisma.employee.update({ where: { id: p.id }, data });
    id = p.id;
  } else {
    const created = await prisma.$transaction(async (tx) => {
      const employeeNo = await nextNumber(tx, "employee", "EMP");
      return tx.employee.create({ data: { ...data, employeeNo } });
    });
    id = created.id;
    await audit(user, "employee.create", "Employee", id, { name: p.name });
  }

  revalidatePath("/hr/employees");
  revalidatePath(`/hr/employees/${id}`);
  return { id };
}

export async function archiveEmployee(id: string) {
  const user = await requireCapability("hr:write");
  await prisma.employee.update({ where: { id }, data: { archived: true } });
  await audit(user, "employee.archive", "Employee", id);
  revalidatePath("/hr/employees");
  redirect("/hr/employees");
}

/** Create (or reset) the employee's portal login — role EMPLOYEE. */
export async function grantEmployeePortalAccess(
  employeeId: string,
  password: string,
): Promise<EmployeeResult> {
  const admin = await requireCapability("hr:write");
  if (password.length < 8) return { error: "Password must be at least 8 characters" };
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return { error: "Employee not found" };

  const passwordHash = await bcrypt.hash(password, 10);
  if (employee.userId) {
    await prisma.user.update({ where: { id: employee.userId }, data: { passwordHash } });
  } else {
    const existing = await prisma.user.findUnique({ where: { email: employee.email } });
    if (existing) return { error: "A user with this email already exists" };
    const user = await prisma.user.create({
      data: { email: employee.email, name: employee.name, passwordHash, role: "EMPLOYEE" },
    });
    await prisma.employee.update({ where: { id: employeeId }, data: { userId: user.id } });
  }
  await audit(admin, "employee.portal-access", "Employee", employeeId, {
    email: employee.email,
  });
  revalidatePath(`/hr/employees/${employeeId}`);
  return { id: employeeId };
}
