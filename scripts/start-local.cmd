@echo off
REM SidGrace Opticals - start MongoDB + the app (production) and open it.
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-local.ps1"
