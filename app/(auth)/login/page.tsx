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
      <div className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between" style={{ backgroundColor: "#0c0e13" }}>
        <div
          className="absolute -bottom-40 -left-32 size-[36rem] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, oklch(0.48 0.128 262 / 0.4), transparent 70%)" }}
        />
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "56px 56px" }} />

        <div className="relative flex items-center gap-3">
          <LogoMark className="size-11" />
          <div className="leading-none">
            <div className="flex items-baseline gap-2 font-display text-[19px] font-semibold tracking-tight">
              <span lang="ar" dir="rtl" className="text-[21px]">فَلَك</span>
              <span className="uppercase tracking-[0.1em]">Falak</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.2em]">
              <span className="text-indigo-400">×</span>
              <span className="text-white/75">Binary AI</span>
            </div>
          </div>
        </div>

        <div className="relative max-w-md">
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/60">
            <ShieldCheck className="size-3.5" /> The company OS
          </p>
          <p lang="ar" dir="rtl" className="font-serif text-[2.9rem] leading-[1.5] text-white">
            وَكُلٌّ فِي فَلَكٍ يَسْبَحُونَ
          </p>
          <p className="mt-3 text-sm italic text-white/45">
            “…and each, in an orbit, is swimming.” — Yā-Sīn 36:40
          </p>
          <p className="mt-6 text-[15px] leading-relaxed text-white/55">
            Clients, contractors, contracts and every dirham — one orbit.
            Invoicing, CRM, agreements, global workforce and payouts,
            in a single place.
          </p>
        </div>

        <div className="relative flex items-center gap-4 text-[11px] text-white/40">
          <span>Binary AI Labs and Technologies L.L.C-FZ</span>
          <span className="h-0.5 w-0.5 rounded-full bg-current" />
          <span>Meydan Free Zone, Dubai</span>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="animate-enter w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <h2 className="font-display text-2xl font-bold tracking-tight">
            Welcome back
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to your Falak workspace.
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
