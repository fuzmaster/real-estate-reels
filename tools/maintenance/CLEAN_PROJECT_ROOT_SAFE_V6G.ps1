$ErrorActionPreference = "Stop"

$ProjectRoot = (Get-Location).Path
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Archive = Join-Path $ProjectRoot "_archive_patch_junk_v6g_$Stamp"

Write-Host "==> Safe cleanup V6G" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot"
Write-Host "Archive: $Archive"

New-Item -ItemType Directory -Force $Archive | Out-Null

$Items = @(
  ".v6f-final-transition-fix-backup-*",
  ".v6g-dedupe-transition-fix-backup-*",
  "apply-v6e-render-fix-and-cleanup.ps1",
  "apply-v6f-final-transition-render-fix.ps1",
  "VERIFY_V6E.ps1",
  "VERIFY_V6F.ps1",
  "README_V6E_RENDER_FIX.md",
  "README_V6F_FINAL_FIX.md",
  "_apply-v6f-final-transition-render-fix.cjs"
)

foreach ($pattern in $Items) {
  Get-ChildItem -LiteralPath $ProjectRoot -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like $pattern } |
    ForEach-Object {
      $dest = Join-Path $Archive $_.Name
      Move-Item -LiteralPath $_.FullName -Destination $dest -Force
      Write-Host "Moved: $($_.Name)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Cleanup complete. Nothing was deleted." -ForegroundColor Green
Write-Host "Moved patch junk to:" -ForegroundColor White
Write-Host $Archive -ForegroundColor Yellow
Write-Host ""
Write-Host "Keep the archive until the app renders correctly." -ForegroundColor White
