# Design — Legacy Ledger Retirement

## Overview

Retire the legacy Account/Transaction ledger. The embedded flows already post double-entry Journal Entries through one bridge; this removes the legacy write-path, the two legacy screens, and the dead models in verified waves without changing any flow's recorded amounts.

## Architecture

## Current state (verified)

```
payment.actions        ─┐
insurance.actions       │
hr.actions              ├─ postLedgerEntry(user, values) ─┬─ writes legacy Transaction row + Account balance (LEGACY)
inventory-purchase      │   reverseLedgerEntry(user, id)   └─ posts/reverses a balanced JournalEntry   (SYSTEM OF RECORD)
visit-clinical          ─┘
```

- `postLedgerEntry` (in `lib/actions/transaction.actions.ts`) does BOTH: `_postTransaction` creates a
  `Transaction`, calls `adjustAccountBalance` + `getOrCreateAccount`, links it onto the Account's
  `deposits[]`/`expenses[]`, AND calls `postBridgedJournalEntry` which builds a balanced `JournalEntry`
  from the default-account mappings and stores its id as `txn.journalEntryId`. It returns the
  `Transaction` (exposing `_id`).
- `reverseLedgerEntry(user, transactionId)` loads the `Transaction`, reverses the `Account` balance,
  soft-deletes the txn, finds the bridged JE (via `txn.journalEntryId` or source/sourceId) and posts a
  reversing JE.
- Legacy READ consumers of `Transaction`: `account/transactions/page.tsx` (Cash Book) via
  `getTransactions`, and `account/expenses/*` (Quick Expenses) via `getTransactions` + `recordExpense`
  / `deleteTransaction`. The old `accounting-reports.actions.ts` is already unreferenced.
- Reports (trial balance, income statement, balance sheet, cash flow, budgets, vendor spend) ALL read
  from posted `JournalEntry` rows already — none read `Transaction`.

## Target state

```
payment / insurance / hr / inventory-purchase / visit-clinical
        └─ postLedgerEntry(user, values)  → posts a balanced JournalEntry ONLY (returns { _id: <JE id> })
           reverseLedgerEntry(user, jeId)  → reverses that JournalEntry ONLY
```

- No `Transaction` rows written; no `Account` balances mutated.
- `postLedgerEntry` returns the `JournalEntry` (so `_id` = JE id). Callers that persist it
  (`run.transactionId`, `purchase.transactionId`) keep working because `reverseLedgerEntry` accepts a
  JE id directly.
- Cash Book / Quick Expenses either (a) re-point to JE-derived reads, or (b) are retired because GL +
  Journal Entries + statements already cover them (decision captured in tasks).
- `Account` / `Transaction` models + `transaction.actions.ts` legacy pieces + `account.actions.ts` +
  `accounting-reports.actions.ts` removed once unreferenced.

## Components and Interfaces

### D1 — `reverseLedgerEntry` must accept a JournalEntry id
Today it takes a `transactionId`. After R2, `postLedgerEntry` returns a JE id, which the two
reversing callers (HR, inventory-purchase) store and pass back. So `reverseLedgerEntry` is reworked to
treat its argument as a JournalEntry id first (reverse that JE), with a fallback: if no JE is found by
that id, try the legacy lookup (so in-flight reversals of pre-change stored transaction ids during the
deploy window still work). This dual-read is removed in the final cleanup wave once no stored legacy
ids remain in active runs.

### D2 — Preserve the return shape
`postLedgerEntry` returns `JSON.parse(JSON.stringify(journalEntry))`. The JournalEntry has `_id`, so
callers reading `txn._id` / `txn.journalEntryId` keep compiling. We KEEP a `journalEntryId` convenience
field on the returned object equal to `_id` so any caller reading either key is safe.

### D3 — Cash Book / Quick Expenses
Recommended end state (confirmed in tasks): retire both legacy screens. Rationale — General Ledger
(per-account running balance), Journal Entries (full list + post/reverse), Income Statement, Cash Flow,
and Vendor Spend already provide every view those two screens offered. Quick-expense entry is replaced
by the Expense Workflow (capture → submit → approve → post). If the clinic prefers to keep a cash-book
view, the alternative task re-points it to a JE-derived `cashBook(period)` read (no legacy model).

### D4 — Historical data
Legacy `Transaction` rows created AFTER the bridge landed each carry `journalEntryId` — their economic
effect is already in the ledger, so deleting the legacy row loses nothing financial. Rows created
BEFORE the bridge (no `journalEntryId`) are pre-existing history; the migration provides a read-only
diagnostic (count of such rows) and leaves the collection in place (models removed, collection not
dropped) so an admin can archive/export on their own schedule. We never drop a collection in code.

## Data Models
- No new models. Removals only, in the final wave: `Transaction` schema (+ its `Income`/`Expense`
  alias registrations), `Account` schema, and their `ITypes` if present.
- `AccountingSettings.defaultAccounts` (used by the bridge to pick cash/revenue/expense) is unchanged
  and still required.

## Error handling
- The bridge stays best-effort and non-throwing for embedded flows: a failure to post the JE logs via
  `console.error` and returns null (never blocks a clinical/billing save) — unchanged from today.
- Removing the legacy write cannot fail (there is simply less work).

## Testing strategy
- Update `tests/integration/accounting-ledger.int.test.ts` bridge cases: assert `postLedgerEntry`
  returns a JE id, a balanced posted JournalEntry exists, and NO `Transaction` document is created;
  `reverseLedgerEntry(jeId)` reverses it.
- Keep the full pure + integration suites green at every wave.
- `npx next build` after the screen changes and after the model removal.
- Grep gate before deletion: zero references to `transaction.actions` / `account.actions` /
  `account.models` / `transaction.models` outside `.kiro` snapshots.

## Correctness properties
- **P1 — Amounts invariant:** for identical inputs, the posted JournalEntry (accounts + amount) is
  byte-identical before and after R2. (Validates R1.)
- **P2 — No legacy writes:** after R2, a `postLedgerEntry` call creates exactly zero `Transaction`
  documents and leaves every `Account.balance` unchanged. (Validates R2.)
- **P3 — Reversal integrity:** `reverseLedgerEntry` applied to the id returned by `postLedgerEntry`
  marks the original JE reversed and posts a mirrored JE. (Validates R1, R2.)
- **P4 — No dangling references:** after the cleanup wave, `tsc` + `next build` pass and grep finds no
  live import of the removed modules. (Validates R4.)
