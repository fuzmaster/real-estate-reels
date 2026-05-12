/* Real Estate Reels V8 — Smart Framing + Professional UI patch
   Safe-ish patcher. Backs up touched files into .v8-smart-framing-ui-backup-*.
*/
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const backupDir = path.join(root, `.v8-smart-framing-ui-backup-${new Date().toISOString().replace(/[:.]/g, "-")}`);

function exists(p) { return fs.existsSync(p); }
function read(p) { return fs.readFileSync(p, "utf8"); }
function write(p, s) { fs.writeFileSync(p, s, "utf8"); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function backup(file) {
  if (!exists(file)) return;
  ensureDir(backupDir);
  const rel = path.relative(root, file).replace(/[\\/:]/g, "__");
  fs.copyFileSync(file, path.join(backupDir, rel));
}
function log(msg) { console.log(msg); }

function patchPhotoFramingUtil() {
  const file = path.join(root, "client", "src", "utils", "photoFraming.ts");
  ensureDir(path.dirname(file));
  backup(file);

  const content = `export type CropMode = 'fill' | 'whole';

export type SmartFramingTemplate =
  | 'vertical-photo'
  | 'square-photo'
  | 'standard-mls'
  | 'wide-room-pan'
  | 'ultra-wide-room'
  | 'exterior-hero'
  | 'detail-shot';

export interface PhotoFraming {
  cropMode: CropMode;
  x: number;      // -50 to 50. Used as focus offset for Fill Screen.
  y: number;      // -50 to 50. Used as focus offset for Fill Screen.
  scale: number;  // 1 to 1.35. Extra zoom for Fill Screen.
  template?: SmartFramingTemplate;
  width?: number;
  height?: number;
  aspectRatio?: number;
}

export const DEFAULT_PHOTO_FRAMING: PhotoFraming = {
  cropMode: 'fill',
  x: 0,
  y: 0,
  scale: 1.04,
  template: 'standard-mls',
};

// Backwards-compatible alias for older patches that used PhotoSetting naming.
export const DEFAULT_PHOTO_SETTING = (photoPath?: string): PhotoFraming => ({
  ...recommendPhotoFramingForImage({
    photoPath: photoPath ?? '',
  }),
});

export function getPhotoFraming(
  photoFraming: Record<string, PhotoFraming> | undefined,
  photoPath: string,
): PhotoFraming {
  return photoFraming?.[photoPath] ?? DEFAULT_PHOTO_FRAMING;
}

export function getPhotoSetting(
  photoFraming: Record<string, PhotoFraming> | undefined,
  photoPath: string,
): PhotoFraming {
  return getPhotoFraming(photoFraming, photoPath);
}

export function getSmartFramingLabel(settings?: PhotoFraming): string {
  const template = settings?.template ?? 'standard-mls';
  switch (template) {
    case 'vertical-photo': return 'Smart Framing: Vertical';
    case 'square-photo': return 'Smart Framing: Square';
    case 'wide-room-pan': return 'Smart Framing: Wide Room Pan';
    case 'ultra-wide-room': return 'Smart Framing: Ultra-Wide';
    case 'exterior-hero': return 'Smart Framing: Exterior Hero';
    case 'detail-shot': return 'Smart Framing: Detail Shot';
    default: return 'Smart Framing: Standard MLS';
  }
}

export function getSmartFramingDescription(settings?: PhotoFraming): string {
  const template = settings?.template ?? 'standard-mls';
  switch (template) {
    case 'vertical-photo': return 'Already vertical. We keep it full screen.';
    case 'square-photo': return 'Square image. We fill the reel with a gentle push-in.';
    case 'wide-room-pan': return 'Wide room. We keep it full screen and start with a safe horizontal pan.';
    case 'ultra-wide-room': return 'Very wide. Full-screen crop is default, but Show Whole Room is available if needed.';
    case 'exterior-hero': return 'Best for first shot. Full-screen with a longer cinematic hold.';
    case 'detail-shot': return 'Good detail image. Do not use it as the first photo.';
    default: return 'Normal listing photo. Full-screen vertical crop with a gentle push-in.';
  }
}

function hasWord(photoPath: string, words: string[]): boolean {
  const s = photoPath.toLowerCase();
  return words.some(w => s.includes(w));
}

export function recommendPhotoFramingForImage(input: {
  width?: number;
  height?: number;
  photoPath?: string;
  index?: number;
}): PhotoFraming {
  const width = input.width || 0;
  const height = input.height || 0;
  const ratio = width > 0 && height > 0 ? width / height : undefined;
  const p = input.photoPath ?? '';
  const index = input.index ?? 999;

  const isExterior = hasWord(p, ['exterior', 'front', 'drone', 'aerial', 'backyard', 'yard', 'outside', 'facade', 'hero']);
  const isWeakDetail = hasWord(p, ['stove', 'oven', 'sink', 'toilet', 'closet', 'laundry', 'vanity', 'appliance']);

  if (isExterior || index === 0) {
    return {
      cropMode: 'fill',
      x: 0,
      y: -2,
      scale: 1.03,
      template: 'exterior-hero',
      width,
      height,
      aspectRatio: ratio,
    };
  }

  if (isWeakDetail) {
    return {
      cropMode: 'fill',
      x: 0,
      y: 0,
      scale: 1.08,
      template: 'detail-shot',
      width,
      height,
      aspectRatio: ratio,
    };
  }

  if (!ratio) {
    return { ...DEFAULT_PHOTO_FRAMING, width, height, aspectRatio: ratio };
  }

  if (ratio < 0.8) {
    return { cropMode: 'fill', x: 0, y: 0, scale: 1.02, template: 'vertical-photo', width, height, aspectRatio: ratio };
  }

  if (ratio <= 1.25) {
    return { cropMode: 'fill', x: 0, y: 0, scale: 1.04, template: 'square-photo', width, height, aspectRatio: ratio };
  }

  if (ratio <= 1.65) {
    return { cropMode: 'fill', x: 0, y: 0, scale: 1.05, template: 'standard-mls', width, height, aspectRatio: ratio };
  }

  if (ratio <= 2.15) {
    // IMPORTANT: Still fill screen. Do NOT letterbox by default.
    return { cropMode: 'fill', x: 0, y: 0, scale: 1.07, template: 'wide-room-pan', width, height, aspectRatio: ratio };
  }

  // Ultra-wide: still default to full-screen crop, but label it so the agent can inspect it.
  return { cropMode: 'fill', x: 0, y: 0, scale: 1.08, template: 'ultra-wide-room', width, height, aspectRatio: ratio };
}

export function detectImageDimensions(file: File): Promise<{ width: number; height: number; aspectRatio: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      URL.revokeObjectURL(url);
      resolve({ width, height, aspectRatio: width / height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image dimensions'));
    };
    img.src = url;
  });
}
`;
  write(file, content);
  log("Patched: client/src/utils/photoFraming.ts");
}

function patchCampaignFormImports(s) {
  // Add smart framing imports to existing photoFraming import.
  if (s.includes("../utils/photoFraming")) {
    s = s.replace(
      /import\s+\{([^}]+)\}\s+from\s+['"]\.\.\/utils\/photoFraming['"];?/,
      (m, inner) => {
        const names = new Set(inner.split(",").map(x => x.trim()).filter(Boolean));
        ["DEFAULT_PHOTO_FRAMING", "DEFAULT_PHOTO_SETTING", "detectImageDimensions", "getSmartFramingLabel", "getSmartFramingDescription", "recommendPhotoFramingForImage"].forEach(n => names.add(n));
        return `import { ${Array.from(names).join(", ")} } from '../utils/photoFraming';`;
      }
    );
    if (!s.includes("detectImageDimensions")) {
      s = s.replace(
        /import type \{([^}]+)\}\s+from\s+['"]\.\.\/utils\/photoFraming['"];?/,
        (m) => `${m}\nimport { detectImageDimensions, getSmartFramingLabel, getSmartFramingDescription, recommendPhotoFramingForImage, DEFAULT_PHOTO_FRAMING, DEFAULT_PHOTO_SETTING } from '../utils/photoFraming';`
      );
    }
  } else {
    s = s.replace(
      /import type \{ CampaignFormData([^}]+)\}\s+from\s+['"]\.\.\/types['"];?/,
      (m) => `${m}\nimport { DEFAULT_PHOTO_FRAMING, DEFAULT_PHOTO_SETTING, detectImageDimensions, getSmartFramingLabel, getSmartFramingDescription, recommendPhotoFramingForImage } from '../utils/photoFraming';`
    );
  }
  return s;
}

function patchHandlePhotoUpload(s) {
  // Ensure a map is declared to hold smart recommendations.
  s = s.replace(
    /const uploaded:\s*string\[\]\s*=\s*\[\];/,
    (m) => s.includes("smartFramingBySavedPath") ? m : `${m}\n      const smartFramingBySavedPath: Record<string, any> = {};`
  );

  // After each saved upload, store smart framing based on actual uploaded file dimensions.
  s = s.replace(
    /uploaded\.push\(saved\);/g,
    (m) => {
      const addition = `
        try {
          const dims = await detectImageDimensions(f);
          smartFramingBySavedPath[saved] = recommendPhotoFramingForImage({
            width: dims.width,
            height: dims.height,
            photoPath: saved,
            index: uploaded.length - 1,
          });
        } catch {
          smartFramingBySavedPath[saved] = recommendPhotoFramingForImage({
            photoPath: saved,
            index: uploaded.length - 1,
          });
        }`;
      if (s.includes("smartFramingBySavedPath[saved] = recommendPhotoFramingForImage")) return m;
      return `${m}${addition}`;
    }
  );

  // Replace defaults for uploaded photos, keeping existing settings untouched.
  s = s.replace(/next\[p\]\s*=\s*DEFAULT_PHOTO_FRAMING;/g, "next[p] = smartFramingBySavedPath[p] ?? DEFAULT_PHOTO_FRAMING;");
  s = s.replace(/updated\[p\]\s*=\s*DEFAULT_PHOTO_SETTING\(p\);/g, "updated[p] = smartFramingBySavedPath[p] ?? DEFAULT_PHOTO_SETTING(p);");
  s = s.replace(/updated\[p\]\s*=\s*\{\s*\.\.\.DEFAULT_PHOTO_SETTING\(p\)[^}]+\};/g, "updated[p] = smartFramingBySavedPath[p] ?? DEFAULT_PHOTO_SETTING(p);");

  // Existing listing load: do not make non-hero photos show-whole-room by default.
  s = s.replace(/\{\s*\.\.\.DEFAULT_PHOTO_SETTING\(p\),\s*mode:\s*i\s*===\s*0\s*\?\s*'fill'\s*:\s*'show-whole-room'\s*\}/g, "recommendPhotoFramingForImage({ photoPath: p, index: i })");
  s = s.replace(/\{\s*\.\.\.DEFAULT_PHOTO_FRAMING,\s*cropMode:\s*i\s*===\s*0\s*\?\s*'fill'\s*:\s*'whole'\s*\}/g, "recommendPhotoFramingForImage({ photoPath: p, index: i })");

  return s;
}

