<#
Real Estate Reels - Online MVP patcher
Run this from PowerShell on Windows.
Default project folder: C:\Sites\RealEstate-Reels-Web
#>

param(
  [string]$ProjectRoot = "C:\Sites\RealEstate-Reels-Web"
)

$ErrorActionPreference = "Stop"

function Write-Step($Text) {
  Write-Host "`n==> $Text" -ForegroundColor Cyan
}

function Backup-File($Path) {
  if (Test-Path $Path) {
    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    Copy-Item $Path "$Path.backup-$stamp" -Force
    Write-Host "Backed up: $Path" -ForegroundColor DarkGray
  }
}

function Replace-Regex($Path, $Pattern, $Replacement, $Description) {
  $text = Get-Content -Raw -Path $Path
  $newText = [regex]::Replace($text, $Pattern, $Replacement, [System.Text.RegularExpressions.RegexOptions]::Singleline)
  if ($newText -eq $text) {
    Write-Warning "Could not patch: $Description"
  } else {
    Set-Content -Path $Path -Value $newText -Encoding UTF8
    Write-Host "Patched: $Description" -ForegroundColor Green
  }
}

function Replace-Literal($Path, $Old, $New, $Description) {
  $text = Get-Content -Raw -Path $Path
  $newText = $text.Replace($Old, $New)
  if ($newText -eq $text) {
    Write-Warning "Could not patch: $Description"
  } else {
    Set-Content -Path $Path -Value $newText -Encoding UTF8
    Write-Host "Patched: $Description" -ForegroundColor Green
  }
}

function Copy-IfDifferent($Source, $Destination) {
  $sourceFull = (Resolve-Path $Source).Path
  if (Test-Path $Destination) {
    $destFull = (Resolve-Path $Destination).Path
  } else {
    $destFull = [System.IO.Path]::GetFullPath($Destination)
  }

  if ($sourceFull -ieq $destFull) {
    Write-Host "Already in place: $Destination" -ForegroundColor DarkGray
    return
  }

  Copy-Item $Source $Destination -Force
  Write-Host "Copied: $Destination" -ForegroundColor Green
}

if (!(Test-Path $ProjectRoot)) {
  throw "Project folder not found: $ProjectRoot"
}

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$FilesToCopy = (Resolve-Path (Join-Path $ScriptRoot "..\..")).Path
$ServerPath = Join-Path $ProjectRoot "server.js"
$ApiPath = Join-Path $ProjectRoot "client\src\api.ts"
$AppPath = Join-Path $ProjectRoot "client\src\App.tsx"
$StartBatPath = Join-Path $ProjectRoot "start.bat"

if (!(Test-Path (Join-Path $FilesToCopy "Dockerfile"))) { throw "Dockerfile not found next to this script. Make sure you copied or extracted the ZIP contents correctly." }

if (!(Test-Path $ServerPath)) { throw "server.js not found at $ServerPath" }

Write-Step "Copy production deployment files"
Copy-IfDifferent (Join-Path $FilesToCopy "Dockerfile") (Join-Path $ProjectRoot "Dockerfile")
Copy-IfDifferent (Join-Path $FilesToCopy ".dockerignore") (Join-Path $ProjectRoot ".dockerignore")
Copy-IfDifferent (Join-Path $FilesToCopy "render.yaml") (Join-Path $ProjectRoot "render.yaml")
Copy-IfDifferent (Join-Path $FilesToCopy ".env.example") (Join-Path $ProjectRoot ".env.example")

Write-Step "Patch server.js for hosted rendering"
Backup-File $ServerPath

# 1) Hosted storage defaults: persistent assets + persistent outputs.
$storagePattern = @'
const BUNDLED_REMOTION = path\.join\(__dirname, 'remotion'\);\s*const BUNDLED_ASSETS\s*=\s*path\.join\(__dirname, 'remotion', 'public'\);\s*let ASSETS_ROOT\s*=\s*process\.env\.ASSETS_ROOT[\s\S]*?let REMOTION_PROJECT\s*=\s*process\.env\.REMOTION_PROJECT[\s\S]*?;
'@
$storageReplacement = @'
const BUNDLED_REMOTION = path.join(__dirname, 'remotion');
const BUNDLED_ASSETS = path.join(__dirname, 'remotion', 'public');
const DEFAULT_DATA_ROOT = process.env.DATA_ROOT || process.env.PERSISTENT_ROOT || path.join(__dirname, '.data');

