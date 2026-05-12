# Real Estate Reels - Multiple Photo Upload Fix
# Put this file in: C:\Sites\RealEstate-Reels-Web
# Then run:
#   cd C:\Sites\RealEstate-Reels-Web
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\tools\patches\fix-multiple-photo-upload.ps1

$ErrorActionPreference = "Stop"

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ServerPath = Join-Path $ProjectRoot "server.js"
$ApiPath = Join-Path $ProjectRoot "client\src\api.ts"
$CampaignPath = Join-Path $ProjectRoot "client\src\components\CampaignForm.tsx"

Write-Host ""
Write-Host "==> Real Estate Reels multiple photo upload patch" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot"

foreach ($Path in @($ServerPath, $ApiPath, $CampaignPath)) {
  if (!(Test-Path $Path)) {
    throw "Missing required file: $Path"
  }
}

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

function Backup-File($Path) {
  $BackupPath = "$Path.bak-multi-photo-$Stamp"
  Copy-Item $Path $BackupPath -Force
  Write-Host "Backed up: $BackupPath" -ForegroundColor DarkGray
}

Backup-File $ServerPath
Backup-File $ApiPath
Backup-File $CampaignPath

# 1) Add a batch photo upload endpoint to server.js.
$ServerText = Get-Content $ServerPath -Raw