function addSmartFramingPanel(s) {
  if (s.includes("V8_SMART_FRAMING_PANEL")) return s;
  const panel = `
        {/* V8_SMART_FRAMING_PANEL */}
        {photos.length > 0 && (
          <Card
            title="Smart Framing"
            help="Real Estate Reels automatically chooses a starting crop based on each photo shape. Most photos stay full-screen vertical. Ultra-wide rooms are flagged so you can review them."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {photos.slice(0, 8).map((photo, index) => {
                const settings = (typeof photoFraming !== 'undefined' ? photoFraming?.[photo] : undefined) ?? (typeof photoSettings !== 'undefined' ? photoSettings?.[photo] : undefined);
                return (
                  <button
                    key={photo}
                    type="button"
                    onClick={() => setFrameEditorPhoto(photo)}
                    className="text-left border border-neutral-700 bg-neutral-950 px-3 py-2 hover:border-neutral-400 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-white truncate">
                        {index === 0 ? 'Hero opener' : \`Photo \${index + 1}\`}
                      </span>
                      <span className="text-[10px] text-neutral-500 uppercase tracking-widest">
                        {settings?.cropMode === 'whole' ? 'Whole' : 'Fill'}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-neutral-400">
                      {getSmartFramingLabel(settings)}
                    </div>
                    <div className="mt-1 text-[11px] text-neutral-600 line-clamp-2">
                      {getSmartFramingDescription(settings)}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-500 leading-relaxed">
              Default rule: <span className="text-neutral-300">Fill Screen first.</span> Use Show Whole Room only when a room is so wide that vertical crop ruins the layout.
            </div>
          </Card>
        )}

`;
  // Put it after Listing Photos card if possible, otherwise before Optional Branding Assets.
  if (s.includes("Optional Branding Assets")) {
    return s.replace(/(\s*<Card title="Optional Branding Assets")/, `${panel}$1`);
  }
  if (s.includes('<Card title="Choose Video Template"')) {
    return s.replace(/(\s*<Card title="Choose Video Template")/, `${panel}$1`);
  }
  return s;
}

