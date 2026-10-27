<#
  Send a clean ESC/POS test receipt directly to the printer on the LAN.
  No admin / no subnet juggling - the printer is at 192.168.1.158 on our network.
#>
param([string]$Ip = "192.168.1.158", [int]$Port = 9100)

$log = "$env:TEMP\print-receipt-test.log"; "" | Out-File $log
try {
    $client = New-Object System.Net.Sockets.TcpClient
    $client.Connect($Ip, $Port)
    $stream = $client.GetStream()

    $bytes = New-Object System.Collections.Generic.List[byte]
    function T($s) { foreach ($ch in $s.ToCharArray()) { $bytes.Add([byte][char]$ch) } }
    function B($arr) { foreach ($b in $arr) { $bytes.Add([byte]$b) } }

    B @(27, 64)          # ESC @   initialize
    B @(27, 116, 0)      # ESC t 0 code page PC437
    B @(27, 97, 1)       # ESC a 1 center
    B @(27, 33, 48)      # ESC ! 48 double width+height
    T "DAPFAM DENTAL CLINIC"; B @(10)
    B @(27, 33, 0)       # ESC ! 0 normal
    T "--------------------------------"; B @(10)
    B @(27, 97, 0)       # ESC a 0 left
    T "Receipt printer test"; B @(10)
    T ("Time: " + (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")); B @(10)
    T ("Printer IP: " + $Ip); B @(10)
    T "1234567890 ABCDEFG abcdefg"; B @(10)
    T "If you can read this, it WORKS."; B @(10)
    T "--------------------------------"; B @(10)
    B @(10, 10, 10)
    B @(29, 86, 66, 0)   # GS V B 0 full cut

    $arr = $bytes.ToArray()
    $stream.Write($arr, 0, $arr.Length)
    $stream.Flush()
    Start-Sleep -Milliseconds 800
    $stream.Close(); $client.Close()
    "SENT $($arr.Length) bytes to ${Ip}:${Port}" | Add-Content $log
} catch {
    "FAILED: $($_.Exception.Message)" | Add-Content $log
}
