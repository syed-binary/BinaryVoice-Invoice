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
  Copy,
  Trash2,
  CheckCircle2,
  Send,
  Ban,
  Loader2,
} from "lucide-react";
import type { InvoiceStatus } from "@prisma/client";
import {
  setInvoiceStatus,
  duplicateInvoice,
  deleteInvoice,
} from "@/lib/actions/invoices";
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

export function InvoiceActions({
  id,
  status,
}: {
  id: string;
  status: InvoiceStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function changeStatus(next: InvoiceStatus) {
    startTransition(async () => {
      await setInvoiceStatus(id, next);
      toast.success("Status updated");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" render={<Link href={`/invoices/${id}/edit`} />} className="gap-2">
        <Pencil className="size-4" /> Edit
      </Button>
      <Button
        variant="outline"
        render={<a href={`/api/pdf/invoice/${id}?download=1`} />}
        className="gap-2"
      >
        <Download className="size-4" /> PDF
      </Button>
      <Button
        variant="outline"
        size="icon"
        render={<a href={`/print/invoice/${id}`} target="_blank" rel="noreferrer" />}
        aria-label="Print"
      >
        <Printer className="size-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="More actions" />}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>Change status</DropdownMenuLabel>
          {status !== "SENT" && (
            <DropdownMenuItem onClick={() => changeStatus("SENT")}>
              <Send className="size-4" /> Mark as sent
            </DropdownMenuItem>
          )}
          {status !== "PAID" && (
            <DropdownMenuItem onClick={() => changeStatus("PAID")}>
              <CheckCircle2 className="size-4" /> Mark as paid
            </DropdownMenuItem>
          )}
          {status !== "CANCELLED" && (
            <DropdownMenuItem onClick={() => changeStatus("CANCELLED")}>
              <Ban className="size-4" /> Mark as cancelled
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => startTransition(() => duplicateInvoice(id).then(() => {}))}>
            <Copy className="size-4" /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <ConfirmButton
            trigger={
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" /> Delete
              </DropdownMenuItem>
            }
            title="Delete this invoice?"
            description="This permanently removes the invoice and its line items. This cannot be undone."
            action={() => deleteInvoice(id)}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