function patchCampaignFormUIStyle(s) {
  // Rename sections to a cleaner agent workflow.
  s = s.replace(/title="Listing Folder"/g, 'title="1. Listing Project"');
  s = s.replace(/title="Listing Details"/g, 'title="2. Property Details"');
  s = s.replace(/title="Agent Branding"/g, 'title="3. Agent Branding"');
  s = s.replace(/title=\{`Listing Photos \(\$\{photos\.length\}\)`\}/g, 'title={`4. Photos & Smart Framing (${photos.length})`}');
  s = s.replace(/title="Optional Branding Assets"/g, 'title="5. Media Assets"');
  s = s.replace(/title="Video Polish Controls"/g, 'title="6. Reel Style"');
  s = s.replace(/title="Photo Transition Style"/g, 'title="7. Transitions"');
  s = s.replace(/title="Photo Transition"/g, 'title="7. Transitions"');
  s = s.replace(/title="Choose Video Template"/g, 'title="8. Template & Render"');

  // Hard edge utility changes in known local component helpers.
  s = s.replace(/rounded-xl/g, "rounded-none");
  s = s.replace(/rounded-lg/g, "rounded-none");
  s = s.replace(/rounded-md/g, "rounded-none");
  // Keep avatar/headshot and circular tiny indicators where explicit rounded-full is used.
  s = s.replace(/ rounded-full/g, " rounded-sm");
  s = s.replace(/rounded-full/g, "rounded-sm");

  return s;
}

