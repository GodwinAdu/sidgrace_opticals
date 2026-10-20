# Implementation Plan

_Accounting Core — double-entry ledger, statements, vendors, expenses + approvals, budgets_

## Overview

Build a real double-entry accounting system in shippable layers so the foundation (and the live money
flows that depend on it) lands and is verified before the rest:

- Layer A — ledger foundation: pure engine, Chart of Accounts, Journal Entries, General Ledger,
  periods, the compatibility bridge, and the seeded default chart.
- Layer B — financial statements: Trial Balance, Income Statement, Balance Sheet, Cash Flow.
- Layer C — vendors, expenses, and the multi-level approval engine.
- Layer D — budgets, accounting settings/periods UI, permissions wiring, and final verification.

Each layer is verified (tsc + pure tests + integration tests + build) before the next. The legacy
`Account`/`Transaction` buckets remain readable; new reporting derives from posted journal entries.

## Tasks

- [x] 1. Pure ledger + CoA engine + tests
  - Create `lib/accounting/ledger.ts` (`normalBalanceForType`, `isBalanced`, `lineSignedAmount`,
    `runningBalance`) and `lib/accounting/coa.ts` (`DEFAULT_CHART` seed definition,
    `validateParentType`, `normalBalanceForType` reuse). Add `tests/accounting-ledger.test.ts`
    covering Properties 1 and 2 (balanced entries; normal-balance + running-balance math) and parent
    type validation.
  - _Requirements: 1.1, 1.5, 2.1, 2.2, 3.1_

- [x] 2. Accounting models (CoA, JournalEntry, Period, Vendor)
  - Create `lib/models/accounting/chart-account.models.ts`, `journal-entry.models.ts` (embedded
    balanced lines, status lifecycle, basis, source, vendorId, reversal links),
    `accounting-period.models.ts`, and `vendor.models.ts`. Add their `ITypes` to `lib/types.d.ts`.
    Derive `normalBalance` on CoA save; enforce JE invariants at the schema/validate layer where
    practical.
  - _Requirements: 1.1, 1.2, 2.1, 2.3, 2.4, 7.1, 11.1_

- [x] 3. Chart of Accounts actions + seed
  - Create `lib/actions/accounting/chart-account.actions.ts` (create/update/deactivate/list, hierarchy
    read, delete-guard when posted activity exists) and a seed action/script that idempotently inserts
    `DEFAULT_CHART`. Gate mutations behind `accountingSettings`, reads behind `accountingManagement`.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.1_

- [x] 4. Journal entry + ledger + period actions
  - Create `lib/actions/accounting/journal-entry.actions.ts` (createDraft, updateDraft, post with
    balance + open-period validation, reverse, get, list — post/reverse gated `accountingPost`),
    `ledger.actions.ts` (`getLedger` with opening/activity/closing), and
    `accounting-period.actions.ts` (configure, close/reopen, gated `accountingSettings`). Immutable
    posted entries; corrections via reversing entry. Audit each mutation.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 7.1, 7.2, 9.1, 9.2_

- [x] 5. Compatibility bridge + accounting settings model/actions
  - Create `accounting-settings.models.ts` + `accounting-settings.actions.ts` (default account
    mappings, period validation mode, basis default; gated `accountingSettings`, audited). Rework
    `postLedgerEntry` / `reverseLedgerEntry` in `transaction.actions.ts` to build/reverse a balanced
    `JournalEntry` via the default mappings, PRESERVING their signatures and the returned `_id`, so
    payments/invoices/insurance/purchases/payroll are unchanged (keep legacy `Transaction` read).
  - _Requirements: 7.3, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 6. Permissions wiring (accounting role flags)
  - Add `accountingManagement`, `accountingPost`, `accountingApprove`, `accountingSettings` to the
    role model, `IRole`, and the role editor UI, mirroring the existing `att*` flags; admin bypass via
    `withAuth`. (Independent; needed by the gated actions above.)
  - _Requirements: 9.1_

- [x] 7. Layer A verification
  - `npx tsc --noEmit` (no new errors in touched files), `npx vitest run` (pure suite incl. ledger
    tests), `npm run test:integration` (new integration tests: post a balanced JE → ledger + period
    behavior; closed-period block; posted-immutability + reverse; bridge builds a balanced JE and a
    reversing entry). `npx next build`.
  - _Requirements: 2.1, 2.5, 3.1, 8.1, 8.2, 10.1, 10.2, 10.3_

- [x] 8. Pure statements engine + tests
  - Create `lib/accounting/statements.ts` (`trialBalance`, `incomeStatement`, `balanceSheet`,
    `cashFlow`, `filterByBasis`, `vendorSpend`, `budgetVsActual`). Add
    `tests/accounting-statements.test.ts` covering Properties 3, 4, 10, 11, 12 (trial balance balances;
    A = L + E; basis filter; vendor spend; budget-vs-actual math).
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 11.3, 12.2_

- [x] 9. Report actions + statement UI
  - Create `lib/actions/accounting/reports.actions.ts` (trialBalance / incomeStatement / balanceSheet
    / cashFlow with period + basis args, joining posted lines to account types) and re-point the
    existing balance-sheet / income-statement / trial-balance pages plus a new cash-flow page at these
    actions, with period + basis controls. `accountingManagement` gated.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 9.1_

