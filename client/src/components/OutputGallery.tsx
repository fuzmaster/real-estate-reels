import { useEffect, useState } from 'react';
import { deleteOutputFile, getOutputs } from '../api';
import type { OutputCampaign } from '../types';

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(mtime: string): string {
  const d = new Date(mtime);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function reelVersion(filename: string): { label: string; color: string } {
  if (filename.startsWith('JustListed')) return { label: 'Just Listed', color: 'text-emerald-300 bg-emerald-950 border-emerald-800' };
  if (filename.startsWith('OpenHouse'))  return { label: 'Open House',  color: 'text-blue-300 bg-blue-950 border-blue-800' };
  if (filename.startsWith('JustSold'))   return { label: 'Just Sold',   color: 'text-purple-300 bg-purple-950 border-purple-800' };
  // Legacy fallbacks for files rendered with older naming
  if (filename.startsWith('V1')) return { label: 'V1', color: 'text-neutral-300 bg-neutral-800 border-neutral-700' };
  if (filename.startsWith('V2')) return { label: 'V2', color: 'text-neutral-300 bg-neutral-800 border-neutral-700' };
  if (filename.startsWith('V3')) return { label: 'V3', color: 'text-neutral-300 bg-neutral-800 border-neutral-700' };
  return { label: filename, color: 'text-neutral-400 bg-neutral-800 border-neutral-700' };
}

type SortKey = 'date' | 'name' | 'size';

function sortFiles(files: OutputCampaign['files'], key: SortKey) {
  return [...files].sort((a, b) => {
    if (key === 'name') return a.name.localeCompare(b.name);
    if (key === 'size') return b.size - a.size;
    return new Date(b.mtime).getTime() - new Date(a.mtime).getTime(); // date desc
  });
}

export default function OutputGallery({ refreshKey = 0 }: { refreshKey?: number }) {
  const [campaigns, setCampaigns] = useState<OutputCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set()); // "slug/file" keys
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('date');

  function loadOutputs() {
    setLoading(true);
    getOutputs()
      .then(setCampaigns)
      .catch(() => setError('Failed to load outputs.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadOutputs(); }, [refreshKey]);

  async function handleDelete(slug: string, filename: string) {
    const key = `${slug}/${filename}`;
    setDeletingFile(key);
    try {
      await deleteOutputFile(slug, filename);
      setCampaigns(prev => prev
        .map(c => c.slug === slug ? { ...c, files: c.files.filter(f => f.name !== filename) } : c)
        .filter(c => c.files.length > 0)
      );
      if (previewName === filename.replace('.mp4', '')) setPreviewUrl(null);
    } catch {
      setError('Failed to delete file.');
    } finally {
      setDeletingFile(null);
      setConfirmDelete(null);
    }
  }

  function toggleSelect(key: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleSelectAll(slug: string, files: OutputCampaign['files']) {
    const keys = files.map(f => `${slug}/${f.name}`);
    const allSelected = keys.every(k => selected.has(k));
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    setBulkDeleting(true);
    const toDelete = Array.from(selected);
    for (const key of toDelete) {
      const slash = key.indexOf('/');
      const slug = key.slice(0, slash);
      const filename = key.slice(slash + 1);
      try {
        await deleteOutputFile(slug, filename);
        setCampaigns(prev => prev
          .map(c => c.slug === slug ? { ...c, files: c.files.filter(f => f.name !== filename) } : c)
          .filter(c => c.files.length > 0)
        );
      } catch { /* skip individual failures */ }
    }
    setSelected(new Set());
    setBulkDeleting(false);
  }

  function openPreview(slug: string, filename: string) {
    setPreviewUrl(`/api/outputs/${encodeURIComponent(slug)}/${encodeURIComponent(filename)}`);
    setPreviewName(filename.replace('.mp4', ''));
  }

  if (loading) {
    return <div className="text-neutral-600 text-sm animate-pulse py-12 text-center">Loading outputs…</div>;
  }
  if (error) {
    return <div className="text-red-400 text-sm py-12 text-center">{error}</div>;
  }
  if (campaigns.length === 0) {
    return (
      <div className="text-center py-20 text-neutral-600">
        <p className="text-4xl mb-4">🏠</p>
        <p className="text-lg font-medium mb-1">No outputs yet</p>
        <p className="text-sm">Render your first listing reel to see it here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Output Gallery</h1>
          <p className="text-neutral-400 text-sm">
            {campaigns.reduce((n, c) => n + c.files.length, 0)} file(s) across {campaigns.length} listing(s)
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="text-xs bg-neutral-800 border border-neutral-700 text-neutral-400 rounded px-2 py-1.5 cursor-pointer focus:outline-none"
          >
            <option value="date">Newest first</option>
            <option value="name">Name A–Z</option>
            <option value="size">Largest first</option>
          </select>
          <button
            onClick={loadOutputs}
            className="text-xs text-neutral-500 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Bulk-action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5">
          <span className="text-sm text-neutral-300 flex-1">
            {selected.size} file{selected.size !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-neutral-500 hover:text-white transition-colors"
          >
            Clear
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="text-xs bg-red-950 hover:bg-red-900 text-red-400 hover:text-red-300 border border-red-800 px-3 py-1.5 rounded transition-colors disabled:opacity-50"
          >
            {bulkDeleting ? 'Deleting…' : `Delete ${selected.size}`}
          </button>
        </div>
      )}

      {campaigns.map(campaign => {
        const sortedFiles = sortFiles(campaign.files, sortKey);
        const allKeys = sortedFiles.map(f => `${campaign.slug}/${f.name}`);
        const allChecked = allKeys.length > 0 && allKeys.every(k => selected.has(k));
        return (
        <div key={campaign.slug} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-800 bg-neutral-900/80 flex items-center gap-3">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={() => toggleSelectAll(campaign.slug, sortedFiles)}
              className="w-3.5 h-3.5 accent-spotify-green cursor-pointer flex-shrink-0"
              title="Select all in campaign"
            />
            <h2 className="font-semibold text-white text-sm flex-1">{campaign.slug.replace(/_/g, ' ')}</h2>
          </div>
          <div className="divide-y divide-neutral-800">
            {sortedFiles.map(file => {
              const { label, color } = reelVersion(file.name);
              const fileKey = `${campaign.slug}/${file.name}`;
              const isSelected = selected.has(fileKey);
              return (
                <div key={file.name} className={`flex items-center gap-4 px-5 py-3 transition-colors ${isSelected ? 'bg-neutral-800/60' : 'hover:bg-neutral-800/40'}`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(fileKey)}
                    className="w-3.5 h-3.5 accent-spotify-green cursor-pointer flex-shrink-0"
                  />
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium flex-shrink-0 ${color}`}>
                    {label}
                  </span>
                  <span className="flex-1 text-sm text-neutral-300 font-mono truncate" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-xs text-neutral-600 flex-shrink-0">{formatBytes(file.size)}</span>
                  <span className="text-xs text-neutral-600 flex-shrink-0 hidden sm:block">{formatDate(file.mtime)}</span>
                  <button
                    onClick={() => openPreview(campaign.slug, file.name)}
                    className="text-xs text-neutral-400 hover:text-white flex-shrink-0 bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 rounded transition-colors"
                  >
                    Preview
                  </button>
                  <a
                    href={`/api/outputs/${encodeURIComponent(campaign.slug)}/${encodeURIComponent(file.name)}`}
                    download={file.name}
                    className="text-xs text-spotify-green hover:text-green-300 flex-shrink-0 bg-spotify-green/10 hover:bg-spotify-green/20 px-3 py-1.5 rounded transition-colors"
                  >
                    Download
                  </a>
                  {confirmDelete === `${campaign.slug}/${file.name}` ? (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleDelete(campaign.slug, file.name)}
                        disabled={deletingFile === `${campaign.slug}/${file.name}`}
                        className="text-xs text-red-400 hover:text-red-300 bg-red-950 hover:bg-red-900 px-2 py-1.5 rounded transition-colors disabled:opacity-50"
                      >
                        {deletingFile === `${campaign.slug}/${file.name}` ? '…' : 'Yes, delete'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs text-neutral-500 hover:text-white px-2 py-1.5 rounded transition-colors"
                      >
                        Keep
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(`${campaign.slug}/${file.name}`)}
                      className="text-xs text-neutral-700 hover:text-red-400 flex-shrink-0 px-2 py-1.5 rounded transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        );
      })}

      {/* Video preview modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="bg-neutral-900 border border-neutral-700 rounded-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-700">
              <span className="text-sm font-medium text-white truncate max-w-xs">{previewName}</span>
              <button
                onClick={() => setPreviewUrl(null)}
                className="text-neutral-400 hover:text-white ml-4 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <video
              src={previewUrl}
              controls
              autoPlay
              className="max-h-[75vh] w-auto"
              style={{ aspectRatio: '9/16', maxWidth: '360px' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
