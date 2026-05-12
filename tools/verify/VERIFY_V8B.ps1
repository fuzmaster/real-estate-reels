# Verifies the V8B Smart Framing build fix.
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$campaignFormPath = Join-Path $ProjectRoot "client\src\components\CampaignForm.tsx"

Write-Host "==> Checking V8B build fix" -ForegroundColor Cyan

if (!(Test-Path $campaignFormPath)) {
  throw "Missing client\src\components\CampaignForm.tsx"
}

$form = Get-Content $campaignFormPath -Raw
$failed = $false

function Check-NotContains($Name, $Pattern) {
  if ($script:form -match $Pattern) {
    Write-Host "FAIL - $Name" -ForegroundColor Red
    $script:failed = $true
  } else {
    Write-Host "OK   - $Name" -ForegroundColor Green
  }
}

function Check-Contains($Name, $Pattern) {
  if ($script:form -match $Pattern) {
    Write-Host "OK   - $Name" -ForegroundColor Green
  } else {
    Write-Host "FAIL - $Name" -ForegroundColor Red
    $script:failed = $true
  }
}

Check-NotContains "No smartFramingBySavedPath reference remains" "smartFramingBySavedPath"
Check-NotContains "No photoSettings reference remains" "photoSettings"
Check-Contains "Photo grid uses photoFraming state fallback" "const settings = photoFraming\[photo\] \?\? DEFAULT_PHOTO_FRAMING;"

if ($failed) {
  Write-Host ""
  throw "V8B verification failed. Send me the output."
}

Write-Host ""
Write-Host "V8B verification passed." -ForegroundColor Green
Write-Host "Now run:"
Write-Host "npm run build"
Write-Host "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force"
Write-Host "node server.js"
