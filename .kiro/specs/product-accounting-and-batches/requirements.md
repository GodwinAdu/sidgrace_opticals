# Requirements Document

## Introduction

Today an Inventory product (`lib/models/inventory-product.models.ts`) carries only a scalar `quantity`,
pricing, and optional drug fields. Purchases post a single hardcoded expense to the double-entry ledger
(`inventory-purchase.actions.ts` → `postLedgerEntry({ type: "expense", category: "Dental Supplies", ... })`),
there is no link between a product and the Chart of Accounts, and there is no expiry/batch tracking.

This feature introduces three capabilities on top of the existing product record, without losing any
existing data or changing any recorded monetary amount for already-posted activity:

1. **Per-product account linking** — each product may link to its own Inventory asset, Revenue, and
   COGS accounts in the Chart of Accounts (`chart-account.models.ts`). These links drive how purchases
   and sales post to the ledger. All three links are optional and fall back to the global defaults in
   `AccountingSettings.defaultAccounts`.
2. **Full inventory accounting** — a PURCHASE debits the product's Inventory asset account (not a
   hardcoded expense) and credits Accounts Payable / Cash. A SALE credits the product's Revenue account
   and moves cost from the Inventory asset account to the COGS account. Posting remains best-effort and
   never blocks the inventory/sale save, consistent with the existing bridge posture.
3. **Batch / lot tracking with expiry** — a product owns many batches (lot number, expiry, quantity,
   plus optional manufacture date, cost, supplier, received-at). `product.quantity` becomes the sum of
   its batch quantities. This enables near-expiry and expired-stock reporting and a dispense guard.
   Additional optional pharmacy fields (generic name, manufacturer, barcode/SKU, storage conditions,
   controlled/scheduled flag) are also added.

The guiding principle: existing products, existing purchase JournalEntry ids, and existing recorded
amounts are preserved; new behavior is additive and degrades gracefully (fallback to defaults, skip
posting rather than block, treat legacy quantity as an opening batch).

## Glossary

- **Product**: An `InventoryProduct` document in `lib/models/inventory-product.models.ts`.
- **Batch**: A lot of a Product with its own `batchNumber`, `expiryDate`, and `quantity`; a Product owns many Batches.
- **COA**: Chart of Accounts — `ChartAccount` documents, each with a `code`, `type`, and `normalBalance`.
- **Inventory_Account**: The asset `ChartAccount` representing stock the clinic owns; a purchase debits it.
- **Revenue_Account**: The revenue `ChartAccount` a sale credits.
- **COGS_Account**: The expense `ChartAccount` (cost of goods sold) a sale debits when cost leaves inventory.
- **Account_Settings**: The singleton `AccountingSettings` document; `defaultAccounts` maps `inventory`, `revenue`, `expense`, `cash`, `accountsPayable`, etc. to COA `code`s.
- **Bridge**: The posting helpers `postLedgerEntry` / `reverseLedgerEntry` in `lib/actions/accounting/bridge.actions.ts` that write/reverse a balanced `JournalEntry`.
- **JE**: `JournalEntry` — the double-entry record the Bridge posts.
- **FEFO**: First-Expiry-First-Out — the batch depletion order (earliest `expiryDate` consumed first).
- **Legacy_Quantity**: The scalar `quantity` on a Product created before this feature, with no batches.
- **Near_Expiry_Threshold**: A configurable number of days (default 90) within which a non-expired batch is flagged as near-expiry.
- **Inventory_System**: The product/batch/purchase server-action layer (gated by `inventoryManagement`).
- **Accounting_System**: The accounting read + posting layer (reads gated by `accountingManagement`).

## Requirements

### Requirement 1: Link a product to its Chart-of-Accounts accounts

**User Story:** As an inventory manager, I want to link a product to its inventory, revenue, and COGS accounts, so that purchases and sales of that product post to the correct ledger accounts.

#### Acceptance Criteria

1. WHERE a product is created or updated, THE Inventory_System SHALL accept an optional Inventory_Account reference, an optional Revenue_Account reference, and an optional COGS_Account reference.
2. WHEN an account reference is provided for a product, THE Inventory_System SHALL persist that reference on the product record.
3. IF a provided Inventory_Account reference resolves to a ChartAccount whose `type` is not `asset`, THEN THE Inventory_System SHALL reject the save and return a validation error identifying the account field.
4. IF a provided Revenue_Account reference resolves to a ChartAccount whose `type` is not `revenue`, THEN THE Inventory_System SHALL reject the save and return a validation error identifying the account field.
5. IF a provided COGS_Account reference resolves to a ChartAccount whose `type` is not `expense`, THEN THE Inventory_System SHALL reject the save and return a validation error identifying the account field.
6. IF a provided account reference does not resolve to an active, non-deleted ChartAccount, THEN THE Inventory_System SHALL reject the save and return a validation error identifying the account field.
7. WHERE a product account reference is left blank, THE Inventory_System SHALL persist that link as null.

