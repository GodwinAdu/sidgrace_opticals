# Requirements Document

## Introduction

The application currently has a single-entry, bucket-based "accounting" layer: an `Account` holds one
running `balance`, and a flat `Transaction` (income/expense) adjusts that balance. There is no
double-entry ledger, so the Trial Balance, Income Statement, and Balance Sheet pages cannot truly
balance, and there is no journal, no approval workflow, and no period control.

This feature builds a real, professional double-entry accounting system alongside the existing data:
a typed, hierarchical **Chart of Accounts**; balanced **Journal Entries** (debit = credit, enforced)
with a draft→posted lifecycle; a **General Ledger** derived from posted entries; the full statement
set (**Trial Balance, Income Statement, Balance Sheet, Cash Flow**); an **Expenses** workflow with
**multi-level, threshold-based approvals**; and accounting **Settings** (fiscal periods, period
close/lock, approval rules, default account mappings). It supports both **accrual** and **cash**
bases, and ships with a **seeded default chart** so it is usable immediately.

Existing posting call sites (`postLedgerEntry` / `reverseLedgerEntry`, used by payments, insurance,
visit billing, inventory purchases, and payroll) keep working: they are bridged to create balanced
journal entries behind the same function signatures, so no caller changes and no historical data is
lost.

## Scope

**In scope:**
- Chart of Accounts: typed (Asset / Liability / Equity / Revenue / Expense), hierarchical (parent /
  child), coded, with a normal balance (debit/credit) per type; seedable defaults; CRUD with guards.
- Journal Entries: balanced multi-line debit/credit entries; draft → posted → (reversed) lifecycle;
  posting date, memo, reference, source link; immutable once posted (correct via reversing entry).
- General Ledger: per-account ledger of posted lines with running balance and drill-down.
- Reports: Trial Balance, Income Statement (P&L), Balance Sheet, Cash Flow — period-filtered, and
  switchable between accrual and cash basis.
- Expenses: capture → submit → multi-level approval (threshold + role rules) → post to the ledger;
  rejection and resubmission.
- Approvals engine: configurable rules (amount thresholds → required approver roles / chains).
- Accounting Settings: fiscal year + periods, period close/lock, approval rules, default account
  mappings used by the posting bridge.
- Bridge: `postLedgerEntry` / `reverseLedgerEntry` create/reverse balanced journal entries via the
  default account mappings; existing callers unchanged.
- A seeded, clinic/professional default Chart of Accounts.

**Out of scope (future):**
- Multi-currency, tax engines (VAT/GST computation beyond simple accounts), fixed-asset depreciation
  schedules, bank-feed import/reconciliation automation, payroll tax filing, consolidated
  multi-entity reporting, external accounting-system sync (e.g. QuickBooks/Xero).
- Replacing the existing bucket `Account` model's data (it is bridged/migrated, not deleted, in this
  spec).

## Decisions and Assumptions

- **D1 — New double-entry core; keep old data working (confirmed).** New Chart of Accounts + Journal
  + GL; the legacy `Transaction`/`Account` buckets are bridged and remain readable.
- **D2 — Multi-level approvals with configurable thresholds (confirmed).**
- **D3 — Full statement set incl. Cash Flow (confirmed).**
- **D4 — Seed a default clinic/professional Chart of Accounts (confirmed).**
- **D5 — Support both accrual and cash basis (confirmed).** Each journal entry records its basis
  (or is flagged cash-relevant) so reports can present either view.
- **A1 — Access control via a new `accountingManagement` (and finer `accountingApprove`,
  `accountingPost`, `accountingSettings`) role flags, consistent with existing `withAuth` gating
  (assumption, override on review).**
- **A2 — Period close is a soft lock** (posting into a closed period is blocked unless reopened by a
  settings-privileged user), not a destructive archive.
- **A3 — Posted journal entries are immutable**; corrections are made by reversing entries, never by
  editing a posted entry.

## Glossary

- **Chart of Accounts (CoA):** the typed, coded, hierarchical list of accounts.
- **Account type:** Asset, Liability, Equity, Revenue, or Expense; each has a normal balance.
- **Normal balance:** the side (debit or credit) that increases an account of a given type.
- **Journal Entry (JE):** a dated, balanced set of lines where total debits equal total credits.
- **Journal line:** one debit or credit against one account within a JE.
- **Posting:** committing a draft JE to the ledger (after which it is immutable).
- **General Ledger (GL):** the collection of posted lines, viewable per account with running balance.
- **Trial Balance:** a list of all accounts with their debit/credit balances; totals must be equal.
- **Basis:** accrual (recognize when earned/incurred) or cash (recognize when cash moves).
- **Approval rule:** a configuration mapping an amount threshold to the approver role(s)/chain
  required.
- **Period close/lock:** marking a fiscal period closed so no new postings land in it.
- **Posting bridge:** the compatibility layer that turns legacy `postLedgerEntry` calls into balanced
  journal entries.

