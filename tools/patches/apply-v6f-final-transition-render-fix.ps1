# Real Estate Reels - V6F Final Transition Render Fix
# Copy this file into C:\Sites\RealEstate-Reels-Web, then run:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\tools\patches\apply-v6f-final-transition-render-fix.ps1

$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Write-Host "==> Real Estate Reels V6F Final Transition Render Fix" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot"

node (Join-Path $ProjectRoot "tools\patches\_apply-v6f-final-transition-render-fix.cjs")

Write-Host ""
Write-Host "==> Next commands" -ForegroundColor Yellow
Write-Host "npm run build"
Write-Host "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force"
Write-Host "node server.js"
Write-Host ""
Write-Host "Then open http://localhost:3000/app and press Ctrl+F5."
Write-Host ""
Write-Host "After the render works, you can clean old patch junk with:"
Write-Host ".\tools\maintenance\CLEAN_PROJECT_ROOT_SAFE_V6F.ps1"
