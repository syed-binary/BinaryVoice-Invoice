"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteEngagement,
  setEngagementStatus,
} from "@/lib/actions/contractors/engagements";
import { toast } from "sonner";

export function EngagementRowActions({
  engagementId,
  contractorId,
  status,
}: {
  engagementId: string;
  contractorId: string;
  status: string;
}) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem
          render={<Link href={`/contractors/${contractorId}/engagements/${engagementId}/edit`} />}
        >
          Edit
        </DropdownMenuItem>
        {status === "ACTIVE" ? (
          <DropdownMenuItem
            onClick={async () => {
              await setEngagementStatus(engagementId, "ENDED");
              router.refresh();
            }}
          >
            End engagement
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={async () => {
              await setEngagementStatus(engagementId, "ACTIVE");
              router.refresh();
            }}
          >
            Reactivate
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={async () => {
            const res = await deleteEngagement(engagementId);
            if (res?.error) toast.error(res.error);
            router.refresh();
          }}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