### Requirement 2: Resolve posting accounts with product-then-default fallback

**User Story:** As an accountant, I want product postings to use the product's linked accounts when set and the global defaults otherwise, so that every product posts somewhere sensible without per-product configuration.

#### Acceptance Criteria

1. WHEN the Inventory_System determines the Inventory_Account for a posting, THE Inventory_System SHALL use the product's linked Inventory_Account IF it is set, OTHERWISE the ChartAccount matching Account_Settings `defaultAccounts.inventory`.
2. WHEN the Inventory_System determines the Revenue_Account for a posting, THE Inventory_System SHALL use the product's linked Revenue_Account IF it is set, OTHERWISE the ChartAccount matching Account_Settings `defaultAccounts.revenue`.
3. WHEN the Inventory_System determines the COGS_Account for a posting, THE Inventory_System SHALL use the product's linked COGS_Account IF it is set, OTHERWISE the ChartAccount matching Account_Settings `defaultAccounts.expense`.
4. IF neither a product link nor the corresponding Account_Settings default resolves to an active ChartAccount, THEN THE Inventory_System SHALL skip the affected ledger posting, log the skip, and complete the inventory operation without raising an error.

### Requirement 3: Purchase posts as an inventory asset debit

**User Story:** As an accountant, I want a purchase to increase the inventory asset and the payable/cash side rather than booking an immediate expense, so that stock on hand is reflected on the balance sheet until it is sold.

#### Acceptance Criteria

1. WHEN a purchase is created with a positive monetary total, THE Inventory_System SHALL post a balanced JE that debits each purchased product's resolved Inventory_Account and credits the payable/cash side for the same total.
2. THE Inventory_System SHALL resolve the credit side of a purchase posting from Account_Settings `defaultAccounts.accountsPayable` when a supplier is recorded, OTHERWISE from Account_Settings `defaultAccounts.cash`.
3. THE Inventory_System SHALL NOT post the purchase as a hardcoded `"Dental Supplies"` operating expense.
4. WHEN a purchase JE is posted, THE Inventory_System SHALL store the returned JE id on the purchase record so the posting can be reversed later.
5. WHEN a purchase is deleted or reversed and a JE id is stored on the purchase, THE Inventory_System SHALL reverse that JE via the Bridge.
6. IF the resolved Inventory_Account or credit account is unavailable, THEN THE Inventory_System SHALL skip the purchase posting and complete the purchase without raising an error.
7. THE Inventory_System SHALL record the same monetary total on the JE as the computed purchase total (quantity × (purchasePrice − discount), floored at zero per line).

### Requirement 4: Sale posts revenue and moves cost to COGS

**User Story:** As an accountant, I want a sale to recognize revenue and move the item's cost from inventory to COGS, so that profit and inventory valuation are both correct.

#### Acceptance Criteria

1. WHEN a product is sold with a positive sale amount, THE Accounting_System SHALL post a balanced JE that credits the product's resolved Revenue_Account and debits the resolved cash/receivable side for the sale amount.
2. WHEN a product is sold, THE Accounting_System SHALL post a balanced JE that debits the product's resolved COGS_Account and credits the product's resolved Inventory_Account for the cost-of-goods amount.
3. THE Accounting_System SHALL compute the cost-of-goods amount from the depleted batches' `costPerUnit` when batch cost is available, OTHERWISE from the product `purchasePrice`.
4. IF the resolved Revenue_Account, COGS_Account, or Inventory_Account is unavailable, THEN THE Accounting_System SHALL skip the affected side of the sale posting and complete the sale without raising an error.
5. THE Accounting_System SHALL post the revenue recognition and the cost move as balanced entries that preserve the recorded sale and cost amounts.

### Requirement 5: Batch and lot tracking

**User Story:** As a pharmacy manager, I want each product to track its stock as batches with lot numbers and expiry dates, so that I can manage stock by lot and expiry.

#### Acceptance Criteria