function patchCampaignForm() {
  const file = path.join(root, "client", "src", "components", "CampaignForm.tsx");
  if (!exists(file)) {
    console.warn("Skipped CampaignForm.tsx: not found");
    return;
  }
  backup(file);
  let s = read(file);
  s = patchCampaignFormImports(s);
  s = patchHandlePhotoUpload(s);
  s = addSmartFramingPanel(s);
  s = patchCampaignFormUIStyle(s);
  write(file, s);
  log("Patched: client/src/components/CampaignForm.tsx");
}

function patchFrameModal() {
  const file = path.join(root, "client", "src", "components", "FrameYourShotModal.tsx");
  if (!exists(file)) {
    console.warn("Skipped FrameYourShotModal.tsx: not found");
    return;
  }
  backup(file);
  let s = read(file);

  // Improve labels: Crop to Vertical / Fit to Screen.
  s = s.replace(/Fill Screen/g, "Crop to Vertical");
  s = s.replace(/Show Whole Room/g, "Fit to Screen");
  s = s.replace(/Showing the whole photo with a blurred background/g, "Fit to Screen with dark background");

  // Make modal sharp/professional.
  s = s.replace(/rounded-xl/g, "rounded-none");
  s = s.replace(/rounded-lg/g, "rounded-none");
  s = s.replace(/rounded-md/g, "rounded-none");
  s = s.replace(/rounded-full/g, "rounded-sm");

  write(file, s);
  log("Patched: client/src/components/FrameYourShotModal.tsx");
}

