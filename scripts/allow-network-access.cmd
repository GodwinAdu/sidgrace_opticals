@echo off
REM ===========================================================================
REM  Dapfam - allow other machines to reach the app (run ONCE on the HOST).
REM  Opens Windows Firewall for port 3000 AND marks the network as Private
REM  (trusted LAN). REQUIRES ADMIN - a UAC prompt will appear; approve it.
REM ===========================================================================

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-Command','" ^
  "Set-NetConnectionProfile -NetworkCategory Private -ErrorAction SilentlyContinue;" ^
  "if (-not (Get-NetFirewallRule -DisplayName \"Dapfam App 3000\" -ErrorAction SilentlyContinue)) {" ^
  "New-NetFirewallRule -DisplayName \"Dapfam App 3000\" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Any };" ^
  "Write-Host \"Firewall opened for port 3000 and network set to Private.\" -ForegroundColor Green;" ^
  "Write-Host \"Press any key to close.\"; [void][System.Console]::ReadKey($true)'"

echo.
echo A UAC prompt should have appeared. Approve it to apply the fix.
echo After it finishes, try the Dapfam shortcut on the other machines again.
pause
