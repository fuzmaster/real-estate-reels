require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const multer = require('multer');

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 4 * 1024 * 1024 * 1024 }, // 4 GB
});

const app = express();
const PORT = process.env.PORT || 3000;

// Default to the bundled remotion/ subfolder — works out of the box with no .env
const BUNDLED_REMOTION = path.join(__dirname, 'remotion');
const BUNDLED_ASSETS   = path.join(__dirname, 'remotion', 'public');

let ASSETS_ROOT       = process.env.ASSETS_ROOT       || (fs.existsSync(BUNDLED_ASSETS)   ? BUNDLED_ASSETS   : '');
let REMOTION_PROJECT  = process.env.REMOTION_PROJECT  || (fs.existsSync(BUNDLED_REMOTION) ? BUNDLED_REMOTION : '');

app.use(express.json());

function validateConfig() {
  if (!ASSETS_ROOT || !fs.existsSync(ASSETS_ROOT)) return false;
  if (!REMOTION_PROJECT || !fs.existsSync(REMOTION_PROJECT)) return false;
  return true;
}
let configValid = validateConfig();

if (!configValid) {
  console.log('\n⚙️  Setup required — open http://localhost:' + PORT + ' to configure paths.\n');
} else {
  console.log(`\n✅  Config OK\n    Assets:   ${ASSETS_ROOT}\n    Remotion: ${REMOTION_PROJECT}\n`);
}

function requireConfig(req, res, next) {
  if (!configValid) return res.status(503).json({ error: 'Setup required', setupRequired: true });
  next();
}

// ── HEALTH ────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ ok: true }));

// ── SETUP API ─────────────────────────────────────────────────
app.get('/api/setup/status', (req, res) => {
  res.json({
    configured: configValid,
    assetsRoot: ASSETS_ROOT,
    remotionProject: REMOTION_PROJECT,
  });
});

app.get('/api/setup/detect', (req, res) => {
  if (fs.existsSync(BUNDLED_REMOTION) && fs.existsSync(path.join(BUNDLED_REMOTION, 'src', 'index.tsx'))) {
    return res.json({
      remotionProject: BUNDLED_REMOTION,
      assetsRoot: BUNDLED_ASSETS,
      candidates: [BUNDLED_REMOTION],
    });
  }

  const home = os.homedir();
  const candidates = [
    path.join(home, 'Dropbox', 'Remotion Projects'),
    path.join(home, 'Documents', 'Remotion Projects'),
    path.join(home, 'Desktop', 'Remotion Projects'),
    path.join(home, 'Remotion Projects'),
    path.join('C:', 'Remotion Projects'),
    path.join('D:', 'Dropbox', 'Remotion Projects'),
    path.join('D:', 'Remotion Projects'),
  ];
  const found = [];
  for (const base of candidates) {
    if (!fs.existsSync(base)) continue;
    try {
      const entries = fs.readdirSync(base, { withFileTypes: true });
      for (const e of entries) {
        if (!e.isDirectory()) continue;
        const dir = path.join(base, e.name);
        const hasSrc = fs.existsSync(path.join(dir, 'src', 'index.tsx'));
        const hasPublic = fs.existsSync(path.join(dir, 'public'));
        if (hasSrc && hasPublic) found.push(dir);
      }
    } catch (_) {}
  }
  res.json({ candidates: found });
});