1. THE Inventory_System SHALL represent a product's stock as a collection of Batches, each with a `batchNumber`, an `expiryDate`, and a non-negative `quantity`.
2. WHERE a batch is created, THE Inventory_System SHALL accept optional `manufactureDate`, `costPerUnit`, `supplierId`, and `receivedAt` values.
3. THE Inventory_System SHALL expose a capability to list the batches of a product.
4. WHEN a batch quantity is created or updated, THE Inventory_System SHALL reject a negative batch quantity and return a validation error.
5. IF a batch `expiryDate` is earlier than its `manufactureDate` when both are provided, THEN THE Inventory_System SHALL reject the batch and return a validation error.

### Requirement 6: Product quantity equals the sum of batch quantities

**User Story:** As an inventory manager, I want a product's on-hand quantity to always equal the total of its batches, so that stock figures are internally consistent.

#### Acceptance Criteria

1. WHEN any batch of a product is created, updated, or depleted, THE Inventory_System SHALL set the product's `quantity` to the sum of its batches' quantities.
2. WHEN a purchase adds stock for a product, THE Inventory_System SHALL add a new batch or increment an existing matching batch rather than only incrementing the scalar quantity.
3. WHEN stock for a product is dispensed or sold, THE Inventory_System SHALL decrement batch quantities in FEFO order, consuming the batch with the earliest non-expired `expiryDate` first.
4. IF a dispense or sale requests more units than the product's total batch quantity, THEN THE Inventory_System SHALL reject the operation and return an insufficient-stock error.

### Requirement 7: Legacy quantity coexistence and migration

**User Story:** As a maintainer, I want existing products that have a scalar quantity and no batches to keep working, so that this feature introduces no data loss.

#### Acceptance Criteria

1. WHERE a product has a positive Legacy_Quantity and no batches, THE Inventory_System SHALL treat that quantity as a single opening batch with no expiry when batch-aware operations run against it.
2. WHEN an opening batch is derived from a Legacy_Quantity, THE Inventory_System SHALL preserve the product's existing total quantity.
3. THE Inventory_System SHALL continue to read and display existing products that have no account links and no batches without error.
4. THE Inventory_System SHALL preserve existing purchase records and their stored JE ids so previously posted purchases remain reversible.

### Requirement 8: Expiry reporting and dispense guard

**User Story:** As a pharmacy manager, I want to see near-expiry and expired stock and be stopped from dispensing expired lots, so that patients never receive expired medication.

#### Acceptance Criteria

1. THE Inventory_System SHALL expose a capability that lists batches whose `expiryDate` is in the past as expired.
2. WHERE a Near_Expiry_Threshold is configured, THE Inventory_System SHALL list batches whose `expiryDate` falls within that threshold from the current date and is not in the past as near-expiry.
3. WHERE no Near_Expiry_Threshold is configured, THE Inventory_System SHALL apply a default threshold of 90 days.
4. IF a dispense or sale would consume units from a batch whose `expiryDate` is in the past, THEN THE Inventory_System SHALL block that consumption and return an expired-stock error.
5. THE Inventory_System SHALL exclude expired batches from the quantity available for FEFO depletion.

### Requirement 9: Additional pharmacy and product fields

**User Story:** As a pharmacy manager, I want to record generic name, manufacturer, barcode, storage conditions, and whether a product is a controlled drug, so that I can manage medications accurately.

#### Acceptance Criteria

1. WHERE a product is created or updated, THE Inventory_System SHALL accept optional `genericName`, `manufacturer`, `barcode`, `storageConditions`, and `controlledSubstance` values.
2. THE Inventory_System SHALL default `controlledSubstance` to false when it is not provided.
3. THE Inventory_System SHALL retain the existing optional drug fields `isDrug`, `strength`, `form`, `unit`, `reorderLevel`, and `prescriptionRequired`.
4. WHERE a product's `isDrug` is false, THE product form SHALL hide the drug-specific fields, matching the existing conditional-reveal pattern in `ProductForm.tsx`.
5. WHERE a product's `isDrug` is true, THE product form SHALL reveal the drug-specific fields for entry.

### Requirement 10: Permissions

**User Story:** As a security administrator, I want product, batch, and account-link operations to respect the existing permission model, so that only authorized users change inventory and read accounting data.

#### Acceptance Criteria

1. THE Inventory_System SHALL gate product and batch create, update, and delete operations behind the `inventoryManagement` permission via `withAuth`.
2. WHERE a user lacks `accountingManagement`, THE Accounting_System SHALL NOT return the Chart-of-Accounts list used to select product account links.
3. WHEN the Bridge posts or reverses a product-driven JE from within an inventory operation, THE Inventory_System SHALL perform that posting as a best-effort internal call that is not blocked by accounting permissions.
