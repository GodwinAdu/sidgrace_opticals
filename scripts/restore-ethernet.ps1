<#
  Restore the Ethernet adapter to its normal network.

  It was left on a manual 192.168.123.50 (printer subnet). This removes that
  address and sets the adapter back to automatic (DHCP + automatic DNS), so the
  router re-assigns the normal 192.168.1.x address (192.168.1.214).
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

$alias = "Ethernet"
Say "Removing the temporary 192.168.123.50 address..." "Cyan"
Remove-NetIPAddress -InterfaceAlias $alias -IPAddress "192.168.123.50" -Confirm:$false -ErrorAction SilentlyContinue
# Clear any static route/config and switch to DHCP.
Remove-NetRoute -InterfaceAlias $alias -Confirm:$false -ErrorAction SilentlyContinue

Say "Setting Ethernet back to automatic (DHCP)..." "Cyan"
Set-NetIPInterface -InterfaceAlias $alias -Dhcp Enabled -ErrorAction SilentlyContinue
Set-DnsClientServerAddress -InterfaceAlias $alias -ResetServerAddresses -ErrorAction SilentlyContinue

# Nudge it to grab a lease now.
ipconfig /release "$alias" 2>$null | Out-Null
ipconfig /renew "$alias" 2>$null | Out-Null
Start-Sleep -Seconds 4

Say "=== Ethernet now ===" "Cyan"
Get-NetIPAddress -InterfaceAlias $alias -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object IPAddress, PrefixOrigin | Format-Table -AutoSize

$ip = (Get-NetIPAddress -InterfaceAlias $alias -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -like "192.168.1.*" }).IPAddress
if ($ip) { Say "SUCCESS: Ethernet is back on $ip" "Green" }
else { Say "No 192.168.1.x yet. Make sure the Ethernet cable goes to your router, then re-run." "Yellow" }

Say ""
Say "Press any key to close."
[void][System.Console]::ReadKey($true)