- [x] 10. Layer B verification
  - tsc + pure suite + integration suite (statements derived from posted entries balance; basis switch
    changes results) + build.
  - _Requirements: 4.1, 4.3, 10.1, 10.2, 10.3_

- [x] 11. Pure approvals engine + tests
  - Create `lib/accounting/approvals.ts` (`resolveApprovalChain`, `nextPendingRole`,
    `isFullyApproved`). Add `tests/accounting-approvals.test.ts` covering Property 7 (deterministic
    chain, default fallback, next-pending gating).
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 5.5_

- [x] 12. Vendors + expenses + approval-rule models and actions
  - Create `budget`-independent models: `approval-rule.models.ts`, `expense.models.ts` (status
    lifecycle, frozen approvalChain, vendorId, journalEntryId). Create
    `lib/actions/accounting/approval-rule.actions.ts`, `vendor.actions.ts` (CRUD + deactivate guard +
    `vendorSpendReport`), and `expense.actions.ts` (capture, submit → freeze chain from rules,
    approve/reject → server-enforce next-pending role + `accountingApprove`, post → balanced JE
    debit expense / credit cash-or-vendor-payable, period-aware, gated `accountingPost`).
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 11.1, 11.2, 11.4, 11.5, 9.1, 9.2_

- [x] 13. Vendors + Expenses + Approvals UI
  - Add the Vendors manager, Expenses (capture + list + status), and an Approvals inbox under
    `app/(dashboard)/(routes)/dashboard/account/*`, built with `components/ui`. Over-budget warning on
    submit is wired in Layer D once budgets exist (leave a hook).
  - _Requirements: 5.1, 5.2, 5.4, 11.1, 11.3_

- [x] 14. Layer C verification
  - tsc + pure suite (approvals tests) + integration suite (expense submit→approve→post yields a
    balanced JE and respects period lock; approval denied for wrong role / missing permission; vendor
    spend ties to posted entries) + build.
  - _Requirements: 5.3, 5.5, 11.2, 10.1, 10.2, 10.3_

- [x] 15. Budgets model + actions + budget-vs-actual + over-budget hook
  - Create `budget.models.ts` + `lib/actions/accounting/budget.actions.ts` (CRUD, `budgetVsActual`,
    `checkOverBudget`), and wire `checkOverBudget` into expense submit (warn or block per the
    configurable setting). Gated `accountingSettings`; audited.
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 7.4_

- [x] 16. Settings + periods + budgets + reports UI, and final verification
  - Add the Accounting Settings UI (fiscal periods + close/reopen, approval rules, default account
    mappings, over-budget mode), the Budgets manager, and the Budget-vs-Actual + Vendor-Spend reports.
    Final full verification: `npx tsc --noEmit` (no new errors), `npx vitest run`,
    `npm run test:integration`, `npx next build`; manual smoke of each accounting route and the
    bridged money flows.
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 12.2, 12.3, 11.3, 9.1, 9.3, 10.1, 10.2, 10.3_

## Task Dependency Graph

```
Layer A (foundation)
1  (pure ledger + CoA engine)        depends on []
2  (accounting models)               depends on 1
3  (CoA actions + seed)              depends on 2
4  (JE + ledger + period actions)    depends on 2
5  (bridge + settings)               depends on 4
6  (permission flags)                depends on []
7  (Layer A verification)            depends on 3, 5, 6

Layer B (statements)
8  (pure statements engine)          depends on 1
9  (report actions + UI)             depends on 4, 8
10 (Layer B verification)            depends on 9

Layer C (vendors, expenses, approvals)
11 (pure approvals engine)           depends on []
12 (vendor/expense/rule models+acts) depends on 4, 5, 11
13 (vendors/expenses/approvals UI)   depends on 12
14 (Layer C verification)            depends on 13

Layer D (budgets, settings, final)
15 (budgets + over-budget hook)      depends on 8, 12
16 (settings/budgets/reports UI + final verify) depends on 9, 13, 15
```

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "6", "11"] },
    { "wave": 2, "tasks": ["2", "8"] },
    { "wave": 3, "tasks": ["3", "4"] },
    { "wave": 4, "tasks": ["5", "9"] },
    { "wave": 5, "tasks": ["7", "10", "12"] },
    { "wave": 6, "tasks": ["13", "15"] },
    { "wave": 7, "tasks": ["14", "16"] }
  ],
  "dependencies": {
    "1": [],
    "2": ["1"],
    "3": ["2"],
    "4": ["2"],
    "5": ["4"],
    "6": [],
    "7": ["3", "5", "6"],
    "8": ["1"],
    "9": ["4", "8"],
    "10": ["9"],
    "11": [],
    "12": ["4", "5", "11"],
    "13": ["12"],
    "14": ["13"],
    "15": ["8", "12"],
    "16": ["9", "13", "15"]
  }
}
```

## Notes

- Double-entry is the invariant that matters most: every posting (manual, bridged, or expense) MUST
  balance. The pure `isBalanced` guard and the JE post path enforce it; integration tests assert it.
- The bridge preserves existing call-site signatures and recorded amounts; only the underlying
  representation becomes double-entry. Legacy `Account`/`Transaction` stay readable.
- Posted entries are immutable; corrections are reversing entries. Period close is a reopenable soft
  lock. Accounting mutations are server-gated (fail closed) and audited.
- Seed a default clinic/professional chart idempotently so the system is usable immediately.
- Do not commit or push as part of task execution unless explicitly requested.