let ASSETS_ROOT = process.env.ASSETS_ROOT || (process.env.NODE_ENV === 'production' ? path.join(DEFAULT_DATA_ROOT, 'assets') : BUNDLED_ASSETS);
let REMOTION_PROJECT = process.env.REMOTION_PROJECT || BUNDLED_REMOTION;
let OUTPUT_ROOT = process.env.OUTPUT_ROOT || (process.env.NODE_ENV === 'production' ? path.join(DEFAULT_DATA_ROOT, 'outputs') : path.join(REMOTION_PROJECT, 'out'));
'@
Replace-Regex $ServerPath $storagePattern $storageReplacement "storage defaults"

# 2) Add CORS before JSON middleware so Vercel can talk to the hosted API.
$corsReplacement = @'
app.set('trust proxy', 1);

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isLocalhost = origin && /^https?:\/\/localhost(:\d+)?$/.test(origin);
  const isAllowed = !origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin) || isLocalhost;

  if (isAllowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '25mb' }));
'@
Replace-Regex $ServerPath "app\.use\(express\.json\(\)\);" $corsReplacement "CORS and JSON limit"

# 3) Validate config by creating needed folders.
$validateReplacement = @'
function validateConfig() {
  try {
    if (!REMOTION_PROJECT || !fs.existsSync(REMOTION_PROJECT)) return false;
    fs.mkdirSync(ASSETS_ROOT, { recursive: true });
    fs.mkdirSync(path.join(ASSETS_ROOT, 'Projects'), { recursive: true });
    fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
    fs.mkdirSync(path.join(REMOTION_PROJECT, 'public', 'Projects'), { recursive: true });
    return true;
  } catch (e) {
    console.warn(`Config validation failed: ${e.message}`);
    return false;
  }
}
'@
Replace-Regex $ServerPath "function validateConfig\(\) \{[\s\S]*?return true;\s*\}" $validateReplacement "config folder creation"

# 4) Sanitize project/output path segments.
$safeReplacement = @'
function safeSegment(value, fallback = 'listing') {
  const cleaned = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9 _.-]+/g, '_')
    .replace(/\s+/g, ' ')
    .slice(0, 90);
  const noDots = cleaned.replace(/\.\./g, '').replace(/^[.\s]+|[.\s]+$/g, '');
  return noDots || fallback;
}

function listingDir(name) {
  return path.join(ASSETS_ROOT, 'Projects', safeSegment(name));
}
'@
Replace-Regex $ServerPath "function listingDir\(name\) \{\s*return path\.join\(ASSETS_ROOT, 'Projects', name\);\s*\}" $safeReplacement "safe project folder names"
Replace-Literal $ServerPath "const safeName = name.trim();" "const safeName = safeSegment(name.trim());" "sanitize created project name"

# 5) Safer project file serving.
$oldFileServing = @'
const full = path.join(listingDir(req.params.name), rel);
  if (!fs.existsSync(full)) return res.status(404).send('Not found');
'@
$newFileServing = @'
const base = listingDir(req.params.name);
  const full = path.resolve(base, rel);
  if (!full.startsWith(path.resolve(base))) return res.status(400).send('Bad path');
  if (!fs.existsSync(full)) return res.status(404).send('Not found');
'@
Replace-Literal $ServerPath $oldFileServing $newFileServing "safe project file serving"

# 6) Use persistent OUTPUT_ROOT instead of remotion/out.
Replace-Literal $ServerPath "const outDir = path.join(REMOTION_PROJECT, 'out');" "const outDir = OUTPUT_ROOT;" "list outputs from persistent storage"
Replace-Literal $ServerPath "const OUTPUT_BASE = path.join(REMOTION_PROJECT, 'out');" "const OUTPUT_BASE = OUTPUT_ROOT;" "render outputs to persistent storage"
Replace-Literal $ServerPath "const filePath = path.join(REMOTION_PROJECT, 'out', req.params.slug, req.params.file);" "const filePath = path.join(OUTPUT_ROOT, safeSegment(req.params.slug), path.basename(req.params.file));" "output file path safety"
Replace-Literal $ServerPath "const slug = campaign.folder.replace(/[^a-zA-Z0-9_-]/g, '_');" "const slug = safeSegment(campaign.folder).replace(/[^a-zA-Z0-9_-]/g, '_');" "safe output slug"
Replace-Literal $ServerPath "const srcFolder = path.join(ASSETS_ROOT, 'Projects', campaign.folder);" "campaign.folder = safeSegment(campaign.folder);`n  const srcFolder = path.join(ASSETS_ROOT, 'Projects', campaign.folder);" "sanitize campaign folder before render"

