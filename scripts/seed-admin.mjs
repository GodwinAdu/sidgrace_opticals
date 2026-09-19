/**
 * Seed an admin Staff user (plus its Role and Department) for local testing.
 *
 * Mirrors how the app works:
 *  - login uses `Staff.findOne({ username })` + bcrypt compare (10 salt rounds),
 *    exactly like `loginStaff` / `_createStaff` in lib/actions/staff.actions.ts.
 *  - the dashboard maps `staff.role` -> permissions, and "admin" is a valid role
 *    (see hooks/dashboard-provider.tsx).
 *  - the app also keeps `Role` and `Department` collections, so we create an
 *    "admin" Role (all permissions on) and an "Administration" Department and
 *    link the admin staff to them, just like `_createRole` / `_createDepartment`
 *    / `_createStaff` would.
 *
 * Usage:
 *   node scripts/seed-admin.mjs
 *   node scripts/seed-admin.mjs --username myadmin --password Secret123 --email me@x.com
 */

import mongoose from "mongoose"
import { hash } from "bcryptjs"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))

// --- tiny .env.local loader (no extra deps) ---------------------------------
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

// --- simple CLI arg parser --------------------------------------------------
function getArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`)
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1]
  return fallback
}

async function main() {
  loadEnv()

  const MONGODB_URL = process.env.MONGODB_URL
  if (!MONGODB_URL) {
    console.error("❌ MONGODB_URL is missing. Set it in .env.local")
    process.exit(1)
  }

  const username = getArg("username", "admin")
  const password = getArg("password", "Admin@1234")
  const email = getArg("email", "admin@sidgracedental.com")
  const fullName = getArg("fullName", "System Administrator")
  const role = getArg("role", "admin")
  const phone = getArg("phone", "+10000000000")

  await mongoose.connect(MONGODB_URL, {
    dbName: "SidGrace", // must match lib/mongoose.ts
    bufferCommands: false,
    serverSelectionTimeoutMS: 100000,
  })
  console.log("✅ Connected to MongoDB (db: SidGrace)")

  // Minimal schema mirroring the required fields of lib/models/staff.models.ts.
  // strict:false lets Mongoose accept the collection's existing shape.
  const StaffSchema = new mongoose.Schema(
    {
      fullName: { type: String, required: true },
      email: { type: String, required: true, unique: true, lowercase: true },
      phone: String,
      role: { type: String, required: true },
      department: String,
      username: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      isActive: { type: Boolean, default: true },
      requirePasswordChange: { type: Boolean, default: false },
      isBanned: { type: Boolean, default: false },
      onLeave: { type: Boolean, default: false },
      del_flag: { type: Boolean, default: false },
      action_type: { type: String, default: "created" },
    },
    { timestamps: true, strict: false }
  )

  const Staff = mongoose.models.Staff || mongoose.model("Staff", StaffSchema, "staffs")

  // --- Department schema (mirrors lib/models/department.models.ts) ----------
  const DepartmentSchema = new mongoose.Schema(
    {
      name: { type: String, required: true, unique: true, trim: true },
      description: { type: String, trim: true },
      head: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", default: null },
      employees: [{ type: mongoose.Schema.Types.ObjectId, ref: "Staff" }],
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Staff", default: null },
      isActive: { type: Boolean, default: true },
      del_flag: { type: Boolean, default: false },
      mod_flag: { type: Boolean, default: false },
      action_type: { type: String, default: "created" },
    },
    { timestamps: true, strict: false }
  )
  const Department =
    mongoose.models.Department || mongoose.model("Department", DepartmentSchema, "departments")

  // --- Role schema (mirrors lib/models/role.models.ts) ----------------------
  // Every permission flag defaults to true so the admin can do everything.
  const PERMISSION_KEYS = [
    "dashboard", "opdManagement", "attendantManagement", "patientManagement",
    "staffManagement", "appointmentManagement", "accountManagement", "salesManagement",
    "messaging", "inventoryManagement", "report", "trash", "history",
    "addOpd", "manageOpd", "viewOpd", "editOpd", "deleteOpd",
    "addAttendance", "manageAttendance", "viewAttendance", "editAttendance", "deleteAttendance",
    "addStaff", "manageStaff", "viewStaff", "editStaff", "deleteStaff",
    "addPatient", "managePatient", "viewPatient", "editPatient", "deletePatient",
    "addAppointment", "manageAppointment", "viewAppointment", "editAppointment", "deleteAppointment",
    "addAccount", "manageAccount", "viewAccount", "editAccount", "deleteAccount",
    "addSales", "manageSales", "viewSales", "editSales", "deleteSales",
    "addInventory", "manageInventory", "viewInventory", "editInventory", "deleteInventory",
    "AccountReport", "inventoryReport", "attendanceReport",
    // dental clinic feature permissions
    "procedureManagement", "dentalChartManagement", "treatmentPlanManagement",
    "clinicalManagement", "billingManagement", "insuranceManagement",
    "recallManagement", "labManagement", "rosterManagement",
    "reportManagement", "branchManagement", "portalAccess",
  ]
  const roleShape = { name: String, displayName: String, description: String }
  for (const k of PERMISSION_KEYS) roleShape[k] = Boolean
  roleShape.createdBy = { type: mongoose.Schema.Types.ObjectId, ref: "Staff", default: null }
  const RoleSchema = new mongoose.Schema(
    { ...roleShape, del_flag: Boolean, mod_flag: Boolean, action_type: String },
    { timestamps: true, versionKey: false, strict: false }
  )
  const Role = mongoose.models.Role || mongoose.model("Role", RoleSchema, "roles")

  // Avoid duplicate staff (login is by username; email/phone are unique too)
  const existing = await Staff.findOne({
    $or: [{ username }, { email: email.toLowerCase() }],
  })
  if (existing) {
    console.log(`⚠️  A staff with username "${existing.username}" / email "${existing.email}" already exists.`)
    console.log(`    _id: ${existing._id}`)
    console.log("    Delete it first or pass a different --username / --email if you want a fresh one.")
    await mongoose.disconnect()
    process.exit(0)
  }

  // 1) Create the admin staff (bcrypt password, same 10 rounds as the app)
  const hashedPassword = await hash(password, 10)
  const admin = await Staff.create({
    fullName,
    email: email.toLowerCase(),
    phone,
    role, // "admin" -> full permissions in hooks/dashboard-provider.tsx
    department: "Administration", // staff.department is a string in the model
    username,
    password: hashedPassword,
    isActive: true,
    requirePasswordChange: false,
    action_type: "created",
  })

  // 2) Create / reuse the "admin" Role with all permissions enabled
  const permissionValues = Object.fromEntries(PERMISSION_KEYS.map((k) => [k, true]))
  let adminRole = await Role.findOne({ name: "admin" })
  if (!adminRole) {
    adminRole = await Role.create({
      name: "admin",
      // IMPORTANT: fetchRole() looks up the Role by `displayName` using the
      // staff.role string, so displayName MUST equal the staff role ("admin").
      displayName: role,
      description: "Full access to all modules and settings",
      ...permissionValues,
      createdBy: admin._id,
      action_type: "create",
    })
    console.log("✅ Created Role: Administrator (all permissions enabled)")
  } else {
    await Role.updateOne({ _id: adminRole._id }, { $set: permissionValues })
    console.log("ℹ️  Role 'admin' already existed — ensured all permissions are enabled")
  }

  // 3) Create / reuse the "Administration" Department and link the admin
  let department = await Department.findOne({ name: "Administration" })
  if (!department) {
    department = await Department.create({
      name: "Administration",
      description: "Administrative and system management",
      head: admin._id,
      employees: [admin._id],
      createdBy: admin._id,
      action_type: "created",
    })
    console.log("✅ Created Department: Administration")
  } else {
    await Department.updateOne(
      { _id: department._id },
      { $addToSet: { employees: admin._id } }
    )
    console.log("ℹ️  Department 'Administration' already existed — added admin to employees")
  }

  console.log("\n🎉 Admin user created successfully!")
  console.log("──────────────────────────────────────")
  console.log(`  Staff _id:   ${admin._id}`)
  console.log(`  Username:    ${username}`)
  console.log(`  Password:    ${password}`)
  console.log(`  Email:       ${email}`)
  console.log(`  Role:        ${role}  (Role doc _id: ${adminRole._id})`)
  console.log(`  Department:  Administration  (_id: ${department._id})`)
  console.log("──────────────────────────────────────")
  console.log("Log in at /sign-in using the username and password above.\n")

  await mongoose.disconnect()
  process.exit(0)
}

main().catch(async (err) => {
  console.error("❌ Seed failed:", err)
  try {
    await mongoose.disconnect()
  } catch {}
  process.exit(1)
})
