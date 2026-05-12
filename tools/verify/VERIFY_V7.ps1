$ErrorActionPreference = "Stop"
$ProjectRoot = (Get-Location).Path

function Check($Name, $Condition) {
  if ($Condition) { Write-Host "OK   - $Name" -ForegroundColor Green }
  else { Write-Host "FAIL - $Name" -ForegroundColor Red; $script:Failed = $true }
}

$script:Failed = $false
$formPath = Join-Path $ProjectRoot "client\src\components\CampaignForm.tsx"
$typesPath = Join-Path $ProjectRoot "client\src\types.ts"
$smartPath = Join-Path $ProjectRoot "client\src\utils\smartDuration.ts"
$framingPath = Join-Path $ProjectRoot "client\src\utils\photoFraming.ts"

$form = Get-Content $formPath -Raw
$types = Get-Content $typesPath -Raw
$smart = Get-Content $smartPath -Raw
$framing = Get-Content $framingPath -Raw

Check "Smart duration utility exists" (Test-Path $smartPath)
Check "Smart duration formula has hero 2.5 seconds" ($smart -match "heroSeconds = 2\.5")
Check "Smart duration formula has normal photos 1.5 seconds" ($smart -match "normalPhotoSeconds = 1\.5")
Check "CampaignForm imports smart duration" ($form -match "utils/smartDuration")
Check "CampaignForm has useSmartDuration state" ($form -match "useSmartDuration")
Check "CampaignForm computes effectiveDuration" ($form -match "effectiveDuration")
Check "Payload uses effectiveDuration" ($form -match "duration:\s*effectiveDuration")
Check "UI has Smart Duration card" ($form -match "V7_SMART_DURATION_CARD_START")
Check "Types include optional useSmartDuration" ($types -match "useSmartDuration\?: boolean")
Check "Default framing is fill" ($framing -match "cropMode:\s*'fill'")

if ($script:Failed) {
  Write-Host "`nOne or more V7 checks failed. Send me this output." -ForegroundColor Red
  exit 1
}

Write-Host "`nV7 verification passed." -ForegroundColor Green
Write-Host "Now run:" -ForegroundColor White
Write-Host "npm run build" -ForegroundColor Yellow
Write-Host "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force" -ForegroundColor Yellow
Write-Host "node server.js" -ForegroundColor Yellow
