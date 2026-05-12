# Safe cleanup for C:\Sites\RealEstate-Reels-Web
# Moves patch junk and backups into one archive folder instead of deleting them.

$ErrorActionPreference = "Stop"
$ProjectRoot = (Get-Location).Path
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$ArchiveRoot = Join-Path $ProjectRoot ".cleanup-archive"
$ArchiveDir = Join-Path $ArchiveRoot $Stamp

Write-Host "==> Safe cleanup for Real Estate Reels" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot"
Write-Host "Archive: $ArchiveDir"

New-Item -ItemType Directory -Force -Path $ArchiveDir | Out-Null

$DirPatterns = @(
  "_backup_gemini_v3",
  "_patch_files",
  "patch-files",
  "v6-files",
  ".v5-backup-*",
  ".v6-transition-backup-*",
  ".v6c-transition-backup-*",
  ".v6d-transition-backup-*",
  ".v6e-render-fix-backup-*",
  ".v6f-final-transition-fix-backup-*",
  ".v6g-dedupe-transition-fix-backup-*",
  ".v7-smart-duration-backup-*",
  ".v8-smart-framing-ui-backup-*",
  ".v8b-smart-framing-build-fix-backup-*",
  "_archive_patch_junk_*"
)

$FilePatterns = @(
  "apply-gemini-v2-video-polish.ps1",
  "apply-gemini-v3-hero-motion.ps1",
  "apply-v4-crop-framing.ps1",
  "apply-v5-frame-your-shot.ps1",
  "apply-v6-transition-pack.ps1",
  "apply-v6b-visible-transitions.ps1",
  "apply-v6c-force-visible-transition.ps1",
  "apply-v6d-actually-show-transitions.ps1",
  "README_GEMINI_V2_PATCH.md",
  "README_GEMINI_V3_PATCH.md",
  "README_INSTALL_V4_CROP_PATCH.txt",
  "README_V5_FRAME_YOUR_SHOT.txt",
  "README_V6B_VISIBLE_TRANSITIONS.txt",
  "README_V6C_FORCE_VISIBLE_TRANSITION.md",
  "README_V6D_TRANSITIONS.txt",
  "README_MULTIPLE_PHOTO_UPLOAD_FIX.txt",
  "README_FIX_FOR_PORT_3000_AND_SCRIPT.txt",
  "README_COPY_INTO_PROJECT_FOLDER.txt",
  "GEMINI_REVIEW_PROMPT_AFTER_V3_PATCH.md",
  "GEMINI_V4_CROP_REVIEW_PROMPT.md",
  "server.js.backup-*",
  "server.js.bak-*",
  "server.js.bak*",
  "start.bat.backup-*",
  "*.mp3",
  "*.mp4"
)

$GeneratedPaths = @(
  "remotion\out"
)

$RecursiveBackupPatterns = @(
  "*.bak*",
  "*.backup-*"
)

function Move-ToArchive($Item) {
  if (!$Item) { return }
  if ($Item.FullName -eq $ArchiveRoot) { return }
  if ($Item.FullName.StartsWith($ArchiveRoot, [System.StringComparison]::OrdinalIgnoreCase)) { return }
  if (!(Test-Path -LiteralPath $Item.FullName)) { return }

  $relativePath = [System.IO.Path]::GetRelativePath($ProjectRoot, $Item.FullName)
  $dest = Join-Path $ArchiveDir $relativePath
  $destDir = Split-Path -Parent $dest
  if ($destDir) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  }

  if (Test-Path -LiteralPath $dest) {
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($dest)
    $extension = [System.IO.Path]::GetExtension($dest)
    $parent = Split-Path -Parent $dest
    $i = 1
    do {
      $candidate = Join-Path $parent ("{0}-{1}{2}" -f $baseName, $i, $extension)
      $i++
    } while (Test-Path -LiteralPath $candidate)
    $dest = $candidate
  }

  Move-Item -LiteralPath $Item.FullName -Destination $dest
  Write-Host "Moved: $relativePath" -ForegroundColor DarkGray
}

foreach ($pattern in $DirPatterns) {
  Get-ChildItem -Path $ProjectRoot -Directory -Force -Filter $pattern -ErrorAction SilentlyContinue | ForEach-Object { Move-ToArchive $_ }
}

foreach ($pattern in $FilePatterns) {
  Get-ChildItem -Path $ProjectRoot -File -Force -Filter $pattern -ErrorAction SilentlyContinue | ForEach-Object { Move-ToArchive $_ }
}

foreach ($relativePath in $GeneratedPaths) {
  $fullPath = Join-Path $ProjectRoot $relativePath
  if (Test-Path -LiteralPath $fullPath) {
    Move-ToArchive (Get-Item -LiteralPath $fullPath)
  }
}

foreach ($pattern in $RecursiveBackupPatterns) {
  Get-ChildItem -Path $ProjectRoot -File -Recurse -Force -Filter $pattern -ErrorAction SilentlyContinue |
    Where-Object {
      -not $_.FullName.StartsWith($ArchiveRoot, [System.StringComparison]::OrdinalIgnoreCase) -and
      $_.FullName -notlike "*\\node_modules\\*" -and
      $_.FullName -notlike "*\\.git\\*"
    } |
    ForEach-Object { Move-ToArchive $_ }
}

Write-Host ""
Write-Host "Cleanup complete. Nothing was deleted." -ForegroundColor Green
Write-Host "Moved old patch files/backups to:" -ForegroundColor White
Write-Host $ArchiveDir -ForegroundColor Yellow
Write-Host ""
Write-Host "Keep the archive for a few days. Delete it later only after the app still works." -ForegroundColor White