app.post('/api/setup/save', (req, res) => {
  const { assetsRoot, remotionProject } = req.body;
  if (!assetsRoot || !remotionProject) {
    return res.status(400).json({ error: 'Both paths are required.' });
  }
  if (!fs.existsSync(assetsRoot)) {
    return res.status(400).json({ error: `Assets path does not exist: ${assetsRoot}` });
  }
  if (!fs.existsSync(remotionProject)) {
    return res.status(400).json({ error: `Remotion project path does not exist: ${remotionProject}` });
  }
  const envPath = path.join(__dirname, '.env');
  const envContent = `ASSETS_ROOT=${assetsRoot}\nREMOTION_PROJECT=${remotionProject}\nPORT=${PORT}\n`;
  try {
    fs.writeFileSync(envPath, envContent, 'utf8');
  } catch (e) {
    return res.status(500).json({ error: `Could not write .env: ${e.message}` });
  }
  ASSETS_ROOT = assetsRoot;
  REMOTION_PROJECT = remotionProject;
  process.env.ASSETS_ROOT = assetsRoot;
  process.env.REMOTION_PROJECT = remotionProject;
  configValid = validateConfig();
  console.log(`\n✅  Config saved\n    Assets:   ${ASSETS_ROOT}\n    Remotion: ${REMOTION_PROJECT}\n`);
  res.json({ ok: true });
});

// ── JOB STORE ─────────────────────────────────────────────────
const jobs = new Map();
const jobEmitters = new Map();
const activeProcesses = new Map();
const cancelledJobs = new Set();
let isRendering = false;
const renderQueue = [];

app.use(express.static(path.join(__dirname, 'client', 'dist')));

// ── LISTING FOLDER HELPERS ────────────────────────────────────
const PHOTOS_DIR   = 'Photos';
const HEADSHOT_DIR = 'Headshot';
const LOGO_DIR     = 'Logo';
const MUSIC_DIR    = 'Music';

function listingDir(name) {
  return path.join(ASSETS_ROOT, 'Projects', name);
}

function readFirstImage(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
  return files[0] || null;
}

