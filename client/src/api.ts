import type { BrandLibrary, CampaignFormData, ListingAssets, OutputCampaign, ProjectSummary } from './types';

export const API_BASE: string = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export async function getProjects(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/api/projects`);
  if (!res.ok) throw new Error('Failed to load listings');
  return res.json();
}

export async function createProject(name: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to create listing');
  }
}

export async function getListingAssets(name: string): Promise<ListingAssets> {
  const res = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(name)}/listing-assets`);
  if (!res.ok) throw new Error('Failed to load listing assets');
  return res.json();
}

export async function getProjectSummaries(): Promise<ProjectSummary[]> {
  const res = await fetch(`${API_BASE}/api/project-summaries`);
  if (!res.ok) throw new Error('Failed to load project dashboard');
  return res.json();
}

export async function duplicateProject(name: string, copyName: string): Promise<{ name: string }> {
  const res = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(name)}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: copyName }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to duplicate project');
  }
  return res.json();
}

export async function importProjectZip(file: File): Promise<{ name: string }> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${API_BASE}/api/projects/import`, { method: 'POST', body: fd });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to import project');
  }
  return res.json();
}

export function exportProjectUrl(name: string): string {
  return `${API_BASE}/api/projects/${encodeURIComponent(name)}/export`;
}

export async function getBrandLibrary(): Promise<BrandLibrary> {
  const res = await fetch(`${API_BASE}/api/brand-library`);
  if (!res.ok) throw new Error('Failed to load brand library');
  return res.json();
}

export function brandAssetUrl(kind: keyof BrandLibrary, file: string): string {
  return `${API_BASE}/api/brand-library/${encodeURIComponent(kind)}/${encodeURIComponent(file)}`;
}

export async function uploadBrandAsset(kind: keyof BrandLibrary, file: File): Promise<{ file: string; label: string }> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${API_BASE}/api/brand-library/${encodeURIComponent(kind)}`, {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to upload brand asset');
  }
  return res.json();
}

export async function useBrandAsset(projectName: string, kind: keyof BrandLibrary, file: string): Promise<{ file: string }> {
  const res = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(projectName)}/use-brand-asset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, file }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to attach brand asset');
  }
  return res.json();
}

export function projectFileUrl(projectName: string, relPath: string): string {
  const safeRelPath = relPath.split('/').map(part => encodeURIComponent(part)).join('/');
  return `${API_BASE}/api/projects/${encodeURIComponent(projectName)}/files/${safeRelPath}`;
}

export async function uploadListingPhoto(projectName: string, file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(projectName)}/photos`, {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) throw new Error('Failed to upload listing photo');
  return (await res.json()).file;
}

export async function uploadListingPhotos(projectName: string, files: FileList | File[]): Promise<string[]> {
  const selected = Array.from(files).filter(file => /image/i.test(file.type));
  if (selected.length === 0) throw new Error('Choose at least one image file');

  const fd = new FormData();
  selected.forEach(file => fd.append('files', file));

  const res = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(projectName)}/photos/batch`, {
    method: 'POST',
    body: fd,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to upload listing photos');
  }

  const data = await res.json();
  return data.files || [];
}
export async function uploadHeadshot(projectName: string, file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(projectName)}/headshot`, {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) throw new Error('Failed to upload agent headshot');
  return (await res.json()).file;
}

export async function uploadLogo(projectName: string, file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(projectName)}/logo`, {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) throw new Error('Failed to upload brokerage logo');
  return (await res.json()).file;
}

export async function uploadMusic(projectName: string, file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${API_BASE}/api/projects/${encodeURIComponent(projectName)}/music`, {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) throw new Error('Failed to upload background music');
  return (await res.json()).file;
}

export async function cancelRender(jobId: string): Promise<void> {
  await fetch(`${API_BASE}/api/render/${jobId}`, { method: 'DELETE' });
}

export async function deleteOutputFile(slug: string, filename: string): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/outputs/${encodeURIComponent(slug)}/${encodeURIComponent(filename)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete file');
  }
}

export async function startRender(campaign: CampaignFormData): Promise<{ jobId: string }> {
  const res = await fetch(`${API_BASE}/api/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(campaign),
  });
  if (!res.ok) throw new Error('Failed to start render');
  return res.json();
}

export async function getOutputs(): Promise<OutputCampaign[]> {
  const res = await fetch(`${API_BASE}/api/outputs`);
  if (!res.ok) throw new Error('Failed to load outputs');
  return res.json();
}

export async function getHealth(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) throw new Error('Server unhealthy');
}