## Requirements

### Requirement 1: Chart of Accounts
**User Story:** As an accountant, I want a typed, hierarchical, coded chart of accounts, so that every
transaction is classified correctly and statements can be derived.

#### Acceptance Criteria
1. WHEN an account is created THEN it SHALL have a unique code, a name, a type (Asset, Liability,
   Equity, Revenue, Expense), an optional parent, and a derived normal balance (debit for
   Asset/Expense, credit for Liability/Equity/Revenue).
2. WHERE an account has posted ledger activity THEN the system SHALL NOT allow deleting it; it MAY be
   deactivated instead.
3. WHEN accounts are listed THEN the system SHALL present them hierarchically by type and code.
4. WHEN the system is first set up THEN it SHALL be able to seed a default clinic/professional chart
   of accounts without creating duplicates on re-run.
5. IF a parent is assigned THEN the child's type SHALL match the parent's type.

### Requirement 2: Journal entries (balanced, lifecycle)
**User Story:** As an accountant, I want to record balanced journal entries with a draft/posted
lifecycle, so that the ledger is always in balance and auditable.

#### Acceptance Criteria
1. WHEN a journal entry is saved THEN the sum of its debit lines SHALL equal the sum of its credit
   lines, and the system SHALL reject an unbalanced entry.
2. WHEN a journal entry has fewer than two lines or a zero total THEN the system SHALL reject it.
3. WHEN a journal entry is posted THEN it SHALL become immutable; subsequent corrections SHALL be made
   by a reversing entry, not by editing.
4. WHEN a journal entry is posted THEN each line SHALL carry its account, debit or credit amount,
   posting date, basis, and a reference to the source.
5. WHERE the posting date falls in a closed period THEN the system SHALL block the post unless the
   period is reopened by an authorized user.
6. WHEN a reversing entry is created THEN it SHALL mirror the original lines (debits/credits swapped)
   and reference the original entry.

### Requirement 3: General Ledger
**User Story:** As an accountant, I want a general ledger per account, so that I can see every posting
and the running balance.

#### Acceptance Criteria
1. WHEN the ledger for an account is viewed THEN it SHALL list all posted lines in date order with a
   running balance consistent with the account's normal balance.
2. WHEN a ledger line is selected THEN the system SHALL allow drill-down to its originating journal
   entry.
3. WHERE a date range is supplied THEN the ledger SHALL show the opening balance, period activity, and
   closing balance for that range.
4. The ledger SHALL only include posted (not draft or reversed-out) entries in balances.

### Requirement 4: Financial statements
**User Story:** As an accountant or manager, I want standard financial statements derived from the
ledger, so that I can report on financial position and performance.

#### Acceptance Criteria
1. WHEN the Trial Balance is run for a period THEN total debits SHALL equal total credits.
2. WHEN the Income Statement is run for a period THEN it SHALL show revenue, expenses, and net
   income derived from posted entries.
3. WHEN the Balance Sheet is run as of a date THEN Assets SHALL equal Liabilities plus Equity
   (including period net income / retained earnings).
4. WHEN the Cash Flow statement is run for a period THEN it SHALL present cash movements grouped into
   operating, investing, and financing activities.
5. WHERE a basis (accrual or cash) is selected THEN each statement SHALL reflect only entries relevant
   to that basis.
6. WHERE a statement total cannot balance THEN the system SHALL surface the discrepancy rather than
   silently hide it.

### Requirement 5: Expenses with approval workflow
**User Story:** As a staff member, I want to submit expenses for approval before they post, so that
spending is controlled and auditable.

#### Acceptance Criteria
1. WHEN an expense is captured THEN it SHALL have an amount, date, expense account, payee/vendor,
   description, optional attachment, and a status (draft / submitted / approved / rejected / posted).
2. WHEN an expense is submitted THEN the system SHALL route it through the approval chain required by
   the configured rules for its amount.
3. WHEN all required approvals are granted THEN the expense SHALL be eligible to post a balanced
   journal entry (debit expense, credit cash/payable).
4. WHEN an approver rejects an expense THEN it SHALL return to the submitter with the rejection
   reason and SHALL NOT post.
5. WHERE a user lacks approval authority for an expense's level THEN the system SHALL NOT allow them to
   approve it, enforced on the server.
6. WHEN an approved expense is posted THEN it SHALL respect period locks and the posting rules of
   Requirement 2.

### Requirement 6: Configurable approval rules
**User Story:** As a finance administrator, I want to configure approval thresholds and approver
roles, so that the workflow matches our controls.

#### Acceptance Criteria
1. WHEN an approval rule is defined THEN it SHALL map an amount range (threshold) to one or more
   required approver roles in sequence (a chain).
2. WHEN an expense amount matches multiple rules THEN the system SHALL apply the most specific /
   highest-threshold applicable chain deterministically.
