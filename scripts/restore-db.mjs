/**
 * Restore a backup made by backup-db.mjs into the local "SidGrace" database.
 *
 * Usage:
 *   node scripts/restore-db.mjs <backup-folder>
 *   node scripts/restore-db.mjs <backup-folder> --drop   (replace existing data)
 *
 * Without --drop it refuses to touch a collection that already has documents,
 * so you can't accidentally duplicate or overwrite data.
 */
import { MongoClient, BSON } from "mongodb"
import { readFileSync, readdirSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const { EJSON } = BSON
const __dirname = dirname(fileURLToPath(import.meta.url))

for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(join(__dirname, "..", file), "utf8").split(/\r?\n/)) {
      const t = line.trim(); if (!t || t.startsWith("#")) continue
      const eq = t.indexOf("="); if (eq === -1) continue
      const k = t.slice(0, eq).trim(); const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "")
      if (!(k in process.env)) process.env[k] = v
    }
  } catch {}
}

const dir = process.argv[2]
const drop = process.argv.includes("--drop")
if (!dir || !existsSync(dir)) {
  console.error("Usage: node scripts/restore-db.mjs <backup-folder> [--drop]")
  process.exit(1)
}

const url = process.env.MONGODB_URL || "mongodb://127.0.0.1:27017"
const client = new MongoClient(url, { serverSelectionTimeoutMS: 10000 })
await client.connect()
const db = client.db("SidGrace")

const files = readdirSync(dir).filter((f) => f.endsWith(".json") && !f.startsWith("_"))
for (const file of files) {
  const name = file.replace(/\.json$/, "")
  const docs = EJSON.parse(readFileSync(join(dir, file), "utf8"), { relaxed: false })
  const col = db.collection(name)
  const existing = await col.countDocuments()

  if (existing > 0 && !drop) {
    console.log(`  SKIP ${name.padEnd(28)} (already has ${existing} docs; use --drop to replace)`)
    continue
  }
  if (drop) await col.deleteMany({})
  if (docs.length) await col.insertMany(docs)
  console.log(`  OK   ${name.padEnd(28)} ${docs.length}`)
}

console.log("Restore complete.")
await client.close()
