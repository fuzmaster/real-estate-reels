/*
  Real Estate Reels V9 - Vibe Presets + Render Debug System
  Run from project root via apply-v9-vibe-debug.ps1
*/
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDir = path.join(root, `.v9-vibe-debug-backup-${stamp}`);

function exists(p) { return fs.existsSync(p); }
function read(p) { return fs.readFileSync(p, 'utf8'); }
function write(p, s) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s, 'utf8'); }
function backup(p) {
  if (!exists(p)) return;
  const rel = path.relative(root, p);
  const dest = path.join(backupDir, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(p, dest);
}
function patchFile(rel, fn) {
  const file = path.join(root, rel);
  if (!exists(file)) { console.warn(`Skipped missing ${rel}`); return; }
  backup(file);
  const before = read(file);
  const after = fn(before);
  if (after !== before) {
    write(file, after);
    console.log(`Patched ${rel}`);
  } else {
    console.log(`No change needed ${rel}`);
  }
}

function insertAfterFirst(s, needle, addition) {
  const i = s.indexOf(needle);
  if (i < 0) return s;
  const end = i + needle.length;
  return s.slice(0, end) + addition + s.slice(end);
}

function patchTypes() {
  patchFile('client/src/types.ts', (s) => {
    const vibeType = `\nexport type ReelVibe =\n  | 'clean-professional'\n  | 'warm-inviting'\n  | 'luxury-cinematic'\n  | 'fast-social'\n  | 'price-drop-urgent';\n`;

    if (!s.includes('export type ReelVibe')) {
      if (/export type MusicMood\s*=\s*[\s\S]*?;\s*/.test(s)) {
        s = s.replace(/(export type MusicMood\s*=\s*[\s\S]*?;\s*)/, `$1${vibeType}`);
      } else if (/export type PhotoTransition[^;]+;\s*/.test(s)) {
        s = s.replace(/(export type PhotoTransition[^;]+;\s*)/, `$1${vibeType}`);
      } else {
        s = vibeType + '\n' + s;
      }
    }

    if (!/\breelVibe\s*:\s*ReelVibe\s*;/.test(s)) {
      if (/\s+videoStyle\s*:[^\n]+;/.test(s)) {
        s = s.replace(/(\s+videoStyle\s*:[^\n]+;)/, `  reelVibe: ReelVibe;\n$1`);
      } else if (/\s+duration\s*:\s*number;[^\n]*\n/.test(s)) {
        s = s.replace(/(\s+duration\s*:\s*number;[^\n]*\n)/, `$1  reelVibe: ReelVibe;\n`);
      } else {
        s = s.replace(/(export interface CampaignFormData\s*\{)/, `$1\n  reelVibe: ReelVibe;`);
      }
    }
    return s;
  });
}

function patchCampaignForm() {
  patchFile('client/src/components/CampaignForm.tsx', (s) => {
    // Import ReelVibe into the existing type import.
    if (!/import type \{[\s\S]*ReelVibe[\s\S]*\} from '\.\.\/types';/.test(s)) {
      s = s.replace(/import type \{([\s\S]*?)\} from '\.\.\/types';/, (m, inner) => {
        if (inner.includes('ReelVibe')) return m;
        return `import type {${inner.replace(/\s*$/, '')}, ReelVibe } from '../types';`;
      });
    }

    const vibeOptions = `\nconst VIBE_OPTIONS: {\n  id: ReelVibe;\n  label: string;\n  description: string;\n  videoStyle: VideoStyle;\n  pacing: PacingPreset;\n  musicMood: MusicMood;\n  photoTransition: PhotoTransition;\n  autoEnhance: boolean;\n  progressBar: boolean;\n}[] = [\n  {\n    id: 'clean-professional',\n    label: 'Clean Professional',\n    description: 'Safe brokerage look with clean motion and neutral pacing.',\n    videoStyle: 'brokerage-clean',\n    pacing: 'balanced',\n    musicMood: 'corporate-professional',\n    photoTransition: 'soft-fade',\n    autoEnhance: true,\n    progressBar: false,\n  },\n  {\n    id: 'warm-inviting',\n    label: 'Warm & Inviting',\n    description: 'Best default for starter homes, family homes, and cozy interiors.',\n    videoStyle: 'brokerage-clean',\n    pacing: 'balanced',\n    musicMood: 'warm-inviting',\n    photoTransition: 'smart-mix',\n    autoEnhance: true,\n    progressBar: true,\n  },\n  {\n    id: 'luxury-cinematic',\n    label: 'Luxury Cinematic',\n    description: 'Slower, cleaner, and more premium for higher-end listings.',\n    videoStyle: 'luxury-cinematic',\n    pacing: 'cinematic',\n    musicMood: 'luxury-cinematic',\n    photoTransition: 'soft-fade',\n    autoEnhance: true,\n    progressBar: false,\n  },\n  {\n    id: 'fast-social',\n    label: 'Fast Social',\n    description: 'Sharper cuts for Reels, TikTok, and quick-scroll attention.',\n    videoStyle: 'social-punchy',\n    pacing: 'fast',\n    musicMood: 'high-energy-social',\n    photoTransition: 'smart-mix',\n    autoEnhance: true,\n    progressBar: true,\n  },\n  {\n    id: 'price-drop-urgent',\n    label: 'Price Drop / Urgent',\n    description: 'More aggressive pacing for price drops and back-on-market promos.',\n    videoStyle: 'social-punchy',\n    pacing: 'fast',\n    musicMood: 'urgent-driving',\n    photoTransition: 'flash-cut',\n    autoEnhance: true,\n    progressBar: true,\n  },\n];\n`;

    if (!s.includes('const VIBE_OPTIONS')) {
      if (s.includes('const TRANSITION_OPTIONS')) {
        const nextConst = s.indexOf('\nconst ', s.indexOf('const TRANSITION_OPTIONS') + 1);
        if (nextConst > -1) s = s.slice(0, nextConst) + vibeOptions + s.slice(nextConst);
        else s += vibeOptions;
      } else if (s.includes('const CTA_PRESETS')) {
        s = s.replace('const CTA_PRESETS', vibeOptions + '\nconst CTA_PRESETS');
      } else {
        s = s.replace(/const TEMPLATE_OPTIONS[\s\S]*?;\n/, (m) => m + vibeOptions);
      }
    }

    if (!/const \[reelVibe,\s*setReelVibe\]/.test(s)) {
      if (/const \[musicMood,\s*setMusicMood\][^\n]+;/.test(s)) {
        s = s.replace(/(const \[musicMood,\s*setMusicMood\][^\n]+;)/, `$1\n  const [reelVibe, setReelVibe] = useState<ReelVibe>('warm-inviting');`);
      } else if (/const \[videoStyle,\s*setVideoStyle\][^\n]+;/.test(s)) {
        s = s.replace(/(const \[videoStyle,\s*setVideoStyle\][^\n]+;)/, `$1\n  const [reelVibe, setReelVibe] = useState<ReelVibe>('warm-inviting');`);
      } else {
        s = s.replace(/(const activeName[^\n]+;)/, `  const [reelVibe, setReelVibe] = useState<ReelVibe>('warm-inviting');\n\n$1`);
      }
    }

    const applyFn = `\n  function applyReelVibe(vibeId: ReelVibe) {\n    const vibe = VIBE_OPTIONS.find(v => v.id === vibeId);\n    if (!vibe) return;\n    setReelVibe(vibe.id);\n    setVideoStyle(vibe.videoStyle);\n    setPacing(vibe.pacing);\n    setMusicMood(vibe.musicMood);\n    setPhotoTransition(vibe.photoTransition);\n    setAutoEnhance(vibe.autoEnhance);\n    setProgressBar(vibe.progressBar);\n  }\n`;

    if (!s.includes('function applyReelVibe')) {
      if (/\n\s*const activeName[^\n]+;/.test(s)) {
        s = s.replace(/(\n\s*const activeName[^\n]+;)/, `$1\n${applyFn}`);
      } else {
        s = s.replace(/(export default function CampaignForm[\s\S]*?\{)/, `$1\n${applyFn}`);
      }
    }

    if (!/\breelVibe\s*,/.test(s)) {
      if (/\s+videoStyle,\s*\n/.test(s)) {
        s = s.replace(/(\s+videoStyle,\s*\n)/, `      reelVibe,\n$1`);
      } else if (/\s+duration,\s*\n/.test(s)) {
        s = s.replace(/(\s+duration,\s*\n)/, `$1      reelVibe,\n`);
      }
    }

    const card = `\n        {/* V9_REEL_VIBE_START */}\n        <Card\n          title="1. Choose Reel Vibe"\n          help="Pick the overall edit style. This automatically sets pacing, music mood, transitions, and polish controls. You can still override details below."\n        >\n          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">\n            {VIBE_OPTIONS.map(vibe => {\n              const selected = reelVibe === vibe.id;\n              return (\n                <button\n                  key={vibe.id}\n                  type="button"\n                  onClick={() => applyReelVibe(vibe.id)}\n                  className={`text-left border px-4 py-3 transition-colors rounded-none ${selected\n                    ? 'bg-white text-black border-white'\n                    : 'bg-neutral-950 border-neutral-700 text-neutral-300 hover:border-neutral-400 hover:text-white'}`}\n                >\n                  <div className="flex items-center justify-between gap-3">\n                    <span className="text-sm font-bold uppercase tracking-wide">{vibe.label}</span>\n                    {selected && <span className="text-[10px] font-bold uppercase">Selected</span>}\n                  </div>\n                  <p className={`mt-1 text-xs leading-relaxed ${selected ? 'text-neutral-700' : 'text-neutral-500'}`}>\n                    {vibe.description}\n                  </p>\n                </button>\n              );\n            })}\n          </div>\n        </Card>\n        {/* V9_REEL_VIBE_END */}\n`;

    if (!s.includes('V9_REEL_VIBE_START')) {
      if (s.includes('<Card title="Video Controls"')) {
        s = s.replace(/\n\s*<Card title="Video Controls"/, card + '\n        <Card title="Video Controls"');
      } else if (s.includes('title="Video Controls"')) {
        s = s.replace(/\n\s*<Card[\s\S]{0,80}title="Video Controls"/, (m) => card + m);
      } else if (s.includes('Choose Video Template')) {
        s = s.replace(/\n\s*<Card title="Choose Video Template"/, card + '\n        <Card title="Choose Video Template"');
      }
    }

    // Small safety: make hard-edge UI on newly inserted controls even if global CSS misses it.
    return s;
  });
}

function createDebugPanel() {
  const file = path.join(root, 'client/src/components/DebugPanel.tsx');
  backup(file);
  const content = `import { useEffect, useState } from 'react';\nimport { API_BASE } from '../api';\n\ninterface DebugStatus {\n  ok: boolean;\n  serverTime: string;\n  nodeVersion: string;\n  configured: boolean;\n  assetsRoot: string;\n  remotionProject: string;\n  assetsRootExists: boolean;\n  remotionProjectExists: boolean;\n  projectsCount: number;\n  outputsCount: number;\n  jobs: { total: number; queued: number; running: number; done: number; error: number };\n  renderQueueLength: number;\n  isRendering: boolean;\n  campaignConfig: { exists: boolean; photoTransitionExports: number; clipDurationExports: number; issues: string[] };\n}\n\nexport default function DebugPanel() {\n  const [status, setStatus] = useState<DebugStatus | null>(null);\n  const [loading, setLoading] = useState(false);\n  const [message, setMessage] = useState('');\n\n  async function load() {\n    setLoading(true);\n    setMessage('');\n    try {\n      const res = await fetch(\`${API_BASE}/api/debug/status\`);\n      if (!res.ok) throw new Error('Debug status failed');\n      setStatus(await res.json());\n    } catch (e) {\n      setMessage(e instanceof Error ? e.message : 'Could not load debug status');\n    } finally {\n      setLoading(false);\n    }\n  }\n\n  async function resetConfig() {\n    if (!confirm('Reset generated Remotion config to a safe default? This does not delete projects or outputs.')) return;\n    setLoading(true);\n    try {\n      const res = await fetch(\`${API_BASE}/api/debug/reset-config\`, { method: 'POST' });\n      if (!res.ok) throw new Error('Reset failed');\n      setMessage('Generated config reset. Run another render when ready.');\n      await load();\n    } catch (e) {\n      setMessage(e instanceof Error ? e.message : 'Could not reset config');\n    } finally {\n      setLoading(false);\n    }\n  }\n\n  useEffect(() => { load(); }, []);\n\n  return (\n    <div className=\"space-y-5\">\n      <div className=\"flex items-start justify-between gap-4\">\n        <div>\n          <h1 className=\"text-2xl font-bold text-white mb-1\">Debug</h1>\n          <p className=\"text-neutral-400 text-sm\">Check the render server, project folders, generated config, and recent jobs.</p>\n        </div>\n        <button type=\"button\" onClick={load} className=\"bg-white text-black text-sm font-bold px-4 py-2 rounded-none disabled:opacity-50\" disabled={loading}>\n          {loading ? 'Checking…' : 'Refresh'}\n        </button>\n      </div>\n\n      {message && <div className=\"border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-neutral-200 rounded-none\">{message}</div>}\n\n      {status && (\n        <>\n          <Section title=\"Server\">\n            <Row label=\"Status\" value={status.ok ? 'OK' : 'Problem'} good={status.ok} />\n            <Row label=\"Node\" value={status.nodeVersion} />\n            <Row label=\"Configured\" value={status.configured ? 'Yes' : 'No'} good={status.configured} />\n            <Row label=\"Assets folder\" value={status.assetsRoot} mono />\n            <Row label=\"Assets exists\" value={status.assetsRootExists ? 'Yes' : 'No'} good={status.assetsRootExists} />\n            <Row label=\"Remotion folder\" value={status.remotionProject} mono />\n            <Row label=\"Remotion exists\" value={status.remotionProjectExists ? 'Yes' : 'No'} good={status.remotionProjectExists} />\n          </Section>\n\n          <Section title=\"Render Health\">\n            <Row label=\"Projects\" value={String(status.projectsCount)} />\n            <Row label=\"Output videos\" value={String(status.outputsCount)} />\n            <Row label=\"Rendering now\" value={status.isRendering ? 'Yes' : 'No'} />\n            <Row label=\"Queue length\" value={String(status.renderQueueLength)} />\n            <Row label=\"Jobs\" value={\`total ${status.jobs.total} / done ${status.jobs.done} / errors ${status.jobs.error}\`} />\n          </Section>\n\n          <Section title=\"Generated Config\">\n            <Row label=\"campaign.config.ts\" value={status.campaignConfig.exists ? 'Exists' : 'Missing'} good={status.campaignConfig.exists} />\n            <Row label=\"PHOTO_TRANSITION exports\" value={String(status.campaignConfig.photoTransitionExports)} good={status.campaignConfig.photoTransitionExports <= 1} />\n            <Row label=\"CLIP_DURATION exports\" value={String(status.campaignConfig.clipDurationExports)} good={status.campaignConfig.clipDurationExports <= 1} />\n            {status.campaignConfig.issues.length > 0 ? (\n              <div className=\"mt-3 border border-red-900 bg-red-950/40 p-3 text-sm text-red-200 rounded-none\">\n                <div className=\"font-bold uppercase text-xs mb-2\">Issues</div>\n                <ul className=\"list-disc pl-5 space-y-1\">\n                  {status.campaignConfig.issues.map(issue => <li key={issue}>{issue}</li>)}\n                </ul>\n              </div>\n            ) : (\n              <div className=\"mt-3 border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-200 rounded-none\">No config issues detected.</div>\n            )}\n            <button type=\"button\" onClick={resetConfig} className=\"mt-4 border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-white hover:border-neutral-400 rounded-none\">\n              Reset Generated Config\n            </button>\n          </Section>\n        </>\n      )}\n    </div>\n  );\n}\n\nfunction Section({ title, children }: { title: string; children: React.ReactNode }) {\n  return (\n    <div className=\"border border-neutral-800 bg-neutral-900/60 p-5 rounded-none\">\n      <h2 className=\"text-sm font-bold uppercase tracking-wider text-white mb-4\">{title}</h2>\n      <div className=\"space-y-2\">{children}</div>\n    </div>\n  );\n}\n\nfunction Row({ label, value, good, mono }: { label: string; value: string; good?: boolean; mono?: boolean }) {\n  return (\n    <div className=\"grid grid-cols-3 gap-4 border-b border-neutral-800 pb-2 text-sm last:border-b-0\">\n      <div className=\"text-neutral-500\">{label}</div>\n      <div className={\`col-span-2 break-all ${mono ? 'font-mono text-xs' : ''} ${good === undefined ? 'text-neutral-200' : good ? 'text-emerald-300' : 'text-red-300'}\`}>\n        {value}\n      </div>\n    </div>\n  );\n}\n`;
  write(file, content);
  console.log('Wrote client/src/components/DebugPanel.tsx');
}

function patchApp() {
  patchFile('client/src/App.tsx', (s) => {
    if (!s.includes("import DebugPanel from './components/DebugPanel';")) {
      s = s.replace("import Settings from './components/Settings';", "import Settings from './components/Settings';\nimport DebugPanel from './components/DebugPanel';");
    }
    if (/type View = ([^;]+);/.test(s) && !/type View = [^;]*'debug'/.test(s)) {
      s = s.replace(/type View = ([^;]+);/, (m, inner) => `type View = ${inner} | 'debug';`);
    }
    if (!s.includes("view === 'debug'")) {
      if (s.includes("<NavBtn active={view === 'settings'}")) {
        s = s.replace(/\n\s*<NavBtn active=\{view === 'settings'\}/, "\n            <NavBtn active={view === 'debug'} onClick={() => setView('debug')}>\n              Debug\n            </NavBtn>\n            <NavBtn active={view === 'settings'}");
      }
      if (s.includes("{view === 'settings' && <Settings />}")) {
        s = s.replace("{view === 'settings' && <Settings />}", "{view === 'settings' && <Settings />}\n        {view === 'debug' && <DebugPanel />}");
      } else if (s.includes("<Settings />")) {
        s = s.replace(/(\{view === 'settings'[\s\S]*?<Settings \/>\})/, `$1\n        {view === 'debug' && <DebugPanel />}`);
      }
    }
    return s;
  });
}

function patchServerDebugRoutes() {
  patchFile('server.js', (s) => {
    if (s.includes('V9_DEBUG_ROUTES_START')) return s;

    const routes = `\n\n// V9_DEBUG_ROUTES_START\nfunction countRegexMatches(text, regex) {\n  const m = text.match(regex);\n  return m ? m.length : 0;\n}\n\nfunction getDebugStatus() {\n  const projectsDir = ASSETS_ROOT ? path.join(ASSETS_ROOT, 'Projects') : '';\n  const outDir = REMOTION_PROJECT ? path.join(REMOTION_PROJECT, 'out') : '';\n  const configFile = REMOTION_PROJECT ? path.join(REMOTION_PROJECT, 'src', 'campaign.config.ts') : '';\n\n  let projectsCount = 0;\n  let outputsCount = 0;\n  let configText = '';\n  const issues = [];\n\n  try {\n    if (projectsDir && fs.existsSync(projectsDir)) {\n      projectsCount = fs.readdirSync(projectsDir, { withFileTypes: true }).filter(d => d.isDirectory()).length;\n    }\n  } catch (e) { issues.push('Could not count projects: ' + e.message); }\n\n  try {\n    if (outDir && fs.existsSync(outDir)) {\n      const campaignDirs = fs.readdirSync(outDir, { withFileTypes: true }).filter(d => d.isDirectory());\n      for (const d of campaignDirs) {\n        const dir = path.join(outDir, d.name);\n        outputsCount += fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.mp4')).length;\n      }\n    }\n  } catch (e) { issues.push('Could not count outputs: ' + e.message); }\n\n  if (configFile && fs.existsSync(configFile)) {\n    try { configText = fs.readFileSync(configFile, 'utf8'); }\n    catch (e) { issues.push('Could not read campaign.config.ts: ' + e.message); }\n  } else {\n    issues.push('campaign.config.ts is missing');\n  }\n\n  const photoTransitionExports = countRegexMatches(configText, /export\\s+const\\s+PHOTO_TRANSITION\\b/g);\n  const clipDurationExports = countRegexMatches(configText, /export\\s+const\\s+CLIP_DURATION_SECONDS\\b/g);\n  if (photoTransitionExports > 1) issues.push('Duplicate PHOTO_TRANSITION exports found');\n  if (clipDurationExports > 1) issues.push('Duplicate CLIP_DURATION_SECONDS exports found');\n\n  const jobList = Array.from(jobs.values ? jobs.values() : []);\n  const jobCounts = {\n    total: jobList.length,\n    queued: jobList.filter(j => j.status === 'queued').length,\n    running: jobList.filter(j => j.status === 'running').length,\n    done: jobList.filter(j => j.status === 'done').length,\n    error: jobList.filter(j => j.status === 'error').length,\n  };\n\n  return {\n    ok: issues.length === 0,\n    serverTime: new Date().toISOString(),\n    nodeVersion: process.version,\n    configured: !!configValid,\n    assetsRoot: ASSETS_ROOT || '',\n    remotionProject: REMOTION_PROJECT || '',\n    assetsRootExists: !!(ASSETS_ROOT && fs.existsSync(ASSETS_ROOT)),\n    remotionProjectExists: !!(REMOTION_PROJECT && fs.existsSync(REMOTION_PROJECT)),\n    projectsCount,\n    outputsCount,\n    jobs: jobCounts,\n    renderQueueLength: Array.isArray(renderQueue) ? renderQueue.length : 0,\n    isRendering: !!isRendering,\n    campaignConfig: {\n      exists: !!(configFile && fs.existsSync(configFile)),\n      photoTransitionExports,\n      clipDurationExports,\n      issues,\n    },\n  };\n}\n\nfunction safeDefaultCampaignConfig() {\n  return \\`// AUTO-GENERATED by real-estate-reels-web — safe debug reset.\\n// This file will be overwritten by the next render.\\n\\nexport const PROJECT_FOLDER = '';\\nexport const LISTING_PHOTOS: string[] = [];\\nexport const PHOTO_SETTINGS = [] as { path: string; mode: 'fill' | 'show-whole-room'; focusX: number; focusY: number; }[];\\n\\nexport const AGENT_HEADSHOT_FILE = '';\\nexport const BROKERAGE_LOGO_FILE = '';\\nexport const BACKGROUND_MUSIC_FILE = '';\\n\\nexport const PROPERTY_ADDRESS = '123 SAMPLE STREET';\\nexport const CITY = 'SAMPLE CITY';\\nexport const STATE = 'MA';\\nexport const LISTING_PRICE = '$500,000';\\nexport const BEDS = '3';\\nexport const BATHS = '2';\\nexport const SQUARE_FEET = '1,500';\\n\\nexport const AGENT_NAME = 'Sample Agent';\\nexport const AGENT_PHONE = '(555) 555-5555';\\nexport const AGENT_EMAIL = 'agent@example.com';\\nexport const BROKERAGE_NAME = 'Sample Realty';\\nexport const CTA_TEXT = 'DM TOUR FOR DETAILS';\\n\\nexport const OPEN_HOUSE_DATE = '';\\nexport const OPEN_HOUSE_TIME = '';\\nexport const SHORT_DESCRIPTION = '';\\nexport const NEIGHBORHOOD = '';\\nexport const MLS_LINK = '';\\n\\nexport const CLIP_DURATION_SECONDS = 12;\\nexport const VIDEO_STYLE = 'social-punchy' as any;\\nexport const PACING = 'fast' as any;\\nexport const MUSIC_MOOD = 'warm-inviting' as any;\\nexport const PHOTO_TRANSITION = 'smart-mix' as any;\\nexport const AUTO_ENHANCE = true;\\nexport const SMART_SAFE_ZONES = true;\\nexport const PERSISTENT_BRANDING = true;\\nexport const PROGRESS_BAR = true;\\n\\`;\n}\n\napp.get('/api/debug/status', (req, res) => {\n  try { res.json(getDebugStatus()); }\n  catch (e) { res.status(500).json({ ok: false, error: e.message }); }\n});\n\napp.get('/api/debug/campaign-config', (req, res) => {\n  try {\n    const configFile = path.join(REMOTION_PROJECT, 'src', 'campaign.config.ts');\n    if (!fs.existsSync(configFile)) return res.status(404).send('campaign.config.ts not found');\n    res.type('text/plain').send(fs.readFileSync(configFile, 'utf8'));\n  } catch (e) { res.status(500).send(e.message); }\n});\n\napp.post('/api/debug/reset-config', (req, res) => {\n  try {\n    const configFile = path.join(REMOTION_PROJECT, 'src', 'campaign.config.ts');\n    fs.mkdirSync(path.dirname(configFile), { recursive: true });\n    fs.writeFileSync(configFile, safeDefaultCampaignConfig(), 'utf8');\n    res.json({ ok: true });\n  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }\n});\n// V9_DEBUG_ROUTES_END\n`;

    const listenMatch = s.match(/\napp\.listen\s*\(/);
    if (listenMatch && listenMatch.index !== undefined) {
      return s.slice(0, listenMatch.index) + routes + s.slice(listenMatch.index);
    }
    return s + routes;
  });
}

function writeTools() {
  write(path.join(root, 'dev-check.ps1'), `$ErrorActionPreference = "Stop"\nWrite-Host "==> Real Estate Reels dev check" -ForegroundColor Cyan\nnpm run build\nnode -c server.js\n$cfg = "remotion\\src\\campaign.config.ts"\nif (Test-Path $cfg) {\n  $photoTransitionCount = (Select-String -Path $cfg -Pattern "export const PHOTO_TRANSITION" -AllMatches).Matches.Count\n  $durationCount = (Select-String -Path $cfg -Pattern "export const CLIP_DURATION_SECONDS" -AllMatches).Matches.Count\n  if ($photoTransitionCount -gt 1) { throw "Duplicate PHOTO_TRANSITION exports found in campaign.config.ts" }\n  if ($durationCount -gt 1) { throw "Duplicate CLIP_DURATION_SECONDS exports found in campaign.config.ts" }\n  Write-Host "OK - generated config has no duplicate key exports" -ForegroundColor Green\n}\nWrite-Host "OK - build and server syntax passed" -ForegroundColor Green\n`);

  write(path.join(root, 'VERIFY_V9.ps1'), `$ErrorActionPreference = "Stop"\n$fail = $false\nfunction Check($label, $condition) {\n  if ($condition) { Write-Host "OK   - $label" -ForegroundColor Green }\n  else { Write-Host "FAIL - $label" -ForegroundColor Red; $script:fail = $true }\n}\n$campaign = Get-Content "client\\src\\components\\CampaignForm.tsx" -Raw\n$types = Get-Content "client\\src\\types.ts" -Raw\n$app = Get-Content "client\\src\\App.tsx" -Raw\n$server = Get-Content "server.js" -Raw\nCheck "ReelVibe type exists" ($types -match "export type ReelVibe")\nCheck "Campaign payload includes reelVibe" ($campaign -match "reelVibe,")\nCheck "Vibe options exist" ($campaign -match "VIBE_OPTIONS")\nCheck "Vibe card exists" ($campaign -match "V9_REEL_VIBE_START")\nCheck "Debug panel component exists" (Test-Path "client\\src\\components\\DebugPanel.tsx")\nCheck "App has debug view" ($app -match "DebugPanel" -and $app -match "'debug'")\nCheck "Server has debug status route" ($server -match "/api/debug/status")\nCheck "Server has reset config route" ($server -match "/api/debug/reset-config")\nif ($fail) { throw "V9 verification failed" }\nWrite-Host "`nV9 verification passed. Run npm run build next." -ForegroundColor Cyan\n`);

  write(path.join(root, 'CLEAN_PROJECT_ROOT_SAFE_V9.ps1'), `$ErrorActionPreference = "Stop"\n$ProjectRoot = (Get-Location).Path\n$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"\n$Archive = Join-Path $ProjectRoot "_archive_patch_junk_$Stamp"\nNew-Item -ItemType Directory -Force $Archive | Out-Null\n$items = @(\n  "apply-v6*.ps1", "apply-v7*.ps1", "apply-v8*.ps1", "apply-v9*.ps1",\n  "_apply-v6*.js", "_apply-v6*.cjs", "_patch",\n  ".v6*-backup*", ".v7*-backup*", ".v8*-backup*", ".v9*-backup*",\n  "README_V6*.md", "README_V6*.txt", "README_V7*.md", "README_V8*.md"\n)\nforeach ($pattern in $items) {\n  Get-ChildItem -LiteralPath $ProjectRoot -Force -Filter $pattern -ErrorAction SilentlyContinue | ForEach-Object {\n    if ($_.FullName -eq $Archive) { return }\n    Move-Item -LiteralPath $_.FullName -Destination (Join-Path $Archive $_.Name) -Force\n    Write-Host "Moved: $($_.Name)"\n  }\n}\nWrite-Host "Cleanup complete. Nothing was deleted. Archive: $Archive" -ForegroundColor Green\n`);

  console.log('Wrote dev-check.ps1, VERIFY_V9.ps1, CLEAN_PROJECT_ROOT_SAFE_V9.ps1');
}

function main() {
  console.log('==> Applying V9 Vibe Presets + Render Debug System');
  console.log('Project:', root);
  patchTypes();
  patchCampaignForm();
  createDebugPanel();
  patchApp();
  patchServerDebugRoutes();
  writeTools();
  console.log('\nV9 patch complete. Backups saved to:', path.relative(root, backupDir));
  console.log('\nNext:');
  console.log('  .\\VERIFY_V9.ps1');
  console.log('  Get-Content .\\docs\\V9_TEST_GUIDE.md');
  console.log('  npm run build');
  console.log('  Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force');
  console.log('  node server.js');
}

main();
