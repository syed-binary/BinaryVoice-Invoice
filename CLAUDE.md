@AGENTS.md

# Binary Labs Invoicing — working notes

In-house invoicing app (single company, multi-user). Next.js 16 App Router + TypeScript, Prisma + PostgreSQL, Auth.js v5, Tailwind v4, shadcn/ui, Playwright for PDF.

## Gotchas that bite

- **shadcn here is Base UI, not Radix.** Components compose with the `render` prop, NOT `asChild`:
  - `<Button render={<Link href="/x" />}>Label</Button>`
  - `<DropdownMenuTrigger render={<Button variant="outline" />}>…</DropdownMenuTrigger>`
  - `<SheetTrigger render={<Button/>}>…`
  Selects/Switches are form-native (`<Select name>` emits a hidden input). Use `components/ui/simple-select.tsx` for selects — it handles Base UI's `Value` render-function quirk.
- **Next 16 uses `proxy.ts`, not `middleware.ts`.** Auth protection lives in `proxy.ts` + `auth.config.ts` (edge-safe, no Prisma/bcrypt). Node-only auth is in `auth.ts`.
- **Prisma is pinned to v6** on purpose (v7 forces driver adapters + `prisma.config.ts` and drops `url` in schema). Don't bump to 7 without migrating.
- `params`/`searchParams` are Promises — `await` them.

## Where things are

- `lib/calculations.ts` — the single source of truth for totals (subtotal → invoice discount → per-line VAT). Used by editors (live) and server actions (persisted). Keep them in sync.
- `lib/invoice-number.ts` — atomic numbering; call inside a `prisma.$transaction`.
- Server actions: `lib/actions/*.ts`. Money stored as Prisma `Decimal`; convert with `toNumber` (`lib/money.ts`) before sending to client components.
- Invoice templates: `components/invoice/templates/{modern,minimal,professional,bold}.tsx`, chosen by `invoice-document.tsx`. Accent color is applied via inline styles (it's dynamic per doc).
- PDF: `/api/pdf/{invoice,estimate}/[id]` → Playwright renders `/print/{invoice,estimate}/[id]`, forwarding the auth cookie so the protected print page authenticates. Requires `npx playwright install chromium`.
- Document data normalizer: `lib/document-data.ts` (`buildInvoiceDoc` / `buildEstimateDoc`) → shared `DocData` for all templates.

## Dirham symbol

The new UAE Dirham symbol renders two ways, both from the official artwork in `Docs/Dirham Fonts/`:
- **App UI** — a web font (`public/fonts/dirham.woff2`) maps the glyph to `U+E800`. It's first in every font stack (`--font-sans/-mono/-display` in `globals.css`) with `unicode-range: U+E800`, so only that codepoint resolves to it. `formatMoney()` emits `` for AED, so all app amounts show it automatically. Rebuild the font with `uv run --with fonttools --with brotli python scripts/build_dirham_font.py`. Ref: https://medium.com/@dagrawal/adding-the-new-dirham-symbol-to-any-font-9a4db9a50873
- **Invoice PDFs** — templates use `<Amount>` / `DirhamGlyph` (inline SVG, same official path) so the glyph never depends on font-loading during Playwright rendering. `/fonts` is excluded from `proxy.ts` auth.

## Deferred (data model is ready)

Email sending, recurring invoices, Stripe, bilingual EN/AR, Peppol PINT-AE XML export.
