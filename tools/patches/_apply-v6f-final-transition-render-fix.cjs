/* Real Estate Reels - V6F Final Transition Render Fix
   Fixes:
   1) TypeScript build errors from old transition id comparisons.
   2) Duplicate PHOTO_TRANSITION exports in remotion/src/campaign.config.ts.
   3) server.js generating duplicate PHOTO_TRANSITION lines.
   4) Normalizes old transition values to canonical values.
*/
const fs = require('fs');
const path = require('path');

const root = __dirname;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(root, `.v6f-final-transition-fix-backup-${stamp}`);
fs.mkdirSync(backupDir, { recursive: true });

function rel(p) { return path.join(root, p); }

function backup(file) {
  const src = rel(file);
  if (!fs.existsSync(src)) {
    console.warn(`WARN - Missing ${file}`);
    return;
  }
  const dest = path.join(backupDir, file.replace(/[\\/]/g, '__'));
  fs.copyFileSync(src, dest);
}

function read(file) {
  return fs.readFileSync(rel(file), 'utf8');
}

function write(file, content) {
  fs.writeFileSync(rel(file), content, 'utf8');
  console.log(`Patched ${file}`);
}

function replaceAllLiteral(s, from, to) {
  return s.split(from).join(to);
}

function normalizeTransitionSourceText(s) {
  const literalPairs = [
    [`'smart'`, `'smart-mix'`],
    [`"smart"`, `"smart-mix"`],
    [`'fade'`, `'soft-fade'`],
    [`"fade"`, `"soft-fade"`],
    [`'slide-in'`, `'slide-left'`],
    [`"slide-in"`, `"slide-left"`],
    [`'slide'`, `'slide-left'`],
    [`"slide"`, `"slide-left"`],
    [`'whip'`, `'whip-pan'`],
    [`"whip"`, `"whip-pan"`],
    [`'flash'`, `'flash-cut'`],
    [`"flash"`, `"flash-cut"`],
  ];
  for (const [a,b] of literalPairs) s = replaceAllLiteral(s, a, b);
  return s;
}

// 1) client/src/types.ts
{
  const file = 'client/src/types.ts';
  backup(file);
  let s = read(file);

  const canonicalType =
`export type PhotoTransition =
  | 'smart-mix'
  | 'soft-fade'
  | 'slide-left'
  | 'slide-up'
  | 'zoom-pop'
  | 'whip-pan'
  | 'flash-cut'
  | 'none';`;

  if (/export type PhotoTransition\s*=[\s\S]*?;/.test(s)) {
    s = s.replace(/export type PhotoTransition\s*=[\s\S]*?;/, canonicalType);
  } else {
    s += `\n\n${canonicalType}\n`;
  }

  s = normalizeTransitionSourceText(s);
  write(file, s);
}

// 2) client/src/components/CampaignForm.tsx
{
  const file = 'client/src/components/CampaignForm.tsx';
  backup(file);
  let s = read(file);

  s = normalizeTransitionSourceText(s);

  // Fix display icon comparisons to canonical transition values if a ternary icon block exists.
  s = s
    .replace(/opt\.id\s*===\s*'smart-mix'\s*\?\s*'✦'/g, `opt.id === 'smart-mix'  ? '✦'`)
    .replace(/opt\.id\s*===\s*'soft-fade'\s*\?\s*'◑'/g, `opt.id === 'soft-fade'  ? '◑'`)
    .replace(/opt\.id\s*===\s*'slide-left'\s*\?\s*'↔'/g, `opt.id === 'slide-left' ? '↔'`)
    .replace(/opt\.id\s*===\s*'slide-up'\s*\?\s*'↥'/g, `opt.id === 'slide-up'   ? '↥'`)
    .replace(/opt\.id\s*===\s*'zoom-pop'\s*\?\s*'◎'/g, `opt.id === 'zoom-pop'   ? '◎'`)
    .replace(/opt\.id\s*===\s*'whip-pan'\s*\?\s*'⚡'/g, `opt.id === 'whip-pan'   ? '⚡'`)
    .replace(/opt\.id\s*===\s*'flash-cut'\s*\?\s*'◈'/g, `opt.id === 'flash-cut'  ? '◈'`);

  // If the selected transition still defaults to an old value, fix it.
  s = s.replace(/useState<PhotoTransition>\('smart-mix'\)/g, `useState<PhotoTransition>('smart-mix')`);

  write(file, s);
}

