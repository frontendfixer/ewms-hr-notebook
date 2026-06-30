# Event Taxonomy

## WorkEventType

| Type | Domain | Ledger | Status |
|------|--------|--------|--------|
| `HOLIDAY_WORK_RECORDED` | CR | — | **Active** — hidden from timeline lists; paired with `CR_CREDIT_ISSUED` |
| `CR_CREDIT_ISSUED` | CR | +1 `CR_CREDIT` (with `subAccountKey`, `expiresAt`) | **Active** |
| `CR_CONSUMED` | CR | −1 `CR_CREDIT` per credit | **Active** |
| `CR_EXPIRED` | CR | −`CR_CREDIT` | Schema only — expiry enforced via `expiresAt` on ledger entries |
| `LEAVE_RECORDED` | LEAVE | Debit CL / LAP / LHAP / COMMUTED | **Active** — SPECIAL_CL skips ledger debit |
| `LEAVE_LEDGER_ADJUSTMENT` | LEAVE | Opening balance credits | **Active** — used during onboarding |
| `LEAVE_CONVERSION` | LEAVE | debit/credit | Schema only — no handler |
| `NIGHT_DUTY_RECORDED` | NIGHT_DUTY | — (amount in payload) | **Active** |
| `TRAVEL_RECORDED` | TRAVEL | — (amount in payload) | **Active** |
| `BILL_SUBMITTED` | META | — | **Active** — claim status transition |
| `CLAIM_PASSED` | META | — | **Active** — claim status transition |
| `PAYMENT_RECEIVED` | META | — | **Active** — claim status transition |
| `STATUS_CHANGED` | META | — | **Active** — fallback for status transitions |
| `ATTACHMENT_LINKED` | META | — | Schema only — no upload UI |
| `NOTE_AMENDED` | META | — | Schema only — no handler |
| `EVENT_VOIDED` | META | Compensating reversals | **Active** — voids event and all ledger entries |

## EventDomain

| Domain | UI label | Color |
|--------|----------|-------|
| `CR` | CR | Emerald |
| `LEAVE` | Leave | Rose |
| `NIGHT_DUTY` | Night Duty | Blue |
| `TRAVEL` | Travel | Amber |
| `META` | Other | Muted |

## LedgerAccount

| Account | Used by |
|---------|---------|
| `CR_CREDIT` | CR credits (with `subAccountKey` for FIFO grouping, `expiresAt` for expiry) |
| `LEAVE_CL` | Casual leave debits and opening balances |
| `LEAVE_LAP` | LAP debits and opening balances |
| `LEAVE_LHAP` | LHAP debits and opening balances |
| `LEAVE_COMMUTED` | Commuted leave debits |
| `LEAVE_SPECIAL_CL` | Schema only — SPECIAL_CL leave does not post to ledger |

## LeaveType (14)

`CL`, `LAP`, `LHAP`, `COMMUTED`, `LND`, `EOL`, `STUDY`, `WRIIL`, `PATERNITY`, `MATERNITY`, `CCL`, `CHILD_ADOPTION`, `SPECIAL_CL`, `JOINING_TIME`

Only CL, LAP, LHAP, and COMMUTED debit ledger accounts. SPECIAL_CL is the only type that can consume CR credits.

## ClaimStatus

`DRAFT` → `BILL_SUBMITTED` → `PASSED` → `PAID` (or `VOIDED`)

Status is derived from child events linked via `parentEventId` to the claim root event.

## Correlation

Related events share `correlationId`:

- Holiday work + CR credit issued
- Leave recorded + CR consumed (SPECIAL_CL with CR)

Status transition events use `parentEventId` pointing to the claim root (night duty or travel event).

## Corrections

Append `EVENT_VOIDED` with compensating ledger entries for all original entries. Never edit event body in place. Voiding is recursive for child events.

## Balance derivation

All balances are computed from ledger entries — never stored or manually edited:

- `getBalances` — sum by account
- `getAvailableCrCredits` — grouped by `subAccountKey`, filters expired, FIFO-sorted
- `getCrBalance`, `getPendingMoney` — derived totals for UI
