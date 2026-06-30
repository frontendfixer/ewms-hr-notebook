# EWMS Product Requirements Document

## Vision

Personal Indian Railways HR notebook replacing a paper workbook. Event-first backend; action-first UI (Notion + Linear + Calendar).

## Goals

1. Home Feed with actionable reminders
2. Timeline as chronological memory
3. Ledger-derived balances (never manual totals)
4. ≤3 taps for common records via FAB
5. Unified Cmd+K search
6. Mobile-first card UI

## Non-Goals

- Multi-user HR admin, RBAC, payroll integration
- Email/WhatsApp notifications
- File attachments (schema exists, UI not built)

## Success Metrics

- Trace CR → leave consumption in <3 clicks
- CR expiry visible 7+ days ahead
- Zero manual balance arithmetic

## Implementation Status

### Shipped

| Feature | Notes |
|---------|-------|
| Google OAuth auth | Better Auth, 7-day sessions |
| Onboarding wizard | Profile + opening CL/LAP/LHAP balances via `LEAVE_LEDGER_ADJUSTMENT` |
| Home feed | CR expiry reminders, pending claim alerts, upcoming holiday, recent activity |
| Balance strip | CR credits, leave balances (CL/LAP/LHAP), pending ₹ |
| FAB quick-add | Take Leave, Add CR, Night Duty, Travel, Payment (→ Claims) |
| Leave wizard | 14 leave types, date range, half-day, FIFO CR consumption with SPECIAL_CL |
| CR recording | Holiday/Sunday work → `HOLIDAY_WORK_RECORDED` + `CR_CREDIT_ISSUED` |
| Night duty | Multi-day range, NDA preview from pay settings |
| Travel allowance | Destination, claim %, TA preview |
| Claims workflow | DRAFT → BILL_SUBMITTED → PASSED → PAID vertical stepper |
| Timeline | Chronological cards, domain/period filters, event detail |
| Calendar | Month view with domain dots, day detail panel |
| Records | Filtered lists by domain (all, CR, leave, night, travel) |
| Search | Cmd+K command palette + `/search` page (title/remarks) |
| Reports | Monthly domain bar chart, year stats, CSV export |
| Insights | Sundays worked, avg night duty/month, top destination |
| Settings | Theme (light/dark/system), pay settings, CR expiry days |
| Public holidays | Per-user holiday list for CR detection |
| Profile | Name, personnel no., designation, department |
| Event voiding | Recursive void with compensating ledger entries |
| PWA | Installable standalone app (production builds) |

### Schema only (not yet in UI)

| Feature | Notes |
|---------|-------|
| Notifications | `Notification` model exists; no readers/writers |
| Attachments | `ATTACHMENT_LINKED` event type; no upload UI |
| `CR_EXPIRED` events | Expiry enforced via `expiresAt` on ledger entries |
| `LEAVE_CONVERSION` | Event type defined, no handler |
| `NOTE_AMENDED` | Event type defined, no handler |
| `EmployeeCategory` | Schema enum; not in profile form |
| Sign-out | No sign-out UI |
