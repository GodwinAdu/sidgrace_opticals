<#
  Repair the Windows Print Spooler on this host.

  Symptom found: spoolsv.exe (the spooler service executable) and the Spooler
  service registry key are MISSING, so Windows printing is completely dead and
  no USB printer (e.g. the Xprinter XP-E200L) can work. The supporting DLLs
  (spoolss.dll, localspl.dll) are still present.

  This script (run as ADMINISTRATOR):
    1. Restores missing protected system files via SFC (brings back spoolsv.exe).
    2. If the Spooler service is still not registered, recreates it.
    3. Sets it to start automatically and starts it.
    4. Verifies the result.

  Run:  right-click -> Run with PowerShell (as admin), or use the .cmd wrapper.
#>

$ErrorActionPreference = "Continue"

function Say($m, $c = "Gray") { Write-Host $m -ForegroundColor $c }

# --- Must be admin ---
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) {
    Say "This script must run as Administrator. Re-launching elevated..." "Yellow"
    Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-File","`"$PSCommandPath`""
    return
}

Say "=== Dapfam: Print Spooler repair ===" "Cyan"

$spoolsv = Join-Path $env:SystemRoot "System32\spoolsv.exe"

# --- Step 1: SFC to restore missing system files ---
if (-not (Test-Path $spoolsv)) {
    Say "spoolsv.exe missing -> running SFC to restore it (this takes a few minutes)..." "Yellow"
    sfc /scannow
    if (-not (Test-Path $spoolsv)) {
        Say "SFC did not restore spoolsv.exe. Trying DISM RestoreHealth..." "Yellow"
        DISM /Online /Cleanup-Image /RestoreHealth
        sfc /scannow
    }
}

if (Test-Path $spoolsv) { Say "spoolsv.exe is present." "Green" }
else { Say "spoolsv.exe STILL missing. A deeper Windows repair/in-place upgrade may be needed." "Red" }

# --- Step 2: Ensure the Spooler service is registered ---
$svc = Get-Service -Name Spooler -ErrorAction SilentlyContinue
if (-not $svc) {
    Say "Spooler service not registered -> creating it..." "Yellow"
    # binPath must point at spoolsv.exe; type own process, auto start.
    sc.exe create Spooler binPath= "$spoolsv" start= auto DisplayName= "Print Spooler" | Out-Null
    sc.exe description Spooler "This service spools print jobs and handles interaction with the printer." | Out-Null
    # Spooler depends on RPC.
    sc.exe config Spooler depend= RPCSS | Out-Null
}

# --- Step 3: Set auto-start and start it ---
Set-Service -Name Spooler -StartupType Automatic -ErrorAction SilentlyContinue
Start-Service -Name Spooler -ErrorAction SilentlyContinue

# Also start the dependent notify service (harmless if already fine).
Start-Service -Name PrintNotify -ErrorAction SilentlyContinue

# --- Step 4: Verify ---
Start-Sleep -Seconds 2
$svc = Get-Service -Name Spooler -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -eq 'Running') {
    Say "SUCCESS: Print Spooler is running." "Green"
    Say "Next: plug in the Xprinter XP-E200L and install its Windows driver." "Cyan"
} else {
    Say "Print Spooler is still not running. Status: $($svc.Status)" "Red"
    Say "If spoolsv.exe is present but it won't start, reboot and run this again." "Yellow"
}

Say ""
Say "Press any key to close."
[void][System.Console]::ReadKey($true)
