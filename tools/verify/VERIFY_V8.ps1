# Verify V8 Smart Framing + Professional UI
$ErrorActionPreference = "Stop"
Write-Host "==> Checking V8 patch"

$checks = @(
  @{Path="client\\src\\utils\\photoFraming.ts"; Pattern="recommendPhotoFramingForImage"; Label="Smart framing recommender exists"},
  @{Path="client\\src\\utils\\photoFraming.ts"; Pattern="detectImageDimensions"; Label="Image dimension detector exists"},
  @{Path="client\\src\\components\\CampaignForm.tsx"; Pattern="Smart Framing"; Label="Smart Framing UI exists"},
  @{Path="client\\src\\components\\CampaignForm.tsx"; Pattern="detectImageDimensions"; Label="CampaignForm reads image dimensions"},
  @{Path="client\\src\\index.css"; Pattern="V8_PROFESSIONAL_HARD_EDGE_UI"; Label="Hard-edge UI CSS exists"},
  @{Path="client\\src\\App.tsx"; Pattern="rer-app-ui"; Label="App shell class exists"}
)

$failed = $false
foreach ($c in $checks) {
  if (Select-String -Path $c.Path -Pattern $c.Pattern -Quiet) {
    Write-Host "OK   - $($c.Label)" -ForegroundColor Green
  } else {
    Write-Host "FAIL - $($c.Label)" -ForegroundColor Red
    $failed = $true
  }
}

if ($failed) {
  Write-Host ""
  Write-Host "One or more V8 checks failed. Send me this output." -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "V8 verification passed."
Write-Host "Run:"
Write-Host "npm run build"
Write-Host "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force"
Write-Host "node server.js"
