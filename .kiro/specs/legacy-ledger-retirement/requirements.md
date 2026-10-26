# Requirements Document

## Introduction

Retire the legacy `Account` / `Transaction` ledger now that the double-entry accounting core
(`JournalEntry` + Chart of Accounts) is the system of record. Every embedded billing flow (payment,
insurance, HR/payroll, inventory-purchase, visit-clinical) already posts a balanced `JournalEntry`
through the single compatibility bridge (`postLedgerEntry` / `reverseLedgerEntry`); the legacy
`Transaction` row is now only consumed by two screens — **Cash Book (legacy)** and
**Quick Expenses (legacy)**. This effort removes the legacy write-path and models WITHOUT changing
any embedded flow's behavior or losing a report.

The guiding principle: no reporting capability disappears, no billing flow changes its recorded
amounts, and every step is independently reversible and verified before the next.

## Glossary

- **Bridge:** postLedgerEntry / reverseLedgerEntry — the single path embedded flows use to post/reverse ledger activity.
- **JE:** JournalEntry — the double-entry system of record.
- **Legacy row:** a Transaction document (and its Account balance side-effect).

## Requirements

### R1 — Preserve all embedded billing behavior
**User story:** As the clinic, when a payment, insurance reimbursement, payroll run, inventory
purchase, or visit is billed, the accounting effect must be identical before and after this change.
**Acceptance (EARS):**
- WHEN any flow calls `postLedgerEntry` THEN a balanced `JournalEntry` SHALL be posted exactly as it
  is today (same accounts, same amount, same source/sourceId/vendor).
- WHEN any flow calls `reverseLedgerEntry` THEN the corresponding `JournalEntry` SHALL be reversed
  exactly as today.
- The recorded monetary amounts SHALL NOT change for any flow (R8.5 of accounting-core preserved).

### R2 — Stop writing the legacy Transaction row
**User story:** As a maintainer, I want the bridge to stop creating new `Transaction` rows / mutating
`Account` balances, so the legacy collection stops growing and can be retired.
**Acceptance:**
- WHEN `postLedgerEntry` runs THEN it SHALL post the `JournalEntry` and SHALL NOT create a new
  `Transaction` or call `adjustAccountBalance` / `getOrCreateAccount`.
- WHEN `reverseLedgerEntry` runs THEN it SHALL reverse the `JournalEntry` and SHALL NOT soft-delete a
  `Transaction` or adjust an `Account` balance.
- The public signatures of `postLedgerEntry` / `reverseLedgerEntry` SHALL be unchanged, and
  `postLedgerEntry` SHALL still return an object exposing an `_id` (callers store it as
  `transactionId`); after this change that id SHALL be the `JournalEntry` id.
- Callers that store the returned id and later pass it to `reverseLedgerEntry` (HR payroll,
  inventory-purchase) SHALL continue to reverse correctly against the JournalEntry id.

### R3 — No reporting capability is lost (legacy screens)
**User story:** As an accountant, the information previously on Cash Book and Quick Expenses must
still be reachable.
**Acceptance:**
- A cash-book-style list of income/expense activity SHALL remain available, derived from posted
  JournalEntries (by source / cash movement), OR the capability SHALL be explicitly covered by the
  existing General Ledger / Journal Entries / statement screens and the legacy screens removed.
- The "record a quick expense" capability SHALL be covered by the new Expense capture flow (Expense
  Workflow) before the legacy Quick Expenses screen is removed.
- No nav entry SHALL point at a removed route.

### R4 — Remove the dead legacy code only after it is unreferenced
**User story:** As a maintainer, I want the legacy models/actions deleted once nothing reads or writes
them, with no dangling imports.
**Acceptance:**
- The `Transaction` and `Account` models, and `transaction.actions.ts` / `account.actions.ts`
  exports, SHALL be removed ONLY after a grep proves zero live references outside `.kiro` snapshots
  and the two legacy screens.
- WHEN the legacy code is removed THEN `npx tsc --noEmit` SHALL have no NEW errors in any touched
  file and `npx next build` SHALL compile.
- The `Account` model registers mongoose refs named `Income` / `Expense` against the transactions
  collection; removal SHALL ensure no model still references those names.

### R5 — Historical legacy data is handled deliberately
**User story:** As the clinic, existing `Transaction`/`Account` documents represent past activity;
removal must not silently lose auditable history.
**Acceptance:**
- Pre-existing `Transaction` rows SHALL either (a) be left read-only accessible via a retained
  read-only legacy view until a defined cutover date, or (b) be confirmed as already represented by
  bridged `JournalEntry` rows (each legacy txn created after the bridge landed carries a
  `journalEntryId`).
- The migration SHALL document which legacy rows predate the bridge (no `journalEntryId`) so the
  clinic can decide whether to backfill or archive them.

### R6 — Reversibility & verification at each wave
**User story:** As the clinic running live billing, each step must be safe to ship and roll back.
**Acceptance:**
- Each wave SHALL be independently shippable, leaving the app in a working state.
- Each wave SHALL pass: `npx tsc --noEmit` (no new errors), `npx vitest run` (pure suite green),
  `npm run test:integration` (DB-backed suite green — including the bridge test), and `npx next build`.
- The accounting integration test for the bridge (`accounting-ledger.int.test.ts`:
  `postLedgerEntry` builds a balanced posted JournalEntry; `reverseLedgerEntry` reverses it) SHALL be
  updated to assert the NEW behavior (no `Transaction` row written) and SHALL stay green.

## Out of scope
- Changing the chart of accounts, default-account mappings, or the statements engine.
- Backfilling pre-bridge legacy transactions into JournalEntries (flagged for a separate decision).
- Any change to the new Expense Workflow / approvals.