function patchApp() {
  const file = path.join(root, "client", "src", "App.tsx");
  if (!exists(file)) {
    console.warn("Skipped App.tsx: not found");
    return;
  }
  backup(file);
  let s = read(file);

  // Add app shell class for professional UI CSS.
  s = s.replace(/<div className="min-h-screen flex flex-col">/, '<div className="rer-app-ui min-h-screen flex flex-col">');
  s = s.replace(/New Listing/g, "1. Build");
  s = s.replace(/Render Videos/g, "3. Render");
  s = s.replace(/Output Gallery/g, "4. Outputs");
  s = s.replace(/>Queue</g, ">2. Queue<");
  s = s.replace(/>Help</g, ">Guide<");
  // Hard edges in App shell.
  s = s.replace(/rounded-xl/g, "rounded-none");
  s = s.replace(/rounded-lg/g, "rounded-none");
  s = s.replace(/rounded-md/g, "rounded-none");
  s = s.replace(/rounded-full/g, "rounded-sm");

  write(file, s);
  log("Patched: client/src/App.tsx");
}

function patchIndexCss() {
  const file = path.join(root, "client", "src", "index.css");
  if (!exists(file)) {
    console.warn("Skipped index.css: not found");
    return;
  }
  backup(file);
  let s = read(file);
  if (!s.includes("V8_PROFESSIONAL_HARD_EDGE_UI")) {
    s += `

/* V8_PROFESSIONAL_HARD_EDGE_UI
   Sharper, brokerage-style interface. This intentionally reduces the soft SaaS look.
   It affects the app UI only, not the rendered MP4 output.
*/
.rer-app-ui {
  --rer-panel: #111111;
  --rer-panel-2: #151515;
  --rer-border: #2a2a2a;
  --rer-border-strong: #525252;
  letter-spacing: 0.005em;
}

.rer-app-ui .rounded,
.rer-app-ui .rounded-sm,
.rer-app-ui .rounded-md,
.rer-app-ui .rounded-lg,
.rer-app-ui .rounded-xl,
.rer-app-ui .rounded-2xl,
.rer-app-ui .rounded-3xl,
.rer-app-ui .rounded-full {
  border-radius: 2px !important;
}

.rer-app-ui header {
  border-bottom: 1px solid var(--rer-border-strong);
  background: rgba(8, 8, 8, 0.96);
}

.rer-app-ui header nav {
  border: 1px solid var(--rer-border);
  background: #0b0b0b;
  padding: 2px;
  gap: 0;
}

.rer-app-ui header nav button {
  border-radius: 0 !important;
  border-right: 1px solid var(--rer-border);
  padding-left: 14px;
  padding-right: 14px;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.08em;
}

.rer-app-ui header nav button:last-child {
  border-right: 0;
}

.rer-app-ui input,
.rer-app-ui select,
.rer-app-ui textarea,
.rer-app-ui button {
  border-radius: 2px !important;
}

.rer-app-ui .bg-neutral-900 {
  background-color: var(--rer-panel);
}

.rer-app-ui .bg-neutral-800 {
  background-color: var(--rer-panel-2);
}

.rer-app-ui .border-neutral-800,
.rer-app-ui .border-neutral-700 {
  border-color: var(--rer-border);
}

.rer-app-ui h1,
.rer-app-ui h2 {
  letter-spacing: 0.02em;
}

.rer-app-ui h2 {
  color: #d4d4d4;
}
`;
  }
  write(file, s);
  log("Patched: client/src/index.css");
}

