<#
  Deeper Print Spooler repair (DISM + SFC).

  Diagnosis on this host:
    - spoolsv.exe is missing from BOTH System32 and the component store (WinSxS),
      so plain SFC cannot restore it (nothing to copy from).
    - A previous repair was blocked by a pending-reboot state (0x80070bc9).

  This script (run as ADMINISTRATOR, needs INTERNET):
    1. DISM RestoreHealth  -> downloads the healthy printing component from
       Windows Update and repairs the component store.
    2. SFC /scannow        -> restores spoolsv.exe into System32 from the now-
       healthy store.
    3. Ensures the Spooler service is set to Automatic and starts it.
    4. Verifies.

  If DISM again reports 0x80070bc9 (reboot required), REBOOT and run this once
  more. Keep the machine online while it runs.
#>

$ErrorActionPreference = "Continue"
function Say($m,$c="Gray"){ Write-Host $m -ForegroundColor $c }

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) {
    Say "Re-launching as Administrator..." "Yellow"
    Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile","-ExecutionPolicy","Bypass","-File","`"$PSCommandPath`""
    return
}

$spoolsv = Join-Path $env:SystemRoot "System32\spoolsv.exe"

Say "=== Step 1: DISM RestoreHealth (downloads from Windows Update; several minutes) ===" "Cyan"
DISM /Online /Cleanup-Image /RestoreHealth

Say ""
Say "=== Step 2: SFC /scannow (restores spoolsv.exe) ===" "Cyan"
sfc /scannow

Say ""
if (Test-Path $spoolsv) {
    Say "spoolsv.exe restored." "Green"
    Set-Service Spooler -StartupType Automatic -ErrorAction SilentlyContinue
    Start-Service Spooler -ErrorAction SilentlyContinue
    Start-Sleep 2
    $s = Get-Service Spooler -ErrorAction SilentlyContinue
    if ($s.Status -eq 'Running') {
        Say "SUCCESS: Print Spooler is running. You can now install the Xprinter driver." "Green"
    } else {
        Say "spoolsv.exe is present but service won't start yet. Reboot and run this once more." "Yellow"
    }
} else {
    Say "spoolsv.exe STILL missing." "Red"
    Say "If DISM reported 0x80070bc9 (reboot required): REBOOT, then run this script again." "Yellow"
    Say "If DISM reported 'source files could not be found': the component store is stripped;" "Yellow"
    Say "an in-place Windows repair/upgrade (keeping files + apps) will be required." "Yellow"
}

Say ""
Say "Press any key to close."
[void][System.Console]::ReadKey($true)
