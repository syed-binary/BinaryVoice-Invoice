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

## Platform foundations (Phase 0 of the company-OS roadmap)

- **Permissions** — `lib/permissions.ts`: static role→capability map + `requireCapability(cap)` (wraps `requireUser`). Roles: ADMIN, FINANCE, HR, MEMBER, CONTRACTOR, EMPLOYEE (portal-only). Path-prefix gating by JWT role lives in `auth.config.ts` (`/hr`, `/payroll`, `/portal`). New server actions should call `requireCapability`, not bare `requireUser`.
- **Private files** — `lib/storage.ts` writes to `var/files/` (gitignored, NOT `public/`); upload via POST `/api/files`, download via `/api/files/[id]` (capability-checked per `Document.entityType` — see `lib/documents.ts`). Logos still use the old `/api/upload` → `public/uploads`.
- **Audit** — `lib/audit.ts` `audit(user, action, entityType, entityId, detail?, before?, after?)`; shallow diff + redaction denylist. Best-effort (never throws). Required for approvals/deletions/salary/contract-signing.
- **Notifications** — `lib/notify.ts` `notify(userId, {...})` / `notifyRoles([...])` writes in-app rows (bell in app shell), `email: true` also sends via `lib/email.ts` (Nodemailer; logs to console when SMTP_* env unset).
- **FX** — every money document stores `fxRate` (doc currency → `baseCurrency`) + `baseTotal`/`baseAmount`. Pure math in `lib/fx-core.ts` (ECB doesn't quote AED — pegged currencies route via USD), cached/service layer in `lib/fx.ts` (`getRate` = FxRate cache → frankfurter.app → null ⇒ manual). Dashboard sums base amounts. Editors prefill the rate via `fetchFxRate` action; keep `calculateTotals` currency-agnostic — convert once in the action.
- **Numbering** — new document types use `lib/numbering.ts` `nextNumber(tx, key, prefix)` (NumberSequence). Invoices/estimates keep their CompanySettings counters.
- **Cron** — job logic in `lib/jobs/*` (registry in `lib/jobs/index.ts`), triggered by host cron: `curl -X POST -H "x-cron-secret: $CRON_SECRET" localhost:3000/api/jobs/<name>`. Jobs: mark-overdue-invoices, document-expiry-alerts, fx-refresh. `/api/jobs` is excluded from proxy auth.
- **Tests** — `npm test` (vitest, scoped to `lib/**/*.test.ts` — pure modules only). Money/tax/FX math must be covered before shipping.
- **Field encryption** — `lib/crypto.ts` (AES-256-GCM, `FIELD_ENCRYPTION_KEY` env, versioned `v1:` prefix). Encrypt contractor payout details and (later) HR identity numbers; never prefill decrypted values into forms.

## Contractors module (Phase 1)

- **Payables ≠ invoices.** `ContractorInvoice` mirrors Invoice but uses `lib/contractors/payable-calc.ts` (no VAT/WHT/discount) — never extend `calculateTotals` for payables. Status flow: RECEIVED → APPROVED → (SCHEDULED via PayoutRun) → PAID, or REJECTED; transitions are audited actions in `lib/actions/contractors/payables.ts`.
- Payable numbers (`PAY-…`) and payout runs (`POR-…`) use `nextNumber()` sequences.
- **Margin** — `lib/contractors/margin.ts` (pure, base-currency). Contractor detail shows rate-card margin (cost vs bill rate via FX); actual billed-vs-paid margin needs `LineItem.engagementId` linking (exists in schema, editor UI later).
- Capability gating: nav filters via client-safe `lib/capabilities.ts`; server actions use `requireCapability` from `lib/permissions.ts` (same `can` map re-exported).

## CRM (Phase 3)

- `Deal` pipeline (LEAD→…→WON/LOST) at `/crm`; deals hold either `clientId` OR prospect fields — `convertProspectToClient` promotes. `Deal.estimateId` links the paper trail; `saveEstimate` accepts `dealId` (from `/estimates/new?deal=…`) and auto-advances early-stage deals to PROPOSAL.
- `Activity` is a polymorphic timeline (`entityType` DEAL/CLIENT/CONTRACTOR/CONTRACT) — reuse `ActivityTimeline` + `getTimeline()` (`lib/crm.ts`) on any detail page; TASK activities have due dates and completion.
- `Contact` = persons under a Client (one `isPrimary` enforced in the action). CRM uses `clients:*` capabilities (MEMBER has them).

## Portals (Phase 4)

- **Contractor portal** at `(portal)/portal/*` — role CONTRACTOR is path-gated there by `auth.config.ts`; `requirePortalContractor()` (lib/session.ts) resolves the Contractor by `userId` per request. Grant/reset access from the contractor detail page (creates a `User` role CONTRACTOR with the contractor's email). Portal actions live in `lib/actions/portal.ts` and must scope every query by `contractor.id`.
- **API routes are exempt from the portal path redirect** (`!path.startsWith("/api")` in auth.config) — they authorize themselves; `/api/files` additionally allows CONTRACTOR access to their own `entityId` only.
- **Public estimate acceptance**: `Estimate.publicToken` → `/estimate/[token]` (proxy-excluded, like `/sign/`). "Copy client link" on the estimate page mints the token; accept/decline is token-authed, audited, and notifies staff.

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

## HRMS (Phase 5)

- `Employee` identity numbers + IBAN are **encrypted** (`lib/crypto.ts`); expiries stay plaintext for the expiry-alert cron (which also scans employee fields, not just Documents). Display via `maskIdentity()` (`lib/hr.ts`); forms leave blanks = keep stored value.
- Salary: `CompensationRecord` history gated by `compensation:read` (ADMIN/FINANCE only — HR sees the employee, not the money). Amounts never logged to audit diffs. Basic/allowance split feeds gratuity + WPS in the payroll phase.
- Leave: UAE types seeded (`lv-*` ids); balances lazily created per year; `requestLeave` allows self-service (employee portal) or hr:write on behalf; approval decrements balance atomically.
- Employee portal: role EMPLOYEE shares `/portal` — layout + pages dispatch by role (`requirePortalEmployee`). Employee numbers use `nextNumber(tx, "employee", "EMP")`.
