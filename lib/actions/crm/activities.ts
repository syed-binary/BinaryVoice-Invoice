"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";

const activitySchema = z.object({
  entityType: z.enum(["DEAL", "CLIENT", "CONTRACTOR", "CONTRACT"]),
  entityId: z.string().min(1),
  type: z.enum(["NOTE", "CALL", "EMAIL", "MEETING", "TASK"]).default("NOTE"),
  body: z.string().min(1, "Write something first"),
  dueDate: z.string().nullish(),
});

export type ActivityInput = z.input<typeof activitySchema>;
export type ActivityResult = { error?: string };

export async function addActivity(input: ActivityInput): Promise<ActivityResult> {
  const user = await requireCapability("clients:write");
  const parsed = activitySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid activity" };
  }
  const p = parsed.data;
  await prisma.activity.create({
    data: {
      entityType: p.entityType,
      entityId: p.entityId,
      type: p.type,
      body: p.body,
      dueDate: p.type === "TASK" && p.dueDate ? new Date(p.dueDate) : null,
      userId: user.id,
    },
  });
  revalidatePath("/");
  return {};
}

export async function toggleTaskDone(id: string) {
  await requireCapability("clients:write");
  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity || activity.type !== "TASK") return;
  await prisma.activity.update({
    where: { id },
    data: { completedAt: activity.completedAt ? null : new Date() },
  });
  revalidatePath("/");
}

export async function deleteActivity(id: string) {
  const user = await requireCapability("clients:write");
  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity) return;
  // Only the author (or an admin) removes timeline entries.
  if (activity.userId !== user.id && user.role !== "ADMIN") return;
  await prisma.activity.delete({ where: { id } });
  revalidatePath("/");
}
