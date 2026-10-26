<#
  Starts ONLY the local MongoDB server (no app).
  Used by the Windows auto-start-at-login shortcut.
  Runs quietly and exits once mongod is launched; mongod keeps running
  in its own minimized window.
#>

$MongoDir = Join-Path $env:LOCALAPPDATA "mongodb"
$MongoExe = Join-Path $MongoDir "mongod.exe"
$MongoCfg = Join-Path $MongoDir "mongod.cfg"

function Test-Port($port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try { $client.Connect("127.0.0.1", $port); return $client.Connected }
    catch { return $false }
    finally { $client.Close() }
}

# Already running? Do nothing.
if (Test-Port 27017) { exit 0 }

if (Test-Path $MongoExe) {
    Start-Process -FilePath $MongoExe -ArgumentList "--config","`"$MongoCfg`"" -WindowStyle Minimized
}
