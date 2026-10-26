# Implementation Plan — Legacy Ledger Retirement

## Overview

Sequenced so each wave is independently shippable and verified. No embedded billing flow changes behavior; only the bridge internals, two legacy screens, and the dead models are touched.

Sequenced so each wave is independently shippable and verified. No embedded billing flow changes
behavior; only the bridge internals, two legacy screens, and the dead models are touched.

## Tasks

- [x] 1. Harden the bridge test to pin current behavior (safety net BEFORE changing anything)
  - In `tests/integration/accounting-ledger.int.test.ts`, keep the existing bridge assertions
    (balanced posted JE on `postLedgerEntry`; reversal on `reverseLedgerEntry`). Add an assertion that
    captures CURRENT behavior as a baseline so the next wave's change is deliberate.
  - Verify: `npm run test:integration` green.
  - _Requirements: R1, R6_

- [x] 2. Rework `reverseLedgerEntry` to accept a JournalEntry id (with legacy fallback)
  - Treat the argument as a JournalEntry id first: if a posted JE with that id exists, reverse it.
    Else fall back to the existing legacy `Transaction` lookup (deploy-window safety, D1).
  - Keep the signature and `{ success }` return shape.
  - Verify: integration suite green (HR delete + inventory-purchase reject reversal paths exercised).
  - _Requirements: R1, R2, D1_

- [x] 3. Make `postLedgerEntry` post ONLY the JournalEntry (stop writing Transaction/Account)
  - `_postTransaction` (or a replacement `_postLedgerEntry`) builds + posts the balanced JournalEntry
    via the default-account mappings and returns it (exposing `_id`, plus a `journalEntryId` alias =
    `_id`, D2). Remove `Transaction.create`, `getOrCreateAccount`, `adjustAccountBalance`, and the
    Account `deposits[]/expenses[]` linking.
  - `recordIncome` / `recordExpense` (the gated wrappers) keep working but now produce only a JE.
  - Update the bridge integration test to assert: a JE id is returned, a balanced posted JE exists,
    and ZERO `Transaction` documents were created (P2).
  - Verify: `tsc` (no new errors), pure + integration suites green, `next build`.
  - _Requirements: R1, R2, R6, P1, P2, P3_

- [x] 4. Decide + handle the two legacy screens (default: retire)
  - Default path (D3): remove `account/transactions` (Cash Book) and `account/expenses`
    (Quick Expenses) routes + their nav entries; confirm GL / Journal Entries / Income Statement /
    Cash Flow / Vendor Spend + Expense Workflow cover their capability.
  - Alternative path (if clinic wants to keep a cash book): add a JE-derived `cashBook(period)` read
    and re-point `account/transactions` at it; retire only Quick Expenses.
  - Ensure no nav `roleField` points at a removed route; remove now-unused `getTransactions` /
    `recordExpense` / `deleteTransaction` usages from the UI.
  - Verify: `tsc`, `next build`; manual click-through of the Accounting menu (no dead links).
  - _Requirements: R3, R6_

- [x] 5. Historical-data diagnostic
  - Add a one-off read (script or gated action) that reports: total legacy `Transaction` count, count
    WITH `journalEntryId` (already in the ledger), and count WITHOUT (pre-bridge history). Surface the
    numbers so the clinic can decide to archive/export; do NOT drop the collection in code (D4).
  - _Requirements: R5_

- [x] 6. Remove dead legacy code (only after grep proves it is unreferenced)
  - Grep gate: zero live references to `transaction.actions`, `account.actions`,
    `accounting-reports.actions`, `account.models`, `transaction.models` outside `.kiro` snapshots and
    the (now-removed) legacy screens.
  - Delete `account.actions.ts`, `accounting-reports.actions.ts`, and the legacy pieces of
    `transaction.actions.ts` (keep the file only if `postLedgerEntry`/`reverseLedgerEntry` live there;
    otherwise relocate them to an `accounting/bridge.actions.ts` and delete the file). Remove the
    `Account` and `Transaction` models + their `Income`/`Expense` alias registrations and any
    `ITransaction`/`IAccount` types once unreferenced.
  - Verify: `tsc` (no new errors; the pre-existing baseline should DROP as legacy error sources go
    away), pure + integration suites green, `next build`.
  - _Requirements: R4, R6, P4_

- [x] 7. Final full verification + regression sweep
  - `npx tsc --noEmit`, `npx vitest run`, `npm run test:integration`, `npx next build`.
  - Smoke the five embedded flows end-to-end against the in-memory DB (payment, insurance payout,
    payroll run + delete, inventory purchase + reject, visit billing) and confirm each posts/reverses a
    balanced JournalEntry and writes no Transaction.
  - _Requirements: R1, R2, R3, R4, R5, R6_

## Task Dependency Graph

```
1 → 2 → 3 → 4 → 6 → 7
            5 ┘ (5 can run any time after 3; must precede 6)
```

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1"] },
    { "wave": 2, "tasks": ["2"] },
    { "wave": 3, "tasks": ["3"] },
    { "wave": 4, "tasks": ["4", "5"] },
    { "wave": 5, "tasks": ["6"] },
    { "wave": 6, "tasks": ["7"] }
  ],
  "dependencies": { "1": [], "2": ["1"], "3": ["2"], "4": ["3"], "5": ["3"], "6": ["4", "5"], "7": ["6"] }
}
```

## Notes
- Live billing: ship wave by wave. After wave 3 the system already stops writing legacy rows while all
  flows keep posting JEs — that is the main risk-bearing change and it is isolated to the bridge.
- Nothing is committed or pushed by task execution unless explicitly requested.
- Collection drops are never performed in code (D4); only model/code removal.