# 7) Safer spawn: no shell string quoting, still works on Windows with npx.cmd.
$spawnPattern = @'
const safeArgs = args\.map\(a => a\.includes\(' '\) \? `"\$\{a\}`" : a\);\s*const proc = spawn\(cmd, safeArgs, \{ cwd, shell: true, env: \{ \.\.\.process\.env \} \}\);
'@
$spawnReplacement = @'
    const executable = process.platform === 'win32' && cmd === 'npx' ? 'npx.cmd' : cmd;
    const proc = spawn(executable, args, { cwd, shell: false, env: { ...process.env } });
'@
Replace-Regex $ServerPath $spawnPattern $spawnReplacement "safe render process spawn"

# 8) Do not try to open a browser on hosted Linux servers.
$autoOpenReplacement = @'

  if (!process.env.DISABLE_AUTO_OPEN && !process.env.RENDER && !process.env.RAILWAY_ENVIRONMENT) {
    setTimeout(() => {
      const { exec } = require('child_process');
      if (process.platform === 'win32') exec(`start "" "${url}"`);
      else if (process.platform === 'darwin') exec(`open "${url}"`);
      else exec(`xdg-open "${url}"`);
    }, 800);
  }
'@
Replace-Regex $ServerPath "\s*setTimeout\(\(\) => \{\s*const \{ exec \} = require\('child_process'\);[\s\S]*?\}, 800\);" $autoOpenReplacement "disable browser auto-open on hosted server"

Write-Step "Patch client API and warning text"
if (Test-Path $ApiPath) {
  Backup-File $ApiPath
  $oldApiBase = @'
export const API_BASE: string = import.meta.env.VITE_API_URL ?? '';
'@
  $newApiBase = @'
export const API_BASE: string = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
'@
  Replace-Literal $ApiPath $oldApiBase $newApiBase "trim VITE_API_URL trailing slash"

  $oldFileUrl = @'
return `${API_BASE}/api/projects/${encodeURIComponent(projectName)}/files/${encodeURIComponent(relPath)}`;
'@
  $newFileUrl = @'
const safeRelPath = relPath.split('/').map(part => encodeURIComponent(part)).join('/');
  return `${API_BASE}/api/projects/${encodeURIComponent(projectName)}/files/${safeRelPath}`;
'@
  Replace-Literal $ApiPath $oldFileUrl $newFileUrl "encode file URL without breaking folders"
}

if (Test-Path $AppPath) {
  Backup-File $AppPath
  $oldWarning = @'
then set <code className="bg-yellow-900/60 px-1.5 py-0.5 rounded font-mono">VITE_API_URL</code> in
                Vercel to your machine's IP. The form is still editable for reference.
'@
  $newWarning = @'
then set <code className="bg-yellow-900/60 px-1.5 py-0.5 rounded font-mono">VITE_API_URL</code> in
                Vercel to your hosted API URL from Render or Railway. The form is still editable for reference.
'@
  Replace-Literal $AppPath $oldWarning $newWarning "hosted API warning text"
}

Write-Step "Replace old start.bat text"
if (Test-Path $StartBatPath) {
  Backup-File $StartBatPath
  @'
@echo off
title Real Estate Reels Web
cd /d "%~dp0"

if not exist "node_modules" (
    echo Installing server dependencies...
    call npm install
    if errorlevel 1 goto fail
)

if not exist "client\node_modules" (
    echo Installing client dependencies...
    call npm install --prefix client
    if errorlevel 1 goto fail
)

if not exist "client\dist" (
    echo Building client app...
    call npm run build --prefix client
    if errorlevel 1 goto fail
)

if not exist "remotion\node_modules" (
    echo Installing Remotion dependencies. This can take a few minutes...
    call npm install --prefix remotion
    if errorlevel 1 goto fail
)

echo.
echo  Starting Real Estate Reels Web...
echo  Open http://localhost:3000 in your browser.
echo.
echo  Press Ctrl+C to stop the server.
echo.
npm start
pause
exit /b 0

:fail
echo.
echo Setup failed. Make sure Node.js is installed, then try again.
pause
exit /b 1
'@ | Set-Content -Path $StartBatPath -Encoding ASCII
}

Write-Step "Create local folders"
New-Item -ItemType Directory -Force (Join-Path $ProjectRoot "remotion\public\Projects") | Out-Null
New-Item -ItemType Directory -Force (Join-Path $ProjectRoot "remotion\out") | Out-Null

Write-Step "Done"
Write-Host "Next: open a terminal in $ProjectRoot and run:" -ForegroundColor Yellow
Write-Host "  npm install" -ForegroundColor White
Write-Host "  npm install --prefix client" -ForegroundColor White
Write-Host "  npm install --prefix remotion" -ForegroundColor White
Write-Host "  npm run build" -ForegroundColor White
Write-Host "  node server.js" -ForegroundColor White
