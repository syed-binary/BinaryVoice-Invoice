"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FileText,
  ScrollText,
  Users,
  Package,
  Settings,
  Menu,
  LogOut,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/lib/actions/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/estimates", label: "Estimates", icon: ScrollText },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/items", label: "Items", icon: Package },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3">
      {NAV.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group relative flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            {active && (
              <span className="absolute inset-y-[5px] left-0 w-[3px] rounded-full bg-sidebar-primary" />
            )}
            <Icon
              className={cn(
                "size-[17px] shrink-0 transition-transform duration-200 group-hover:scale-110",
                active ? "text-sidebar-primary" : "text-muted-foreground/80",
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserMenu({
  user,
  variant = "sidebar",
}: {
  user: { name?: string | null; email?: string | null };
  variant?: "sidebar" | "bar";
}) {
  const initials = (user.name ?? user.email ?? "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors",
              variant === "sidebar"
                ? "text-sidebar-foreground hover:bg-sidebar-accent"
                : "hover:bg-accent",
            )}
          />
        }
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{user.name}</span>
          <span
            className={cn(
              "block truncate text-xs",
              variant === "sidebar"
                ? "text-sidebar-foreground/60"
                : "text-muted-foreground",
            )}
          >
            {user.email}
          </span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/settings" />}>
          <Settings className="size-4" /> Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => logout()}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: { name?: string | null; email?: string | null };
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-1">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar py-5 lg:flex">
        <div className="px-5 pb-5">
          <Link
            href="/dashboard"
            className="group flex items-center gap-2.5 text-sidebar-foreground"
          >
            <LogoMark className="size-[30px] transition-transform duration-300 group-hover:scale-105" />
            <div className="leading-none">
              <div className="font-display text-[15px] font-semibold tracking-tight">
                Binary Labs
              </div>
              <div className="mt-1 text-[9.5px] uppercase tracking-[0.2em] text-muted-foreground">
                Invoicing
              </div>
            </div>
          </Link>
        </div>
        <div className="px-3 pb-4">
          <Button
            render={<Link href="/invoices/new" />}
            className="h-9 w-full gap-2 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
          >
            <Plus className="size-4" /> New invoice
          </Button>
        </div>
        <div className="px-4 pb-2">
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
            Menu
          </span>
        </div>
        <NavLinks />
        <div className="mt-auto border-t border-sidebar-border px-3 pt-3">
          <UserMenu user={user} />
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" />}>
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground"
            >
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-full flex-col py-5">
                <div className="px-5 pb-5">
                  <Logo />
                </div>
                <div className="px-3 pb-3">
                  <Button
                    render={<Link href="/invoices/new" />}
                    onClick={() => setMobileOpen(false)}
                    className="h-10 w-full gap-2 bg-sidebar-primary text-sidebar-primary-foreground"
                  >
                    <Plus className="size-4" /> New invoice
                  </Button>
                </div>
                <NavLinks onNavigate={() => setMobileOpen(false)} />
                <div className="mt-auto border-t border-sidebar-border px-3 pt-3">
                  <UserMenu user={user} />
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <Logo compact />
          <div className="w-9" />
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
