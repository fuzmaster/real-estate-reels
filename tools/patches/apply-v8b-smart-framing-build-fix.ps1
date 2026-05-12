# Real Estate Reels - V8B Smart Framing Build Fix
# Fixes V8 TypeScript errors:
# - smartFramingBySavedPath is not defined
# - photoSettings is not defined
#
# Copy this file into C:\Sites\RealEstate-Reels-Web and run:
# Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
# .\tools\patches\apply-v8b-smart-framing-build-fix.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$BackupDir = Join-Path $ProjectRoot (".v8b-smart-framing-build-fix-backup-" + (Get-Date -Format "yyyyMMdd-HHmmss"))

Write-Host ""
Write-Host "==> Real Estate Reels V8B Smart Framing Build Fix" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot"

function Backup-File($RelativePath) {
  $full = Join-Path $ProjectRoot $RelativePath
  if (Test-Path $full) {
    $dest = Join-Path $BackupDir $RelativePath
    New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
    Copy-Item $full $dest -Force
  }
}

$campaignFormPath = Join-Path $ProjectRoot "client\src\components\CampaignForm.tsx"
if (!(Test-Path $campaignFormPath)) {
  throw "Could not find client\src\components\CampaignForm.tsx"
}

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
Backup-File "client\src\components\CampaignForm.tsx"

$form = Get-Content $campaignFormPath -Raw

# 1) Fix undefined smartFramingBySavedPath.
# Bad V8 line:
# next[p] = smartFramingBySavedPath[p] ?? DEFAULT_PHOTO_FRAMING;
# Safe fallback:
# next[p] = DEFAULT_PHOTO_FRAMING;
$form = $form -replace "smartFramingBySavedPath\s*\[\s*p\s*\]\s*\?\?\s*DEFAULT_PHOTO_FRAMING", "DEFAULT_PHOTO_FRAMING"

# Also handle any other indexed usage just in case.
$form = $form -replace "smartFramingBySavedPath\s*\[\s*([^\]]+)\s*\]\s*\?\?\s*DEFAULT_PHOTO_FRAMING", "DEFAULT_PHOTO_FRAMING"

# 2) Fix undefined photoSettings expression.
# Replace the defensive expression that references photoSettings with the real photoFraming state.
$form = $form -replace "const settings = \(typeof photoFraming !== 'undefined' \? photoFraming\?\.\[photo\] : undefined\) \?\? \(typeof photoSettings !== 'undefined' \? photoSettings\?\.\[photo\] : undefined\);", "const settings = photoFraming[photo] ?? DEFAULT_PHOTO_FRAMING;"

# Broader fallback if spacing changed.
$form = $form -replace "const settings = .*photoSettings.*;", "const settings = photoFraming[photo] ?? DEFAULT_PHOTO_FRAMING;"

# 3) If the prior replacement left any bare bad identifiers, neutralize them.
$form = $form -replace "\bphotoSettings\b", "photoFraming"

Set-Content -Path $campaignFormPath -Value $form -Encoding UTF8

Write-Host "Patched client/src/components/CampaignForm.tsx" -ForegroundColor Green
Write-Host ""
Write-Host "V8B build fix applied."
Write-Host "Backups saved to: $BackupDir"
Write-Host ""
Write-Host "Run:" -ForegroundColor Yellow
Write-Host "  .\tools\verify\VERIFY_V8B.ps1"
Write-Host "  npm run build"
Write-Host "  Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force"
Write-Host "  node server.js"
Write-Host ""