if ($ServerText -notmatch "/api/projects/:name/photos/batch") {
  $BatchRoute = @'
// ── UPLOAD MANY LISTING PHOTOS (batch — lets users select/drop multiple) ───
app.post('/api/projects/:name/photos/batch', requireConfig, upload.any(), (req, res) => {
  const files = Array.isArray(req.files) ? req.files : [];
  if (files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

  const dir = path.join(listingDir(req.params.name), PHOTOS_DIR);
  fs.mkdirSync(dir, { recursive: true });

  const saved = [];
  try {
    for (const file of files) {
      if (!file || !/image/i.test(file.mimetype || '')) {
        if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        continue;
      }

      const original = path.basename(file.originalname || 'photo.jpg').replace(/[^a-zA-Z0-9._-]+/g, '_');
      const ext = path.extname(original).toLowerCase() || '.jpg';
      const stem = path.basename(original, ext) || 'photo';
      let target = `${stem}${ext}`;
      let n = 1;

      while (fs.existsSync(path.join(dir, target))) {
        target = `${stem}-${n}${ext}`;
        n++;
      }

      fs.copyFileSync(file.path, path.join(dir, target));
      fs.unlinkSync(file.path);
      saved.push(`${PHOTOS_DIR}/${target}`);
    }

    if (saved.length === 0) {
      return res.status(400).json({ error: 'No image files were uploaded' });
    }

    res.json({ files: saved });
  } catch (e) {
    for (const file of files) {
      try {
        if (file?.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      } catch (_) {}
    }
    res.status(500).json({ error: e.message });
  }
});

'@

  $Marker = "// ── UPLOAD LISTING PHOTO (additive — keeps existing photos) ───"
  if (!$ServerText.Contains($Marker)) {
    throw "Could not find the photo upload marker in server.js. The file may have changed."
  }

  $ServerText = $ServerText.Replace($Marker, "$BatchRoute$Marker")
  Set-Content $ServerPath $ServerText -Encoding utf8 -NoNewline
  Write-Host "Added /api/projects/:name/photos/batch endpoint to server.js" -ForegroundColor Green
} else {
  Write-Host "Batch endpoint already exists in server.js. Skipping." -ForegroundColor Yellow
}

# 2) Add uploadListingPhotos() to client/src/api.ts.
$ApiText = Get-Content $ApiPath -Raw

if ($ApiText -notmatch "uploadListingPhotos") {
  $BatchApi = @'
export async function uploadListingPhotos(projectName: string, files: FileList | File[]): Promise<string[]> {
  const selected = Array.from(files).filter(file => /image/i.test(file.type));
  if (selected.length === 0) throw new Error('Choose at least one image file');

  const fd = new FormData();
  selected.forEach(file => fd.append('files', file));

  const res = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(projectName)}/photos/batch`, {
    method: 'POST',
    body: fd,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to upload listing photos');
  }

  const data = await res.json();
  return data.files || [];
}

'@

  $Marker = "export async function uploadHeadshot"
  if (!$ApiText.Contains($Marker)) {
    throw "Could not find uploadHeadshot marker in client/src/api.ts. The file may have changed."
  }

  $ApiText = $ApiText.Replace($Marker, "$BatchApi$Marker")
  Set-Content $ApiPath $ApiText -Encoding utf8 -NoNewline
  Write-Host "Added uploadListingPhotos() to client/src/api.ts" -ForegroundColor Green
} else {
  Write-Host "uploadListingPhotos() already exists in api.ts. Skipping." -ForegroundColor Yellow
}

# 3) Update CampaignForm.tsx to call the batch API and support drag/drop multi-upload.
$CampaignText = Get-Content $CampaignPath -Raw

$CampaignText = $CampaignText.Replace(
  "startRender, uploadHeadshot, uploadListingPhoto, uploadLogo, uploadMusic,",
  "startRender, uploadHeadshot, uploadListingPhotos, uploadLogo, uploadMusic,"
)

$PhotoFunctionPattern = "async function handlePhotoUpload\(files: FileList\) \{[\s\S]*?\r?\n  \}\r?\n\r?\n  async function handleHeadshotUpload"
$PhotoFunctionReplacement = @'
async function handlePhotoUpload(files: FileList) {
    if (!activeName || !projectReady) return setError('Create or select a listing first.');

    const imageFiles = Array.from(files).filter(f => /image/i.test(f.type));
    if (imageFiles.length === 0) return setError('Choose at least one JPG, PNG, or WEBP image.');

    setPhotosUploading(true);
    setError('');
    try {
      const uploaded = await uploadListingPhotos(activeName, imageFiles);
      setPhotos(p => Array.from(new Set([...p, ...uploaded])));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setPhotosUploading(false);
    }
  }

  async function handleHeadshotUpload
'@

$NewCampaignText = [regex]::Replace($CampaignText, $PhotoFunctionPattern, $PhotoFunctionReplacement, 1)
if ($NewCampaignText -eq $CampaignText -and $CampaignText -notmatch "uploadListingPhotos\(activeName") {
  throw "Could not replace handlePhotoUpload() in CampaignForm.tsx. The file may have changed."
}
$CampaignText = $NewCampaignText

$OldDropStart = @'
            <div
              onClick={() => projectReady && photosInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl py-10 text-center transition-colors
'@

$NewDropStart = @'
            <div
              onClick={() => projectReady && photosInputRef.current?.click()}
              onDragOver={e => { if (projectReady) e.preventDefault(); }}
              onDrop={e => {
                e.preventDefault();
                if (projectReady && e.dataTransfer.files?.length) handlePhotoUpload(e.dataTransfer.files);
              }}
              className={`border-2 border-dashed rounded-xl py-10 text-center transition-colors
'@

if ($CampaignText.Contains($OldDropStart)) {
  $CampaignText = $CampaignText.Replace($OldDropStart, $NewDropStart)
  Write-Host "Added drag/drop multi-photo upload to the empty photo box" -ForegroundColor Green
} else {
  Write-Host "Could not find the exact empty drop-zone block. Skipping drop-zone enhancement." -ForegroundColor Yellow
}

$OldPhotoHint = @'
              <p className="text-sm text-neutral-400">
                {projectReady ? 'Drop photos here or click to upload' : 'Create or select a listing first'}
              </p>
'@

$NewPhotoHint = @'
              <p className="text-sm text-neutral-400">
                {projectReady ? 'Drop multiple photos here or click to upload' : 'Create or select a listing first'}
              </p>
              {projectReady && (
                <p className="text-xs text-neutral-600 mt-1">
                  Tip: hold Ctrl or Shift to select more than one photo, or drag a group of photos onto this box.
                </p>
              )}
'@

if ($CampaignText.Contains($OldPhotoHint)) {
  $CampaignText = $CampaignText.Replace($OldPhotoHint, $NewPhotoHint)
  Write-Host "Added clearer multi-select instructions to the photo upload box" -ForegroundColor Green
}

Set-Content $CampaignPath $CampaignText -Encoding utf8 -NoNewline
Write-Host "Updated CampaignForm.tsx" -ForegroundColor Green

Write-Host ""
Write-Host "==> Patch complete." -ForegroundColor Cyan
Write-Host ""
Write-Host "Now run these commands:" -ForegroundColor White
Write-Host "  npm run build" -ForegroundColor Gray
Write-Host "  node server.js" -ForegroundColor Gray
Write-Host ""
Write-Host "Then test this:" -ForegroundColor White
Write-Host "  1. Open http://localhost:3000/app" -ForegroundColor Gray
Write-Host "  2. Create/select a listing" -ForegroundColor Gray
Write-Host "  3. Click Add Photos" -ForegroundColor Gray
Write-Host "  4. Hold Ctrl or Shift and select multiple images" -ForegroundColor Gray
Write-Host "  5. Or drag multiple photos onto the empty upload box" -ForegroundColor Gray
Write-Host ""
