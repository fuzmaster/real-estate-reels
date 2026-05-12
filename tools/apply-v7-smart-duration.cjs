const fs = require('fs');
const path = require('path');

const root = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(root, `.v7-smart-duration-backup-${stamp}`);

function exists(p) { return fs.existsSync(p); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function write(p, s) { fs.writeFileSync(p, s, 'utf8'); }
function backup(file) {
  const full = path.join(root, file);
  if (!exists(full)) return;
  const dst = path.join(backupDir, file);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(full, dst);
}
function requireFile(file) {
  const full = path.join(root, file);
  if (!exists(full)) throw new Error(`Missing required file: ${file}`);
  return full;
}
function insertAfter(s, needle, insertion) {
  const i = s.indexOf(needle);
  if (i === -1) return null;
  return s.slice(0, i + needle.length) + insertion + s.slice(i + needle.length);
}

console.log(`Project: ${root}`);

const campaignFormPath = requireFile('client/src/components/CampaignForm.tsx');
const typesPath = requireFile('client/src/types.ts');
const utilsDir = path.join(root, 'client/src/utils');
fs.mkdirSync(utilsDir, { recursive: true });

backup('client/src/components/CampaignForm.tsx');
backup('client/src/types.ts');
if (exists(path.join(root, 'client/src/utils/smartDuration.ts'))) backup('client/src/utils/smartDuration.ts');

// 1) Add smart duration utility.
const smartDurationPath = path.join(utilsDir, 'smartDuration.ts');
write(smartDurationPath, `export function clampDuration(seconds: number, min = 6, max = 30): number {
  if (!Number.isFinite(seconds)) return min;
  return Math.max(min, Math.min(max, Math.round(seconds)));
}

export function calculateSmartDuration(photoCount: number): number {
  const count = Math.max(0, Math.floor(Number(photoCount) || 0));
  if (count <= 0) return 10;

  // Gemini-backed simple formula:
  // Hero shot = 2.5s
  // Every other photo = 1.5s
  // CTA ending = 2.5s
  // Clamp to 6s minimum and 30s maximum.
  const heroSeconds = 2.5;
  const normalPhotoSeconds = 1.5;
  const ctaSeconds = 2.5;
  const normalPhotos = Math.max(0, count - 1);
  return clampDuration(heroSeconds + normalPhotos * normalPhotoSeconds + ctaSeconds, 6, 30);
}

export function explainSmartDuration(photoCount: number, duration: number): string {
  const count = Math.max(0, Math.floor(Number(photoCount) || 0));
  if (count <= 0) return 'Upload photos to get an auto length recommendation.';
  const plural = count === 1 ? 'photo' : 'photos';
  return \`We recommend \${duration} seconds for \${count} \${plural} so each room gets seen without the reel feeling slow.\`;
}
`);
console.log('Updated: client/src/utils/smartDuration.ts');

// 2) Optional type fields for future persistence / debugging.
let types = read(typesPath);
if (!types.includes('useSmartDuration?: boolean')) {
  types = types.replace(/(\s+duration:\s*number;\s*\/\/[^\n]*\n)/, `$1  useSmartDuration?: boolean; // true when the app auto-calculates reel length from photo count\n  recommendedDuration?: number; // seconds suggested by Smart Duration\n`);
  write(typesPath, types);
  console.log('Patched: client/src/types.ts');
} else {
  console.log('Skipped: client/src/types.ts already has Smart Duration fields');
}

// 3) Patch CampaignForm.
let form = read(campaignFormPath);

// Import smart duration helpers.
if (!form.includes('../utils/smartDuration')) {
  const importNeedle = "import FrameYourShotModal from './FrameYourShotModal';";
  if (form.includes(importNeedle)) {
    form = insertAfter(form, importNeedle, "\nimport { calculateSmartDuration, explainSmartDuration } from '../utils/smartDuration';");
  } else {
    const lastImportMatch = [...form.matchAll(/^import .*?;$/gm)].pop();
    if (!lastImportMatch) throw new Error('Could not find import section in CampaignForm.tsx');
    const idx = lastImportMatch.index + lastImportMatch[0].length;
    form = form.slice(0, idx) + "\nimport { calculateSmartDuration, explainSmartDuration } from '../utils/smartDuration';" + form.slice(idx);
  }
}

// Add Smart Duration state near duration state.
if (!form.includes('const [useSmartDuration, setUseSmartDuration]')) {
  const durationStateRegex = /(^\s*const\s+\[duration,\s*setDuration\][^\n]+;\s*$\n?)/m;
  if (!durationStateRegex.test(form)) throw new Error('Could not find duration state in CampaignForm.tsx');
  form = form.replace(durationStateRegex, `$1  const [useSmartDuration, setUseSmartDuration] = useState(true);\n`);
}

// Add computed smart duration values after activeName.
if (!form.includes('const smartDuration = calculateSmartDuration(photos.length);')) {
  const activeNameRegex = /(^\s*const\s+activeName\s*=\s*[^\n]+;\s*$\n?)/m;
  if (!activeNameRegex.test(form)) throw new Error('Could not find activeName declaration in CampaignForm.tsx');
  form = form.replace(activeNameRegex, `$1\n  const smartDuration = calculateSmartDuration(photos.length);\n  const effectiveDuration = useSmartDuration ? smartDuration : duration;\n  const smartDurationExplanation = explainSmartDuration(photos.length, smartDuration);\n`);
}

// Ensure payload uses effectiveDuration and includes debug metadata.
form = form.replace(/(\n\s*)duration,\n/, `$1duration: effectiveDuration,\n      useSmartDuration,\n      recommendedDuration: smartDuration,\n`);

// Insert Smart Duration card before Photo Transition Style or Choose Video Template.
if (!form.includes('V7_SMART_DURATION_CARD_START')) {
  const smartCard = `
        {/* V7_SMART_DURATION_CARD_START */}
        <Card
          title="Smart Duration"
          help="Auto Length protects agents from making slow reels. It recommends a reel length from the number of photos."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setUseSmartDuration(true)}
              className={\`rounded-lg border px-4 py-3 text-left transition-colors \${useSmartDuration ? 'border-white/70 bg-white/10 text-white' : 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-white'}\`}
            >
              <div className="text-sm font-bold">✓ Auto Length</div>
              <div className="text-xs text-neutral-500 mt-1">Recommended for agents</div>
            </button>
            <button
              type="button"
              onClick={() => setUseSmartDuration(false)}
              className={\`rounded-lg border px-4 py-3 text-left transition-colors \${!useSmartDuration ? 'border-white/70 bg-white/10 text-white' : 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-white'}\`}
            >
              <div className="text-sm font-bold">Manual Length</div>
              <div className="text-xs text-neutral-500 mt-1">Uses the duration slider above</div>
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-500">Recommended Reel Length</p>
                <p className="text-2xl font-black text-white mt-1">{smartDuration}s</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-neutral-500">Render will use</p>
                <p className="text-xl font-bold text-white mt-1">{effectiveDuration}s</p>
              </div>
            </div>
            <p className="text-sm text-neutral-400 mt-3 leading-relaxed">{smartDurationExplanation}</p>
            <p className="text-xs text-neutral-600 mt-2">Formula: hero shot 2.5s + each extra photo 1.5s + CTA 2.5s. Minimum 6s. Maximum 30s.</p>
          </div>
        </Card>
        {/* V7_SMART_DURATION_CARD_END */}
`;
  const transitionNeedle = '        <Card title="Photo Transition Style"';
  const transitionIndex = form.indexOf(transitionNeedle);
  if (transitionIndex !== -1) {
    form = form.slice(0, transitionIndex) + smartCard + form.slice(transitionIndex);
  } else {
    const templateNeedle = '        <Card title="Choose Video Template"';
    const templateIndex = form.indexOf(templateNeedle);
    if (templateIndex === -1) throw new Error('Could not find insertion point for Smart Duration card');
    form = form.slice(0, templateIndex) + smartCard + form.slice(templateIndex);
  }
}

// Make existing duration label clearer if present.
form = form.replace(/Duration\s+—\s+<span/g, 'Manual Duration — <span');

write(campaignFormPath, form);
console.log('Patched: client/src/components/CampaignForm.tsx');

// 4) Harden photo framing default utility. This is already true in your code, but keep it enforced.
const framingPath = path.join(root, 'client/src/utils/photoFraming.ts');
if (exists(framingPath)) {
  backup('client/src/utils/photoFraming.ts');
  let framing = read(framingPath);
  framing = framing.replace(/cropMode:\s*'whole'/g, "cropMode: 'fill'");
  framing = framing.replace(/scale:\s*1,/, 'scale: 1.05,');
  if (!framing.includes('V7 default: prefer immersive vertical fill')) {
    framing = framing.replace(/export const DEFAULT_PHOTO_FRAMING:[\s\S]*?};/, `// V7 default: prefer immersive vertical fill. Agents can still choose whole-photo mode in Frame Your Shot.\nexport const DEFAULT_PHOTO_FRAMING: PhotoFraming = {\n  cropMode: 'fill',\n  x: 0,\n  y: 0,\n  scale: 1.05,\n};`);
  }
  write(framingPath, framing);
  console.log('Patched: client/src/utils/photoFraming.ts');
}

console.log(`Backups saved to: ${path.relative(root, backupDir)}`);
