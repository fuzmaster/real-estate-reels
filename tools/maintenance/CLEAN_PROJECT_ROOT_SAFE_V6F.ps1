# Safe cleanup for C:\Sites\RealEstate-Reels-Web
# This MOVES old patch/backups into an archive folder. It does not delete them.

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Archive = Join-Path $ProjectRoot "_archive_patch_junk_$Stamp"

New-Item -ItemType Directory -Force -Path $Archive | Out-Null

$NamesToMove = @(
  "_backup_gemini_v3",
  "_patch_files",
  "patch-files",
  "v6-files"
)

$WildcardToMove = @(
  ".v5-backup-*",
  ".v6-transition-backup-*",
  ".v6c-transition-backup-*",
  ".v6d-transition-backup-*",
  ".v6e-render-fix-backup-*",
  ".v6f-final-transition-fix-backup-*",
  "_apply-v6*.js",
  "_apply-v6*.cjs",
  "apply-gemini-v2-video-polish.ps1",
  "apply-gemini-v3-hero-motion.ps1",
  "apply-v4-crop-framing.ps1",
  "apply-v5-frame-your-shot.ps1",
  "apply-v6-transition-pack.ps1",
  "apply-v6b-visible-transitions.ps1",
  "apply-v6c-force-visible-transition.ps1",
  "apply-v6d-actually-show-transitions.ps1",
  "apply-v6e-render-fix-and-cleanup.ps1",
  "README_GEMINI_V*.md",
  "README_INSTALL_V4_CROP_PATCH.txt",
  "README_V5_FRAME_YOUR_SHOT.txt",
  "README_V6*.txt",
  "README_V6*.md",
  "GEMINI_REVIEW_PROMPT_AFTER_V3_PATCH.md",
  "GEMINI_V4_CROP_REVIEW_PROMPT.md",
  "server.js.bak*",
  "server.js.backup-*",
  "start.bat.backup-*"
)

Write-Host "Moving old patch junk into: $Archive" -ForegroundColor Cyan

foreach ($Name in $NamesToMove) {
  $Path = Join-Path $ProjectRoot $Name
  if (Test-Path $Path) {
    Move-Item -LiteralPath $Path -Destination $Archive -Force
    Write-Host "Moved $Name"
  }
}

foreach ($Pattern in $WildcardToMove) {
  Get-ChildItem -LiteralPath $ProjectRoot -Force -Filter $Pattern -ErrorAction SilentlyContinue | ForEach-Object {
    Move-Item -LiteralPath $_.FullName -Destination $Archive -Force
    Write-Host "Moved $($_.Name)"
  }
}

Write-Host ""
Write-Host "Cleanup complete. Nothing was deleted." -ForegroundColor Green
Write-Host "Archive folder:"
Write-Host $Archive
Write-Host ""
Write-Host "Keep the archive until you confirm the app renders correctly."
