# EWMS — Personal HR Notebook

Personal Indian Railways HR notebook with an event-first, ledger-first architecture. The UI speaks in actions ("Take Leave", "Add CR") rather than database terms.

## Stack

- **Runtime:** Bun 1.3, Node.js ≥24
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Data:** Prisma 7 + MySQL (MariaDB adapter)
- **Auth:** Better Auth (Google OAuth)
- **Forms & state:** React Hook Form, Zod, TanStack Query
- **PWA:** `@ducanh2912/next-pwa` (enabled in production builds)

## Quick start

```bash
cp .env.example .env
# Fill in GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET

docker compose up -d
bun install
bun run db:push      # or: bun run db:migrate
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with Google, complete onboarding, then land on the Home feed.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | MySQL connection string |
| `BETTER_AUTH_SECRET` | Session signing secret (≥32 chars) |
| `BETTER_AUTH_URL` | App base URL (e.g. `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

## Architecture

- **WorkEvent** — append-only event stream (source of truth)
- **LedgerEntry** — balance mutations linked to events; balances are always derived, never manually edited
- **Correlation** — related events share a `correlationId` (e.g. leave + CR consumed)
- **Corrections** — append `EVENT_VOIDED` with compensating ledger entries; never edit event bodies in place

Business logic lives in `src/lib/services/`. Server actions are in `src/actions/events.ts`.

## Routes

### Public

| Route | Purpose |
|-------|---------|
| `/` | Auth router → `/login`, `/onboarding`, or `/home` |
| `/login` | Google OAuth sign-in |
| `/onboarding` | 4-step wizard (profile + opening leave balances) |

### App (authenticated)

| Route | Purpose |
|-------|---------|
| `/home` | Command center: balances, reminders, insights, recent activity |
| `/calendar` | Month view with domain-colored event dots |
| `/timeline` | Chronological event cards with domain/period filters |
| `/timeline/[eventId]` | Event detail, claim stepper, ledger impact, void |
| `/claims` | Pending night-duty and travel claims (₹ total) |
| `/records/[type]` | Filtered lists: `all`, `cr`, `leave`, `night`, `ta` |
| `/reports` | Monthly domain chart, year stats, CSV export |
| `/reports/insights` | Personal insights (Sundays worked, avg night duty, top destination) |
| `/search` | Full-text search on title/remarks (`?q=`) |
| `/settings` | Theme, pay & allowance settings |
| `/settings/holidays` | User-defined public holidays |
| `/profile` | Name, personnel no., designation, department |
| `/more` | Mobile hub for records, reports, settings, search |

### Add flows (FAB)

| Route | Action |
|-------|--------|
| `/add/leave` | Leave wizard with FIFO CR recommendation |
| `/add/cr` | Record holiday/Sunday work → CR credit |
| `/add/night-duty` | Night duty with NDA preview |
| `/add/travel` | Travel allowance with TA preview |
| `/add/payment` | Redirects to `/claims` |
| `/add/sunday-work` | Redirects to `/add/cr` (legacy alias) |

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | No | Health check (includes DB ping) |
| `GET` | `/api/feed` | Yes | Home feed JSON (`feed`, `balances`) |
| `GET` | `/api/export/monthly` | Yes | CSV export of current month domain counts |
| `*` | `/api/auth/[...all]` | — | Better Auth (sessions, OAuth) |

## Server actions

`recordHolidayWork`, `recordLeave`, `recordNightDuty`, `recordTravel`, `transitionClaimStatus`, `voidEvent`, `updateProfile`, `completeOnboarding`, `addHoliday`, `updatePaySettings`

## Allowance formulas

- **DA:** `basicPay × daPercent / 100`
- **NDA per night:** `(basicPay + DA) / 200`
- **TA:** `taBaseAmount × claimPercent / 100` (default base ₹625)
- **CR expiry:** configurable, default 90 days from work date

## Project structure

```
src/
├── app/                  # Next.js App Router (pages, API routes, manifest)
├── actions/events.ts     # Server actions
├── components/           # UI (shell, flows, calendar, timeline, …)
├── generated/prisma/     # Prisma client (generated)
└── lib/
    ├── services/         # event, ledger, feed, insight, claim-status
    ├── calculations/     # allowance formulas
    └── design-tokens.ts  # Domain palette, status colors, defaults
prisma/schema.prisma
tests/unit/               # Vitest (allowances, utils)
docs/                     # PRD, UX spec, event taxonomy, design tokens
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Development server |
| `bun run build` | Production build (webpack) |
| `bun run start` | Production server |
| `bun run lint` | ESLint |
| `bun run test` | Vitest unit tests |
| `bun run db:migrate` | `prisma migrate dev` |
| `bun run db:push` | `prisma db push` |

## PWA

Standalone installable app with portrait orientation. Service worker is disabled in development; icons and manifest are generated at build time. See `src/app/manifest.ts`.

## Documentation

- [`docs/PRD.md`](docs/PRD.md) — product requirements and implementation status
- [`docs/UX-SPEC.md`](docs/UX-SPEC.md) — navigation, flows, design principles
- [`docs/EVENT-TAXONOMY.md`](docs/EVENT-TAXONOMY.md) — event types, ledger accounts, correlation
- [`docs/DESIGN-TOKENS.md`](docs/DESIGN-TOKENS.md) — colors, domain palette, spacing
