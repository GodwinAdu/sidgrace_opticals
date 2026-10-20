# Design Document

## Overview

Build a real double-entry accounting core alongside the existing single-entry buckets. The heart is a
pure ledger engine (balancing, normal-balance math, statement derivation, approval-chain resolution)
with DB-free unit tests, wrapped by `withAuth`-gated server actions and Mongoose models. Existing
posting call sites keep working through a compatibility bridge that turns legacy income/expense posts
into balanced journal entries using configurable default-account mappings.

Delivery is layered so the foundation ships and is verified before dependent features:
1. CoA + JE + GL engine + bridge (money flows become double-entry).
2. Reports (Trial Balance, P&L, Balance Sheet, Cash Flow).
3. Expenses + approval engine.
4. Settings/periods polish + UI.

Maps to requirements R1–R10.

## Architecture

```
UI (app/(dashboard)/(routes)/dashboard/account/*)
  Chart of Accounts · Journal · General Ledger · Reports · Expenses · Approvals · Settings
        │  (server actions, withAuth-gated)
        ▼
Server actions (lib/actions/accounting/*.actions.ts)
  chart-account · journal-entry · ledger · reports · expense · approval · accounting-settings
        │        │                         │
        │        ▼                         ▼
        │   PURE ENGINE (lib/accounting/*.ts, DB/React-free, unit-tested)
        │     ledger.ts   — isBalanced, normalBalanceSide, lineSignedAmount, runningBalance
        │     statements.ts — trialBalance, incomeStatement, balanceSheet, cashFlow (from posted lines)
        │     approvals.ts — resolveApprovalChain(amount, rules), nextApprover, isFullyApproved
        │     coa.ts       — normalBalanceForType, validateParentType, seed definition
        ▼
Models (lib/models/accounting/*)
  ChartAccount · JournalEntry (+ embedded lines) · AccountingPeriod · ApprovalRule · Expense
        ▲
Compatibility bridge (lib/actions/transaction.actions.ts, same exports)
  postLedgerEntry / reverseLedgerEntry  → build balanced JournalEntry via default account mappings
```

The legacy `Account` / `Transaction` models remain for historical reads. New reporting is derived
from `JournalEntry` posted lines only.

## Data Models

### ChartAccount (`lib/models/accounting/chart-account.models.ts`)
```
code: string (unique, e.g. "1000")           // sortable, hierarchical by convention
name: string
type: "asset" | "liability" | "equity" | "revenue" | "expense"
subtype?: string                              // e.g. "current-asset", "cogs" (reporting groups)
parentId?: ObjectId<ChartAccount> | null      // child.type must equal parent.type
normalBalance: "debit" | "credit"             // derived from type on save
isCashAccount?: boolean                       // flags cash/bank accounts for cash-flow + cash basis
isActive: boolean (default true)
isSystem?: boolean                            // seeded accounts the bridge relies on; not deletable
description?: string
+ audit fields (createdBy, modifiedBy, mod_flag, del_flag, action_type)
```
Guards: no hard delete when posted lines reference it (deactivate instead); parent type must match.

### JournalEntry (`lib/models/accounting/journal-entry.models.ts`)
```
entryNo: string                               // nextSequence("journal-YYYY")
date: Date                                     // posting date (validated against periods)
memo?: string
status: "draft" | "posted" | "reversed"
basis: "accrual" | "cash"                      // which basis this entry belongs to
source: "manual" | "payment" | "invoice" | "purchase" | "insurance" | "payroll" | "expense" | "bridge"
sourceId?: ObjectId | null
vendorId?: ObjectId<Vendor> | null             // set when the entry relates to a vendor (A/P, spend reports)
reversalOf?: ObjectId<JournalEntry> | null     // set on reversing entries
reversedBy?: ObjectId<JournalEntry> | null     // set on the original when reversed
lines: [{ accountId: ObjectId<ChartAccount>, debit: number>=0, credit: number>=0,
          memo?: string }]                      // exactly one of debit/credit > 0 per line
postedBy?, postedAt?
+ audit fields
```
Invariants enforced at save/post: sum(debit) === sum(credit) and > 0; >= 2 lines; each line has
exactly one positive side; posting requires an open period; posted entries are immutable (updates
rejected) — corrections via a reversing entry.

