"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";

export interface BellNotification {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export function NotificationsBell({
  notifications,
}: {
  notifications: BellNotification[];
}) {
  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="relative" />}
      >
        <Bell className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-sidebar-primary text-[9px] font-semibold text-sidebar-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
          {unread > 0 && (
            <button
              onClick={() => markAllNotificationsRead()}
              className="text-xs font-normal text-muted-foreground hover:text-foreground"
            >
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            Nothing yet
          </div>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              render={n.href ? <Link href={n.href} /> : undefined}
              onClick={() => {
                if (!n.readAt) markNotificationRead(n.id);
              }}
              className={cn(
                "flex flex-col items-start gap-0.5 py-2",
                !n.readAt && "bg-accent/40",
              )}
            >
              <span className="text-sm font-medium">{n.title}</span>
              {n.body && (
                <span className="line-clamp-2 text-xs text-muted-foreground">
                  {n.body}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground/70">
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
