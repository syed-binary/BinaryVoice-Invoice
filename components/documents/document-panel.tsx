"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { differenceInCalendarDays, format } from "date-fns";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleSelect } from "@/components/ui/simple-select";
import { deleteDocument } from "@/lib/actions/documents";
import { ConfirmButton } from "@/components/app/confirm-button";

export interface PanelDocument {
  id: string;
  kind: string;
  fileName: string;
  sizeBytes: number;
  expiryDate: Date | null;
  createdAt: Date;
}

const KIND_OPTIONS = [
  { value: "GENERIC", label: "General" },
  { value: "CONTRACT_PDF", label: "Signed contract" },
  { value: "PASSPORT", label: "Passport" },
  { value: "KYC_ID", label: "ID (KYC)" },
  { value: "KYC_ADDRESS", label: "Proof of address" },
  { value: "W8BEN", label: "W-8BEN" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "OTHER", label: "Other" },
];

function expiryBadge(expiryDate: Date | null) {
  if (!expiryDate) return null;
  const days = differenceInCalendarDays(new Date(expiryDate), new Date());
  const label =
    days < 0 ? "Expired" : days <= 30 ? `Expires in ${days}d` : format(new Date(expiryDate), "dd MMM yyyy");
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-medium",
        days < 0
          ? "bg-destructive/10 text-destructive"
          : days <= 30
            ? "bg-amber-500/15 text-amber-600"
            : "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

export function DocumentPanel({
  entityType,
  entityId,
  documents,
  kinds = KIND_OPTIONS,
}: {
  entityType: string;
  entityId: string;
  documents: PanelDocument[];
  kinds?: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [kind, setKind] = useState(kinds[0]?.value ?? "GENERIC");
  const [expiryDate, setExpiryDate] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a file first");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("entityType", entityType);
      form.set("entityId", entityId);
      form.set("kind", kind);
      if (expiryDate) form.set("expiryDate", expiryDate);
      const res = await fetch("/api/files", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Upload failed");
        return;
      }
      toast.success(`Uploaded ${data.fileName}`);
      if (fileRef.current) fileRef.current.value = "";
      setExpiryDate("");
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_150px_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label>File</Label>
          <Input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx" />
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <SimpleSelect value={kind} onValueChange={setKind} options={kinds} />
        </div>
        <div className="space-y-1.5">
          <Label>Expiry (optional)</Label>
          <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
        </div>
        <Button type="button" onClick={upload} disabled={uploading} className="gap-1.5">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Upload
        </Button>
      </div>

      {documents.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">No documents yet.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 px-3 py-2.5">
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <a
                  href={`/api/files/${doc.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sm font-medium hover:underline"
                >
                  {doc.fileName}
                </a>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{KIND_OPTIONS.find((k) => k.value === doc.kind)?.label ?? doc.kind}</span>
                  <span>·</span>
                  <span>{(doc.sizeBytes / 1024).toFixed(0)} KB</span>
                </div>
              </div>
              {expiryBadge(doc.expiryDate)}
              <ConfirmButton
                trigger={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                }
                title="Delete document?"
                description={`"${doc.fileName}" will be permanently removed.`}
                action={() => deleteDocument(doc.id)}
                onDone={() => router.refresh()}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
