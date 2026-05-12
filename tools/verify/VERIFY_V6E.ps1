# Verify V6E render fix

$ErrorActionPreference = "Stop"

Write-Host "==> Checking transition render fix" -ForegroundColor Cyan

$checks = @(
  @{ File = "server.js"; Pattern = "const safeTransition = transitionMap\[rawTransition\]"; Label = "server.js defines safeTransition" },
  @{ File = "server.js"; Pattern = "V6E_NOOP_ERROR_LISTENER"; Label = "server.js protects EventEmitter error crash" },
  @{ File = "server.js"; Pattern = "export const PHOTO_TRANSITION"; Label = "server.js writes PHOTO_TRANSITION" },
  @{ File = "client\src\types.ts"; Pattern = "smart-mix"; Label = "client types use canonical smart-mix" },
  @{ File = "client\src\components\CampaignForm.tsx"; Pattern = "Photo Transition Style"; Label = "UI has Photo Transition Style card" },
  @{ File = "remotion\src\campaign.config.ts"; Pattern = "PHOTO_TRANSITION"; Label = "Remotion config has PHOTO_TRANSITION" },
  @{ File = "remotion\src\ListingReel.tsx"; Pattern = "smart-mix"; Label = "ListingReel expects smart-mix" }
)

foreach ($check in $checks) {
  if (!(Test-Path $check.File)) {
    Write-Host "FAIL - Missing $($check.File)" -ForegroundColor Red
    continue
  }

  $found = Select-String -Path $check.File -Pattern $check.Pattern -Quiet
  if ($found) {
    Write-Host "OK   - $($check.Label)" -ForegroundColor Green
  } else {
    Write-Host "FAIL - $($check.Label)" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "Now run:" -ForegroundColor White
Write-Host "npm run build" -ForegroundColor Yellow
Write-Host "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force" -ForegroundColor Yellow
Write-Host "node server.js" -ForegroundColor Yellow
