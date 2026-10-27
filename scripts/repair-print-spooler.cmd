@echo off
REM Repair the Windows Print Spooler (needed for the USB Xprinter).
REM Requires admin - a UAC prompt will appear; approve it.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','\"%~dp0repair-print-spooler.ps1\"'"
echo.
echo A UAC prompt should have appeared. Approve it to repair printing.
pause