// ── CREATE LISTING ────────────────────────────────────────────
app.post('/api/projects', requireConfig, (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name required' });
  const safeName = name.trim();
  const dir = listingDir(safeName);
  if (fs.existsSync(dir)) return res.status(409).json({ error: 'Project already exists' });
  try {
    fs.mkdirSync(path.join(dir, PHOTOS_DIR),   { recursive: true });
    fs.mkdirSync(path.join(dir, HEADSHOT_DIR), { recursive: true });
    fs.mkdirSync(path.join(dir, LOGO_DIR),     { recursive: true });
    fs.mkdirSync(path.join(dir, MUSIC_DIR),    { recursive: true });
    res.json({ name: safeName });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── LIST LISTINGS ─────────────────────────────────────────────
app.get('/api/projects', requireConfig, (req, res) => {
  const projectsDir = path.join(ASSETS_ROOT, 'Projects');
  try {
    if (!fs.existsSync(projectsDir)) return res.json([]);
    const folders = fs.readdirSync(projectsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .sort();
    res.json(folders);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── LISTING ASSETS ────────────────────────────────────────────
app.get('/api/projects/:name/listing-assets', requireConfig, (req, res) => {
  const dir = listingDir(req.params.name);
  if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Listing not found' });

  const result = { photos: [], headshot: null, logo: null, music: null };

  const photosDir = path.join(dir, PHOTOS_DIR);
  if (fs.existsSync(photosDir)) {
    result.photos = fs.readdirSync(photosDir)
      .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .sort()
      .map(f => `${PHOTOS_DIR}/${f}`);
  }

  const headshot = readFirstImage(path.join(dir, HEADSHOT_DIR));
  if (headshot) result.headshot = `${HEADSHOT_DIR}/${headshot}`;

  const logo = readFirstImage(path.join(dir, LOGO_DIR));
  if (logo) result.logo = `${LOGO_DIR}/${logo}`;

  const musicDir = path.join(dir, MUSIC_DIR);
  if (fs.existsSync(musicDir)) {
    const m = fs.readdirSync(musicDir).find(f => /\.(wav|mp3|aac|m4a)$/i.test(f));
    if (m) result.music = `${MUSIC_DIR}/${m}`;
  }

  res.json(result);
});

// ── SERVE ANY LISTING FILE (thumbnails, previews, etc.) ───────
app.get('/api/projects/:name/files/*', requireConfig, (req, res) => {
  const rel = req.params[0];
  if (!rel || rel.includes('..')) return res.status(400).send('Bad path');
  const full = path.join(listingDir(req.params.name), rel);
  if (!fs.existsSync(full)) return res.status(404).send('Not found');
  res.sendFile(full);
});

// ── UPLOAD LISTING PHOTO (additive — keeps existing photos) ───
app.post('/api/projects/:name/photos', requireConfig, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const dir = path.join(listingDir(req.params.name), PHOTOS_DIR);
  fs.mkdirSync(dir, { recursive: true });
  // Sanitize filename — strip path bits, fall back to extension default
  const original = path.basename(req.file.originalname).replace(/[^a-zA-Z0-9._-]+/g, '_');
  const ext = path.extname(original).toLowerCase() || '.jpg';
  const stem = path.basename(original, ext) || 'photo';
  let target = `${stem}${ext}`;
  // Avoid overwriting if a file with the same name already exists
  let n = 1;
  while (fs.existsSync(path.join(dir, target))) {
    target = `${stem}-${n}${ext}`;
    n++;
  }
  try {
    fs.copyFileSync(req.file.path, path.join(dir, target));
    fs.unlinkSync(req.file.path);
    res.json({ file: `${PHOTOS_DIR}/${target}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── UPLOAD AGENT HEADSHOT (single — overwrites) ───────────────
app.post('/api/projects/:name/headshot', requireConfig, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const dir = path.join(listingDir(req.params.name), HEADSHOT_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
  const dest = path.join(dir, `headshot${ext}`);
  try {
    fs.readdirSync(dir).forEach(f => fs.unlinkSync(path.join(dir, f)));
    fs.copyFileSync(req.file.path, dest);
    fs.unlinkSync(req.file.path);
    res.json({ file: `${HEADSHOT_DIR}/headshot${ext}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── UPLOAD BROKERAGE LOGO (single — overwrites) ───────────────
app.post('/api/projects/:name/logo', requireConfig, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const dir = path.join(listingDir(req.params.name), LOGO_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(req.file.originalname).toLowerCase() || '.png';
  const dest = path.join(dir, `logo${ext}`);
  try {
    fs.readdirSync(dir).forEach(f => fs.unlinkSync(path.join(dir, f)));
    fs.copyFileSync(req.file.path, dest);
    fs.unlinkSync(req.file.path);
    res.json({ file: `${LOGO_DIR}/logo${ext}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── UPLOAD BACKGROUND MUSIC (single — overwrites) ─────────────
app.post('/api/projects/:name/music', requireConfig, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const dir = path.join(listingDir(req.params.name), MUSIC_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(req.file.originalname).toLowerCase() || '.mp3';
  const dest = path.join(dir, `music${ext}`);
  try {
    fs.readdirSync(dir).forEach(f => fs.unlinkSync(path.join(dir, f)));
    fs.copyFileSync(req.file.path, dest);
    fs.unlinkSync(req.file.path);
    res.json({ file: `${MUSIC_DIR}/music${ext}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── LIST OUTPUTS ──────────────────────────────────────────────
app.get('/api/outputs', requireConfig, (req, res) => {
  const outDir = path.join(REMOTION_PROJECT, 'out');
  try {
    if (!fs.existsSync(outDir)) return res.json([]);
    const campaigns = fs.readdirSync(outDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => {
        const dir = path.join(outDir, d.name);
        const files = fs.readdirSync(dir)
          .filter(f => f.endsWith('.mp4'))
          .map(f => {
            const stat = fs.statSync(path.join(dir, f));
            return { name: f, size: stat.size, mtime: stat.mtime };
          })
          .sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
        return { slug: d.name, files };
      })
      .filter(c => c.files.length > 0)
      .sort((a, b) => new Date(b.files[0].mtime) - new Date(a.files[0].mtime));
    res.json(campaigns);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── SERVE OUTPUT VIDEO FILES ──────────────────────────────────
app.get('/api/outputs/:slug/:file', requireConfig, (req, res) => {
  const filePath = path.join(REMOTION_PROJECT, 'out', req.params.slug, req.params.file);
  if (!fs.existsSync(filePath)) return res.status(404).send('Not found');
  res.sendFile(filePath);
});

// ── START RENDER ──────────────────────────────────────────────
app.post('/api/render', requireConfig, (req, res) => {
  const campaign = req.body;
  const jobId = Date.now().toString();

  const emitter = new EventEmitter();
  emitter.setMaxListeners(20);
  jobEmitters.set(jobId, emitter);
  jobs.set(jobId, {
    id: jobId,
    status: 'queued',
    campaign: campaign.folder,
    startTime: Date.now(),
    logs: [],
  });

  res.json({ jobId });

  renderQueue.push({ jobId, campaign, emitter });
  processQueue();
});

function processQueue() {
  if (isRendering || renderQueue.length === 0) return;
  const { jobId, campaign, emitter } = renderQueue.shift();
  isRendering = true;
  const job = jobs.get(jobId);
  job.status = 'running';

  runRender(jobId, campaign, emitter)
    .then(() => {
      job.status = 'done';
      emitter.emit('done');
    })
    .catch(err => {
      job.status = 'error';
      job.error = err.message;
      emitter.emit('error', err.message);
    })
    .finally(() => {
      isRendering = false;
      processQueue();
    });
}

// ── STREAM RENDER LOGS (SSE) ──────────────────────────────────
app.get('/api/render/:jobId/stream', (req, res) => {
  const { jobId } = req.params;
  const emitter = jobEmitters.get(jobId);
  const job = jobs.get(jobId);

  if (!job) return res.status(404).json({ error: 'Job not found' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  for (const line of job.logs) {
    res.write(`data: ${JSON.stringify(line)}\n\n`);
  }
  if (job.progress != null) {
    res.write(`event: progress\ndata: ${JSON.stringify(job.progress)}\n\n`);
  }

  if (job.status === 'done') {
    res.write('event: done\ndata: {}\n\n');
    return res.end();
  }
  if (job.status === 'error') {
    res.write(`event: error\ndata: ${JSON.stringify(job.error || 'Unknown error')}\n\n`);
    return res.end();
  }

  const onLog = line => {
    job.logs.push(line);
    res.write(`data: ${JSON.stringify(line)}\n\n`);
  };
  const onProgress = pct => {
    job.progress = pct;
    res.write(`event: progress\ndata: ${JSON.stringify(pct)}\n\n`);
  };
  const onDone = () => { res.write('event: done\ndata: {}\n\n'); res.end(); };
  const onError = msg => { res.write(`event: error\ndata: ${JSON.stringify(msg)}\n\n`); res.end(); };

  emitter.on('log', onLog);
  emitter.on('progress', onProgress);
  emitter.on('done', onDone);
  emitter.on('error', onError);

  req.on('close', () => {
    emitter.off('log', onLog);
    emitter.off('progress', onProgress);
    emitter.off('done', onDone);
    emitter.off('error', onError);
  });
});

// ── JOB STATUS ────────────────────────────────────────────────
app.get('/api/render/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const { logs, ...rest } = job;
  res.json(rest);
});

// ── CANCEL RENDER ─────────────────────────────────────────────
app.delete('/api/render/:jobId', requireConfig, (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.status === 'done' || job.status === 'error') {
    return res.status(400).json({ error: 'Job already finished' });
  }
  cancelledJobs.add(jobId);
  const proc = activeProcesses.get(jobId);
  if (proc) proc.kill('SIGTERM');
  const qIdx = renderQueue.findIndex(r => r.jobId === jobId);
  if (qIdx !== -1) {
    renderQueue.splice(qIdx, 1);
    job.status = 'error';
    job.error = 'Cancelled';
    const emitter = jobEmitters.get(jobId);
    if (emitter) emitter.emit('error', 'Cancelled');
  }
  res.json({ ok: true });
});

// ── DELETE OUTPUT FILE ────────────────────────────────────────
app.delete('/api/outputs/:slug/:file', requireConfig, (req, res) => {
  const filePath = path.join(REMOTION_PROJECT, 'out', req.params.slug, req.params.file);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  try {
    fs.unlinkSync(filePath);
    const dir = path.dirname(filePath);
    if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── COMPOSITION ID MAP ────────────────────────────────────────
const TEMPLATE_TO_COMP = {
  'just-listed': { id: 'JustListed', prefix: 'JustListed' },
  'open-house':  { id: 'OpenHouse',  prefix: 'OpenHouse' },
  'just-sold':   { id: 'JustSold',   prefix: 'JustSold' },
};

// ── RENDER LOGIC ──────────────────────────────────────────────
async function runRender(jobId, campaign, emitter) {
  const log = msg => emitter.emit('log', msg);

  const CONFIG_FILE = path.join(REMOTION_PROJECT, 'src', 'campaign.config.ts');
  const ENTRY_POINT = 'src/index.tsx';
  const OUTPUT_BASE = path.join(REMOTION_PROJECT, 'out');

  log(`━━━ Starting render: ${campaign.folder} ━━━`);

  const srcFolder = path.join(ASSETS_ROOT, 'Projects', campaign.folder);
  const destFolder = path.join(REMOTION_PROJECT, 'public', 'Projects', campaign.folder);

  if (!fs.existsSync(srcFolder)) {
    throw new Error(`Asset folder not found: ${srcFolder}`);
  }

  const sameDir = path.resolve(srcFolder) === path.resolve(destFolder);
  if (!sameDir) {
    log(`Staging assets...`);
    await copyDirAsync(srcFolder, destFolder);
    log(`Assets ready.`);
  } else {
    log(`Assets already in place (ASSETS_ROOT is inside Remotion project).`);
  }

  // Auto-detect photos if the payload omitted them
  let photos = (campaign.photos || []).filter(Boolean);
  if (photos.length === 0) {
    const photosDir = path.join(destFolder, PHOTOS_DIR);
    if (fs.existsSync(photosDir)) {
      photos = fs.readdirSync(photosDir)
        .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
        .sort()
        .map(f => `${PHOTOS_DIR}/${f}`);
      log(`Auto-detected ${photos.length} listing photo(s).`);
    }
  }
  if (photos.length === 0) {
    throw new Error('No listing photos found — upload at least one image before rendering.');
  }

  writeConfig(campaign, photos, CONFIG_FILE);
  log(`Wrote campaign.config.ts`);

  const slug = campaign.folder.replace(/[^a-zA-Z0-9_-]/g, '_');
  const outDir = path.join(OUTPUT_BASE, slug);
  fs.mkdirSync(outDir, { recursive: true });

  const templates = Array.isArray(campaign.templates) && campaign.templates.length > 0
    ? campaign.templates
    : ['just-listed'];

  const compositions = templates
    .map(t => TEMPLATE_TO_COMP[t])
    .filter(Boolean);

  if (compositions.length === 0) {
    throw new Error('No valid templates selected.');
  }

  log(`Queued ${compositions.length} composition(s): ${compositions.map(c => c.id).join(', ')}`);

  for (const comp of compositions) {
    const friendlyName = `${comp.prefix} - ${campaign.folder}`;
    const outFile = path.join(outDir, `${friendlyName}.mp4`);

    log(`\n▶  Rendering: ${friendlyName}`);

    await spawnRender(
      'npx',
      ['remotion', 'render', ENTRY_POINT, comp.id, outFile, '--codec=h264'],
      REMOTION_PROJECT,
      log,
      emitter,
      jobId
    );

    log(`✅  Done: ${friendlyName}.mp4`);
  }

  if (!sameDir) {
    try {
      fs.rmSync(destFolder, { recursive: true, force: true });
      log(`\nCleaned up staged assets.`);
    } catch (e) {
      log(`Warning: cleanup failed — ${e.message}`);
    }
  }

  log(`\n━━━ All ${compositions.length} render(s) complete! ━━━`);
}

async function copyDirAsync(src, dest) {
  await fs.promises.cp(src, dest, { recursive: true });
}

function tsString(value) {
  return JSON.stringify(value == null ? '' : String(value));
}

function writeConfig(campaign, photos, configFile) {
  const photosTs = photos.map(p => `  ${JSON.stringify(p)},`).join('\n');
  const duration = Number(campaign.duration) > 0 ? Math.round(Number(campaign.duration)) : 18;

  const config = `// AUTO-GENERATED by real-estate-reels-web — do not hand-edit.
// Real estate listing config — consumed by Root.tsx.

export const PROJECT_FOLDER = ${tsString(`Projects/${campaign.folder}`)};

export const LISTING_PHOTOS: string[] = [
${photosTs}
];

export const AGENT_HEADSHOT_FILE = ${tsString(campaign.headshot || '')};
export const BROKERAGE_LOGO_FILE = ${tsString(campaign.logo || '')};
export const BACKGROUND_MUSIC_FILE = ${tsString(campaign.music || '')};

export const PROPERTY_ADDRESS = ${tsString(campaign.propertyAddress)};
export const CITY             = ${tsString(campaign.city)};
export const STATE            = ${tsString(campaign.state)};
export const LISTING_PRICE    = ${tsString(campaign.listingPrice)};
export const BEDS             = ${tsString(campaign.beds)};
export const BATHS            = ${tsString(campaign.baths)};
export const SQUARE_FEET      = ${tsString(campaign.squareFeet)};

export const AGENT_NAME       = ${tsString(campaign.agentName)};
export const AGENT_PHONE      = ${tsString(campaign.agentPhone)};
export const AGENT_EMAIL      = ${tsString(campaign.agentEmail)};
export const BROKERAGE_NAME   = ${tsString(campaign.brokerageName)};
export const CTA_TEXT         = ${tsString(campaign.ctaText || 'Schedule a Showing')};

export const OPEN_HOUSE_DATE  = ${tsString(campaign.openHouseDate)};
export const OPEN_HOUSE_TIME  = ${tsString(campaign.openHouseTime)};
export const SHORT_DESCRIPTION = ${tsString(campaign.shortDescription)};
export const NEIGHBORHOOD     = ${tsString(campaign.neighborhood)};
export const MLS_LINK         = ${tsString(campaign.mlsLink)};

export const CLIP_DURATION_SECONDS = ${duration};
`;

  fs.writeFileSync(configFile, config, 'utf8');
}

function parseProgress(line) {
  let m;
  if ((m = line.match(/\b(\d+)\s*\/\s*(\d+)\b/))) {
    const pct = Math.round((parseInt(m[1]) / parseInt(m[2])) * 100);
    if (pct >= 0 && pct <= 100) return pct;
  }
  if ((m = line.match(/\b(\d{1,3})%/))) {
    const pct = parseInt(m[1]);
    if (pct >= 0 && pct <= 100) return pct;
  }
  return null;
}

function spawnRender(cmd, args, cwd, log, emitter, jobId) {
  return new Promise((resolve, reject) => {
    if (cancelledJobs.has(jobId)) return reject(new Error('Render cancelled'));

    const safeArgs = args.map(a => a.includes(' ') ? `"${a}"` : a);
    const proc = spawn(cmd, safeArgs, { cwd, shell: true, env: { ...process.env } });
    activeProcesses.set(jobId, proc);

    const handleData = data => {
      data.toString().split('\n').filter(Boolean).forEach(line => {
        log(line);
        const pct = parseProgress(line);
        if (pct != null) emitter.emit('progress', pct);
      });
    };
    proc.stdout.on('data', handleData);
    proc.stderr.on('data', handleData);

    proc.on('close', code => {
      activeProcesses.delete(jobId);
      if (cancelledJobs.has(jobId)) reject(new Error('Render cancelled'));
      else if (code === 0) resolve();
      else reject(new Error(`Render process exited with code ${code}`));
    });
    proc.on('error', err => { activeProcesses.delete(jobId); reject(err); });
  });
}

// ── SETUP PAGE HTML ───────────────────────────────────────────
const SETUP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Real Estate Reels Web — Setup</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #0a0a0a; color: #e5e5e5; min-height: 100vh;
    display: flex; align-items: center; justify-content: center; padding: 2rem; }
  .card { background: #141414; border: 1px solid #262626; border-radius: 16px;
    padding: 2.5rem; width: 100%; max-width: 560px; }
  h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.35rem; }
  .sub { color: #737373; font-size: 0.875rem; margin-bottom: 2rem; }
  label { display: block; font-size: 0.75rem; color: #737373;
    text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.4rem; margin-top: 1.25rem; }
  input { width: 100%; background: #1a1a1a; border: 1px solid #333;
    border-radius: 8px; padding: 0.625rem 0.875rem; font-size: 0.875rem;
    color: #e5e5e5; font-family: monospace; outline: none; transition: border-color 0.15s; }
  input:focus { border-color: #555; }
  .hint { font-size: 0.75rem; color: #555; margin-top: 0.4rem; }
  .row { display: flex; gap: 0.75rem; margin-top: 2rem; align-items: center; }
  button { padding: 0.625rem 1.5rem; border-radius: 8px; font-size: 0.875rem;
    font-weight: 600; cursor: pointer; border: none; transition: background 0.15s; }
  .btn-primary { background: #ffffff; color: #000; }
  .btn-primary:hover { background: #e5e5e5; }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-secondary { background: #262626; color: #a3a3a3; border: 1px solid #333; }
  .btn-secondary:hover { background: #333; color: #e5e5e5; }
  .error { background: #2d1515; border: 1px solid #7f1d1d; color: #fca5a5;
    border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.875rem; margin-top: 1rem; display: none; }
  .success { background: #0d2d1a; border: 1px solid #14532d; color: #86efac;
    border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.875rem; margin-top: 1rem; display: none; }
  .candidates { margin-top: 0.5rem; }
  .candidate { display: block; width: 100%; text-align: left; background: #1a1a1a;
    border: 1px solid #333; border-radius: 6px; padding: 0.5rem 0.875rem;
    font-size: 0.75rem; font-family: monospace; color: #a3a3a3; cursor: pointer;
    margin-bottom: 0.35rem; transition: border-color 0.15s; }
  .candidate:hover { border-color: #555; color: #e5e5e5; }
</style>
</head>
<body>
<div class="card">
  <h1>⚙️ Real Estate Reels Setup</h1>
  <p class="sub">Tell the server where your Remotion project and assets live.</p>

  <div>
    <button class="btn-secondary" onclick="detect()" id="detectBtn">🔍 Auto-detect Remotion project</button>
    <div class="candidates" id="candidates"></div>
  </div>

  <label for="remotionInput">Remotion Project Folder</label>
  <input id="remotionInput" type="text" placeholder="C:\\\\Sites\\\\RealEstate-Reels-Web\\\\remotion"
    oninput="syncAssets()" />
  <div class="hint">The folder containing <code>src/index.tsx</code> and <code>public/</code></div>

  <label for="assetsInput">Assets Root (public folder)</label>
  <input id="assetsInput" type="text" placeholder="C:\\\\Sites\\\\RealEstate-Reels-Web\\\\remotion\\\\public" />
  <div class="hint">Usually the <code>public/</code> subfolder of your Remotion project</div>

  <div id="errorBox" class="error"></div>
  <div id="successBox" class="success"></div>

  <div class="row">
    <button class="btn-primary" onclick="save()" id="saveBtn">Save &amp; Launch</button>
  </div>
</div>

<script>
function syncAssets() {
  const rp = document.getElementById('remotionInput').value.trim();
  if (rp) document.getElementById('assetsInput').value = rp.replace(/[\\\\/]+$/, '') + '/public';
}

async function detect() {
  const btn = document.getElementById('detectBtn');
  btn.textContent = 'Searching…'; btn.disabled = true;
  try {
    const r = await fetch('/api/setup/detect');
    const { candidates } = await r.json();
    const box = document.getElementById('candidates');
    if (!candidates.length) { box.innerHTML = '<p style="font-size:0.75rem;color:#555;margin-top:0.5rem">No projects found automatically.</p>'; return; }
    box.innerHTML = candidates.map(c =>
      '<button class="candidate" onclick="pickCandidate(' + JSON.stringify(c) + ')">' + c + '</button>'
    ).join('');
  } catch(e) { } finally {
    btn.textContent = '🔍 Auto-detect Remotion project'; btn.disabled = false;
  }
}

function pickCandidate(p) {
  document.getElementById('remotionInput').value = p;
  document.getElementById('assetsInput').value = p.replace(/[\\\\/]+$/, '') + '/public';
  document.getElementById('candidates').innerHTML = '';
}

async function save() {
  const btn = document.getElementById('saveBtn');
  const errBox = document.getElementById('errorBox');
  const okBox = document.getElementById('successBox');
  errBox.style.display = 'none'; okBox.style.display = 'none';

  const remotionProject = document.getElementById('remotionInput').value.trim();
  const assetsRoot = document.getElementById('assetsInput').value.trim();
  if (!remotionProject || !assetsRoot) {
    errBox.textContent = 'Both paths are required.'; errBox.style.display = 'block'; return;
  }
  btn.textContent = 'Saving…'; btn.disabled = true;
  try {
    const r = await fetch('/api/setup/save', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetsRoot, remotionProject }),
    });
    const data = await r.json();
    if (!r.ok) { errBox.textContent = data.error || 'Save failed.'; errBox.style.display = 'block'; return; }
    okBox.textContent = 'Saved! Redirecting…'; okBox.style.display = 'block';
    setTimeout(() => { window.location.href = '/'; }, 1200);
  } catch(e) {
    errBox.textContent = 'Network error: ' + e.message; errBox.style.display = 'block';
  } finally {
    btn.textContent = 'Save & Launch'; btn.disabled = false;
  }
}
</script>
</body>
</html>`;

app.get('*', (req, res) => {
  if (!configValid) {
    return res.send(SETUP_HTML);
  }
  const indexPath = path.join(__dirname, 'client', 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send(`
      <html><body style="font-family:monospace;padding:2rem;background:#111;color:#eee">
        <h2>⚙️ First-time setup required</h2>
        <p>Run the following command in the <code>RealEstate-Reels-Web</code> folder:</p>
        <pre style="background:#222;padding:1rem;border-radius:6px">npm run build</pre>
        <p>Then refresh this page.</p>
      </body></html>
    `);
  }
});

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n🏠  Real Estate Reels Web running at ${url}\n`);
  if (configValid) {
    console.log(`    Assets:   ${ASSETS_ROOT}`);
    console.log(`    Remotion: ${REMOTION_PROJECT}\n`);
  }

  setTimeout(() => {
    const { exec } = require('child_process');
    if (process.platform === 'win32') exec(`start "" "${url}"`);
    else if (process.platform === 'darwin') exec(`open "${url}"`);
    else exec(`xdg-open "${url}"`);
  }, 800);
});
