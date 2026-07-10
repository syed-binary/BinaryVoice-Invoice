import { prisma } from "@/lib/prisma";
import type { TimelineActivity } from "@/components/crm/activity-timeline";

export const DEAL_STAGES = [
  "LEAD",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
] as const;

export const STAGE_LABEL: Record<string, string> = {
  LEAD: "Lead",
  QUALIFIED: "Qualified",
  PROPOSAL: "Proposal",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
};

/** Fetch an entity's timeline with author names resolved, newest first. */
export async function getTimeline(
  entityType: string,
  entityId: string,
  viewer: { id?: string; role?: string | null },
): Promise<TimelineActivity[]> {
  const activities = await prisma.activity.findMany({
    where: { entityType, entityId },
    orderBy: { occurredAt: "desc" },
    take: 50,
  });
  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(activities.map((a) => a.userId))] } },
    select: { id: true, name: true },
  });
  const names = new Map(users.map((u) => [u.id, u.name]));
  return activities.map((a) => ({
    id: a.id,
    type: a.type,
    body: a.body,
    dueDate: a.dueDate,
    completedAt: a.completedAt,
    userName: names.get(a.userId) ?? "Unknown",
    occurredAt: a.occurredAt,
    canDelete: a.userId === viewer.id || viewer.role === "ADMIN",
  }));
}
