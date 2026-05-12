# Real Estate Reels V7 - Smart Duration + Better Defaults
# Copy this ZIP into C:\Sites\RealEstate-Reels-Web and run this from the project root.

$ErrorActionPreference = "Stop"
$ProjectRoot = (Get-Location).Path
$ScriptPath = Join-Path $ProjectRoot "tools\apply-v7-smart-duration.cjs"

Write-Host "==> Real Estate Reels V7 Smart Duration" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot"

if (!(Test-Path $ScriptPath)) {
  throw "Missing patch script: $ScriptPath. Make sure you copied the ZIP contents into C:\Sites\RealEstate-Reels-Web."
}

node $ScriptPath

Write-Host "" 
Write-Host "V7 Smart Duration patch applied." -ForegroundColor Green
Write-Host "" 
Write-Host "Next commands:" -ForegroundColor White
Write-Host ".\tools\verify\VERIFY_V7.ps1" -ForegroundColor Yellow
Write-Host "npm run build" -ForegroundColor Yellow
Write-Host "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force" -ForegroundColor Yellow
Write-Host "node server.js" -ForegroundColor Yellow
Write-Host "" 
Write-Host "Then open http://localhost:3000/app and press Ctrl+F5." -ForegroundColor White
