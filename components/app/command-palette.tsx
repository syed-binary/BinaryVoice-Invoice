"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { globalSearch, type SearchHit } from "@/lib/actions/search";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/** ⌘K / Ctrl+K global search across Falak. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onChange(value: string) {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(async () => {
        setHits(await globalSearch(value));
      });
    }, 250);
  }

  function go(href: string) {
    setOpen(false);
    setQ("");
    setHits([]);
    router.push(href);
  }

  const groups = [...new Set(hits.map((h) => h.group))];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[20%] max-w-lg translate-y-0 p-0">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <div className="flex items-center gap-2 border-b px-4">
          {pending ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <Search className="size-4 text-muted-foreground" />
          )}
          <Input
            autoFocus
            value={q}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search clients, invoices, contractors, contracts…"
            className="h-12 border-0 shadow-none focus-visible:ring-0"
          />
          <kbd className="rounded border px-1.5 text-[10px] text-muted-foreground">esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {hits.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {q.length < 2 ? "Type to search across everything in orbit." : pending ? "Searching…" : "No matches."}
            </p>
          ) : (
            groups.map((g) => (
              <div key={g}>
                <div className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {g}
                </div>
                {hits
                  .filter((h) => h.group === g)
                  .map((h) => (
                    <button
                      key={h.href}
                      onClick={() => go(h.href)}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                    >
                      <span className="font-medium">{h.label}</span>
                      <span className="truncate pl-3 text-xs text-muted-foreground">{h.sub}</span>
                    </button>
                  ))}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
