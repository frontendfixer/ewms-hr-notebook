# EWMS UX Specification

## Principles

- **Action First** — "I worked Sunday", not "Create CompOffCredit"
- **Dashboard First** — Home Feed command center
- **Timeline First** — chronological cards, not tables
- **Mobile First** — FAB, bottom nav, cards; desktop gets a sidebar

## Navigation

### Mobile bottom nav

Fixed bottom bar (`lg:hidden`):

| Tab | Route |
|-----|-------|
| Home | `/home` |
| Calendar | `/calendar` |
| Timeline | `/timeline` |
| Claims | `/claims` |
| More | `/more` |

"More" highlights when on `/more`, `/records/*`, `/settings`, `/profile`, `/reports`, or `/search`.

### Desktop sidebar

Fixed left column (`lg:` breakpoint):

- **Main:** Home, Calendar, Timeline, Claims
- **My Records:** All Records, Leave, CR, Night Duty, Travel
- **Footer:** Reports, Profile, Settings

### FAB (Quick Add)

Fixed bottom-right. Expands to:

1. **Take Leave** → `/add/leave`
2. **Add CR** → `/add/cr` (holiday/Sunday work)
3. **Night Duty** → `/add/night-duty`
4. **Travel** → `/add/travel`
5. **Payment** → `/add/payment` (redirects to Claims)

Domain-colored icons via `DOMAIN_STYLES`. No attachment action.

### Command palette

Sticky header search bar. Opens modal on click or `⌘K` / `/`. Debounced redirect to `/search?q=...` after 2+ characters.

### More page (mobile hub)

Links to Settings, Profile, Reports, Search, and record-type shortcuts.

## Screens

### Home (`/home`)

Greeting, balance strip (CR / leave / pending ₹), month stats, insights cards, activity feed with reminders (CR expiry ≤14 days, pending payments, next holiday).

### Calendar (`/calendar`)

Month grid with domain-colored dots. Tap a day to see events; link to event detail.

### Timeline (`/timeline`)

Event cards grouped by month. Domain and period filters via `?filter=`. `HOLIDAY_WORK_RECORDED` events are hidden from lists (paired CR credit is shown instead).

### Event detail (`/timeline/[eventId]`)

Domain header, remarks, claim status vertical stepper (night duty / travel), ledger impact, related events (via `correlationId`), void action.

### Claims (`/claims`)

Pending night-duty and travel claims with total ₹. Payment recording happens via claim status stepper on event detail.

### Records (`/records/[type]`)

Filtered card lists: `all`, `cr`, `leave`, `night`, `ta`. CR view shows available credits with expiry.

### Reports (`/reports`)

This-month domain bar chart, year-at-a-glance stats, link to CSV export and insights page.

### Settings (`/settings`)

Theme toggle (light / dark / system). Pay settings form: basic pay, DA %, TA base, CR expiry days with live DA preview. Link to holidays management.

### Onboarding (`/onboarding`)

4 steps: Welcome → Profile (name, personnel no., designation, department) → Opening leave balances (CL, LAP, LHAP) → Done.

## Key Flows

### 1. Onboarding → Home Feed

New user signs in → onboarding wizard sets profile and opening balances → redirected to Home.

### 2. Leave with FIFO CR

Take Leave wizard → select SPECIAL_CL → app recommends oldest CR credits (FIFO) → records `LEAVE_RECORDED` + `CR_CONSUMED` with shared `correlationId`.

### 3. Claim lifecycle

Record night duty or travel (starts as DRAFT) → open event detail → vertical stepper: Mark as Bill Submitted → Passed → Paid. Each transition appends a child event (`BILL_SUBMITTED`, `CLAIM_PASSED`, `PAYMENT_RECEIVED`).

### 4. Void / delete

Event detail → delete → appends `EVENT_VOIDED` with compensating ledger reversals. Never edits original event body.

## Design Tokens

- Spacing: 8px grid
- Radius: `0.75rem` (12px) for cards, sheets, and nav items
- Status: emerald=success, amber=pending/warning, blue=progress/info, red=expired/critical
- Domain colors: emerald=CR, rose=Leave, blue=Night Duty, amber=Travel, muted=Meta

See [`DESIGN-TOKENS.md`](DESIGN-TOKENS.md) for full token reference.
