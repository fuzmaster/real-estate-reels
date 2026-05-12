# Real Estate Reels V8 — Smart Framing + Professional UI
# Copy this ZIP into C:\Sites\RealEstate-Reels-Web, then run:
# Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
# .\tools\patches\apply-v8-smart-framing-pro-ui.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

Write-Host ""
Write-Host "==> Real Estate Reels V8 Smart Framing + Professional UI" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot"

node (Join-Path $ProjectRoot "tools\patches\_apply-v8-smart-framing-pro-ui.cjs")

Write-Host ""
Write-Host "V8 patch applied."
Write-Host ""
Write-Host "Next commands:"
Write-Host ".\tools\verify\VERIFY_V8.ps1"
Write-Host "npm run build"
Write-Host "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force"
Write-Host "node server.js"
Write-Host ""
Write-Host "Then open http://localhost:3000/app and press Ctrl+F5."
