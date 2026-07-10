import Link from "next/link";
import { LogOut } from "lucide-react";
import { requirePortalContractor } from "@/lib/session";
import { logout } from "@/lib/actions/auth";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/portal", label: "Overview" },
  { href: "/portal/invoices/new", label: "Submit invoice" },
  { href: "/portal/documents", label: "Documents" },
  { href: "/portal/contracts", label: "Contracts" },
];

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { contractor } = await requirePortalContractor();

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-6">
            <Logo compact />
            <nav className="flex items-center gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">
              {contractor.name}
            </span>
            <form action={logout}>
              <Button variant="ghost" size="icon-sm" type="submit" title="Sign out">
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
