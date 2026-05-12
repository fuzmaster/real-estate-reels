import { useEffect, useRef, useState } from 'react';
import type { JobEntry } from '../App';
import { cancelRender } from '../api';

function formatEta(ms: number): string {
  if (ms <= 0) return '';
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `~${m}m ${s % 60}s left` : `~${s}s left`;
}

type Status = 'connecting' | 'running' | 'done' | 'error';

interface LogLine {
  text: string;
  color: string; // pre-computed at ingestion time
}

interface JobState {
  status: Status;
  logs: LogLine[];
  progress: number | null; // 0–100, null = unknown
  startedAt: number | null; // Date.now() when render started
  etaMs: number | null;     // estimated ms remaining
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function colorLine(line: string): string {
  if (line.includes('✅') || /done|complete|All .* render/i.test(line)) return 'text-spotify-green';
  if (line.includes('❌') || /error|failed|exception/i.test(line)) return 'text-red-400';
  if (line.includes('▶') || /rendering/i.test(line)) return 'text-blue-400';
  if (line.includes('━━━')) return 'text-neutral-600';
  if (/Wrote|Staged|Auto-detected|Assets/i.test(line)) return 'text-yellow-400';
  if (/%|Bundling|Copying/.test(line)) return 'text-neutral-400';
  return 'text-neutral-500';
}

function statusBadge(status: Status) {
  const map: Record<Status, { label: string; cls: string; dot?: string }> = {
    connecting: { label: 'Queued',    cls: 'text-yellow-400',       dot: 'bg-yellow-400 opacity-60' },
    running:    { label: 'Rendering', cls: 'text-blue-400',          dot: 'bg-blue-400 animate-pulse' },
    done:       { label: 'Done',      cls: 'text-spotify-green',     dot: 'bg-spotify-green' },
    error:      { label: 'Failed',    cls: 'text-red-400',           dot: 'bg-red-400' },
  };
  const { label, cls, dot } = map[status];
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      {label}
    </span>
  );
}

// Ask for notification permission once — silently if already granted/denied
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendNotification(label: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Render complete', { body: `${label} finished rendering.`, silent: true });
  }
}

// Short sine-wave beep via Web Audio API — respects notificationSound pref
function playChime() {
  try {
    const prefs = JSON.parse(localStorage.getItem('rer-prefs-v1') || '{}');
    if (prefs.notificationSound === false) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    osc.onended = () => ctx.close();
  } catch { /* audio not available */ }
}

