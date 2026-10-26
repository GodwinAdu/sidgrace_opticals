<#
  SidGrace Opticals - Local launcher (production mode)

  Starts the local MongoDB server and the Next.js app in PRODUCTION mode
  (next start), then opens the app in a clean browser "app window" (no tabs,
  no address bar) so it looks like a desktop application.

  Node + MongoDB were installed per-user (no admin) under %LOCALAPPDATA%.

  NOTE: production mode serves a pre-built app. If the application code
  changes, run a rebuild first:  npm run build

  Usage (double-click the .cmd wrapper, or run in PowerShell):
    powershell -ExecutionPolicy Bypass -File scripts\start-local.ps1
#>

$ErrorActionPreference = "Stop"

# --- Paths ---
$NodeDir    = Join-Path $env:LOCALAPPDATA "nodejs"
$MongoDir   = Join-Path $env:LOCALAPPDATA "mongodb"
$MongoExe   = Join-Path $MongoDir "mongod.exe"
$MongoCfg   = Join-Path $MongoDir "mongod.cfg"
$ProjectDir = Split-Path -Parent $PSScriptRoot   # repo root (scripts\ is one level down)
$AppUrl     = "http://localhost:3000"

# --- Make node + npm available for this process ---
$env:Path = "$NodeDir;$env:Path"

Write-Host "SidGrace Opticals - local launcher (production)" -ForegroundColor Cyan
Write-Host "Project: $ProjectDir"

# --- Sanity checks ---
if (-not (Test-Path $MongoExe)) {
    Write-Host "ERROR: MongoDB not found at $MongoExe" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path (Join-Path $NodeDir "node.exe"))) {
    Write-Host "ERROR: Node.js not found at $NodeDir" -ForegroundColor Red
    exit 1
}
if (-not (Test-Path (Join-Path $ProjectDir ".next"))) {
    Write-Host "WARNING: No production build found (.next missing)." -ForegroundColor Red
    Write-Host "Run 'npm run build' first. Attempting to build now..." -ForegroundColor Yellow
    Set-Location $ProjectDir
    npm run build
}

function Test-Port($port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try { $client.Connect("127.0.0.1", $port); return $client.Connected }
    catch { return $false }
    finally { $client.Close() }
}

# --- Start MongoDB if not already running ---
if (Test-Port 27017) {
    Write-Host "MongoDB already running on 127.0.0.1:27017" -ForegroundColor Green
} else {
    Write-Host "Starting MongoDB..." -ForegroundColor Yellow
    Start-Process -FilePath $MongoExe -ArgumentList "--config","`"$MongoCfg`"" -WindowStyle Hidden
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        if (Test-Port 27017) { $ready = $true; break }
    }
    if ($ready) { Write-Host "MongoDB is up on 127.0.0.1:27017" -ForegroundColor Green }
    else { Write-Host "WARNING: MongoDB did not open port 27017 in time. See $MongoDir\log\mongod.log" -ForegroundColor Red }
}

# --- Start the app (production) if not already running ---
if (Test-Port 3000) {
    Write-Host "App already running on $AppUrl" -ForegroundColor Green
} else {
    Write-Host "Starting the app (production)..." -ForegroundColor Yellow
    Set-Location $ProjectDir
    # Start 'next start' hidden so no console is visible. We invoke the Next CLI
    # with node.exe directly (not npx.cmd) because node.exe hides cleanly while a
    # .cmd batch file briefly flashes a window.
    # -H 0.0.0.0 binds to ALL network interfaces so other machines on the LAN
    # can reach the app at http://<this-pc-ip>:3000 (not just localhost).
    $nodeExe = Join-Path $NodeDir "node.exe"
    $nextCli = Join-Path $ProjectDir "node_modules\next\dist\bin\next"
    Start-Process -FilePath $nodeExe -ArgumentList "`"$nextCli`"","start","-H","0.0.0.0","-p","3000" -WorkingDirectory $ProjectDir -WindowStyle Hidden
    $ready = $false
    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 1
        if (Test-Port 3000) { $ready = $true; break }
    }
    if ($ready) { Write-Host "App is up on $AppUrl" -ForegroundColor Green }
    else { Write-Host "WARNING: App did not open port 3000 in time." -ForegroundColor Red; exit 1 }
}

# --- Open the app in a clean browser window (app mode) ---
$chrome = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

$edge = @(
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

Write-Host "Opening the app..." -ForegroundColor Yellow
# Use a dedicated browser profile folder so the app always opens in its own
# clean window, independent of any normal browsing session the user has open.
$AppProfile = Join-Path $env:LOCALAPPDATA "SidGraceApp\browser-profile"
if (-not (Test-Path $AppProfile)) { New-Item -ItemType Directory -Path $AppProfile -Force | Out-Null }

if ($chrome) {
    Start-Process -FilePath $chrome -ArgumentList "--app=$AppUrl","--user-data-dir=`"$AppProfile`"","--no-first-run"
} elseif ($edge) {
    Start-Process -FilePath $edge -ArgumentList "--app=$AppUrl","--user-data-dir=`"$AppProfile`"","--no-first-run"
} else {
    Start-Process $AppUrl   # default browser
}

Write-Host "Done. The app is running at $AppUrl" -ForegroundColor Green
