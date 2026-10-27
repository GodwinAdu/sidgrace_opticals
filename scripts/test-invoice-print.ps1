# Post a sample invoice to the app's /api/print-receipt route (real printer).
$body = @{
  clinicName    = "Dapfam Dental Clinic"
  clinicAddress = "Accra, Ghana"
  clinicPhone   = "+233 20 000 0000"
  title         = "RECEIPT"
  docNumber     = "INV-2026-0001"
  dateText      = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  customerName  = "Ama Mensah"
  customerId    = "PT-00042"
  lines         = @(
    @{ name = "Dental Consultation"; detail = "1 x 150.00"; amount = "150.00" },
    @{ name = "Scaling & Polishing"; detail = "1 x 200.00"; amount = "200.00" },
    @{ name = "Fluoride Treatment";  detail = "2 x 50.00";  amount = "100.00" }
  )
  totals        = @(
    @{ label = "Subtotal"; value = "450.00" },
    @{ label = "TOTAL";    value = "450.00"; bold = $true },
    @{ label = "Paid";     value = "450.00" },
    @{ label = "Balance";  value = "0.00";   bold = $true }
  )
  footer        = "Thank you for choosing Dapfam Dental Clinic."
  width         = 48
} | ConvertTo-Json -Depth 6

try {
  $r = Invoke-WebRequest -Uri "http://localhost:3000/api/print-receipt" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing -TimeoutSec 20
  "Status: $($r.StatusCode)"
  "Body:   $($r.Content)"
} catch {
  "ERROR: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
    "Response: " + $sr.ReadToEnd()
  }
}