function patchLanding() {
  const file = path.join(root, "client", "src", "pages", "Landing.tsx");
  if (!exists(file)) return;
  backup(file);
  let s = read(file);
  s = s.replace(/rounded-full/g, "rounded-sm");
  s = s.replace(/rounded-xl/g, "rounded-none");
  s = s.replace(/rounded-lg/g, "rounded-none");
  write(file, s);
  log("Patched: client/src/pages/Landing.tsx");
}

function writeDocs() {
  const docsDir = path.join(root, "docs");
  ensureDir(docsDir);
  write(path.join(docsDir, "V8_SMART_FRAMING_AND_UI.md"), `# V8 Smart Framing + Professional UI

## What changed

This patch adds a safer default workflow:

1. Upload photos
2. The app reads each photo's real width and height
3. The app assigns a Smart Framing template
4. Most photos default to full-screen vertical crop
5. Ultra-wide rooms are flagged so the agent can review them
6. The UI is reorganized into numbered production steps
7. The app styling is sharper and more professional, with hard edges instead of rounded cards

## Smart Framing templates

- Exterior Hero
- Vertical Photo
- Square Photo
- Standard MLS
- Wide Room Pan
- Ultra-Wide Room
- Detail Shot

## Product rule

Default to full-screen vertical. Do not letterbox by default. Fit-to-screen should only be used when a very wide room becomes impossible to understand.

## Next best feature

Use these Smart Framing labels in a true side-by-side live Remotion preview so agents can see the exact final crop before rendering.
`);
}

function writeVerifier() {
  const file = path.join(root, "VERIFY_V8.ps1");
  const ps = `# Verify V8 Smart Framing + Professional UI
$ErrorActionPreference = "Stop"
Write-Host "==> Checking V8 patch"

$checks = @(
  @{Path="client\\\\src\\\\utils\\\\photoFraming.ts"; Pattern="recommendPhotoFramingForImage"; Label="Smart framing recommender exists"},
  @{Path="client\\\\src\\\\utils\\\\photoFraming.ts"; Pattern="detectImageDimensions"; Label="Image dimension detector exists"},
  @{Path="client\\\\src\\\\components\\\\CampaignForm.tsx"; Pattern="Smart Framing"; Label="Smart Framing UI exists"},
  @{Path="client\\\\src\\\\components\\\\CampaignForm.tsx"; Pattern="detectImageDimensions"; Label="CampaignForm reads image dimensions"},
  @{Path="client\\\\src\\\\index.css"; Pattern="V8_PROFESSIONAL_HARD_EDGE_UI"; Label="Hard-edge UI CSS exists"},
  @{Path="client\\\\src\\\\App.tsx"; Pattern="rer-app-ui"; Label="App shell class exists"}
)

$failed = $false
foreach ($c in $checks) {
  if (Select-String -Path $c.Path -Pattern $c.Pattern -Quiet) {
    Write-Host "OK   - $($c.Label)" -ForegroundColor Green
  } else {
    Write-Host "FAIL - $($c.Label)" -ForegroundColor Red
    $failed = $true
  }
}

if ($failed) {
  Write-Host ""
  Write-Host "One or more V8 checks failed. Send me this output." -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "V8 verification passed."
Write-Host "Run:"
Write-Host "npm run build"
Write-Host "Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force"
Write-Host "node server.js"
`;
  write(file, ps);
}

ensureDir(backupDir);
patchPhotoFramingUtil();
patchCampaignForm();
patchFrameModal();
patchApp();
patchIndexCss();
patchLanding();
writeDocs();
writeVerifier();

log("");
log("Backups saved to: " + path.basename(backupDir));
log("V8 Smart Framing + Professional UI patch complete.");
