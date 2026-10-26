@echo off
REM Opens Windows Firewall port 3000 so other machines on the LAN can reach
REM the SidGrace app. REQUIRES ADMIN - this will trigger a UAC prompt.
REM Run this once on the host (server) desktop.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-Command','New-NetFirewallRule -DisplayName \"SidGrace App 3000\" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Private,Domain; Write-Host \"Firewall rule added. Press any key.\"; [void][System.Console]::ReadKey($true)'"

echo.
echo A UAC prompt should have appeared. Approve it to add the firewall rule.
pause
