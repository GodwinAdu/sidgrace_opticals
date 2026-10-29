# Dapfam Dental Clinic: rebuild the host PC after a Windows reinstall

Follow these steps in order. They bring back the full local setup: the app,
the local database, auto-start, network access for other PCs, and receipt
printing on the Xprinter.

What lives where:

| Thing | Where it is kept | Survives Windows reinstall? |
|---|---|---|
| App code | GitHub `GodwinAdu/sidgrace_opticals` (`main`) | Yes |
| Online database (Vercel) | MongoDB Atlas | Yes (not on this PC) |
| Local clinic database | This PC | **No, back it up (Part A)** |
| `.env.local` (secrets, printer IP) | This PC only, never on GitHub | **No, back it up (Part A)** |

---

## Part A: BEFORE you wipe Windows

1. **Back up the local database.** In the project folder:
   ```powershell
   node scripts/backup-db.mjs
   ```
   This creates `Desktop\dapfam-db-backup-<date>` containing every collection.
2. **Back up `.env.local`.** Copy the project's `.env.local` into that same
   backup folder (name it `env.local.BACKUP`).
3. **Copy the whole backup folder to a USB drive** (or Google Drive). The
   Desktop gets erased, so it must leave this PC.
4. Also copy `Downloads\atlas-credentials.env` to the USB (online database login).
5. Make sure GitHub is up to date: `git status` should say
   *"Your branch is up to date with 'origin/main'"* and nothing to commit.
6. Write down:
   - Host PC Ethernet MAC: `DC:FE:07:05:5C:FF` (normally 192.168.1.214)
   - Printer MAC: `00-61-7B-FB-41-E5` (normally 192.168.1.158, port 9100)

---

## Part B: Install Windows

