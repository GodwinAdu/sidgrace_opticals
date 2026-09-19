/**
 * Seeds a realistic demo dataset that flows through the whole pipeline so the
 * app demonstrably works end-to-end:
 *   procedures -> patients -> appointments -> invoice -> payment (posts income
 *   to the ledger + Clinic Revenue account) -> an expense -> recalls.
 *
 * Mirrors the app's own logic (auto invoice numbers, ledger posting, balance
 * updates). Idempotent-ish: skips creating if demo patients already exist.
 *
 * Usage: node scripts/seed-demo.mjs
 */
import mongoose from "mongoose"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
for (const file of [".env.local", ".env"]) {
  try {
    const raw = readFileSync(join(__dirname, "..", file), "utf8")
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim(); if (!t || t.startsWith("#")) continue
      const eq = t.indexOf("="); if (eq === -1) continue
      const k = t.slice(0, eq).trim(); const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "")
      if (!(k in process.env)) process.env[k] = v
    }
  } catch {}
}

await mongoose.connect(process.env.MONGODB_URL, { dbName: "SidGrace", bufferCommands: false })
const db = mongoose.connection.db
const oid = () => new mongoose.Types.ObjectId()
const now = new Date()
const daysAgo = (n) => new Date(now.getTime() - n * 864e5)

const admin = await db.collection("staffs").findOne({ username: "admin" })
const adminId = admin?._id || oid()

// Guard: skip if we already seeded demo patients
const existing = await db.collection("patients").countDocuments({ patientId: /^DEMO-/ })
if (existing > 0) {
  console.log(`Demo data already present (${existing} demo patients). Nothing to do.`)
  await mongoose.disconnect(); process.exit(0)
}

const audit = { mod_flag: false, del_flag: false, action_type: "created", createdBy: adminId, createdAt: now, updatedAt: now }

// 1) Procedures
const procs = [
  { code: "D0120", name: "Periodic oral evaluation", category: "Preventive", defaultDuration: 30, price: 60 },
  { code: "D1110", name: "Prophylaxis (cleaning) - adult", category: "Preventive", defaultDuration: 45, price: 120 },
  { code: "D2140", name: "Amalgam filling - one surface", category: "Restorative", defaultDuration: 40, price: 180 },
  { code: "D2740", name: "Crown - porcelain/ceramic", category: "Restorative", defaultDuration: 90, price: 1100 },
  { code: "D7140", name: "Extraction - erupted tooth", category: "Surgical", defaultDuration: 45, price: 220 },
].map((p) => ({ _id: oid(), ...p, isActive: true, ...audit }))
await db.collection("procedures").insertMany(procs)

// 2) Patients
const names = ["Ama Owusu", "Kwame Mensah", "Efua Boateng", "Yaw Darko", "Adjoa Asante", "Kofi Antwi"]
const patients = names.map((fullName, i) => ({
  _id: oid(),
  fullName,
  patientId: `DEMO-${String(i + 1).padStart(4, "0")}`,
  dob: `19${70 + i}-0${(i % 9) + 1}-15`,
  gender: i % 2 === 0 ? "female" : "male",
  phone: `+23324${String(1000000 + i).slice(0, 7)}`,
  status: "active",
  lastVisit: daysAgo(i * 3),
  originalId: 1000 + i,
  createdAt: daysAgo(i * 4),
  updatedAt: now,
}))
await db.collection("patients").insertMany(patients)

// 3) Appointments
const apptTypes = ["examination", "consultation", "procedure", "followup"]
const apptStatuses = ["scheduled", "completed", "completed", "no-show", "cancelled"]
const appts = patients.flatMap((p, i) => ([
  {
    _id: oid(), patientId: p._id, date: daysAgo(i), timeSlot: `${9 + (i % 6)}:00`,
    appointmentType: apptTypes[i % apptTypes.length], duration: 30, priority: "normal",
    status: apptStatuses[i % apptStatuses.length], createdAt: daysAgo(i), updatedAt: now,
  },
]))
await db.collection("appointments").insertMany(appts)

// 4) Ledger account (Clinic Revenue) — created lazily by app; we create it here
let revenue = await db.collection("accounts").findOne({ accountName: "Clinic Revenue" })
if (!revenue) {
  const doc = { _id: oid(), accountName: "Clinic Revenue", balance: 0, deposits: [], expenses: [], ...audit }
  await db.collection("accounts").insertOne(doc); revenue = doc
}
let opex = await db.collection("accounts").findOne({ accountName: "Operating Expenses" })
if (!opex) {
  const doc = { _id: oid(), accountName: "Operating Expenses", balance: 0, deposits: [], expenses: [], ...audit }
  await db.collection("accounts").insertOne(doc); opex = doc
}

