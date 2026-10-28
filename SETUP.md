# SidGrace — Local Setup (Online & Offline)

This is a **Next.js 16** server application backed by **MongoDB**. It runs entirely on
the client's own machine, so it works **offline** (no internet required for day-to-day
use). Internet is only needed for the optional **SMS reminders** feature (Twilio).

> **What "offline" means here:** the app is a server process + a local database running
> on the client's computer. As long as both are running on that machine, the whole app
> works with the network cable unplugged. It is **not** a browser-only PWA — there is no
> service worker or offline browser cache.

| Feature | Works offline? | Notes |
|---|---|---|
| Patients, appointments, accounting, inventory, clinical, etc. | ✅ Yes | Uses the local MongoDB |
| Login / authentication | ✅ Yes | Fully local (JWT) |
| SMS reminders (Twilio) | ❌ No | Needs internet + a Twilio account; app runs fine without it |

---

## 1. Prerequisites

Install these on the client's machine:

1. **Node.js 20 or newer** — <https://nodejs.org> (tested on Node 24).
   This must include `npm`. If the machine only has `pnpm`, that works too — just swap
   `npm` for `pnpm` in the commands below.
2. **MongoDB Community Server** — <https://www.mongodb.com/try/download/community>
   - Install it to run **as a service** so it starts automatically with the computer.
   - This local database is what makes the app work offline.
   - Optional: install **MongoDB Compass** (GUI) to browse the data.

Verify MongoDB is running (default port `27017`):

```bash
# macOS/Linux
mongosh --eval "db.runCommand({ ping: 1 })"
```

---

## 2. Install dependencies

From the project folder:

```bash
npm install
# or: pnpm install
```

---

## 3. Create the environment file  ⚠️ required before building

Create a file named **`.env.local`** in the project root. **The build (`npm run build`)
will FAIL if this file is missing**, because some pages read the database at build time.

```ini
# --- Database (local = offline) ---
# Database name "SidGrace" is appended automatically by the app; do not add it here.
MONGODB_URL=mongodb://127.0.0.1:27017

# --- Auth secrets (generate your own — see command below) ---
TOKEN_SECRET_KEY=REPLACE_WITH_RANDOM_STRING_1
REFRESH_TOKEN_SECRET=REPLACE_WITH_RANDOM_STRING_2

# --- The app's own URL (used for internal SMS calls) ---
NEXT_PUBLIC_API_URL=http://localhost:3000/api/

# --- Twilio SMS (OPTIONAL) ---
# Leave blank for offline use. Fill in to enable SMS when internet is available.
TWILO_SID=
TWILO_AUTH_TOKEN=
TWILO_NUMBER=
```

Generate the two secrets (run twice, paste one value into each):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 4. Create the first admin login

A seed script creates an admin user, role, and department:

```bash
node scripts/seed-admin.mjs
```

Default credentials created (override with flags if you want):

- **Username:** `admin`
- **Password:** `Admin@1234`

Override example:

```bash
node scripts/seed-admin.mjs --username myadmin --password "StrongPass123" --email admin@clinic.com
```

The script prints the final credentials when it finishes. **Change the default password
after the first login.**

> Optional: `node scripts/seed-demo.mjs` loads demo/sample data for testing.

---

## 5. Build and run (production — recommended for the client)

```bash
npm run build
npm start
```

Open <http://localhost:3000> and log in at **`/sign-in`** with the admin credentials
from step 4.

> For development/testing instead, use `npm run dev` (slower, auto-reloads on edits).

---

## 6. Online vs offline

### Offline / local-only (default)
Follow steps 1–5. Everything except SMS works with **no internet**. Leave the three
`TWILO_*` values blank — the app detects they're missing and simply skips sending SMS.

### Online — reachable from other devices on the clinic network
1. Find the host machine's LAN IP (e.g. `192.168.1.50`).
2. Start the server bound to all interfaces:
   ```bash
   npm start -- -H 0.0.0.0
   ```
3. Other devices on the same network open `http://192.168.1.50:3000`.
4. If SMS is used, set `NEXT_PUBLIC_API_URL=http://192.168.1.50:3000/api/` and rebuild.

### Enabling SMS reminders
Fill in `TWILO_SID`, `TWILO_AUTH_TOKEN`, `TWILO_NUMBER` (from the Twilio console),
make sure `NEXT_PUBLIC_API_URL` points at the running server, then **rebuild**:

```bash
npm run build && npm start
```

No code changes are needed — the feature activates once the credentials are present.

---

## 7. Keep it running automatically (recommended for a client machine)

Use **PM2** so the app restarts on crash and on reboot:

```bash
npm install -g pm2
pm2 start "npm start" --name sidgrace
pm2 startup      # run the command it prints, to enable start-on-boot
pm2 save
```

- View logs: `pm2 logs sidgrace`
- Restart: `pm2 restart sidgrace`
- Stop: `pm2 stop sidgrace`

---

## 8. Back up the data

Because all data lives in the local MongoDB, set up regular backups so records aren't lost:

```bash
# Create a dated backup
mongodump --uri="mongodb://127.0.0.1:27017" --db=SidGrace --out="backup-$(date +%Y%m%d)"

# Restore from a backup
mongorestore --uri="mongodb://127.0.0.1:27017" --db=SidGrace "backup-YYYYMMDD/SidGrace"
```

Schedule `mongodump` (cron on macOS/Linux, Task Scheduler on Windows) for automatic backups.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `MONGODB_URL IS MISSING` during `npm run build` | `.env.local` is missing or `MONGODB_URL` is empty. Create it (step 3) before building. |
| App loads but every page errors | MongoDB isn't running. Start the MongoDB service and confirm with `mongosh`. |
| Can't log in / no users | Run the seed script (step 4). |
| SMS not sending | Expected offline. To enable, fill the `TWILO_*` values, point `NEXT_PUBLIC_API_URL` at the server, and rebuild. |
| Other devices can't reach it | Start with `-H 0.0.0.0` and open the host's port 3000 in its firewall. |