export default function RenderConsole({
  jobs,
  onNewReel,
  onJobDone,
  onRetryJob,
}: {
  jobs: JobEntry[];
  onNewReel: () => void;
  onJobDone?: () => void;
  onRetryJob?: (job: JobEntry) => void;
}) {
  const [jobStates, setJobStates] = useState<Record<string, JobState>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tick, setTick] = useState(0); // 1-second ticker for elapsed display
  const bottomRef = useRef<HTMLDivElement>(null);
  const esRefs = useRef<Record<string, EventSource>>({})

  // Request notification permission once when the console mounts
  useEffect(() => { requestNotificationPermission(); }, []);

  // Auto-select the most recent job
  useEffect(() => {
    if (jobs.length > 0) {
      setSelectedId(jobs[jobs.length - 1].jobId);
    }
  }, [jobs.length]);

  // Open an SSE stream for each new job
  useEffect(() => {
    for (const { jobId, label } of jobs) {
      if (esRefs.current[jobId]) continue;

      setJobStates(s => ({
        ...s,
        [jobId]: s[jobId] ?? { status: 'connecting', logs: [], progress: null, startedAt: null },
      }));

      const es = new EventSource(`/api/render/${jobId}/stream`);
      esRefs.current[jobId] = es;

      es.onmessage = e => {
        const text = JSON.parse(e.data) as string;
        const line: LogLine = { text, color: colorLine(text) };
        setJobStates(s => {
          const prev = s[jobId] ?? { logs: [], progress: null, startedAt: null };
          return {
            ...s,
            [jobId]: {
              ...prev,
              status: 'running',
              startedAt: prev.startedAt ?? Date.now(),
              logs: [...prev.logs, line],
            },
          };
        });
      };

      es.addEventListener('progress', (e) => {
        const pct = JSON.parse((e as MessageEvent).data) as number;
        setJobStates(s => {
          const prev = s[jobId];
          let etaMs: number | null = null;
          if (prev?.startedAt && pct > 0) {
            const elapsed = Date.now() - prev.startedAt;
            etaMs = Math.round((elapsed / pct) * (100 - pct));
          }
          return { ...s, [jobId]: { ...(prev ?? { logs: [], progress: null, startedAt: null, etaMs: null }), progress: pct, etaMs } };
        });
      });

      es.addEventListener('done', () => {
        setJobStates(s => ({ ...s, [jobId]: { ...(s[jobId] ?? { logs: [], progress: null, startedAt: null, etaMs: null }), status: 'done', progress: 100 } }));
        sendNotification(label);
        playChime();
        onJobDone?.();
        es.close();
      });

      es.addEventListener('error', (e) => {
        const msg = (e as MessageEvent).data ? JSON.parse((e as MessageEvent).data) : 'Unknown error';
        const errText = `ERROR: ${msg}`;
        setJobStates(s => ({
          ...s,
          [jobId]: {
            ...(s[jobId] ?? { logs: [], progress: null }),
            logs: [...(s[jobId]?.logs ?? []), { text: errText, color: 'text-red-400' }],
            status: 'error',
          },
        }));
        es.close();
      });

      es.onerror = () => {
        setJobStates(s => {
          if (s[jobId]?.status === 'done' || s[jobId]?.status === 'error') return s;
          return { ...s, [jobId]: { ...(s[jobId] ?? { logs: [], progress: null }), status: 'error' } };
        });
        es.close();
      };
    }
    return () => {};
  }, [jobs]);

  // Tick every second while any job is running (for elapsed display)
  const hasRunning = Object.values(jobStates).some(j => j.status === 'running');
  useEffect(() => {
    if (!hasRunning) return;
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [hasRunning]);

  async function handleCancel(jobId: string) {
    try { await cancelRender(jobId); } catch { /* server will update status via SSE */ }
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-neutral-600 gap-4">
        <p className="text-4xl">🎬</p>
        <p className="text-lg text-neutral-400">No renders yet</p>
        <button onClick={onNewReel} className="text-white hover:underline text-sm">
          Start a new listing reel →
        </button>
      </div>
    );
  }

  const selected = selectedId ? jobStates[selectedId] : null;

  // Auto-scroll only when the selected job's lines grow or focus changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.logs.length, selectedId]);

  const doneCount = Object.values(jobStates).filter(j => j.status === 'done').length;
  const activeCount = jobs.filter(j => {
    const s = jobStates[j.jobId]?.status;
    return s === 'running' || s === 'connecting';
  }).length;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Render Videos</h1>
          <p className="text-neutral-500 text-sm">
            {doneCount}/{jobs.length} complete
            {activeCount > 0 && <span className="text-blue-400 ml-2">· {activeCount} rendering</span>}
          </p>
        </div>
        <button
          onClick={onNewReel}
          className="bg-neutral-800 hover:bg-neutral-700 text-sm text-white px-4 py-2 rounded-lg transition-colors"
        >
          + New Listing
        </button>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: '220px 1fr' }}>
        {/* ── Job list (left) ── */}
        <div className="space-y-1.5">
          {jobs.map(({ jobId, label }) => {
            const state = jobStates[jobId];
            const status: Status = state?.status ?? 'connecting';
            const pct = state?.progress ?? null;
            const isSelected = jobId === selectedId;
            return (
              <button
                key={jobId}
                onClick={() => setSelectedId(jobId)}
                className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors border overflow-hidden
                  ${isSelected
                    ? 'bg-neutral-800 border-neutral-600'
                    : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'}`}
              >
                <p className="text-sm text-white font-medium truncate leading-snug mb-1" title={label}>
                  {label}
                </p>
                <div className="flex items-center gap-2">
                  {statusBadge(status)}
                  {status === 'running' && (
                    <span className="text-xs font-mono text-blue-400 ml-auto">
                      {pct != null ? `${pct}%` : '…'}
                      {state?.startedAt && (
                        <span className="text-neutral-600 ml-1">
                          {formatElapsed(Date.now() - state.startedAt)}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                {status === 'running' && state?.etaMs != null && state.etaMs > 0 && (
                  <p className="text-xs text-neutral-600 mt-0.5">{formatEta(state.etaMs)}</p>
                )}
                {status === 'running' && (
                  <button
                    onClick={e => { e.stopPropagation(); handleCancel(jobId); }}
                    className="mt-1.5 w-full text-xs text-neutral-600 hover:text-red-400 transition-colors text-left"
                  >
                    Cancel render
                  </button>
                )}
                {status === 'error' && onRetryJob && jobs.find(j => j.jobId === jobId)?.payload && (
                  <button
                    onClick={e => { e.stopPropagation(); onRetryJob(jobs.find(j => j.jobId === jobId)!); }}
                    className="mt-1.5 w-full text-xs text-neutral-500 hover:text-spotify-green transition-colors text-left"
                  >
                    ↺ Retry
                  </button>
                )}
                {status === 'running' && pct != null && (
                  <div className="mt-2 h-1 rounded-full bg-neutral-700 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Log panel (right) ── */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
          {/* Terminal toolbar */}
          <div className="border-b border-neutral-800 bg-neutral-900">
            <div className="flex items-center gap-1.5 px-4 py-3">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="ml-3 text-xs text-neutral-600 font-mono truncate">
                {selectedId
                  ? jobs.find(j => j.jobId === selectedId)?.label ?? selectedId
                  : 'Select a job'}
              </span>
              {selected?.status === 'running' && (
                <span className="ml-auto text-xs text-blue-400 font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  {selected.progress != null ? `${selected.progress}%` : 'rendering…'}
                  {selected.etaMs != null && selected.etaMs > 0 && (
                    <span className="text-neutral-600 ml-1">{formatEta(selected.etaMs)}</span>
                  )}
                </span>
              )}
              {selected?.status === 'done' && (
                <span className="ml-auto text-xs text-spotify-green font-mono">✓ complete</span>
              )}
              {selected?.status === 'error' && (
                <span className="ml-auto text-xs text-red-400 font-mono">✗ failed</span>
              )}
            </div>
            {/* Progress bar under toolbar — only when actively rendering */}
            {selected?.status === 'running' && (
              <div className="h-0.5 bg-neutral-800">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${selected.progress ?? 0}%` }}
                />
              </div>
            )}
          </div>

          {/* Log output */}
          <div className="p-4 h-[calc(100vh-320px)] min-h-64 overflow-y-auto font-mono text-xs leading-relaxed">
            {!selectedId && (
              <span className="text-neutral-700">Select a job from the list to view its log.</span>
            )}
            {selectedId && !selected && (
              <span className="text-neutral-600 animate-pulse">Connecting…</span>
            )}
            {selected?.logs.map((line, i) => (
              <div key={i} className={line.color}>
                {line.text || <br />}
              </div>
            ))}
            {selected?.status === 'done' && (
              <div className="mt-3 text-spotify-green font-medium">
                ✅ Render complete — switch to Output Gallery to download.
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
