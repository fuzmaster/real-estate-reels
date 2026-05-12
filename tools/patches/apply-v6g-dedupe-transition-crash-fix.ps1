$ErrorActionPreference = "Stop"

$ProjectRoot = (Get-Location).Path
$Fixer = Join-Path $ProjectRoot "tools\patches\_apply-v6g-dedupe-transition-crash-fix.cjs"

Write-Host "==> Real Estate Reels V6G Transition Dedupe Crash Fix" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot"

$Required = @(
  "server.js",
  "remotion\src\campaign.config.ts"
)

foreach ($file in $Required) {
  $full = Join-Path $ProjectRoot $file
  if (!(Test-Path $full)) {
    throw "Missing required file: $file. Run this from C:\Sites\RealEstate-Reels-Web."
  }
}

node $Fixer $ProjectRoot

Write-Host ""
Write-Host "V6G crash fix applied." -ForegroundColor Green
Write-Host ""
Write-Host "Run these next:" -ForegroundColor White
Write-Host "  .\tools\verify\VERIFY_V6G.ps1" -ForegroundColor Yellow
Write-Host "  npm run build" -ForegroundColor Yellow
Write-Host "  Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force" -ForegroundColor Yellow
Write-Host "  node server.js" -ForegroundColor Yellow
Write-Host ""
Write-Host "Then open http://localhost:3000/app and press Ctrl+F5." -ForegroundColor White
