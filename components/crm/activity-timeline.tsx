"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import {
  StickyNote,
  Phone,
  Mail,
  Users,
  CheckSquare,
  Loader2,
  Trash2,
  Plus,
} from "lucide-react";
import {
  addActivity,
  toggleTaskDone,
  deleteActivity,
} from "@/lib/actions/crm/activities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SimpleSelect } from "@/components/ui/simple-select";
import { cn } from "@/lib/utils";

export interface TimelineActivity {
  id: string;
  type: string;
  body: string;
  dueDate: Date | null;
  completedAt: Date | null;
  userName: string;
  occurredAt: Date;
  canDelete: boolean;
}

const TYPE_META: Record<string, { icon: typeof StickyNote; label: string }> = {
  NOTE: { icon: StickyNote, label: "Note" },
  CALL: { icon: Phone, label: "Call" },
  EMAIL: { icon: Mail, label: "Email" },
  MEETING: { icon: Users, label: "Meeting" },
  TASK: { icon: CheckSquare, label: "Task" },
};

const TYPE_OPTIONS = Object.entries(TYPE_META).map(([value, m]) => ({
  value,
  label: m.label,
}));

export function ActivityTimeline({
  entityType,
  entityId,
  activities,
}: {
  entityType: "DEAL" | "CLIENT" | "CONTRACTOR" | "CONTRACT";
  entityId: string;
  activities: TimelineActivity[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState("NOTE");
  const [body, setBody] = useState("");
  const [dueDate, setDueDate] = useState("");

  function submit() {
    startTransition(async () => {
      const res = await addActivity({
        entityType,
        entityId,
        type: type as "NOTE",
        body,
        dueDate: dueDate || null,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setBody("");
      setDueDate("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
        <div className="flex gap-2">
          <SimpleSelect value={type} onValueChange={setType} options={TYPE_OPTIONS} className="w-32" />
          {type === "TASK" && (
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-40"
            />
          )}
        </div>
        <Textarea
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={type === "TASK" ? "What needs doing?" : "Log a note, call or meeting…"}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={submit} disabled={pending || !body.trim()} className="gap-1.5">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add
          </Button>
        </div>
      </div>

      {activities.length === 0 ? (
        <p className="py-2 text-center text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <ul className="space-y-3">
          {activities.map((a) => {
            const meta = TYPE_META[a.type] ?? TYPE_META.NOTE;
            const Icon = meta.icon;
            const overdue =
              a.type === "TASK" && !a.completedAt && a.dueDate && new Date(a.dueDate) < new Date();
            return (
              <li key={a.id} className="flex gap-3">
                <span
                  className={cn(
                    "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
                    overdue ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "whitespace-pre-line text-sm",
                        a.completedAt && "text-muted-foreground line-through",
                      )}
                    >
                      {a.body}
                    </p>
                    <div className="flex shrink-0 items-center gap-1">
                      {a.type === "TASK" && (
                        <Checkbox
                          checked={!!a.completedAt}
                          onCheckedChange={() =>
                            startTransition(async () => {
                              await toggleTaskDone(a.id);
                              router.refresh();
                            })
                          }
                        />
                      )}
                      {a.canDelete && (
                        <button
                          className="text-muted-foreground/50 hover:text-destructive"
                          onClick={() =>
                            startTransition(async () => {
                              await deleteActivity(a.id);
                              router.refresh();
                            })
                          }
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {a.userName} · {formatDistanceToNow(new Date(a.occurredAt), { addSuffix: true })}
                    {a.dueDate && (
                      <span className={cn(overdue && "font-medium text-destructive")}>
                        {" "}
                        · due {format(new Date(a.dueDate), "dd MMM")}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
