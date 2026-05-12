# Real Estate Reels V9 - Vibe Presets + Render Debug System
# Copy this ZIP into C:\Sites\RealEstate-Reels-Web, then run this from the project root.

$ErrorActionPreference = "Stop"
$ProjectRoot = (Get-Location).Path
$Patch = Join-Path $ProjectRoot "tools\patches\v9\apply-v9-vibe-debug.cjs"

Write-Host "==> Real Estate Reels V9" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot"

if (!(Test-Path $Patch)) {
  throw "Missing patch file: $Patch. Make sure you copied the ZIP contents into C:\Sites\RealEstate-Reels-Web."
}

node $Patch

Write-Host ""
Write-Host "Run these next:" -ForegroundColor White
Write-Host "Open .\docs\V9_TEST_GUIDE.md" -ForegroundColor Yellow
Write-Host "npm run build" -ForegroundColor Yellow
Write-Host "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force" -ForegroundColor Yellow
Write-Host "node server.js" -ForegroundColor Yellow
Write-Host ""
Write-Host "Then open http://localhost:3000/app and press Ctrl+F5." -ForegroundColor White
Write-Host "Open the new Debug tab if rendering fails." -ForegroundColor White