3. WHERE no rule matches THEN the system SHALL apply a configurable default (e.g. single approver) and
   SHALL NOT allow an unapproved post.
4. WHEN rules change THEN in-flight approvals SHALL retain the chain they started with (rules are not
   retroactively applied mid-flight).

### Requirement 7: Accounting settings and periods
**User Story:** As a finance administrator, I want to configure fiscal periods, locks, default
accounts, and rules, so that the system enforces our policies.

#### Acceptance Criteria
1. WHEN a fiscal year and its periods are configured THEN the system SHALL use them to validate
   posting dates and scope reports.
2. WHEN a period is closed THEN the system SHALL block new postings dated within it until it is
   reopened by an authorized user.
3. WHEN default account mappings are set (e.g. default cash, revenue, expense, A/R, A/P accounts) THEN
   the posting bridge SHALL use them to build journal entries.
4. WHERE settings are changed THEN the change SHALL be recorded in the audit history with the actor.

### Requirement 8: Compatibility bridge (no regression)
**User Story:** As a developer, I want existing posting call sites to keep working, so that payments,
invoices, purchases, insurance, and payroll continue to record finance correctly.

#### Acceptance Criteria
1. WHEN `postLedgerEntry` is called with the existing income/expense shape THEN the system SHALL
   create a balanced journal entry using the configured default account mappings, preserving the
   function signature.
2. WHEN `reverseLedgerEntry` is called THEN the system SHALL post a reversing journal entry for the
   bridged source, preserving the signature.
3. WHEN the feature ships THEN existing payment, invoice, insurance, purchase, and payroll flows SHALL
   continue to post finance without code changes at their call sites.
4. WHERE legacy `Transaction` / `Account` bucket data exists THEN it SHALL remain readable, and the new
   reports SHALL be derivable going forward from journal entries.
5. The status-quo revenue/expense recording behavior SHALL NOT silently change amounts; only the
   underlying representation becomes double-entry.

### Requirement 9: Access control and audit
**User Story:** As a finance administrator, I want accounting actions gated and audited, so that only
authorized staff act and every action is traceable.

#### Acceptance Criteria
1. WHERE a user lacks the accounting permission for an action (view, post, approve, settings) THEN the
   server SHALL deny it regardless of UI state, failing closed.
2. WHEN a journal entry is posted, an expense is approved/rejected, a period is closed/reopened, or
   settings change THEN the system SHALL write an audit record with the actor and timestamp.
3. WHEN posted entries or approvals are viewed THEN they SHALL be read-only in the audit surface.

### Requirement 10: Non-regression and verification
**User Story:** As a developer, I want the accounting build verified, so that shipping it is safe.

#### Acceptance Criteria
1. WHEN the feature ships THEN `npx tsc --noEmit` SHALL introduce no new errors in touched files.
2. WHEN the test suites run THEN the pure suite and the DB-backed integration suite SHALL be green,
   including new tests for balancing, normal-balance math, approval-chain resolution, and statement
   derivation.
3. WHEN the app is built THEN the accounting routes SHALL compile and render without error.

### Requirement 11: Vendors (accounts payable master)
**User Story:** As an accountant, I want a vendor master that expenses and purchases reference, so
that I can track what we owe and how much we spend per vendor.

#### Acceptance Criteria
1. WHEN a vendor is created THEN it SHALL have a name and MAY have contact details, a default payable
   account, tax/registration id, and payment terms.
2. WHERE an expense or purchase references a vendor THEN the vendor link SHALL be stored on the
   resulting journal entry source so vendor spend can be reported.
3. WHEN a vendor spend report is run for a period THEN it SHALL total posted expense/purchase amounts
   grouped by vendor.
4. WHERE a vendor has referencing transactions THEN the system SHALL NOT hard-delete it; it MAY be
   deactivated instead.
5. WHEN an expense is posted against a payable (not cash) THEN the credit SHALL go to the vendor's
   payable account (or the default A/P account), supporting accounts-payable balances.

### Requirement 12: Budgets (budget vs actual)
**User Story:** As a finance manager, I want to set budgets per account and period, so that I can
compare actual spending against plan and catch overruns.

#### Acceptance Criteria
1. WHEN a budget is defined THEN it SHALL set a budgeted amount for a specific account and fiscal
   period (or year), optionally per department/cost center.
2. WHEN a budget-vs-actual report is run THEN it SHALL show, per budgeted account, the budget, the
   actual from posted entries, and the variance (and variance percentage) for the period.
3. WHERE an expense submission would push an account's actual over its budget for the period THEN the
   system SHALL surface an over-budget warning; whether it blocks or only warns SHALL be configurable
   in settings (default: warn, do not block).
4. WHERE no budget exists for an account/period THEN the report SHALL show actual with no budget
   (not an error) and the over-budget check SHALL be a no-op.
5. WHEN budgets change THEN the change SHALL be recorded in the audit history with the actor.
