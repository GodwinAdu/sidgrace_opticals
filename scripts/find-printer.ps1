<#
  Find the Xprinter on the 192.168.1.x network.
  Pings the whole /24 to populate ARP, then reports:
   - the full ARP table,
   - any entry matching the printer MAC (00-61-7B-FB-41-E5),
   - any host with print port 9100 open.
  Writes results to a log and prints them. No admin needed.
#>
$log = "$env:TEMP\find-printer.log"
"" | Out-File $log

$printerMac = "00-61-7b-fb-41-e5"

# 1. Ping sweep to populate ARP
$ping = New-Object System.Net.NetworkInformation.Ping
$tasks = 1..254 | ForEach-Object { $ping.SendPingAsync("192.168.1.$_", 300) }
[System.Threading.Tasks.Task]::WaitAll($tasks)
Start-Sleep -Seconds 2

# 2. ARP table
$arp = arp -a | Select-String "192.168.1\."
"=== ARP table (192.168.1.x) ===" | Tee-Object -FilePath $log -Append
$arp | ForEach-Object { $_.Line.Trim() | Tee-Object -FilePath $log -Append }

# 3. MAC match
"" | Tee-Object -FilePath $log -Append
$hit = $arp | Where-Object { $_.Line -match $printerMac }
if ($hit) {
    ("PRINTER MAC MATCH: " + $hit.Line.Trim()) | Tee-Object -FilePath $log -Append
} else {
    "Printer MAC $printerMac NOT found in ARP." | Tee-Object -FilePath $log -Append
}

# 4. Scan for port 9100 (thermal print port) on every ARP host
"" | Tee-Object -FilePath $log -Append
"=== hosts with print port 9100 OPEN ===" | Tee-Object -FilePath $log -Append
$ips = ($arp | ForEach-Object { ($_.Line.Trim() -split '\s+')[0] }) | Sort-Object -Unique
$found = @()
foreach ($ip in $ips) {
    $c = New-Object Net.Sockets.TcpClient
    try { $iar = $c.BeginConnect($ip, 9100, $null, $null); if ($iar.AsyncWaitHandle.WaitOne(400)) { $c.EndConnect($iar); $found += $ip } } catch {} finally { $c.Close() }
}
if ($found) { $found | ForEach-Object { "  $_  (9100 OPEN) <-- likely the printer" | Tee-Object -FilePath $log -Append } }
else { "  none" | Tee-Object -FilePath $log -Append }

"" | Tee-Object -FilePath $log -Append
"Done. (Log: $log)" | Tee-Object -FilePath $log -Append
