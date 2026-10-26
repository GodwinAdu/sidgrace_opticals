/**
 * Historical-data diagnostic for the legacy ledger retirement.
 *
 * READ-ONLY one-off report. It counts the legacy `Transaction` documents and
 * splits them into:
 *   - total                 : every legacy Transaction row (del_flag ignored)
 *   - with journalEntryId   : created AFTER the bridge landed — their economic
 *                             effect is ALREADY in the double-entry ledger
 *                             (JournalEntry), so the legacy row is redundant.
 *   - without journalEntryId: pre-bridge history — NOT represented in the
 *                             ledger. The clinic may want to archive/export
 *                             these before any future cleanup.
 *
 * This surfaces the numbers so the clinic can decide to archive/export. It
 * NEVER writes, updates, deletes, or drops the collection (design D4: we never
 * drop a collection in code).
 *
 * Mirrors the app's DB access (see lib/mongoose.ts `connectToDB`): same
 * MONGODB_URL, same `dbName: "SidGrace"`. The legacy Transaction model
 * (lib/models/transaction.models.ts) stores rows in the "transactions"
 * collection, which is what we read here.
 *
 * Usage:
 *   node scripts/legacy-transaction-diagnostic.mjs
 */

import mongoose from "mongoose"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))

// --- tiny .env.local loader (no extra deps; same approach as seed-admin.mjs) -
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const raw = readFileSync(join(__dirname, "..", file), "utf8")
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith("#")) continue
        const eq = trimmed.indexOf("=")
        if (eq === -1) continue
        const key = trimmed.slice(0, eq).trim()
        let value = trimmed.slice(eq + 1).trim()
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1)
        }
        if (!(key in process.env)) process.env[key] = value
      }
    } catch {
      // file may not exist; ignore
    }
  }
}

async function main() {
  loadEnv()

  const MONGODB_URL = process.env.MONGODB_URL
  if (!MONGODB_URL) {
    console.error("❌ MONGODB_URL is missing. Set it in .env.local")
    process.exit(1)
  }

  // Same connection settings as lib/mongoose.ts `connectToDB`.
  await mongoose.connect(MONGODB_URL, {
    dbName: "SidGrace",
    bufferCommands: false,
    serverSelectionTimeoutMS: 100000,
  })
  console.log("✅ Connected to MongoDB (db: SidGrace)\n")

  // READ ONLY: raw collection handle, count queries only. No model is created,
  // nothing is written, updated, deleted, or dropped.
  const transactions = mongoose.connection.collection("transactions")

  // "WITH journalEntryId" = the field exists and is a real (non-null) value.
  const withJournalEntryFilter = {
    journalEntryId: { $exists: true, $ne: null },
  }
  // "WITHOUT journalEntryId" = pre-bridge history (missing OR explicitly null).
  const withoutJournalEntryFilter = {
    $or: [{ journalEntryId: { $exists: false } }, { journalEntryId: null }],
  }

  const [total, withJournalEntry, withoutJournalEntry] = await Promise.all([
    transactions.countDocuments({}),
    transactions.countDocuments(withJournalEntryFilter),
    transactions.countDocuments(withoutJournalEntryFilter),
  ])

  console.log("Legacy Transaction diagnostic (READ ONLY — nothing modified)")
  console.log("────────────────────────────────────────────────────────────")
  console.log(`  Total legacy Transaction rows           : ${total}`)
  console.log(`  WITH journalEntryId (already in ledger)  : ${withJournalEntry}`)
  console.log(`  WITHOUT journalEntryId (pre-bridge)      : ${withoutJournalEntry}`)
  console.log("────────────────────────────────────────────────────────────")

  // Sanity line so the two buckets visibly sum to the total.
  if (withJournalEntry + withoutJournalEntry !== total) {
    console.log(
      `  ⚠️  Buckets (${withJournalEntry} + ${withoutJournalEntry} = ` +
        `${withJournalEntry + withoutJournalEntry}) do not sum to total (${total}).`
    )
  }

  console.log("")
  if (total === 0) {
    console.log("No legacy Transaction rows found — nothing to archive or export.")
  } else {
    console.log(
      "Rows WITH a journalEntryId are already represented in the double-entry\n" +
        "ledger (JournalEntry); removing the legacy row loses nothing financial.\n" +
        "Rows WITHOUT a journalEntryId are pre-bridge history — archive/export\n" +
        "them before any future cleanup. This script does NOT drop the collection."
    )
  }
  console.log("")

  await mongoose.disconnect()
  process.exit(0)
}

main().catch(async (err) => {
  console.error("❌ Diagnostic failed:", err)
  try {
    await mongoose.disconnect()
  } catch {}
  process.exit(1)
})
