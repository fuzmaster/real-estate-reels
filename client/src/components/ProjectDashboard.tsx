import { useEffect, useRef, useState } from 'react';
import { duplicateProject, exportProjectUrl, getProjectSummaries, importProjectZip } from '../api';
import type { ProjectSummary } from '../types';
import { cloudSyncEnabled, slideshowBucket, supabase } from '../lib/supabase';

interface CloudSlideshow {
  id: string;
  project_name: string;
  storage_path: string;
  created_at?: string;
}

export default function ProjectDashboard({
  refreshKey = 0,
  onOpenProject,
}: {
  refreshKey?: number;
  onOpenProject: (name: string) => void;
}) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [email, setEmail] = useState('');
  const [sessionEmail, setSessionEmail] = useState('');
  const [cloudSlideshows, setCloudSlideshows] = useState<CloudSlideshow[]>([]);
  const [cloudMessage, setCloudMessage] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProjectSummaries().then(setProjects).catch(() => setError('Could not load listing dashboard.'));
  }, [refreshKey]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSessionEmail(data.session?.user.email || '');
      if (data.session) loadCloudSlideshows();
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user.email || '');
      if (session) loadCloudSlideshows();
      else setCloudSlideshows([]);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const visible = projects.filter(project => project.name.toLowerCase().includes(query.toLowerCase()));

  async function handleDuplicate(project: ProjectSummary) {
    const name = `${project.name} Copy`;
    setBusy(project.name);
    setError('');
    try {
      const result = await duplicateProject(project.name, name);
      const next = await getProjectSummaries();
      setProjects(next);
      onOpenProject(result.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not duplicate project.');
    } finally {
      setBusy('');
    }
  }

  async function handleImport(file: File) {
    setBusy('import');
    setError('');
    try {
      const result = await importProjectZip(file);
      const next = await getProjectSummaries();
      setProjects(next);
      onOpenProject(result.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not import project.');
    } finally {
      setBusy('');
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !email.trim()) return;
    setBusy('auth');
    setCloudMessage('');
    const { error: authError } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setCloudMessage(authError ? authError.message : 'Check your email for the sign-in link.');
    setBusy('');
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSessionEmail('');
    setCloudSlideshows([]);
  }

  async function loadCloudSlideshows() {
    if (!supabase) return;
    const { data, error: loadError } = await supabase
      .from('saved_slideshows')
      .select('id, project_name, storage_path, created_at')
      .order('created_at', { ascending: false });
    if (loadError) {
      setCloudMessage(loadError.message);
      return;
    }
    setCloudSlideshows((data || []) as CloudSlideshow[]);
  }

  async function saveToCloud(project: ProjectSummary) {
    if (!supabase) return;
    setBusy(`cloud-${project.name}`);
    setCloudMessage('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) throw new Error('Sign in first.');
      const response = await fetch(exportProjectUrl(project.name));
      if (!response.ok) throw new Error('Could not export project ZIP.');
      const blob = await response.blob();
      const safe = project.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'project';
      const storagePath = `${user.id}/${safe}-${Date.now()}.zip`;
      const { error: uploadError } = await supabase.storage.from(slideshowBucket).upload(storagePath, blob, {
        contentType: 'application/zip',
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { error: rowError } = await supabase.from('saved_slideshows').insert({
        user_id: user.id,
        project_name: project.name,
        storage_path: storagePath,
      });
      if (rowError) throw rowError;
      await loadCloudSlideshows();
      setCloudMessage('Saved slideshow backup to cloud storage.');
    } catch (e) {
      setCloudMessage(e instanceof Error ? e.message : 'Could not save slideshow backup.');
    } finally {
      setBusy('');
    }
  }

  async function restoreFromCloud(item: CloudSlideshow) {
    if (!supabase) return;
    setBusy(`restore-${item.id}`);
    setCloudMessage('');
    try {
      const { data, error: downloadError } = await supabase.storage.from(slideshowBucket).download(item.storage_path);
      if (downloadError || !data) throw downloadError || new Error('Could not download slideshow ZIP.');
      const file = new File([data], `${item.project_name}.zip`, { type: 'application/zip' });
      const result = await importProjectZip(file);
      const next = await getProjectSummaries();
      setProjects(next);
      onOpenProject(result.name);
      setCloudMessage('Cloud slideshow restored locally.');
    } catch (e) {
      setCloudMessage(e instanceof Error ? e.message : 'Could not restore slideshow.');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Listings Dashboard</h1>
          <p className="text-neutral-400 text-sm">Resume, duplicate, export, or import local listing projects.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => importRef.current?.click()} className="bg-white hover:bg-neutral-200 text-black px-4 py-2 text-sm font-bold">
            {busy === 'import' ? 'Importing...' : 'Import ZIP'}
          </button>
          <input ref={importRef} type="file" accept=".zip,application/zip" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) handleImport(file); e.target.value = ''; }} />
        </div>
      </div>

      <div className="border border-neutral-800 bg-neutral-950 px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-neutral-500">Cloud Backups</div>
            <div className="text-sm text-white font-semibold mt-1">
              {cloudSyncEnabled ? (sessionEmail ? `Signed in as ${sessionEmail}` : 'Sign in to save slideshow ZIP backups') : 'Supabase cloud sync is not configured'}
            </div>
          </div>
          {cloudSyncEnabled && !sessionEmail && (
            <form onSubmit={handleMagicLink} className="flex flex-col gap-2 sm:flex-row">
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" className="bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500" />
              <button type="submit" className="bg-white hover:bg-neutral-200 text-black px-4 py-2 text-sm font-bold">{busy === 'auth' ? 'Sending...' : 'Email Sign-in Link'}</button>
            </form>
          )}
          {cloudSyncEnabled && sessionEmail && (
            <button type="button" onClick={handleSignOut} className="border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 px-3 py-2 text-sm text-white">Sign Out</button>
          )}
        </div>
        {cloudMessage && <div className="mt-3 text-xs text-neutral-400">{cloudMessage}</div>}
        {cloudSyncEnabled && sessionEmail && cloudSlideshows.length > 0 && (
          <div className="mt-4 grid gap-2">
            {cloudSlideshows.map(item => (
              <div key={item.id} className="border border-neutral-800 bg-neutral-900/70 px-3 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm text-white font-semibold">{item.project_name}</div>
                  <div className="text-xs text-neutral-500">{item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Saved slideshow backup'}</div>
                </div>
                <button type="button" onClick={() => restoreFromCloud(item)} className="border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 px-3 py-2 text-sm text-white">
                  {busy === `restore-${item.id}` ? 'Restoring...' : 'Restore'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div className="border border-red-800 bg-red-950/40 text-red-300 px-4 py-3 text-sm">{error}</div>}

      <div className="border border-neutral-800 bg-neutral-950 px-3 py-3">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search listings" className="w-full bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500" />
      </div>

      <div className="grid gap-3">
        {visible.map(project => (
          <div key={project.name} className="border border-neutral-800 bg-neutral-900 px-4 py-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold truncate">{project.name}</div>
              <div className="mt-1 text-xs text-neutral-500">
                {project.photos} photos · {project.outputs} outputs · updated {new Date(project.updatedAt).toLocaleDateString()}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => onOpenProject(project.name)} className="border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 px-3 py-2 text-sm text-white">Resume</button>
              <button type="button" onClick={() => handleDuplicate(project)} disabled={busy === project.name} className="border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 px-3 py-2 text-sm text-white">Duplicate</button>
              {cloudSyncEnabled && sessionEmail && (
                <button type="button" onClick={() => saveToCloud(project)} disabled={busy === `cloud-${project.name}`} className="border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 px-3 py-2 text-sm text-white">
                  {busy === `cloud-${project.name}` ? 'Saving...' : 'Save Cloud Backup'}
                </button>
              )}
              <a href={exportProjectUrl(project.name)} className="border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 px-3 py-2 text-sm text-white">Export ZIP</a>
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="border border-neutral-800 bg-neutral-900 px-4 py-12 text-center text-neutral-500 text-sm">
            No listings found.
          </div>
        )}
      </div>
    </div>
  );
}
