import type { CampaignFormData, ListingAssets, OutputCampaign } from './types';

export const API_BASE: string = import.meta.env.VITE_API_URL ?? '';

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

export function projectFileUrl(projectName: string, relPath: string): string {
  return `${API_BASE}/api/projects/${encodeURIComponent(projectName)}/files/${encodeURIComponent(relPath)}`;
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
