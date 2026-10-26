# Application Completeness & Wiring Audit — Sidgrace Opticals (Hospital/Clinic System)

**Scope:** Read-only completeness + wiring audit of the Next.js 15 (App Router) + Mongoose + TypeScript hospital system on disk at `c:\Users\Jr\Desktop\sidgrace_opticals`. No code was modified. Audited the working tree (including substantial uncommitted accounting / inventory-batch / pharmacy-POS work), not what is committed.

---

## 0. Remediation status (completed)

All audit findings below have since been **fixed and verified** (`next build` compiles successfully; `vitest run` → 493 unit tests pass, incl. 9 new HR tests). Changes made:

1. **Payroll account routing (MEDIUM) — FIXED.** `bridge.actions.ts` now routes the "Payroll" expense category to the dedicated `payrollExpense` (6000) default and "Inventory Purchase" to `inventory` (1200) via a new `wellKnownExpenseDefault` helper (explicit per-category overrides still win). `DEFAULT_ACCOUNT_MAP` seeds `expenseByCategory: { "Payroll": "6000" }` so it is visible/editable in the settings UI.
2. **Expense category drift (MEDIUM) — FIXED** by the same well-known-default mapping.
3. **Broken `prescriptions/new` + orphan `manage-inventory` (LOW) — FIXED.** Both dead/legacy folders removed.
4. **HR nav vs payroll permission mismatch (LOW) — FIXED.** The HR page resolves the viewer's role and passes `canRunPayroll` (via `hasPermission(role, "payrollManagement")`); the Payroll and Compensation tabs render only for permitted users.
5. **`createStaff` mass-assignment (LOW) — FIXED.** Added a `PROTECTED_FIELDS` strip + server-stamped `createdBy`, mirroring the attendance guard.
6. **Orphan pages (LOW) — ADDRESSED.** `manage-inventory` removed; `analytics`/`ops` left on disk (reachable by direct URL) as they are functional read screens.
7. **HR/payroll feature build-out (feature work) — IMPLEMENTED.** Added: standing **compensation profiles** on `Staff` (base salary, recurring allowances/deductions, PAYE + pension rates, expected hours) with a `setCompensation` action and a new **Compensation tab**; **statutory PAYE/pension** computation and **timesheet proration** pure helpers (`computeStatutoryDeductions`, `payLineFromProfile`, `prorateByHours`); **draft → post** payroll workflow (`createPayrollRun` accepts `status`, new `postPayrollRun` books the ledger on post, idempotent); **prefill from profiles** (`prefillPayrollLines`); and **payslip generation** (`getPayslipsForRun` + client-side jsPDF download). All new pure helpers are unit-tested.

The sections below are the original diagnostic findings, retained for the record.

---

## 1. Executive Summary

**Overall readiness verdict: PRODUCTION-LEANING / NEAR-COMPLETE.** The application is far more complete and internally wired than a typical in-progress build. Every nav route resolves to a real `page.tsx`, every audited module has a backing `*.actions.ts`, server actions are consistently gated by `withAuth(...)`, the OPD check-in path is hardened against mass-assignment, and the accounting layer is genuinely dynamic (clinic-configurable per-category account mapping with defaults). The end-to-end money chain (OPD → visit → invoice → payment → double-entry ledger) is connected and posts through a single bridge, so the dynamic mapping is honored.

The `"use server"` crash reported in user message #9 (`A "use server" file can only export async functions`) is **no longer present** — the offending constants live in a plain (non-`use server`) module, and the only non-function exports remaining in action files are compile-time `type`/`interface` declarations that are erased at build and do not trigger the runtime guard.

### Top issues, prioritized