### AccountingPeriod (`lib/models/accounting/accounting-period.models.ts`)
```
fiscalYear: number
periodNo: number (1..12 or 13)
start: Date, end: Date
status: "open" | "closed"
closedBy?, closedAt?
```
A posting date must fall in an existing OPEN period (or period validation is relaxed to "no closed
period covers it" if periods are not fully configured — configurable).

### ApprovalRule (`lib/models/accounting/approval-rule.models.ts`)
```
name: string
minAmount: number, maxAmount?: number | null   // threshold band (null max = and above)
approverRoles: string[]                         // ordered chain of role names required in sequence
isDefault?: boolean                             // fallback when no band matches
isActive: boolean
```

### Expense (`lib/models/accounting/expense.models.ts`)
```
expenseNo: string
date: Date
amount: number
expenseAccountId: ObjectId<ChartAccount>        // debit side
creditAccountId: ObjectId<ChartAccount>         // cash or payable (credit side)
vendorId?: ObjectId<Vendor> | null              // optional vendor; drives payable + spend reports
    payee?: string
description?: string
attachmentUrl?: string
status: "draft" | "submitted" | "approved" | "rejected" | "posted"
approvalChain: [{ role: string, approverId?: ObjectId, decision?: "approved"|"rejected",
                  reason?: string, decidedAt?: Date }]   // frozen from rules at submit time
journalEntryId?: ObjectId<JournalEntry>         // set when posted
+ audit fields
```

### Vendor (`lib/models/accounting/vendor.models.ts`)
```
name: string (required)
contactName?, email?, phone?, address?
taxId?: string                                  // registration / tax number
paymentTerms?: string                           // e.g. "net-30"
payableAccountId?: ObjectId<ChartAccount>       // defaults to settings A/P when absent
isActive: boolean (default true)
+ audit fields
```
Guards: no hard delete when referenced by expenses/purchases (deactivate instead). The `Expense` and
inventory purchase sources store `vendorId`, and the resulting `JournalEntry.vendorId` is set so
vendor spend is reportable.

### Budget (`lib/models/accounting/budget.models.ts`)
```
fiscalYear: number
periodNo?: number | null                        // null = whole-year budget
accountId: ObjectId<ChartAccount>               // the budgeted account (usually expense/revenue)
departmentId?: ObjectId | null                  // optional cost center
amount: number                                   // budgeted amount for the account+period
note?: string
+ audit fields
```
Unique per (fiscalYear, periodNo, accountId, departmentId). Budget-vs-actual joins budgets with
posted-line actuals from the ledger.
### AccountingSettings (singleton, `lib/models/accounting/accounting-settings.models.ts`)
```
key: "accounting"
periodValidation: "strict" | "lenient"
defaultAccounts: {
  cash, accountsReceivable, accountsPayable, revenue, expense, insuranceReceivable, inventory,
  payrollExpense, ... }                          // code or id references used by the bridge
basisDefault: "accrual" | "cash"
}
```

No model change to legacy `Account`/`Transaction`; they are read-only history going forward.

## Components and Interfaces

### Pure engine (`lib/accounting/`, DB/React-free, unit-tested)

`ledger.ts`
```
normalBalanceForType(type): "debit" | "credit"
isBalanced(lines): boolean                       // sum debit === sum credit, > 0, >=2 lines, one-sided
lineSignedAmount(line, accountType): number      // + when it increases the account's normal side
runningBalance(openingBalance, lines, accountType): number
```

`statements.ts` (operate on an array of posted lines joined with their account type)
```
trialBalance(rows): { accounts: {code,name,debit,credit}[], totalDebit, totalCredit, balanced }
incomeStatement(rows, period): { revenue, expenses, netIncome, groups }
balanceSheet(rows, asOf): { assets, liabilities, equity, retainedEarnings, balanced }
cashFlow(rows, period): { operating, investing, financing, netChange }   // from cash-account deltas + classification
filterByBasis(rows, basis): rows
budgetVsActual(budgets, actualRows): { accountId, budget, actual, variance, variancePct }[]   // R12.2
vendorSpend(rows): { vendorId, total }[]                                                       // R11.3
```

`approvals.ts`
```
resolveApprovalChain(amount, rules): string[]    // ordered roles (Property: deterministic, R6.2)
isFullyApproved(chain): boolean
nextPendingRole(chain): string | null
```

`coa.ts`
```
DEFAULT_CHART: { code, name, type, subtype?, isCash?, isSystem? }[]   // seed definition
validateParentType(childType, parentType): boolean
```

These carry the correctness properties and are the primary unit-test target.

### Server actions (`lib/actions/accounting/`), all `withAuth`-gated

- `chart-account.actions.ts` — create/update/deactivate/list/seed CoA (`accountingSettings` for
  mutate; `accountingManagement` for read).
- `journal-entry.actions.ts` — createDraft, update draft, post (validate balance + period), reverse,
  get, list. Post gated by `accountingPost`.
- `ledger.actions.ts` — getLedger(accountId, from?, to?) with opening/activity/closing.
- `reports.actions.ts` — trialBalance / incomeStatement / balanceSheet / cashFlow (basis + period
  args), reading posted lines and joining account types via the pure statements module.
- `expense.actions.ts` — capture, submit (freeze chain from rules), approve/reject (server-enforce
  the acting user's role is the next pending role, `accountingApprove`), post (gated `accountingPost`).
- `approval-rule.actions.ts` + `accounting-settings.actions.ts` — CRUD, `accountingSettings` gated,
  audited.
- `vendor.actions.ts` — vendor CRUD/deactivate/list (mutate `accountingSettings`; read
  `accountingManagement`) + `vendorSpendReport(period)`.
- `budget.actions.ts` — budget CRUD/list (`accountingSettings`) + `budgetVsActual(fiscalYear,
  periodNo?, basis)`; `checkOverBudget(accountId, period, addAmount)` used on expense submit.

Every mutating action writes a `History` audit entry (reuse the existing model; add accounting
actionTypes). The journal/period/expense/settings actions enforce permissions server-side and fail
closed (R9).

### Compatibility bridge (keep existing exports in `transaction.actions.ts`)

`postLedgerEntry(user, values)` currently creates a single `Transaction`. It will instead:
1. Resolve debit/credit accounts from `AccountingSettings.defaultAccounts` + the `values.type` and
   `values.category`/`source` (e.g. income → debit Cash, credit Revenue; expense → debit Expense,
   credit Cash/Payable).
2. Create and post a balanced `JournalEntry` (`source` mapped from `values.source`, `sourceId`
   preserved, basis = settings default).
3. Return an object exposing an `_id` so existing callers that store `transactionId` keep working
   (store the journal entry id).
`reverseLedgerEntry(user, id)` posts a reversing entry for that journal entry.
To avoid breaking during rollout, the bridge also keeps writing the legacy `Transaction` row (optional
flag) OR fully switches — chosen at implementation as "write JE, keep legacy read" per R8.4; callers
are unchanged either way.

### UI (`app/(dashboard)/(routes)/dashboard/account/*`)

Extend the existing account section with: Chart of Accounts manager, Journal (list + new entry),
General Ledger (account picker + ledger table w/ drill-down), Reports (the four statements with
period + basis controls — the existing balance-sheet/income-statement/trial-balance pages are
re-pointed at the new report actions), Expenses (list + capture + approval inbox), and Settings
(periods, approval rules, default accounts). Built with the existing `components/ui` kit.

### Permissions

Add role flags `accountingManagement`, `accountingPost`, `accountingApprove`, `accountingSettings`
to `IRole` + role model + role editor (mirroring the existing `att*` pattern). Admin bypasses via
`withAuth`.

## Error Handling

- Unbalanced / <2-line / zero JE → rejected at the action with a clear error; never persisted.
- Posting into a closed period → blocked with a period error (R2.5).
- Editing a posted entry → rejected; UI offers "reverse" instead (R2.3).
- Approve by a user who is not the next pending role, or lacks `accountingApprove` → denied
  server-side (R5.5, R9.1).
- Delete of an account with posted activity → blocked; offer deactivate (R1.2).
- Bridge failure (missing default account mapping) → logged via `logError`; the finance post fails
  loudly in manual flows but is best-effort/logged in embedded flows so clinical/billing actions are
  not blocked (mirrors today's `postLedgerEntry` try/catch behavior).
- Statement discrepancy → surfaced in the report output, not hidden (R4.6).

## Testing Strategy

- **Pure unit tests** (`tests/accounting-*.test.ts`): `isBalanced` + normal-balance math; `runningBalance`
  per account type; `trialBalance` debits==credits; `incomeStatement`/`balanceSheet` identities
  (A = L + E incl. net income); `cashFlow` grouping; `resolveApprovalChain` determinism and default
  fallback; `validateParentType`.
- **Integration tests (in-memory Mongo harness)**: create CoA + post a balanced JE → ledger + trial
  balance reflect it and balance; posting into a closed period is blocked; a posted entry cannot be
  edited but can be reversed; `postLedgerEntry` bridge creates a balanced JE and a reversing entry;
  expense submit→approve→post produces a balanced JE and respects period lock; approval denied for
  wrong role / insufficient permission.
- **Regression**: existing pure + integration suites stay green; `npx tsc --noEmit` no new errors;
  `npx next build` compiles the account routes.

## Correctness Properties

### Property 1: Journal entries are balanced
`isBalanced` is true only when total debits equal total credits, the total is positive, there are at
least two lines, and every line is strictly one-sided; a JE cannot be posted otherwise.
**Validates: Requirements 2.1, 2.2**

### Property 2: Normal-balance correctness
`normalBalanceForType` returns debit for Asset/Expense and credit for Liability/Equity/Revenue, and
`runningBalance` increases an account on its normal side and decreases on the other.
**Validates: Requirements 1.1, 3.1**

### Property 3: Trial balance balances
For any set of posted lines, `trialBalance` yields total debits equal to total credits.
**Validates: Requirements 4.1**

### Property 4: Accounting equation holds
`balanceSheet` satisfies Assets = Liabilities + Equity (including period net income) for any posted
set derived from balanced entries.
**Validates: Requirements 4.3**

### Property 5: Posted entries are immutable; corrections reverse
A posted journal entry cannot be mutated; a reversing entry mirrors the original with debits and
credits swapped and references it.
**Validates: Requirements 2.3, 2.6**

### Property 6: Period lock blocks posting
Posting (direct, bridged, or expense) with a date inside a closed period is rejected unless the period
is reopened.
**Validates: Requirements 2.5, 7.2, 5.6**

### Property 7: Approval chain is deterministic and gated
`resolveApprovalChain` returns the same ordered roles for the same amount + rules, falls back to the
default when no band matches, and an approval is accepted only from the next pending role held by a
user with approval permission.
**Validates: Requirements 6.1, 6.2, 6.3, 5.5**

### Property 8: Bridge preserves amounts and signatures
`postLedgerEntry` with the legacy shape produces a balanced JE whose net revenue/expense effect equals
the original amount, without changing the function signature or the amount recorded.
**Validates: Requirements 8.1, 8.2, 8.5**

### Property 9: Access control fails closed
Every accounting mutation (post, approve, close period, settings, CoA mutate) is denied server-side
when the caller lacks the required permission, regardless of UI.
**Validates: Requirements 9.1**

### Property 10: Basis filtering
Selecting cash vs accrual basis includes only the entries relevant to that basis in every statement.
**Validates: Requirements 4.5**

### Property 11: Vendor spend ties to posted entries
`vendorSpend` totals, grouped by vendor, equal the sum of posted expense/purchase amounts carrying
that `vendorId`; a vendor with referencing entries cannot be hard-deleted.
**Validates: Requirements 11.2, 11.3, 11.4**

### Property 12: Budget-vs-actual math
`budgetVsActual` reports, per budgeted account/period, actual = sum of posted lines for that account
in the period, variance = budget - actual, and treats a missing budget as actual-only (no error);
the over-budget check only warns/blocks per the configured setting.
**Validates: Requirements 12.2, 12.3, 12.4**
