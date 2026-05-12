# Real Estate Reels — V6E Render Error Fix + Root Cleanup Helper
# Run from: C:\Sites\RealEstate-Reels-Web

$ErrorActionPreference = "Stop"
$ProjectRoot = (Get-Location).Path

Write-Host "==> Real Estate Reels V6E Fix" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot"

$RequiredFiles = @(
  "server.js",
  "client\src\components\CampaignForm.tsx",
  "client\src\types.ts",
  "remotion\src\Root.tsx",
  "remotion\src\ListingReel.tsx",
  "remotion\src\campaign.config.ts"
)

foreach ($file in $RequiredFiles) {
  $full = Join-Path $ProjectRoot $file
  if (!(Test-Path $full)) {
    throw "Missing required file: $file. Run this from C:\Sites\RealEstate-Reels-Web."
  }
}

node .\_apply-v6e-render-fix.cjs

Write-Host ""
Write-Host "==> Next commands" -ForegroundColor Cyan
Write-Host "npm run build" -ForegroundColor Yellow
Write-Host "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force" -ForegroundColor Yellow
Write-Host "node server.js" -ForegroundColor Yellow
Write-Host ""
Write-Host "Then open http://localhost:3000/app and press Ctrl+F5." -ForegroundColor White
Write-Host ""
Write-Host "Optional cleanup after the render works:" -ForegroundColor Cyan
Write-Host ".\tools\maintenance\CLEAN_PROJECT_ROOT_SAFE.ps1" -ForegroundColor Yellow
