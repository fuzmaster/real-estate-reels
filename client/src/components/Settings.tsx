import { useEffect, useState } from 'react';

const PREFS_KEY = 'rer-prefs-v1';

export interface AppPrefs {
  notificationSound: boolean;
  autoSwitchToJobs: boolean;
  defaultTemplates: string[];
}

export function loadPrefs(): AppPrefs {
  try {
    return {
      notificationSound: true,
      autoSwitchToJobs: true,
      defaultTemplates: ['just-listed'],
      ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'),
    };
  } catch {
    return { notificationSound: true, autoSwitchToJobs: true, defaultTemplates: ['just-listed'] };
  }
}

export function savePrefs(p: AppPrefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

const TEMPLATE_OPTIONS = [
  { id: 'just-listed', label: 'Just Listed' },
  { id: 'open-house', label: 'Open House' },
  { id: 'just-sold',  label: 'Just Sold' },
];

const inputClass =
  'w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 ' +
  'placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors font-mono';

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <div className="mb-4">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">{title}</h2>
        {subtitle && <p className="text-xs text-neutral-600 mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, sublabel, checked, onChange }: {
  label: string; sublabel?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none py-2">
      <div className="flex-shrink-0 mt-0.5">
        <div
          onClick={() => onChange(!checked)}
          className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer
            ${checked ? 'bg-white' : 'bg-neutral-700'}`}
        >
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-black shadow transition-transform
            ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </div>
      </div>
      <div>
        <p className="text-sm text-neutral-200">{label}</p>
        {sublabel && <p className="text-xs text-neutral-600 mt-0.5">{sublabel}</p>}
      </div>
    </label>
  );
}

export default function Settings() {
  const [assetsRoot, setAssetsRoot] = useState('');
  const [remotionProject, setRemotionProject] = useState('');
  const [pathSaving, setPathSaving] = useState(false);
  const [pathResult, setPathResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [detecting, setDetecting] = useState(false);

  const [prefs, setPrefs] = useState<AppPrefs>(loadPrefs);

  useEffect(() => {
    fetch('/api/setup/status')
      .then(r => r.json())
      .then(d => {
        setAssetsRoot(d.assetsRoot || '');
        setRemotionProject(d.remotionProject || '');
      })
      .catch(() => {});
  }, []);

  function updatePref<K extends keyof AppPrefs>(key: K, value: AppPrefs[K]) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePrefs(next);
  }

  function toggleTemplate(id: string) {
    const cur = prefs.defaultTemplates;
    const next = cur.includes(id) ? cur.filter(t => t !== id) : [...cur, id];
    updatePref('defaultTemplates', next);
  }

  async function handleDetect() {
    setDetecting(true);
    setPathResult(null);
    try {
      const r = await fetch('/api/setup/detect');
      const d = await r.json();
      if (d.assetsRoot) setAssetsRoot(d.assetsRoot);
      if (d.remotionProject) setRemotionProject(d.remotionProject);
      setPathResult({ ok: true, msg: 'Paths auto-detected — review and save.' });
    } catch {
      setPathResult({ ok: false, msg: 'Auto-detect failed. Enter paths manually.' });
    } finally {
      setDetecting(false);
    }
  }

  async function handleSavePaths() {
    if (!assetsRoot.trim() || !remotionProject.trim()) return;
    setPathSaving(true);
    setPathResult(null);
    try {
      const r = await fetch('/api/setup/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetsRoot: assetsRoot.trim(), remotionProject: remotionProject.trim() }),
      });
      const d = await r.json();
      setPathResult(d.ok
        ? { ok: true, msg: 'Paths saved — server updated without restart.' }
        : { ok: false, msg: d.error || 'Save failed.' });
    } catch {
      setPathResult({ ok: false, msg: 'Could not reach server.' });
    } finally {
      setPathSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-5">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
        <p className="text-neutral-400 text-sm">Configure paths and preferences.</p>
      </div>

      <Card
        title="Server Paths"
        subtitle="Changes take effect immediately — no server restart needed."
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-neutral-500 mb-1.5">Assets Root</label>
            <input
              value={assetsRoot}
              onChange={e => setAssetsRoot(e.target.value)}
              placeholder="C:\Sites\RealEstate-Reels-Web\remotion\public"
              className={inputClass}
            />
            <p className="text-xs text-neutral-700 mt-1">
              The folder that contains your <span className="font-mono text-neutral-600">Projects/</span> directory.
            </p>
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1.5">Remotion Project</label>
            <input
              value={remotionProject}
              onChange={e => setRemotionProject(e.target.value)}
              placeholder="C:\Sites\RealEstate-Reels-Web\remotion"
              className={inputClass}
            />
            <p className="text-xs text-neutral-700 mt-1">
              Path to your Remotion source folder (contains <span className="font-mono text-neutral-600">package.json</span>).
            </p>
          </div>

          {pathResult && (
            <div className={`text-xs px-3 py-2 rounded-lg border ${pathResult.ok
              ? 'bg-emerald-900/30 border-emerald-700 text-emerald-300'
              : 'bg-red-950/50 border-red-800 text-red-400'}`}>
              {pathResult.msg}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleDetect}
              disabled={detecting}
              className="text-sm bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 border border-neutral-700"
            >
              {detecting ? 'Detecting…' : '🔍 Auto-detect'}
            </button>
            <button
              type="button"
              onClick={handleSavePaths}
              disabled={pathSaving || !assetsRoot.trim() || !remotionProject.trim()}
              className="text-sm bg-white hover:bg-neutral-200 text-black font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {pathSaving ? 'Saving…' : 'Save Paths'}
            </button>
          </div>
        </div>
      </Card>

      <Card title="Preferences">
        <div className="divide-y divide-neutral-800">
          <Toggle
            label="Notification sound"
            sublabel="Play a chime when a render completes."
            checked={prefs.notificationSound}
            onChange={v => updatePref('notificationSound', v)}
          />
          <Toggle
            label="Auto-switch to Render Videos on submit"
            sublabel="Automatically navigate to the Render Videos tab when you hit Render Now."
            checked={prefs.autoSwitchToJobs}
            onChange={v => updatePref('autoSwitchToJobs', v)}
          />
        </div>
      </Card>

      <Card
        title="Default Templates"
        subtitle="Which templates are pre-selected when the form loads."
      >
        <div className="flex gap-2 flex-wrap">
          {TEMPLATE_OPTIONS.map(opt => {
            const on = prefs.defaultTemplates.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleTemplate(opt.id)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors
                  ${on
                    ? 'bg-white/10 border-white/60 text-white'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-500'}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </Card>

      <div className="pb-10" />
    </div>
  );
}
