"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  Pencil,
  Download,
  Printer,
  MoreHorizontal,
  Trash2,
  FileUp,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import type { EstimateStatus } from "@prisma/client";
import {
  setEstimateStatus,
  deleteEstimate,
  convertToInvoice,
} from "@/lib/actions/estimates";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmButton } from "@/components/app/confirm-button";

export function EstimateActions({
  id,
  status,
  converted,
}: {
  id: string;
  status: EstimateStatus;
  converted: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function changeStatus(next: EstimateStatus) {
    startTransition(async () => {
      await setEstimateStatus(id, next);
      toast.success("Status updated");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {!converted && (
        <Button
          onClick={() => startTransition(() => convertToInvoice(id).then(() => {}))}
          disabled={pending}
          className="gap-2"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
          Convert to invoice
        </Button>
      )}
      <Button variant="outline" render={<Link href={`/estimates/${id}/edit`} />} className="gap-2">
        <Pencil className="size-4" /> Edit
      </Button>
      <Button variant="outline" render={<a href={`/api/pdf/estimate/${id}?download=1`} />} className="gap-2">
        <Download className="size-4" /> PDF
      </Button>
      <Button variant="outline" size="icon" render={<a href={`/print/estimate/${id}`} target="_blank" rel="noreferrer" />} aria-label="Print">
        <Printer className="size-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="More actions" />}>
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Change status</DropdownMenuLabel>
          {status !== "SENT" && (
            <DropdownMenuItem onClick={() => changeStatus("SENT")}>
              <Send className="size-4" /> Mark as sent
            </DropdownMenuItem>
          )}
          {status !== "ACCEPTED" && (
            <DropdownMenuItem onClick={() => changeStatus("ACCEPTED")}>
              <CheckCircle2 className="size-4" /> Mark accepted
            </DropdownMenuItem>
          )}
          {status !== "DECLINED" && (
            <DropdownMenuItem onClick={() => changeStatus("DECLINED")}>
              <XCircle className="size-4" /> Mark declined
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <ConfirmButton
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            }
            title="Delete this estimate?"
            description="This permanently removes the estimate. This cannot be undone."
            action={() => deleteEstimate(id)}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
