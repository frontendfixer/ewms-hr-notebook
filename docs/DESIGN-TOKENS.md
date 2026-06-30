# Design Tokens

## CSS variables (`src/app/globals.css`)

### Light (`:root`)

| Token | Value |
|-------|-------|
| `--background` | `#fafafa` |
| `--foreground` | `#171717` |
| `--card` | `#ffffff` |
| `--primary` | `#1d4ed8` |
| `--primary-foreground` | `#ffffff` |
| `--secondary` / `--muted` / `--accent` | `#f4f4f5` |
| `--muted-foreground` | `#71717a` |
| `--destructive` | `#dc2626` |
| `--border` / `--input` | `#e4e4e7` |
| `--ring` | `#1d4ed8` |
| `--radius` | `0.75rem` (12px) |

### Dark (`.dark`)

| Token | Value |
|-------|-------|
| `--background` | `#09090b` |
| `--foreground` | `#fafafa` |
| `--card` | `#18181b` |
| `--primary` | `#3b82f6` |
| `--secondary` / `--muted` | `#27272a` |
| `--muted-foreground` | `#a1a1aa` |
| `--destructive` | `#ef4444` |
| `--border` / `--input` | `#27272a` |
| `--ring` | `#3b82f6` |

### Fonts

Geist Sans + Geist Mono via Next.js font loader. Mapped to Tailwind v4 via `@theme inline`.

### PWA theme colors

- Light: `#1d4ed8`
- Dark: `#3b82f6`
- Manifest background: `#fafafa`

## Status colors (`src/lib/design-tokens.ts`)

Status colors are Tailwind utility class strings (not CSS custom properties). Always pair with icon + label for accessibility.

| Status | Palette | Usage |
|--------|---------|-------|
| `success` | Emerald | Completed, paid, healthy balance |
| `warning` | Amber | Pending, expiring soon |
| `info` | Blue | In progress, informational |
| `critical` | Red | Expired, overdue, error |
| `muted` | Muted foreground | Neutral, voided |

## Domain palette (`DOMAIN_STYLES`)

Each domain has consistent tokens for cards, borders, icons, labels, rings, dots, bars, and active chips:

| Domain | Color | Tokens |
|--------|-------|--------|
| CR | Emerald (`emerald-500`) | card, border, icon, label, ring, dot, bar, chipActive |
| LEAVE | Rose (`rose-500`) | same set |
| NIGHT_DUTY | Blue (`blue-500`) | same set |
| TRAVEL | Amber (`amber-500`) | same set |
| META | Muted | same set |

Used in: timeline cards, calendar dots, FAB icons, report bars, filter chips.

## Spacing & radius

- **Grid:** 8px base
- **Radius:** `0.75rem` (12px) — cards, nav items, sheets, buttons (`--radius` / `rounded-xl`)
- **Sheets / modals:** `rounded-2xl` (16px) for FAB menu and overlays

## Runtime constants (`src/lib/design-tokens.ts`)

| Constant | Value | Purpose |
|----------|-------|---------|
| `DEFAULT_CR_EXPIRY_DAYS` | 90 | CR credit expiry from work date |
| `DEFAULT_TA_BASE_AMOUNT` | 625 | Default travel allowance base (₹) |

### Setting keys

`crExpiryDays`, `clEntitlement`, `elEntitlement`, `basicPay`, `daPercent`, `taBaseAmount`

(`clEntitlement` and `elEntitlement` are defined but not yet used in UI.)

### Claim status labels

| Enum | Label |
|------|-------|
| `DRAFT` | Pending |
| `BILL_SUBMITTED` | Bill Submitted |
| `PASSED` | Passed |
| `PAID` | Paid |
| `VOIDED` | Voided |
