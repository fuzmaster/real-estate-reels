# Verify V6F final transition fix
$ErrorActionPreference = "Stop"

function Check($Name, $Condition) {
  if ($Condition) {
    Write-Host "OK   - $Name" -ForegroundColor Green
  } else {
    Write-Host "FAIL - $Name" -ForegroundColor Red
    $script:Failed = $true
  }
}

$script:Failed = $false

$CampaignForm = Get-Content "client\src\components\CampaignForm.tsx" -Raw
$Types = Get-Content "client\src\types.ts" -Raw
$Server = Get-Content "server.js" -Raw
$Config = Get-Content "remotion\src\campaign.config.ts" -Raw

Check "CampaignForm uses smart-mix, not old smart id" ($CampaignForm -match "smart-mix" -and $CampaignForm -notmatch "opt\.id\s*===\s*'smart'")
Check "CampaignForm uses soft-fade, not old fade id" ($CampaignForm -match "soft-fade" -and $CampaignForm -notmatch "opt\.id\s*===\s*'fade'")
Check "CampaignForm uses whip-pan, not old whip id" ($CampaignForm -match "whip-pan" -and $CampaignForm -notmatch "opt\.id\s*===\s*'whip'")
Check "CampaignForm uses flash-cut, not old flash id" ($CampaignForm -match "flash-cut" -and $CampaignForm -notmatch "opt\.id\s*===\s*'flash'")
Check "PhotoTransition type is canonical" ($Types -match "smart-mix" -and $Types -match "soft-fade" -and $Types -match "whip-pan")
Check "server defines normalizePhotoTransition" ($Server -match "function normalizePhotoTransition")
Check "server defines safeTransition" ($Server -match "const safeTransition = normalizePhotoTransition\(campaign\.photoTransition\)")
Check "server writes exactly one PHOTO_TRANSITION in template" ((([regex]::Matches($Server, "export const PHOTO_TRANSITION")).Count) -eq 1)
Check "current generated campaign.config has exactly one PHOTO_TRANSITION" ((([regex]::Matches($Config, "export const PHOTO_TRANSITION")).Count) -eq 1)

if ($script:Failed) {
  Write-Host ""
  Write-Host "One or more checks failed. Send me the output." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "V6F checks passed." -ForegroundColor Green
Write-Host "Now run:"
Write-Host "npm run build"
Write-Host "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force"
Write-Host "node server.js"
