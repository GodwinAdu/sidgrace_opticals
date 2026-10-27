<#
  Run SFC to restore spoolsv.exe from the component store (now that the store
  has it and the pending-reboot lock has cleared), then start the Print Spooler.
  Run as ADMINISTRATOR.
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

Say "Running SFC /scannow (a few minutes)..." "Cyan"
sfc /scannow

Say ""
if (Test-Path $spoolsv) {
    Say "spoolsv.exe is now present in System32." "Green"
    # Make sure the service exists, is auto, and start it.
    $svc = Get-Service Spooler -ErrorAction SilentlyContinue
    if (-not $svc) {
        Say "Registering Spooler service..." "Yellow"
        sc.exe create Spooler binPath= "$spoolsv" start= auto DisplayName= "Print Spooler" | Out-Null
        sc.exe config Spooler depend= RPCSS | Out-Null
    }
    Set-Service Spooler -StartupType Automatic -ErrorAction SilentlyContinue
    Start-Service Spooler -ErrorAction SilentlyContinue
    Start-Service PrintNotify -ErrorAction SilentlyContinue
    Start-Sleep 2
    $svc = Get-Service Spooler -ErrorAction SilentlyContinue
    if ($svc.Status -eq 'Running') {
        Say "SUCCESS: Print Spooler is RUNNING. Printing is restored!" "Green"
        Say "Next: install the Xprinter driver (USB) or run the Xprinter config tool." "Cyan"
    } else {
        Say "spoolsv present but service won't start. Reboot and run this again." "Yellow"
    }
} else {
    Say "SFC did not restore spoolsv.exe. The in-place Windows repair will be needed." "Red"
}

Say ""
Say "Press any key to close."
[void][System.Console]::ReadKey($true)
