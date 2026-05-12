$ErrorActionPreference = "Stop"

Write-Host "==> V6G verification" -ForegroundColor Cyan

$serverPath = "server.js"
$configPath = "remotion\src\campaign.config.ts"

if (!(Test-Path $serverPath)) { throw "Missing server.js" }
if (!(Test-Path $configPath)) { throw "Missing remotion\src\campaign.config.ts" }

$server = Get-Content $serverPath -Raw
$config = Get-Content $configPath -Raw

function Count-Matches($Text, $Pattern) {
  return ([regex]::Matches($Text, $Pattern)).Count
}

$fail = $false

$safeCount = Count-Matches $server "\b(const|let)\s+safeTransition\b"
if ($safeCount -eq 1) {
  Write-Host "OK   - server.js has exactly one safeTransition declaration" -ForegroundColor Green
} else {
  Write-Host "FAIL - server.js has $safeCount safeTransition declarations" -ForegroundColor Red
  $fail = $true
}

$templateCount = Count-Matches $server "export const PHOTO_TRANSITION"
if ($templateCount -eq 1) {
  Write-Host "OK   - server.js writes exactly one PHOTO_TRANSITION in generated template" -ForegroundColor Green
} else {
  Write-Host "FAIL - server.js has $templateCount PHOTO_TRANSITION template exports" -ForegroundColor Red
  $fail = $true
}

$configCount = Count-Matches $config "export const PHOTO_TRANSITION"
if ($configCount -eq 1) {
  Write-Host "OK   - current remotion campaign.config.ts has exactly one PHOTO_TRANSITION" -ForegroundColor Green
} else {
  Write-Host "FAIL - current remotion campaign.config.ts has $configCount PHOTO_TRANSITION exports" -ForegroundColor Red
  $fail = $true
}

if ($server -match "V6G_TRANSITION_NORMALIZE_START") {
  Write-Host "OK   - V6G normalization block is present" -ForegroundColor Green
} else {
  Write-Host "FAIL - V6G normalization block is missing" -ForegroundColor Red
  $fail = $true
}

Write-Host ""
if ($fail) {
  Write-Host "One or more checks failed. Send me this output." -ForegroundColor Red
  exit 1
}

Write-Host "V6G checks passed." -ForegroundColor Green
Write-Host ""
Write-Host "Now run:" -ForegroundColor White
Write-Host "npm run build" -ForegroundColor Yellow
Write-Host "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force" -ForegroundColor Yellow
Write-Host "node server.js" -ForegroundColor Yellow
