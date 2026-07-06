# Binary Labs — Invoicing

An in-house invoicing app for **Binary AI Labs and Technologies L.L.C-FZ** (Meydan Free Zone, Dubai). Ultra-modern, UAE VAT-ready, with beautiful selectable invoice templates — built to be at par with Zoho Invoice / QuickBooks without the bloat.

Everything (frontend, backend, database access) lives in this one Next.js repo.

## Features

- **Clients** with custom fields, TRN, per-client currency, addresses
- **Items** catalog (reusable products/services)
- **Invoices** — line items, line & invoice-level discounts, auto-numbering (`BL-2026-0001`), multi-currency (AED default), statuses, notes/terms
- **Configurable UAE VAT (5%)** — off by default, flip on when you register; shows "Tax Invoice" + TRN per line
- **4 ultra-modern templates** (Modern, Minimal, Professional, Bold) with logo + accent-color branding
- **Pixel-perfect PDF** download & print (server-side via Playwright — the PDF matches the on-screen preview exactly)
- **Payments** (partial/full) with automatic status (Paid / Partially paid / Overdue)
- **Estimates / quotes** → one-click convert to invoice
- **Custom fields manager** — define your own fields for clients & invoices
- **Dashboard** — outstanding / collected / overdue totals + revenue chart
- **Multi-user login** (email + password), single company

## Tech stack

Next.js 16 (App Router, TypeScript) · Tailwind CSS v4 + shadcn/ui (Base UI) · Prisma + PostgreSQL · Auth.js v5 · Playwright (PDF) · Recharts.

## Getting started

```bash
# 1. Start Postgres (Docker)
npm run db:up

# 2. Install dependencies
npm install

# 3. Install the Chromium used for PDF generation (one-time)
npx playwright install chromium

# 4. Create the schema and seed company settings + admin user
npm run db:migrate      # applies migrations
npm run db:seed         # seeds Binary Labs settings + admin

# 5. Run
npm run dev             # http://localhost:3000
```

**Default login:** `syed.asad@binarylabz.com` / `binarylabs123` (change via `.env` → `ADMIN_PASSWORD`, then re-seed).

Environment variables live in `.env` (see `.env.example`).

## Handy scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run db:up` | Start local Postgres (Docker) |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed company settings + admin |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | Drop & recreate the database |

## Notes

- **Company & bank details** are pre-seeded from the legal documents in `Docs/` and are editable under **Settings**.
- **VAT** is off by default (only a Corporate Tax TRN is on file). Enable it in Settings once VAT-registered — no rework needed.
- The data model already stores the fields required for the UAE's upcoming **Peppol PINT-AE e-invoicing** mandate (2026–27); XML export can be added later.
- `scripts/make-test-data.ts` creates a sample client + invoice for demoing.