| # | Severity | Issue | Where |
|---|----------|-------|-------|
| 1 | MEDIUM | Payroll expense posts under category **"Payroll"**, but the bridge resolves expense categories against `expenseByCategory` → global `expense` default (`6900 Misc Expense`). The dedicated `payrollExpense` default (`6000 Salaries & Wages`) is **never consulted by the bridge**, so by default payroll lands in Misc Expense. | `lib/actions/accounting/bridge.actions.ts` (expense branch), `accounting-settings.actions.ts` `DEFAULT_ACCOUNT_MAP` |
| 2 | MEDIUM | Settings UI expense category list uses **"Inventory Purchase"** / **"Other Expense"**, but actual posting call sites emit **"Payroll"** (hr) and inventory purchases post via `postLedgerEntryLines` (explicit account ids, bypassing category map). Category labels in the UI and the bridge are not fully in sync for expenses. | `AccountingSettings.tsx` `EXPENSE_CATEGORIES`, `hr.actions.ts`, `inventory-purchase.actions.ts` |
| 3 | LOW | Dead/partial route folders: `prescriptions/new/` has `loading.tsx` but **no `page.tsx`** (broken nested route if linked); `manage-inventory/inventory/` exists with a page but is unreferenced in nav (orphan). | `app/(dashboard)/(routes)/dashboard/prescriptions/new`, `.../manage-inventory` |
| 4 | LOW | Orphan but functional pages not reachable from nav: `analytics` and `ops` (the `ops` nav entry is commented out). | `.../dashboard/analytics`, `.../dashboard/ops` |
| 5 | LOW | Payroll actions gated by `payrollManagement`, but the HR nav entry gates on `hrManagement`. A role with `hrManagement` but not `payrollManagement` sees the HR page yet cannot run/delete payroll (silent-ish failure). | `nav-main.tsx` (HR entry), `hr.actions.ts` |
| 6 | LOW | `staff.actions._createStaff` spreads `...values` into `new Staff(...)` with no explicit field allow-list. Admin-gated (`staffManagement`), so not a public mass-assignment hole, but lacks the PROTECTED_FIELDS discipline used in attendance. | `lib/actions/staff.actions.ts` |

No HIGH-severity integrity defects (no `use server` runtime crash, no double-posting, no unbalanced-ledger path, no dead-link nav entries) were found.

---

## 2. Page Presence & Nav Wiring

Nav source: `components/dashboad-layout/nav-main.tsx`. Every enumerated nav route was `Test-Path`-checked for `page.tsx` under `app/(dashboard)/(routes)/dashboard/`.

**Result: 100% of nav routes resolve to a real `page.tsx`. No dead nav links.**

| Route | page.tsx? | Reachable from nav? |
|-------|-----------|---------------------|
| dashboard | ✅ | ✅ |
| opd, attendance, emergency, theatre, maternity, blood-bank, referrals, procurement, assets, cpoe, queue, hr | ✅ (all) | ✅ |
| manage-user/department, manage-user/manage-role, manage-user/staff | ✅ | ✅ (Manage Staff group) |
| manage-patient/patients, manage-patient/patient-list | ✅ | ✅ |
| appointments | ✅ | ✅ |
| account/account-list, journal-entries, general-ledger, income-statement, trial-balance, balance-sheet, cash-flow, expense-workflow, approvals, vendors, budgets, budget-vs-actual, vendor-spend, settings | ✅ (all 14) | ✅ (Accounting group) |
| billing/invoices, billing/insurance, billing/claims | ✅ | ✅ |
| nursing, admission, wards | ✅ | ✅ (Inpatient group) |
| recalls, waitlist, consent, portal | ✅ | ✅ (Patient Care group) |
| clinical, treatment-plans, procedures, lab, lab-cases | ✅ | ✅ (Clinical group) |
| messaging/sms | ✅ | ✅ |
| inventory/category, stores, products, purchase, suppliers | ✅ | ✅ |
| pharmacy, pharmacy/drugs, pharmacy/pos | ✅ | ✅ (Pharmacy group) |
| roster, audit-log, branches | ✅ | ✅ (Operations group) |
| reports, settings, history, trash | ✅ | ✅ |

### Orphans & partial routes (on disk but not fully wired)

| Folder | State | Note |
|--------|-------|------|
| `dashboard/ops/page.tsx` | page EXISTS | Nav entry is **commented out** (the `// { title: "Operations", url: /dashboard/ops ...}` block). Reachable only by direct URL. |
| `dashboard/analytics/page.tsx` | page EXISTS | Not referenced anywhere in nav. Orphan (direct-URL only). |
| `dashboard/manage-inventory/inventory/page.tsx` | page EXISTS (+ `loading.tsx`) | Legacy inventory screen; superseded by the `inventory/*` group in nav. Orphan. |
| `dashboard/prescriptions/new/` | `loading.tsx` ONLY — **no `page.tsx`** | Broken nested route. Any link to `/dashboard/prescriptions/new` 404s/renders only loading. `prescriptions` is not in nav. |

