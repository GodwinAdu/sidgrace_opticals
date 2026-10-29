<#
  Dapfam Dental Clinic - one-shot HOST setup for a fresh Windows machine.

  Run this AFTER you have:
    1. Installed Node.js 22 LTS, MongoDB Community Server, and Git.
    2. Cloned the repo and put your .env.local back in the project root.
  (Full steps: docs/REINSTALL-GUIDE.md)

  What it does:
    - Checks Node/npm and that MongoDB is reachable on 127.0.0.1:27017
    - npm install + npm run build (production build)
    - Optionally restores the clinic database from a backup folder
    - Installs the Dapfam icon and creates "Dapfam Dental Clinic" shortcuts on
      the Desktop and in Startup (auto-launch at login, no console window)
    - Optionally opens Windows Firewall port 3000 so other PCs can connect

  Usage (PowerShell, from the project folder):
    powershell -ExecutionPolicy Bypass -File scripts\setup-host.ps1
    powershell -ExecutionPolicy Bypass -File scripts\setup-host.ps1 -RestoreFrom "E:\dapfam-db-backup-..."
    powershell -ExecutionPolicy Bypass -File scripts\setup-host.ps1 -OpenFirewall
  Switches: -SkipInstall  -SkipBuild  -RestoreFrom <folder>  -OpenFirewall
#>
param(
    [switch]$SkipInstall,
    [switch]$SkipBuild,
    [string]$RestoreFrom,
    [switch]$OpenFirewall
)

$ErrorActionPreference = "Stop"
function Say($m, $c = "Gray") { Write-Host $m -ForegroundColor $c }
function Step($m) { Write-Host ""; Write-Host "==> $m" -ForegroundColor Cyan }

$ProjectDir = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectDir
Say "Project: $ProjectDir"

# ---------------------------------------------------------------- 1. Node
Step "Checking Node.js"
$NodeDir = @((Join-Path $env:ProgramFiles "nodejs"), (Join-Path $env:LOCALAPPDATA "nodejs")) |
    Where-Object { Test-Path (Join-Path $_ "node.exe") } | Select-Object -First 1
if (-not $NodeDir) {
    $c = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($c) { $NodeDir = Split-Path -Parent $c.Source }
}
if (-not $NodeDir) { Say "Node.js not found. Install Node.js 22 LTS from https://nodejs.org then re-run." "Red"; exit 1 }
$env:Path = "$NodeDir;$env:Path"
Say ("node " + (& node -v) + "  /  npm " + (& npm -v)) "Green"

# ---------------------------------------------------------------- 2. .env.local
Step "Checking .env.local"
$envFile = Join-Path $ProjectDir ".env.local"
if (-not (Test-Path $envFile)) {
    Say ".env.local is missing. Copy your saved env.local.BACKUP into the project root as .env.local, then re-run." "Red"
    exit 1
}
$envText = Get-Content $envFile -Raw
foreach ($k in "MONGODB_URL", "TOKEN_SECRET_KEY", "REFRESH_TOKEN_SECRET", "COOKIE_SECURE", "PRINTER_IP") {
    if ($envText -notmatch "(?m)^$k=") { Say "  WARNING: $k not set in .env.local" "Yellow" } else { Say "  $k set" "Green" }
}

# ---------------------------------------------------------------- 3. MongoDB
Step "Checking MongoDB on 127.0.0.1:27017"
function Test-Port($p) { $c = New-Object Net.Sockets.TcpClient; try { $c.Connect("127.0.0.1", $p); $true } catch { $false } finally { $c.Close() } }
if (-not (Test-Port 27017)) {
    $svc = Get-Service MongoDB -ErrorAction SilentlyContinue
    if ($svc) { try { Start-Service MongoDB; Start-Sleep 3 } catch {} }
}
if (Test-Port 27017) { Say "MongoDB is reachable." "Green" }
else { Say "MongoDB is NOT running. Install MongoDB Community Server (as a service) and re-run." "Red"; exit 1 }

# ---------------------------------------------------------------- 4. npm install
if (-not $SkipInstall) {
    Step "Installing packages (npm install) - this can take several minutes"
    npm install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) { Say "npm install failed." "Red"; exit 1 }
} else { Say "Skipping npm install" "Yellow" }

# ---------------------------------------------------------------- 5. build
if (-not $SkipBuild) {
    Step "Building the app (npm run build)"
    npm run build
    if ($LASTEXITCODE -ne 0) { Say "Build failed." "Red"; exit 1 }
} else { Say "Skipping build" "Yellow" }

# ---------------------------------------------------------------- 6. restore DB
if ($RestoreFrom) {
    Step "Restoring database from $RestoreFrom"
    if (-not (Test-Path $RestoreFrom)) { Say "Backup folder not found: $RestoreFrom" "Red"; exit 1 }
    node scripts/restore-db.mjs "$RestoreFrom"
}

# ---------------------------------------------------------------- 7. icon + shortcuts
Step "Creating Dapfam Dental Clinic shortcuts (Desktop + Startup)"
$brandDir = Join-Path $env:LOCALAPPDATA "Dapfam"
New-Item -ItemType Directory -Path $brandDir -Force | Out-Null
$ico = Join-Path $brandDir "dapfam.ico"
Copy-Item (Join-Path $ProjectDir "app\favicon.ico") $ico -Force

$vbs = Join-Path $ProjectDir "scripts\launch-medira.vbs"
$ws = New-Object -ComObject WScript.Shell
foreach ($folder in @([Environment]::GetFolderPath("Desktop"), [Environment]::GetFolderPath("Startup"))) {
    $lnk = Join-Path $folder "Dapfam Dental Clinic.lnk"
    $sc = $ws.CreateShortcut($lnk)
    $sc.TargetPath = "wscript.exe"
    $sc.Arguments = "`"$vbs`""
    $sc.WorkingDirectory = $ProjectDir
    $sc.IconLocation = "$ico,0"
    $sc.Description = "Start Dapfam Dental Clinic (MongoDB + app) and open it"
    $sc.Save()
    Say "  created $lnk" "Green"
}

# ---------------------------------------------------------------- 8. firewall
if ($OpenFirewall) {
    Step "Opening firewall port 3000 + setting network to Private (UAC prompt)"
    $cmd = 'Set-NetConnectionProfile -NetworkCategory Private -ErrorAction SilentlyContinue; if (-not (Get-NetFirewallRule -DisplayName "Dapfam App 3000" -ErrorAction SilentlyContinue)) { New-NetFirewallRule -DisplayName "Dapfam App 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Any | Out-Null }'
    Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $cmd -Wait
    if (Get-NetFirewallRule -DisplayName "Dapfam App 3000" -ErrorAction SilentlyContinue) { Say "Firewall rule present." "Green" }
    else { Say "Firewall rule not created (UAC declined?). Run scripts\allow-network-access.cmd later." "Yellow" }
}

# ---------------------------------------------------------------- done
Step "Done"
$ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -like "192.168.*" } | Select-Object -First 1).IPAddress
Say "Double-click 'Dapfam Dental Clinic' on the Desktop to start the app." "Green"
if ($ip) { Say "Other PCs on the network can use: http://${ip}:3000" "Green" }
Say "Log in: admin / Admin@1234 (only if you seeded a fresh admin; restored data keeps your existing users)."