// 5) Invoices + payments + ledger income (mirrors invoice.actions + payment.actions + transaction posting)
const year = now.getFullYear()
let invoiceSeq = 0
let revenueBalance = 0
const transactions = []
const invoices = []
const payments = []

for (let i = 0; i < patients.length; i++) {
  const p = patients[i]
  const proc = procs[i % procs.length]
  const qty = 1
  const unit = proc.price
  const subtotal = unit * qty
  const tax = 0
  const discount = 0
  const total = subtotal + tax - discount
  // pay full for even index, half for odd (partial), first one unpaid
  const paid = i === 0 ? 0 : (i % 2 === 0 ? total : Math.round(total / 2))
  const balance = Math.max(0, total - paid)
  const status = paid <= 0 ? "unpaid" : balance <= 0 ? "paid" : "partial"
  invoiceSeq++
  const invId = oid()
  invoices.push({
    _id: invId,
    invoiceNumber: `INV-${year}-${String(invoiceSeq).padStart(5, "0")}`,
    patientId: p._id,
    items: [{ description: `${proc.code} — ${proc.name}`, procedureId: proc._id, quantity: qty, unitPrice: unit, amount: subtotal }],
    subtotal, tax, discount, total, amountPaid: paid, balance, status,
    notes: "", ...audit, createdAt: daysAgo(i * 2), updatedAt: now,
  })

  if (paid > 0) {
    const payId = oid()
    payments.push({
      _id: payId, patientId: p._id, invoiceId: invId, amount: paid,
      method: i % 3 === 0 ? "cash" : i % 3 === 1 ? "card" : "mobile-money",
      reference: `RCPT-${1000 + i}`, receivedBy: adminId, ...audit, createdAt: daysAgo(i * 2), updatedAt: now,
    })
    // ledger income posting
    const txId = oid()
    transactions.push({
      _id: txId, type: "income", category: "Procedure", amount: paid,
      accountId: revenue._id, accountName: "Clinic Revenue", date: daysAgo(i * 2),
      description: "Patient payment", method: payments[payments.length - 1].method,
      source: "payment", sourceId: payId, patientId: p._id, ...audit,
    })
    revenueBalance += paid
    await db.collection("accounts").updateOne({ _id: revenue._id }, { $addToSet: { deposits: txId } })
  }
}
if (invoices.length) await db.collection("invoices").insertMany(invoices)
if (payments.length) await db.collection("payments").insertMany(payments)

// 6) Expenses (ledger)
const expenses = [
  { category: "Salaries", amount: 3200, date: daysAgo(10) },
  { category: "Rent", amount: 1500, date: daysAgo(8) },
  { category: "Dental Supplies", amount: 640, date: daysAgo(5) },
  { category: "Utilities", amount: 280, date: daysAgo(3) },
]
let opexBalance = 0
for (const e of expenses) {
  const txId = oid()
  transactions.push({
    _id: txId, type: "expense", category: e.category, amount: e.amount,
    accountId: opex._id, accountName: "Operating Expenses", date: e.date,
    description: `${e.category} payment`, source: "manual", ...audit,
  })
  opexBalance += e.amount
  await db.collection("accounts").updateOne({ _id: opex._id }, { $addToSet: { expenses: txId } })
}
if (transactions.length) await db.collection("transactions").insertMany(transactions)

// Update account balances
await db.collection("accounts").updateOne({ _id: revenue._id }, { $set: { balance: revenueBalance } })
await db.collection("accounts").updateOne({ _id: opex._id }, { $set: { balance: Math.max(0, opexBalance) } })

// 7) Recalls
const recalls = patients.slice(0, 4).map((p, i) => ({
  _id: oid(), patientId: p._id, type: "6-month checkup", dueDate: daysAgo(-(7 + i * 5)),
  status: "pending", ...audit,
}))
await db.collection("recalls").insertMany(recalls)

const income = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0)
const expense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0)

console.log("🎉 Demo data seeded:")
console.log(`  Procedures:   ${procs.length}`)
console.log(`  Patients:     ${patients.length}`)
console.log(`  Appointments: ${appts.length}`)
console.log(`  Invoices:     ${invoices.length}`)
console.log(`  Payments:     ${payments.length}`)
console.log(`  Transactions: ${transactions.length} (income ${income}, expense ${expense}, net ${income - expense})`)
console.log(`  Recalls:      ${recalls.length}`)
console.log(`  Clinic Revenue balance: ${revenueBalance}`)

await mongoose.disconnect()
process.exit(0)
