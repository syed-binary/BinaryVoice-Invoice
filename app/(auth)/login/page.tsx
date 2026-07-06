"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { authenticate } from "@/lib/actions/auth";
import { Logo, LogoMark } from "@/components/brand/logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full gap-2" disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <>
          Sign in <ArrowRight className="size-4" />
        </>
      )}
    </Button>
  );
}

export default function LoginPage() {
  const [errorMessage, formAction] = useActionState(authenticate, undefined);

  return (
    <div className="grid min-h-dvh flex-1 lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-sidebar text-sidebar-foreground lg:flex lg:flex-col lg:justify-between p-12">
        <div className="bg-grid absolute inset-0 opacity-60" />
        <div
          className="absolute -right-40 -top-40 size-[32rem] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.55 0.2 274 / 0.55), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-52 -left-24 size-[34rem] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, oklch(0.6 0.16 200 / 0.35), transparent 70%)" }}
        />

        <div className="relative flex items-center gap-2.5">
          <LogoMark className="size-9 text-sidebar-primary" />
          <span className="font-display text-lg font-bold tracking-tight">
            Binary Labs
          </span>
        </div>

        <div className="relative max-w-md">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.16em] text-sidebar-foreground/70">
            <ShieldCheck className="size-3.5" /> FTA-ready invoicing
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-white xl:text-5xl">
            Beautiful invoices, built for the UAE.
          </h1>
          <p className="mt-5 text-base leading-relaxed text-sidebar-foreground/70">
            Create, send and track VAT-ready invoices and estimates — clients,
            custom fields and stunning templates, all in one place.
          </p>
        </div>

        <div className="relative flex items-center gap-6 text-xs text-sidebar-foreground/60">
          <span>Binary AI Labs and Technologies L.L.C-FZ</span>
          <span className="h-1 w-1 rounded-full bg-current" />
          <span>Meydan Free Zone, Dubai</span>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <h2 className="font-display text-2xl font-bold tracking-tight">
            Welcome back
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to your Binary Labs workspace.
          </p>

          <form action={formAction} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@binarylabz.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
            </div>

            {errorMessage && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </p>
            )}

            <SubmitButton />
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Protected workspace · Contact your administrator for access.
          </p>
        </div>
      </div>
    </div>
  );
}
