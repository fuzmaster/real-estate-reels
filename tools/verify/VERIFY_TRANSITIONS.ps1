$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Checking source file..." -ForegroundColor Cyan
Select-String -Path (Join-Path $ProjectRoot "client\src\components\CampaignForm.tsx") -Pattern "V6D_TRANSITION_CONTROL|Photo Transition|Transition Style|data-transition-control-v6d|photoTransition" | Select-Object -First 30
Write-Host "" 
Write-Host "Checking built JS files..." -ForegroundColor Cyan
if (Test-Path (Join-Path $ProjectRoot "client\dist\assets")) {
  Select-String -Path (Join-Path $ProjectRoot "client\dist\assets\*.js") -Pattern "Photo Transition|Transition Style|Smart Mix|Whip Pan" | Select-Object -First 20
} else {
  Write-Host "client\dist\assets not found. Run npm run build first." -ForegroundColor Yellow
}
