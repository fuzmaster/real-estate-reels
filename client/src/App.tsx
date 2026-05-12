import { useEffect, useState } from 'react';
import { getHealth, startRender } from './api';
import CampaignForm from './components/CampaignForm';
import RenderConsole from './components/RenderConsole';
import OutputGallery from './components/OutputGallery';
import BatchQueue from './components/BatchQueue';
import Help from './components/Help';
import Settings from './components/Settings';
import { loadPrefs } from './components/Settings';
import type { CampaignFormData } from './types';

type View = 'form' | 'queue' | 'console' | 'outputs' | 'help' | 'settings';

export interface JobEntry {
  jobId: string;
  label: string;
  payload?: CampaignFormData;
}

const JOBS_KEY = 'rer-jobs-v1';

function loadJobs(): JobEntry[] {
  try { return JSON.parse(sessionStorage.getItem(JOBS_KEY) || '[]'); } catch { return []; }
}

export default function App() {
  const [view, setView] = useState<View>('form');
  const [queue, setQueue] = useState<CampaignFormData[]>([]);
  const [jobs, setJobs] = useState<JobEntry[]>(loadJobs);
  const [outputsVersion, setOutputsVersion] = useState(0);
  const [serverOk, setServerOk] = useState<boolean | null>(null);

  useEffect(() => {
    sessionStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    function ping() {
      getHealth()
        .then(() => setServerOk(true))
        .catch(() => setServerOk(false));
    }
    ping();
    const t = setInterval(ping, 30_000);
    return () => clearInterval(t);
  }, []);

  function addToQueue(campaign: CampaignFormData) {
    setQueue(q => [...q, campaign]);
  }

  function removeFromQueue(i: number) {
    setQueue(q => q.filter((_, idx) => idx !== i));
  }

  function duplicateInQueue(i: number) {
    setQueue(q => {
      const copy = { ...q[i] };
      return [...q.slice(0, i + 1), copy, ...q.slice(i + 1)];
    });
  }

  function handleRenderStarted(jobId: string, label: string, payload?: CampaignFormData) {
    setJobs(j => [...j, { jobId, label, payload }]);
    if (loadPrefs().autoSwitchToJobs) setView('console');
  }

  async function retryJob(original: JobEntry) {
    if (!original.payload) return;
    try {
      const { jobId } = await startRender(original.payload);
      setJobs(j => [...j, { jobId, label: original.label, payload: original.payload }]);
    } catch { /* SSE will surface the error */ }
  }

  async function renderAll() {
    if (queue.length === 0) return;
    const toRender = [...queue];
    setQueue([]);
    setView('console');
    for (const campaign of toRender) {
      try {
        const { jobId } = await startRender(campaign);
        setJobs(j => [...j, { jobId, label: campaign.folder, payload: campaign }]);
      } catch {
        // job will show as errored in the console
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-white">REAL ESTATE</span>
            <span className="text-lg font-bold tracking-tight text-neutral-400">REELS</span>
            <span
              title={serverOk === null ? 'Checking server…' : serverOk ? 'Server online' : 'Server offline'}
              className={`w-2 h-2 rounded-full ml-1 flex-shrink-0 transition-colors
                ${serverOk === null ? 'bg-neutral-600'
                  : serverOk ? 'bg-emerald-400'
                  : 'bg-red-500 animate-pulse'}`}
            />
          </div>
          <nav className="flex gap-1">
            <NavBtn active={view === 'form'} onClick={() => setView('form')}>
              New Listing
            </NavBtn>
            <NavBtn active={view === 'queue'} onClick={() => setView('queue')}>
              Queue
              {queue.length > 0 && (
                <span className="ml-1.5 bg-yellow-400 text-black text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                  {queue.length}
                </span>
              )}
            </NavBtn>
            <NavBtn active={view === 'console'} onClick={() => setView('console')}>
              Render Videos
              {jobs.length > 0 && (
                <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              )}
            </NavBtn>
            <NavBtn active={view === 'outputs'} onClick={() => setView('outputs')}>
              Output Gallery
            </NavBtn>
            <NavBtn active={view === 'help'} onClick={() => setView('help')}>
              Help
            </NavBtn>
            <NavBtn active={view === 'settings'} onClick={() => setView('settings')}>
              ⚙
            </NavBtn>
          </nav>
        </div>
        <div className="max-w-6xl mx-auto px-6 pb-3 -mt-1">
          <p className="text-xs text-neutral-500">
            Turn listing photos into branded real estate videos in minutes.
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        {serverOk === false && (
          <div className="mb-6 bg-yellow-950/60 border border-yellow-800/60 rounded-xl px-5 py-4 flex gap-4 items-start">
            <span className="text-yellow-400 text-xl flex-shrink-0 mt-0.5">⚠</span>
            <div>
              <p className="text-yellow-200 font-semibold text-sm mb-1">Local server not running</p>
              <p className="text-yellow-400/80 text-xs leading-relaxed">
                Rendering requires the local Express server. Open a terminal in the project folder and run{' '}
                <code className="bg-yellow-900/60 px-1.5 py-0.5 rounded font-mono">node server.js</code>,
                then set <code className="bg-yellow-900/60 px-1.5 py-0.5 rounded font-mono">VITE_API_URL</code> in
                Vercel to your machine's IP. The form is still editable for reference.
              </p>
            </div>
          </div>
        )}
        {/* CampaignForm stays mounted so form state survives tab switches */}
        <div style={{ display: view === 'form' ? undefined : 'none' }}>
          <CampaignForm
            onRenderStarted={(jobId, label, payload) => handleRenderStarted(jobId, label, payload)}
            onAddToQueue={addToQueue}
            serverOk={serverOk}
          />
        </div>
        {view === 'queue' && (
          <BatchQueue
            queue={queue}
            onRemove={removeFromQueue}
            onDuplicate={duplicateInQueue}
            onRenderAll={renderAll}
            onGoToForm={() => setView('form')}
          />
        )}
        {view === 'console' && (
          <RenderConsole
            jobs={jobs}
            onNewReel={() => setView('form')}
            onJobDone={() => setOutputsVersion(v => v + 1)}
            onRetryJob={retryJob}
          />
        )}
        {view === 'outputs' && <OutputGallery refreshKey={outputsVersion} />}
        {view === 'help' && <Help />}
        {view === 'settings' && <Settings />}
      </main>
    </div>
  );
}

function NavBtn({
  children, active, onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-1
        ${active ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
    >
      {children}
    </button>
  );
}