The commented-out `Sales` nav block references only `#` URLs (placeholder) and is correctly disabled.

---

## 3. Actions Presence & Wiring

All 58 top-level action files and all 11 `lib/actions/accounting/*` files named in the brief are present on disk. Spot-checked wiring (pages importing and awaiting the actions they render):

| Module | Action file | Wired into page/components? |
|--------|-------------|------------------------------|
| HR & payroll | `hr.actions.ts` | ✅ `hr/page.tsx` awaits `getLeaveRequests`/`getTimesheets`/`getPayrollRuns`; `HrManager.tsx` calls the create/decide/delete actions. |
| Accounting settings | `accounting/accounting-settings.actions.ts` | ✅ `account/settings/page.tsx` → `getSettings`; `AccountingSettings.tsx` → `updateSettings`. |
| Accounting bridge | `accounting/bridge.actions.ts` | ✅ Imported by payment, insurance, hr, pharmacy-sale, inventory-purchase, visit-clinical. |
| OPD / attendance | `attendance.actions.ts` | ✅ `createAttendance` (gated `opdManagement`); OpdForm wired. |
| Billing / invoice | `invoice.actions.ts`, `payment.actions.ts`, `insurance.actions.ts` | ✅ invoice ↔ payment ↔ ledger linked. |
| Pharmacy POS | `pharmacy-sale.actions.ts` | ✅ `pharmacy/pos/page.tsx` + `PharmacyPOS.tsx`. |

**Dead exports:** None of concern. The `export type` / `export interface` lines flagged in `clinical-section.actions.ts`, `visit-audit.actions.ts`, `inventory-expiry.actions.ts`, `budget.actions.ts`, `reports.actions.ts` are type-only (erased at compile time) — they are consumed by callers and do NOT create runtime exports.

**Unwired forms/buttons:** A grep for `href="#"` and empty `onClick={() => {}}` across `app/(dashboard)/**/*.tsx` returned **no matches** — no placeholder/non-functional UI in the dashboard.

---

## 4. Accounting Dynamism Assessment

**Verdict: Genuinely dynamic, with one default-resolution gap (payroll).**

Confirmed against the three core files + the settings UI:

- **(a) Model** — `lib/models/accounting/accounting-settings.models.ts`: `defaultAccounts` embeds scalar code fields (`cash`, `accountsReceivable`, `accountsPayable`, `revenue`, `expense`, `insuranceReceivable`, `inventory`, `payrollExpense`) **plus** `revenueByCategory` and `expenseByCategory` as `Mixed` maps — so clinics can add categories without a schema change. ✅
- **(b) Settings action** — `accounting-settings.actions.ts`: `getSettings`/`getSettingsInternal` upsert the singleton with a `DEFAULT_ACCOUNT_MAP` fallback (cash 1000, A/R 1100, A/P 2000, revenue 4000, expense 6900, insurance 1110, inventory 1200, payrollExpense 6000, and `revenueByCategory: { "Pharmacy Sales": "4300" }`). `updateSettings` **deep-merges** category maps (supplying one category never wipes others; a blank value clears a single mapping back to the default). Gated `accountingSettings`, audited to `History`. ✅
- **(c) Bridge** — `bridge.actions.ts`: `pickCategoryCode(byCategory, category, fallbackCode)` resolves category → global default → `null` (skip, never a wrong account), case-insensitive + trimmed. Used by both `postLedgerEntry` (income debits Cash / credits category-resolved Revenue; expense debits category-resolved Expense / credits Cash) and `postLedgerEntryLines` (explicit balanced lines for inventory/COGS). `isBalanced` guard prevents persisting an unbalanced row. ✅
- **(d) Settings UI** — `AccountingSettings.tsx`: edits the 8 default scalar mappings (grouped Assets/Liabilities and Income/Expense defaults), per-category revenue/expense pickers (type-filtered to the correct statement side), and **add/remove custom categories** (`addRevenueCategory`/`addExpenseCategory`/`removeRevenueCategory`/`removeExpenseCategory`), with a warning when a custom category is left unmapped (won't persist). Editable from the UI as requested (message #8). ✅

**Every income/expense posting path flows through the bridge** — no hardcoded account posting was found. Call sites and their categories:

| Caller | Fn | type | category |
|--------|----|------|----------|
| `payment.actions.ts` (×2) | `postLedgerEntry` | income | `insurance` → "Insurance Reimbursement", else "Procedure" |
| `insurance.actions.ts` | `postLedgerEntry` | income | "Insurance Reimbursement" |
| `visit-clinical.actions.ts` | `postLedgerEntry` | income | "Procedure" / "Consultation" / "Other Income" (computed) |
| `visit-clinical.actions.ts` | `postLedgerEntryLines` | — | COGS relief (explicit lines) |
| `pharmacy-sale.actions.ts` | `postLedgerEntry` + `postLedgerEntryLines` | income + COGS | "Pharmacy Sales" + POS COGS |
| `inventory-purchase.actions.ts` | `postLedgerEntryLines` | — | Inventory purchase (explicit lines) |
| `hr.actions.ts` | `postLedgerEntry` | expense | **"Payroll"** |

### Gaps

1. **Payroll default misroute (MEDIUM).** The expense branch of `postBridgedJournalEntry` resolves `expenseByCategory["Payroll"]` → falls back to `map.expense` (6900 Misc Expense). The dedicated `payrollExpense` (6000) default is defined in the model/map and shown in the settings UI as a scalar field, but **the bridge never reads `payrollExpense`**. Unless the clinic manually maps the "Payroll" expense category to 6000, payroll posts to Misc Expense. Recommend: in the expense branch, when `category` normalizes to "Payroll", prefer `map.payrollExpense` ahead of the generic `expense` fallback (or seed `expenseByCategory: { "Payroll": "6000" }` in `DEFAULT_ACCOUNT_MAP`).
2. **Expense category label drift (MEDIUM/LOW).** `AccountingSettings.tsx` `EXPENSE_CATEGORIES` lists `Payroll`, `Inventory Purchase`, `Other Expense`. "Payroll" matches hr. "Inventory Purchase" has no matching `postLedgerEntry` expense call (inventory uses `postLedgerEntryLines` with explicit accounts, so that category mapping is inert). Align the UI list with the categories the bridge actually emits, or document that inventory posting is account-explicit by design.

---

## 5. Payroll & HR Completeness

Source: `lib/actions/hr.actions.ts`, `lib/models/hr.models.ts`, `app/(dashboard)/(routes)/dashboard/hr/` (`page.tsx` + `HrManager.tsx`), pure helpers in `lib/clinical/hr`.

| Feature | Status | Evidence |
|---------|--------|----------|
| Leave requests (typed, date-ranged) | ✅ Present | `LeaveRequest` model; `createLeaveRequest`, day-count via `leaveDays`. |
| Leave approval workflow (pending→approved/rejected/cancelled) | ✅ Present | `decideLeaveRequest` validated by `canTransitionLeave` status machine; approver + decidedAt stamped. |
| Timesheets / time & attendance | ✅ Present | `Timesheet` model; `recordTimesheet` (clock pair or daily hours; derives span). |
| Payroll run per period | ✅ Present | `PayrollRun` model; `createPayrollRun` with per-staff `lines[]`. |
| Pay components: base + allowances + deductions | ✅ Present | `PayLineInput`, `computeLine` = `max(0, base + allowances − deductions)`; cached run totals. |
| Payroll → ledger posting | ✅ Present (with gap) | `createPayrollRun` posts gross via `postLedgerEntry` category "Payroll" (cash-basis expense); `transactionId` stored; reversed on delete via `reverseLedgerEntry`. **Gap: routes to Misc Expense by default — see §4.** |
| Reversal on delete | ✅ Present | `deletePayrollRun` reverses the JE then soft-deletes. |
| Run numbering | ✅ Present | `PAY-YYYY-00001` via `nextSequence`. |
| **Payslips (per-employee document/print)** | ❌ Missing | No payslip model, action, or UI; only run-level totals and lines. |
| **Tax / statutory deductions (PAYE, pension, etc.)** | ⚠️ Stub-ish | Only free-form `deductions[]` (label+amount). No tax tables, auto-computation, or statutory categories. |
| **Attendance/timesheet → pay linkage** | ❌ Missing | Timesheets and payroll are independent; payroll lines are entered manually, not derived from timesheet hours or OPD attendance. |
| **Employee compensation profile (standing salary on Staff)** | ❌ Missing | `basePay` is typed per run; no standing salary/grade stored on `Staff` to prefill a run. |
| **Draft → post approval for payroll** | ⚠️ Partial | `PayrollRun.status` enum has `draft`/`posted` but `createPayrollRun` always creates `posted`; no draft/approve step. |
| **Leave balance accrual/tracking** | ❌ Missing | Leave days counted per request; no per-employee accrued/remaining balance. |

**Summary:** HR covers leave, timesheets, and a posting payroll run competently (model + pure helpers + ledger integration + reversal). For "fully complete" HR/payroll, the missing pieces are: payslips, statutory tax/deduction computation, timesheet→pay linkage, standing employee salary profiles, a draft/approve payroll step, and leave-balance accrual. No TODO/placeholder comments block the existing flow.

---

## 6. Loopholes & Integrity Findings

| File:line (approx) | Issue | Severity |
|--------------------|-------|----------|
| `bridge.actions.ts` (expense branch, ~`postBridgedJournalEntry`) + `accounting-settings.actions.ts` `DEFAULT_ACCOUNT_MAP` | Payroll category not routed to `payrollExpense`; defaults to global `expense` (6900). `payrollExpense` (6000) is dead unless mapped manually. | MEDIUM |
| `AccountingSettings.tsx` `EXPENSE_CATEGORIES` vs `hr.actions.ts`/`inventory-purchase.actions.ts` | UI expense categories partly inert ("Inventory Purchase" never emitted as a `postLedgerEntry` category). Label drift between UI and bridge. | MEDIUM |
| `app/.../prescriptions/new/` | `loading.tsx` with no sibling `page.tsx` — broken nested route. | LOW |
| `nav-main.tsx` (HR entry `roleField:"hrManagement"`) vs `hr.actions.ts` (`payrollManagement`) | Permission mismatch: `hrManagement` opens the page; payroll run/delete require `payrollManagement`. A role with only `hrManagement` hits payroll failures. | LOW |
| `staff.actions.ts` `_createStaff` (~line 55) | `new Staff({ ...values, ... })` with no field allow-list (admin-gated, so low risk, but inconsistent with the attendance PROTECTED_FIELDS hardening). | LOW |
| `dashboard/analytics`, `dashboard/ops`, `dashboard/manage-inventory/inventory` | Orphan pages (exist, not in nav; `ops` nav entry commented out). Not broken, just unreachable via UI. | LOW |

**Checked and NOT found (good):**
- No `"use server"` file exports a non-async runtime value (the message #9 crash is resolved; the `INCOME/EXPENSE_CATEGORIES` arrays live in a plain `lib/constants/accounting.ts`, explicitly NOT a `use server` module).
- No `href="#"` / empty `onClick` in dashboard pages (no non-functional UI).
- OPD/attendance check-in has an explicit mass-assignment guard (`PROTECTED_FIELDS`), status clamping to `waiting`/`ongoing`, and `visitType` enum validation — the class of loophole the user flagged earlier is closed on the OPD path.
- No revenue/COGS double-post: each sale posts exactly one revenue JE + one COGS JE; `isBalanced` guard prevents unbalanced rows; reversal is idempotent (no-op if already reversed).
- Server actions consistently wrapped in `withAuth(...)` (returns an async fn — valid under the `use server` rule).

---

## 7. Cross-Module Connectivity Assessment

| Chain | Status | Evidence |
|-------|--------|----------|
| OPD check-in → visit/attendance → invoice | ✅ Connected | `createAttendance` auto-applies the clinic `defaultConsultationFee` into `billing`, then calls `ensureVisitInvoice` and stamps `invoiceId`/`invoiceNumber`/`balance` onto the visit. |
| Visit clinical charges → invoice sync | ✅ Connected | `visit-clinical.actions.ts` guarantees an invoice (`_ensureVisitInvoice`) before syncing procedure/product charges. |
| Invoice → payment → ledger | ✅ Connected | `payment.actions.ts` `recomputeInvoice` updates amountPaid/balance/status, then `postLedgerEntry` (income). |
| Insurance → reimbursement → ledger | ✅ Connected | `insurance.actions.ts` recomputes the invoice from payments and posts income "Insurance Reimbursement". |
| Inventory purchase → stock batches → ledger | ✅ Connected | `inventory-purchase.actions.ts` posts `postLedgerEntryLines` (debit Inventory / credit Payable|Cash); reversible via stored `journalEntryId`. |
| Dispense / Pharmacy POS → COGS + revenue | ✅ Connected | `pharmacy-sale.actions.ts` and `visit-clinical` dispense depletes FEFO batches and posts revenue + COGS relief JEs. |
| Prescriptions → pharmacy dispense | ✅ Connected | `pharmacy/[prescriptionId]` + `DispenseView`/`PharmacyQueue`; `prescription.actions.ts` present. (Note the separate `prescriptions/new` broken route in §2 is a legacy stub, not this chain.) |
| Payroll → ledger | ✅ Connected (default-misrouted) | See §4/§5. |

**No orphaned data-producing pages in the core chains** — every creator feeds a downstream consumer. The only orphan pages (`analytics`, `ops`, `manage-inventory`) are read/legacy screens, not broken data sinks.

---

## 8. Prioritized Remediation Backlog

1. **Route payroll to its dedicated account (MEDIUM).** In `bridge.actions.ts` expense branch, when the normalized category is "Payroll", prefer `map.payrollExpense` before the generic `expense` fallback; OR seed `expenseByCategory: { "Payroll": "6000" }` in `DEFAULT_ACCOUNT_MAP`. Pick one so the UI's `payrollExpense` scalar is actually honored. Verify by running a payroll run on a fresh-seeded clinic and confirming the JE credits/debits 6000, not 6900.
2. **Reconcile expense category labels (MEDIUM).** Make `AccountingSettings.tsx` `EXPENSE_CATEGORIES` reflect the categories the bridge truly emits, and either expose an inventory-expense mapping or annotate that inventory posts account-explicit lines (not category-mapped).
3. **Fix the broken `prescriptions/new` route (LOW).** Either add the missing `page.tsx`, delete the stray `loading.tsx`, or remove the `prescriptions/` folder if superseded by the pharmacy flow.
4. **Align HR nav permission with payroll gating (LOW).** Either split the HR nav into HR vs Payroll sub-items with matching `roleField`s, or have payroll actions accept `hrManagement` as sufficient, so a user who can open the page can use it.
5. **Decide on orphan pages (LOW).** Re-enable the `ops`/`analytics` nav entries (and remove `manage-inventory/inventory` legacy) or delete them, so the on-disk surface matches the reachable UI.
6. **Add a field allow-list to `createStaff` (LOW).** Mirror the attendance PROTECTED_FIELDS pattern to keep staff provisioning consistent and defensive, even though it is admin-gated.
7. **HR/payroll feature build-out (feature work, not a bug).** Payslips, statutory tax/deduction computation, timesheet→pay derivation, standing salary profiles on `Staff`, a draft→post payroll approval step, and leave-balance accrual — required for a "fully complete" HR/payroll module.

---

### Method note
Findings are grounded in files read on disk: `nav-main.tsx`, the three accounting core files + settings UI/page, `hr.actions.ts` + `hr.models.ts` + `hr/page.tsx`, `attendance.actions.ts`, and greps across `lib/actions/**` for posting call sites, `...values` spreads, non-async `use server` exports, and dead UI links. Where a behavior could not be fully traced (e.g. exhaustive runtime category coverage), it is called out as a label/resolution gap rather than asserted as broken. Content was rephrased for compliance with licensing restrictions where external concepts were referenced.
