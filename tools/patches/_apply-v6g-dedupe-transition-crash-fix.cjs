/**
 * Real Estate Reels V6G
 * Fix duplicate safeTransition declarations and duplicate PHOTO_TRANSITION exports.
 *
 * This is intentionally a repair script, not a feature patch.
 * It cleans up the accumulated V6 transition patch leftovers.
 */

const fs = require("fs");
const path = require("path");

const root = process.argv[2] || process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupDir = path.join(root, `.v6g-dedupe-transition-fix-backup-${stamp}`);

function exists(p) {
  return fs.existsSync(p);
}

function read(p) {
  return fs.readFileSync(p, "utf8");
}

function write(p, content) {
  fs.writeFileSync(p, content, "utf8");
}

function backup(rel) {
  const src = path.join(root, rel);
  if (!exists(src)) return;
  const dest = path.join(backupDir, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function removePhotoTransitionExports(s) {
  // Remove any generated TS export block for PHOTO_TRANSITION, including optional union type lines.
  let prev;
  do {
    prev = s;
    s = s.replace(
      /\n?export const PHOTO_TRANSITION[\s\S]*?(?=\nexport const\s+[A-Z_]+\s*=|\n`;\s*|\r?\n\/\/|\r?\n$)/g,
      "\n"
    );
  } while (s !== prev);
  return s;
}

function patchServer() {
  const rel = "server.js";
  const file = path.join(root, rel);
  if (!exists(file)) throw new Error("server.js not found");
  backup(rel);

  let s = read(file);

  // Remove previous V6G block if the script is run twice.
  s = s.replace(/\n\s*\/\/ V6G_TRANSITION_NORMALIZE_START[\s\S]*?\/\/ V6G_TRANSITION_NORMALIZE_END\s*\n/g, "\n");

  // Remove old transition map blocks from previous patches.
  s = s.replace(/\n\s*const\s+transitionMap\s*=\s*\{[\s\S]*?\};\s*/g, "\n");
  s = s.replace(/\n\s*const\s+allowedTransitions\s*=\s*new Set\([\s\S]*?\);\s*/g, "\n");

  // Remove old duplicate declarations.
  s = s.replace(/^\s*const\s+rawTransition\s*=.*;\r?\n/gm, "");
  s = s.replace(/^\s*const\s+rawPhotoTransition\s*=.*;\r?\n/gm, "");
  s = s.replace(/^\s*const\s+safeTransition\s*=.*;\r?\n/gm, "");
  s = s.replace(/^\s*let\s+safeTransition\s*=.*;\r?\n/gm, "");

  // Remove every PHOTO_TRANSITION line/block from the server's generated template.
  s = removePhotoTransitionExports(s);

  const normalizeBlock = `  // V6G_TRANSITION_NORMALIZE_START
  const rawPhotoTransitionV6G = String(campaign.photoTransition || 'smart-mix').trim().toLowerCase();
  const photoTransitionAliasesV6G = {
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
  const safeTransition = photoTransitionAliasesV6G[rawPhotoTransitionV6G] || 'smart-mix';
  // V6G_TRANSITION_NORMALIZE_END

`;

  const configNeedle = /(\n\s*)const\s+config\s*=\s*`\/\/ AUTO-GENERATED/;
  if (!configNeedle.test(s)) {
    throw new Error("Could not find writeConfig() config template insertion point in server.js");
  }
  s = s.replace(configNeedle, `$1${normalizeBlock}$1const config = \`// AUTO-GENERATED`);

  const clipLine = "export const CLIP_DURATION_SECONDS = ${duration};";
  if (!s.includes(clipLine)) {
    throw new Error("Could not find CLIP_DURATION_SECONDS in server.js generated config template");
  }
  s = s.replace(
    clipLine,
    `${clipLine}\nexport const PHOTO_TRANSITION = \${tsString(safeTransition)};`
  );

  const safeCount = (s.match(/\b(?:const|let)\s+safeTransition\b/g) || []).length;
  const templateTransitionCount = (s.match(/export const PHOTO_TRANSITION/g) || []).length;
  if (safeCount !== 1) {
    throw new Error(`server.js still has ${safeCount} safeTransition declarations after patch`);
  }
  if (templateTransitionCount !== 1) {
    throw new Error(`server.js still has ${templateTransitionCount} PHOTO_TRANSITION template exports after patch`);
  }

  write(file, s);
  console.log("Patched server.js");
}

function patchCampaignConfig() {
  const rel = path.join("remotion", "src", "campaign.config.ts");
  const file = path.join(root, rel);
  if (!exists(file)) throw new Error("remotion/src/campaign.config.ts not found");
  backup(rel);

  let s = read(file);
  s = removePhotoTransitionExports(s);

  if (!s.includes("export const CLIP_DURATION_SECONDS")) {
    // Safe fallback: append if the config is unusual.
    s += "\nexport const PHOTO_TRANSITION = 'smart-mix';\n";
  } else {
    s = s.replace(
      /(export const CLIP_DURATION_SECONDS\s*=\s*[^;]+;\s*)/,
      `$1\nexport const PHOTO_TRANSITION = 'smart-mix';\n`
    );
  }

  const count = (s.match(/export const PHOTO_TRANSITION/g) || []).length;
  if (count !== 1) {
    throw new Error(`campaign.config.ts still has ${count} PHOTO_TRANSITION exports after patch`);
  }

  write(file, s);
  console.log("Patched remotion/src/campaign.config.ts");
}

patchServer();
patchCampaignConfig();

console.log("");
console.log(`Backups saved to: ${backupDir}`);
console.log("V6G dedupe complete.");