1. Use an **official Windows 11 image** from microsoft.com/software-download/windows11.
   (The old install was a modified pre-release build with printing removed;
   don't reuse it.)
2. Create a user account that is an **Administrator**, and remember its password.
3. After setup, run **Windows Update** until there's nothing left to install, then reboot.
4. Quick check that printing works again (Administrator PowerShell):
   ```powershell
   Get-Service Spooler
   ```
   It should say `Running`.

---

## Part C: Install the software (needs admin)

Download and install each one, accepting the defaults:

| Software | Where | Notes |
|---|---|---|
| Visual C++ Redistributable (x64) | https://aka.ms/vs/17/release/vc_redist.x64.exe | Native modules need it |
| Git | https://git-scm.com/download/win | |
| Node.js **22 LTS** | https://nodejs.org | Use the `.msi` |
| MongoDB **Community Server 8.0** | https://www.mongodb.com/try/download/community | Choose **"Install as a Service"** (the default) |
| Google Chrome | https://www.google.com/chrome | The app opens in a Chrome app window |

You can also use winget in an Administrator PowerShell:
```powershell
winget install Microsoft.VCRedist.2015+.x64
winget install Git.Git
winget install OpenJS.NodeJS.LTS
winget install MongoDB.Server
winget install Google.Chrome
```

**Close and reopen PowerShell** so `git`, `node` and `npm` are on the PATH, then check:
```powershell
node -v      # v22.x
git --version
Get-Service MongoDB   # Running
```

---

## Part D: Get the code and settings back

1. Clone the project. A folder outside the Desktop keeps the code out of sight:
   ```powershell
   mkdir C:\Dapfam
   cd C:\Dapfam
   git clone https://github.com/GodwinAdu/sidgrace_opticals.git
   cd sidgrace_opticals
   ```
   GitHub may ask you to sign in. Use your browser login, or a **new**
   Personal Access Token (revoke any old token that was shared).
2. Copy `env.local.BACKUP` from the USB into `C:\Dapfam\sidgrace_opticals`
   and **rename it to `.env.local`**.
3. Open `.env.local` and confirm these values:
   ```
   MONGODB_URL=mongodb://127.0.0.1:27017
   COOKIE_SECURE=false
   PRINTER_IP=192.168.1.158
   PRINTER_PORT=9100
   ```
   (`TOKEN_SECRET_KEY` and `REFRESH_TOKEN_SECRET` must be the same as before,
   or existing logins will need to sign in again. That's harmless.)

---

## Part E: Run the setup script

From `C:\Dapfam\sidgrace_opticals` in PowerShell (replace the backup path with
your USB folder):
```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-host.ps1 -RestoreFrom "E:\dapfam-db-backup-XXXX" -OpenFirewall
```

It checks Node, `.env.local` and MongoDB, runs `npm install` and `npm run build`,
restores the database, creates the **Dapfam Dental Clinic** shortcut on the
Desktop and in Startup (auto-start at login), and opens firewall port 3000
(approve the UAC prompt).

If you have **no backup**, leave out `-RestoreFrom` and create the admin login:
```powershell
node scripts/seed-admin.mjs
```
Login: `admin` / `Admin@1234`. Change it after the first login.

---

## Part F: Test everything

1. Double-click **Dapfam Dental Clinic** on the Desktop. The app opens in its own window.
2. Log in with your existing account (restored data keeps all users).
3. Open **Billing → Invoices**, open any invoice and click **Print Receipt**.
   The receipt should print on the Xprinter.
4. Printer-only test, without the app:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\print-receipt-test.ps1
   ```

---

## Part G: Network (other PCs and the printer)

1. Find the host's IP: `ipconfig` (Ethernet → IPv4). It should be `192.168.1.214`.
2. **Recommended:** in the router (`http://192.168.1.1`) add DHCP reservations
   so addresses never change:
   - `DC:FE:07:05:5C:FF` → `192.168.1.214` (host PC)
   - `00-61-7B-FB-41-E5` → `192.168.1.158` (printer)
3. If the host IP changed, re-run `scripts\install-client-shortcut.cmd http://<new-ip>:3000`
   on each client PC.
4. If the printer IP changed:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\find-printer.ps1
   ```
   Then put the new IP in `PRINTER_IP` in `.env.local` and restart the app
   (sign out of Windows and back in, or reboot).

The printer itself keeps its settings (DHCP on). Don't reset it.
A Windows reinstall does **not** affect the printer. Only Part H below is needed
if the printer is new, was factory-reset, or stops showing a `192.168.1.x` IP.

---

## Part H: Xprinter XP-E200L receipt printer

### How printing works

The app does **not** use Windows printing, a driver, or USB. The server sends
raw ESC/POS commands straight to the printer over the network
(`PRINTER_IP:9100`, see `lib/clinical/escpos-receipt.ts` and
`app/api/print-receipt/route.ts`). So you don't need to install any Xprinter
driver or the CD software. The printer just has to be on the same network as
the host PC.

Printer facts (from its self-test):

| Setting | Value |
|---|---|
| Model | Xprinter XP-E200L, 80mm (72mm print width), auto-cutter |
| Interface | USB + Ethernet |
| MAC address | `00-61-7B-FB-41-E5` |
| Factory network settings | IP `192.168.123.100`, gateway `192.168.123.1`, **DHCP disabled** |
| Our working settings | **DHCP enabled**, gets `192.168.1.158` from the router, port `9100` |

### Print a self-test (to see the printer's current IP)

1. Turn the printer **off**.
2. Hold the **FEED** button and turn the printer **on**, keeping FEED held
   until it starts printing.
3. The slip shows `IP address`, `Gateway` and `Net DHCP`.
   - Gateway `192.168.1.1` and an IP like `192.168.1.x` means it's already
     set up. Go to "Point the app at the printer".
   - IP `192.168.123.100` with DHCP **Disabled** means it's at factory settings.
     Do "Put the printer on the network" first.

### Put the printer on the network (only if it's at factory settings)

The printer's factory IP (`192.168.123.100`) is on a different network from
ours (`192.168.1.x`), so it can't be reached until it's switched to DHCP. Do
this from a **spare laptop**, not the host PC. Changing the host's IP knocks it
off the clinic network.

1. On the spare laptop, turn **Wi-Fi off**.
2. Connect a network cable **directly from the laptop to the printer's Ethernet port**.
3. On the laptop, open **Command Prompt as administrator** and give it a
   temporary address on the printer's network:
   ```
   netsh interface ip set address name="Ethernet" static 192.168.123.50 255.255.255.0
   ```
   (If the adapter isn't called "Ethernet", find its name with
   `netsh interface show interface`.)
4. Open a browser on the laptop and go to **http://192.168.123.100**
   (type `http://`, not https). If it asks for a login, try leaving it blank
   or `admin` / `admin`.
5. In the network/TCP-IP settings, set **DHCP = Enabled** and **Save**.
6. Put the laptop back to normal:
   ```
   netsh interface ip set address name="Ethernet" dhcp
   ```
7. Unplug the printer from the laptop, **plug it into the clinic router**
   (the same router as the host PC), then turn the printer **off and on**.
8. Print a self-test again. It should now show gateway `192.168.1.1` and a
   `192.168.1.x` IP.

### Point the app at the printer

1. Put the printer's IP from the self-test in `.env.local`:
   ```
   PRINTER_IP=192.168.1.158
   PRINTER_PORT=9100
   ```
2. Test the printer directly (no app needed):
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\print-receipt-test.ps1 -Ip 192.168.1.158
   ```
   A slip headed **DAPFAM DENTAL CLINIC** should print and cut.
3. Restart the app (reboot, or sign out and back in) so it picks up the new
   `PRINTER_IP`.
4. In the app: **Billing → Invoices → open an invoice → Print Receipt**.
   Pharmacy POS also has a **Print Receipt** button.
5. In the router, reserve `00-61-7B-FB-41-E5` → `192.168.1.158` so the IP
   never changes (Part G).

If you can't find the printer's IP, this scans the clinic network for its
MAC address and port 9100:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\find-printer.ps1
```

If the app shows **"Printer unreachable — using browser print"**, the printer
is off, unplugged, or its IP changed. Check the cable and link light, print a
self-test, and update `PRINTER_IP`.

---

## Updating the app later

```powershell
cd C:\Dapfam\sidgrace_opticals
git pull
npm install --legacy-peer-deps
npm run build
```
Then restart the app (reboot, or sign out and back in).

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `node` / `git` not recognized | Close and reopen PowerShell after installing |
| Setup says MongoDB not running | `Start-Service MongoDB` (admin), or reinstall MongoDB as a service |
| Build error `not a valid Win32 application` / `.node` module | Install the VC++ Redistributable, delete `node_modules`, run setup again |
| Other PCs keep loading forever | Firewall: run `scripts\allow-network-access.cmd` and approve UAC |
| Login works on host but not on other PCs | `.env.local` must have `COOKIE_SECURE=false` (LAN uses plain HTTP) |
| "Printer unreachable" toast | Check the printer is on and cabled to the router; run `find-printer.ps1`; update `PRINTER_IP` |
| Restore says SKIP | That collection already has data. Add `--drop` to replace it: `node scripts/restore-db.mjs <folder> --drop` |
