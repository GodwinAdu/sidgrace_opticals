@echo off
REM ===========================================================================
REM  Medira - client shortcut installer (run ON a peripheral/client machine)
REM ===========================================================================
REM  Creates a "Medira" desktop shortcut that opens the app in a clean browser
REM  window (no tabs / address bar) pointed at the host server on the LAN.
REM
REM  The client machine does NOT run the app or a database - it only opens the
REM  app served by the host desktop. Make sure the host is on and reachable.
REM
REM  Copy this file AND medira.ico (kept in the same scripts folder) to the
REM  client machine, then run this .cmd.
REM
REM  Default host URL is below. To change it, pass the URL as an argument:
REM      install-client-shortcut.cmd http://192.168.1.50:3000
REM ===========================================================================

set "APPURL=%~1"
if "%APPURL%"=="" set "APPURL=http://192.168.1.214:3000"
set "ICOSRC=%~dp0medira.ico"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$url='%APPURL%';" ^
  "$icoSrc='%ICOSRC%';" ^
  "$chrome=@(\"$env:ProgramFiles\Google\Chrome\Application\chrome.exe\",\"${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe\",\"$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe\") | Where-Object { Test-Path $_ } | Select-Object -First 1;" ^
  "$edge=@(\"$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe\",\"${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe\") | Where-Object { Test-Path $_ } | Select-Object -First 1;" ^
  "$browser = if ($chrome) { $chrome } elseif ($edge) { $edge } else { $null };" ^
  "if (-not $browser) { Write-Host 'No Chrome or Edge found. Install one, then re-run.' -ForegroundColor Red; exit 1 };" ^
  "$brandDir = Join-Path $env:LOCALAPPDATA 'Medira'; New-Item -ItemType Directory -Path $brandDir -Force | Out-Null;" ^
  "$ico = Join-Path $brandDir 'medira.ico';" ^
  "if (Test-Path $icoSrc) { Copy-Item $icoSrc $ico -Force } ;" ^
  "$iconLocation = if (Test-Path $ico) { \"$ico,0\" } else { \"$browser,0\" };" ^
  "$profile = Join-Path $env:LOCALAPPDATA 'MediraApp\browser-profile';" ^
  "New-Item -ItemType Directory -Path $profile -Force | Out-Null;" ^
  "$desktop=[Environment]::GetFolderPath('Desktop');" ^
  "$lnk=Join-Path $desktop 'Medira.lnk';" ^
  "$ws=New-Object -ComObject WScript.Shell; $sc=$ws.CreateShortcut($lnk);" ^
  "$sc.TargetPath=$browser;" ^
  "$sc.Arguments='--app=' + $url + ' --user-data-dir=\"' + $profile + '\" --no-first-run';" ^
  "$sc.Description='Open Medira (' + $url + ')';" ^
  "$sc.IconLocation=$iconLocation;" ^
  "$sc.Save();" ^
  "Write-Host ('Created Medira shortcut on the Desktop -> ' + $url) -ForegroundColor Green"

echo.
echo Done. A "Medira" icon is on this machine's Desktop.
echo It opens the app from the host at %APPURL%
pause
