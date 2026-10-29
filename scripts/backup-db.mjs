/**
 * Export every collection of the local "SidGrace" database to EJSON files.
 *
 * EJSON keeps MongoDB types (ObjectId, Date, etc.) so the restore is exact.
 * Use this BEFORE reinstalling Windows / moving to a new machine.
 *
 * Usage:
 *   node scripts/backup-db.mjs                 -> Desktop\dapfam-db-backup-<timestamp>
 *   node scripts/backup-db.mjs D:\my-backup    -> custom folder
 *
 * Restore with: node scripts/restore-db.mjs <folder>
 */
import { MongoClient, BSON } from "mongodb"
import { mkdirSync, writeFileSync, readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { homedir } from "node:os"
import { fileURLToPath } from "node:url"

const { EJSON } = BSON
const __dirname = dirname(fileURLToPath(import.meta.url))

// Load MONGODB_URL from .env.local if not set
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

const url = process.env.MONGODB_URL || "mongodb://127.0.0.1:27017"
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
const outDir = process.argv[2] || join(homedir(), "Desktop", `dapfam-db-backup-${stamp}`)

const client = new MongoClient(url, { serverSelectionTimeoutMS: 10000 })
await client.connect()
const db = client.db("SidGrace")

mkdirSync(outDir, { recursive: true })
const collections = await db.listCollections({}, { nameOnly: true }).toArray()
const summary = {}

for (const { name } of collections) {
  if (name.startsWith("system.")) continue
  const docs = await db.collection(name).find({}).toArray()
  writeFileSync(join(outDir, `${name}.json`), EJSON.stringify(docs, { relaxed: false }))
  summary[name] = docs.length
}

writeFileSync(join(outDir, "_manifest.json"), JSON.stringify({ database: "SidGrace", createdAt: new Date().toISOString(), collections: summary }, null, 2))

console.log(`Backup written to: ${outDir}`)
for (const [k, v] of Object.entries(summary)) console.log(`  ${k.padEnd(28)} ${v}`)
await client.close()
