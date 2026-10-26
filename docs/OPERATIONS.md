# Medira — Operations Guide

Operational runbook: scheduled jobs, backups, and data retention.

## Scheduled jobs

### Bed-day charge recompute (inpatient billing)
Admitted patients accrue a per-day bed charge on their visit invoice. The charge
is refreshed when the invoice is opened and at discharge. To keep bills current
for long-staying inpatients **without** anyone opening them, run a nightly
recompute.

- Endpoint: `POST /api/jobs/bed-charges` (app route; calls
  `recomputeActiveBedChargesCore()`).
- Auth: shared secret in the `x-cron-key` header, compared to `CRON_SECRET`.
  If `CRON_SECRET` is unset the endpoint is disabled (503).
- **Cron lives in the external `sidgrace-backend` project**, not in this app
  (Next.js has no built-in scheduler). The backend runs the schedule and calls
  this endpoint.
- Schedule: once daily, early morning (after midnight) in the clinic's timezone.

sidgrace-backend cron example:
```
0 1 * * *  curl -fsS -X POST -H "x-cron-key: $CRON_SECRET" https://<app-host>/api/jobs/bed-charges
```

Set the SAME `CRON_SECRET` value in both this app's env and the sidgrace-backend
environment.

## Database

MongoDB connection is configured via `MONGODB_URL` (see `.env.local`), database
name `SidGrace` (`lib/mongoose.ts`).

### Transactions
Multi-document operations (e.g. patient admission) run inside a MongoDB
transaction **when the deployment supports it** (replica set / Atlas). On a
standalone Mongo (common in local dev) the code transparently falls back to
sequential writes — see `lib/helpers/transaction.ts`. **For production, use a
replica set or Atlas** so these operations are truly atomic.

### Backups
Use `mongodump` / `mongorestore`.

Backup (daily, retained):
```
mongodump --uri "$MONGODB_URL" --db SidGrace --archive="backup-$(date +%F).gz" --gzip
```

Restore:
```
mongorestore --uri "$MONGODB_URL" --gzip --archive="backup-YYYY-MM-DD.gz"
```

Recommended policy:
- Nightly full dump; keep 7 daily, 4 weekly, 12 monthly.
- Store encrypted, off the database host (object storage / separate volume).
- Periodically test a restore into a scratch database — an untested backup is
  not a backup.

### Data retention
- Soft-deleted records (`del_flag: true`) and the Trash collection are retained
  for audit; purge on a documented schedule if required by policy.
- The `History` collection is an audit log — retain per your compliance needs;
  do not purge casually.
- Patient and financial records: retain per local healthcare regulations
  (often several years). Confirm the requirement for your jurisdiction before
  deleting anything.

## Secrets
- `MONGODB_URL`, `TOKEN_SECRET_KEY`, `REFRESH_TOKEN_SECRET`, and SMS/Twilio
  credentials live in environment variables (`.env.local`), never committed.
- Rotate the token secrets if a leak is suspected; rotating invalidates all
  active sessions (users must sign in again).

## Error handling & logging
- Server-action failures are recorded durably in the `ErrorLog` collection via
  `lib/helpers/error-log.ts` (best-effort, never masks the original error) in
  addition to stdout. Query recent errors there when diagnosing issues.
- The dashboard has a route-level error boundary
  (`app/(dashboard)/(routes)/dashboard/error.tsx`) that shows a friendly
  recovery screen and distinguishes permission errors from unexpected ones.

## Clinic identity (invoices / receipts)
- Clinic name, address, phone, email and logo URL live on the clinic Settings
  document (`clinic-settings.models.ts`) and are editable via
  `updateClinicSettings` (gated by `accountManagement`).
- The invoice/receipt header reads `clinicName` from settings (falls back to
  "Medira"). Point the storage adapter / settings at your real identity before
  going live.

## Accessibility
Status: baseline review done on primary screens (form inputs have labels,
buttons have text/icons, dialogs use the shared accessible primitives from the
component library). NOT yet validated end-to-end.

Still required before an accessibility claim:
- Manual keyboard-only navigation pass across all flows.
- Screen-reader testing (NVDA/VoiceOver) on OPD, attendance, billing.
- Colour-contrast audit of the teal/cyan palette against WCAG AA.
- Focus-trap verification in all dialogs/sheets.

Full WCAG compliance requires manual testing with assistive technologies and
expert review; this cannot be certified from code review alone.