// 3) server.js
{
  const file = 'server.js';
  backup(file);
  let s = read(file);

  // Add/normalize helper.
  const helper = `
function normalizePhotoTransition(value) {
  const raw = String(value || 'smart-mix').trim().toLowerCase();
  const aliases = {
    'smart': 'smart-mix',
    'smart-mix': 'smart-mix',
    'fade': 'soft-fade',
    'soft-fade': 'soft-fade',
    'slide': 'slide-left',
    'slide-in': 'slide-left',
    'slide-left': 'slide-left',
    'slide-up': 'slide-up',
    'zoom': 'zoom-pop',
    'zoom-pop': 'zoom-pop',
    'whip': 'whip-pan',
    'whip-pan': 'whip-pan',
    'flash': 'flash-cut',
    'flash-cut': 'flash-cut',
    'none': 'none',
  };
  return aliases[raw] || 'smart-mix';
}
`;

  if (!/function normalizePhotoTransition\s*\(/.test(s)) {
    // Insert before writeConfig if possible.
    if (/function writeConfig\s*\(/.test(s)) {
      s = s.replace(/function writeConfig\s*\(/, helper + `\nfunction writeConfig(`);
    } else if (/function tsString\s*\(/.test(s)) {
      s = s.replace(/function tsString\s*\([^)]*\)\s*\{[\s\S]*?\n\}/, (m) => m + '\n' + helper);
    } else {
      s += '\n' + helper;
    }
  }

  // Make sure safeTransition exists in writeConfig.
  if (!/const\s+safeTransition\s*=\s*normalizePhotoTransition\(campaign\.photoTransition\)/.test(s)) {
    s = s.replace(
      /const\s+duration\s*=\s*Number\(campaign\.duration\)[\s\S]*?;\s*/,
      (m) => m + `  const safeTransition = normalizePhotoTransition(campaign.photoTransition);\n`
    );
  }

  // Remove every generated PHOTO_TRANSITION export line from the template text.
  // These lines appear inside the backtick config string, but line-based removal is safest.
  s = s.replace(/^\s*export const PHOTO_TRANSITION\s*=\s*\$\{tsString\([^)]*\)\};\s*$/gm, '');
  s = s.replace(/^\s*export const PHOTO_TRANSITION\s*=\s*['"][^'"]*['"];\s*$/gm, '');

  // Add exactly one PHOTO_TRANSITION export after CLIP_DURATION_SECONDS inside config string.
  if (!/export const PHOTO_TRANSITION\s*=\s*\$\{tsString\(safeTransition\)\};/.test(s)) {
    s = s.replace(
      /export const CLIP_DURATION_SECONDS = \$\{duration\};/,
      `export const CLIP_DURATION_SECONDS = \${duration};\nexport const PHOTO_TRANSITION = \${tsString(safeTransition)};`
    );
  }

  // Safety: If EventEmitter has no generic error listener, prevent hard Node crash.
  if (!/emitter\.on\('error',\s*\(\)\s*=>\s*\{\s*\}\s*\)/.test(s)) {
    s = s.replace(
      /const emitter = new EventEmitter\(\);\s*\n\s*emitter\.setMaxListeners\(20\);/,
      `const emitter = new EventEmitter();\n  emitter.setMaxListeners(20);\n  // Prevent Node from crashing if an error event fires before the SSE listener attaches.\n  emitter.on('error', () => {});`
    );
  }

  write(file, s);
}

// 4) remotion/src/campaign.config.ts - clean generated duplicate exports now.
{
  const file = 'remotion/src/campaign.config.ts';
  if (fs.existsSync(rel(file))) {
    backup(file);
    let s = read(file);

    // Remove all current PHOTO_TRANSITION export lines.
    s = s.replace(/^\s*export const PHOTO_TRANSITION\s*=\s*['"][^'"]*['"];\s*$/gm, '');

    // Add one canonical fallback export.
    if (/export const CLIP_DURATION_SECONDS\s*=.*;/.test(s)) {
      s = s.replace(/(export const CLIP_DURATION_SECONDS\s*=.*;)/, `$1\nexport const PHOTO_TRANSITION = 'smart-mix';`);
    } else {
      s += `\nexport const PHOTO_TRANSITION = 'smart-mix';\n`;
    }

    write(file, s);
  }
}

// 5) remotion/src/Root.tsx - fix accidental spread typo if present and dedupe PHOTO_TRANSITION import visually.
{
  const file = 'remotion/src/Root.tsx';
  if (fs.existsSync(rel(file))) {
    backup(file);
    let s = read(file);

    s = s.replace(/defaultProps=\{\{\s*\.sharedProps/g, 'defaultProps={{ ...sharedProps');

    // Remove duplicated PHOTO_TRANSITION lines in the import block.
    const lines = s.split(/\r?\n/);
    let seen = false;
    const cleaned = lines.filter(line => {
      if (/^\s*PHOTO_TRANSITION,\s*$/.test(line)) {
        if (seen) return false;
        seen = true;
      }
      return true;
    });
    s = cleaned.join('\n');

    write(file, s);
  }
}

console.log('');
console.log('V6F final transition render fix applied.');
console.log(`Backups saved to: ${path.basename(backupDir)}`);
console.log('');
console.log('Run:');
console.log('  npm run build');
console.log('  Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force');
console.log('  node server.js');
