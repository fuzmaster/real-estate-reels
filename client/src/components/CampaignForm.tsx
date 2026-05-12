import { useEffect, useRef, useState } from 'react';
import {
  createProject, getListingAssets, getProjects, projectFileUrl,
  startRender, uploadHeadshot, uploadListingPhoto, uploadLogo, uploadMusic,
} from '../api';
import type { CampaignFormData, ReelTemplate } from '../types';

const TEMPLATE_OPTIONS: { id: ReelTemplate; label: string; description: string; defaultCta: string }[] = [
  { id: 'just-listed', label: 'Just Listed',  description: 'New on the market — agent + property hero', defaultCta: 'Schedule a Showing' },
  { id: 'open-house', label: 'Open House',   description: 'Date & time + property highlights',          defaultCta: 'Come to the Open House' },
  { id: 'just-sold',  label: 'Just Sold',    description: 'Sold celebration + agent CTA',                defaultCta: 'See What Your Home Is Worth' },
];

const CTA_PRESETS = [
  'Schedule a Showing',
  'Message Me for Details',
  'View the Full Listing',
  'Come to the Open House',
  'See What Your Home Is Worth',
];

const US_STATE_ABBREV = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

const TEMPLATE_KEY = 'rer-templates-v1';

interface ListingTemplate {
  id: string;
  name: string;
  agentName: string;
  agentPhone: string;
  agentEmail: string;
  brokerageName: string;
  ctaText: string;
}

function loadTemplates(): ListingTemplate[] {
  try { return JSON.parse(localStorage.getItem(TEMPLATE_KEY) || '[]'); } catch { return []; }
}
function saveTemplates(t: ListingTemplate[]) {
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(t));
}

// A default, friendly example to populate the form on first load.
const DEFAULT_SAMPLE = {
  propertyAddress: '123 Magnolia Lane',
  city: 'Austin',
  state: 'TX',
  listingPrice: '$1,250,000',
  beds: '4',
  baths: '3',
  squareFeet: '2,840',
  agentName: 'Jordan Carter',
  agentPhone: '(512) 555-0142',
  agentEmail: 'jordan@bluestonere.com',
  brokerageName: 'Bluestone Realty',
  ctaText: 'Schedule a Showing',
  shortDescription: 'Hill-country light, white-oak floors, and a chef’s kitchen.',
  neighborhood: 'Travis Heights',
};

export default function CampaignForm({
  onRenderStarted,
  onAddToQueue,
  serverOk,
}: {
  onRenderStarted: (jobId: string, label: string, payload: CampaignFormData) => void;
  onAddToQueue: (campaign: CampaignFormData) => void;
  serverOk: boolean | null;
}) {
  // Listing folder selection
  const [mode, setMode] = useState<'existing' | 'new'>('new');
  const [projects, setProjects] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectReady, setProjectReady] = useState(false);

  // Listing detail fields
  const [propertyAddress, setPropertyAddress] = useState(DEFAULT_SAMPLE.propertyAddress);
  const [city, setCity] = useState(DEFAULT_SAMPLE.city);
  const [state, setState] = useState(DEFAULT_SAMPLE.state);
  const [listingPrice, setListingPrice] = useState(DEFAULT_SAMPLE.listingPrice);
  const [beds, setBeds] = useState(DEFAULT_SAMPLE.beds);
  const [baths, setBaths] = useState(DEFAULT_SAMPLE.baths);
  const [squareFeet, setSquareFeet] = useState(DEFAULT_SAMPLE.squareFeet);

  // Agent / brokerage
  const [agentName, setAgentName] = useState(DEFAULT_SAMPLE.agentName);
  const [agentPhone, setAgentPhone] = useState(DEFAULT_SAMPLE.agentPhone);
  const [agentEmail, setAgentEmail] = useState(DEFAULT_SAMPLE.agentEmail);
  const [brokerageName, setBrokerageName] = useState(DEFAULT_SAMPLE.brokerageName);
  const [ctaText, setCtaText] = useState(DEFAULT_SAMPLE.ctaText);

  // Optional
  const [openHouseDate, setOpenHouseDate] = useState('');
  const [openHouseTime, setOpenHouseTime] = useState('');
  const [shortDescription, setShortDescription] = useState(DEFAULT_SAMPLE.shortDescription);
  const [neighborhood, setNeighborhood] = useState(DEFAULT_SAMPLE.neighborhood);
  const [mlsLink, setMlsLink] = useState('');

  // Assets
  const [photos, setPhotos] = useState<string[]>([]);
  const [photosUploading, setPhotosUploading] = useState(false);
  const [headshot, setHeadshot] = useState('');
  const [headshotUploading, setHeadshotUploading] = useState(false);
  const [logo, setLogo] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [music, setMusic] = useState('');
  const [musicUploading, setMusicUploading] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<ReelTemplate[]>(['just-listed']);

  // Output config
  const [duration, setDuration] = useState(18);

  // Saved agent profiles
  const [profiles, setProfiles] = useState<ListingTemplate[]>(loadTemplates);
  const [profileName, setProfileName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [queuedFeedback, setQueuedFeedback] = useState(false);
  const [error, setError] = useState('');

  const photosInputRef = useRef<HTMLInputElement>(null);
  const headshotInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);

  const activeName = mode === 'new' ? newProjectName.trim() : selectedProject;

  // Load listing list on mount
  useEffect(() => {
    getProjects().then(setProjects).catch(() => {
      if (serverOk !== false) setError('Could not load listings. Is the server running?');
    });
  }, []);

  // When an existing listing is selected, load its assets
  useEffect(() => {
    if (mode !== 'existing' || !selectedProject) return;
    setProjectReady(true);
    getListingAssets(selectedProject).then(a => {
      setPhotos(a.photos);
      setHeadshot(a.headshot || '');
      setLogo(a.logo || '');
      setMusic(a.music || '');
    }).catch(() => {});
  }, [selectedProject, mode]);

  // Reset assets when switching modes
  useEffect(() => {
    setSelectedProject('');
    setNewProjectName('');
    setProjectReady(false);
    setPhotos([]);
    setHeadshot('');
    setLogo('');
    setMusic('');
  }, [mode]);

  async function handleCreateProject() {
    const name = newProjectName.trim();
    if (!name) return setError('Enter a listing folder name first.');
    setCreatingProject(true);
    setError('');
    try {
      await createProject(name);
      setProjectReady(true);
      setProjects(p => [...p, name].sort());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed';
      if (msg.includes('already exists')) {
        setProjectReady(true);
      } else {
        setError(msg);
      }
    } finally {
      setCreatingProject(false);
    }
  }

  async function handlePhotoUpload(files: FileList) {
    if (!activeName || !projectReady) return setError('Create or select a listing first.');
    setPhotosUploading(true);
    setError('');
    try {
      const uploaded: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (!/image/i.test(f.type)) continue;
        const saved = await uploadListingPhoto(activeName, f);
        uploaded.push(saved);
      }
      setPhotos(p => Array.from(new Set([...p, ...uploaded])));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setPhotosUploading(false);
    }
  }

  async function handleHeadshotUpload(file: File) {
    if (!activeName || !projectReady) return setError('Create or select a listing first.');
    setHeadshotUploading(true);
    try {
      const saved = await uploadHeadshot(activeName, file);
      setHeadshot(saved);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setHeadshotUploading(false);
    }
  }

  async function handleLogoUpload(file: File) {
    if (!activeName || !projectReady) return setError('Create or select a listing first.');
    setLogoUploading(true);
    try {
      const saved = await uploadLogo(activeName, file);
      setLogo(saved);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleMusicUpload(file: File) {
    if (!activeName || !projectReady) return setError('Create or select a listing first.');
    setMusicUploading(true);
    try {
      const saved = await uploadMusic(activeName, file);
      setMusic(saved);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setMusicUploading(false);
    }
  }

  function toggleTemplate(id: ReelTemplate) {
    setTemplates(prev => {
      const next = prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id];
      // When user adds Open House, default CTA if blank or generic
      if (!prev.includes('open-house') && id === 'open-house' && !ctaText) {
        setCtaText('Come to the Open House');
      }
      return next;
    });
  }

  function buildPayload(): CampaignFormData | null {
    if (!activeName) { setError('Select or create a listing.'); return null; }
    if (!projectReady) { setError('Create the listing folder first.'); return null; }
    if (templates.length === 0) { setError('Choose at least one video template.'); return null; }
    if (!propertyAddress.trim()) { setError('Property address is required.'); return null; }
    if (!agentName.trim()) { setError('Agent name is required.'); return null; }
    if (photos.length === 0) { setError('Upload at least one listing photo.'); return null; }
    return {
      folder: activeName,
      templates,
      propertyAddress,
      city,
      state,
      listingPrice,
      beds,
      baths,
      squareFeet,
      agentName,
      agentPhone,
      agentEmail,
      brokerageName,
      ctaText: ctaText.trim() || 'Schedule a Showing',
      openHouseDate,
      openHouseTime,
      shortDescription,
      neighborhood,
      mlsLink,
      photos,
      headshot,
      logo,
      music,
      duration,
    };
  }

  function handleAddToQueue() {
    setError('');
    const payload = buildPayload();
    if (!payload) return;
    onAddToQueue(payload);
    setQueuedFeedback(true);
    setTimeout(() => setQueuedFeedback(false), 2500);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const payload = buildPayload();
    if (!payload) return;
    try {
      setSubmitting(true);
      const { jobId } = await startRender(payload);
      onRenderStarted(jobId, activeName, payload);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start render.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSaveProfile() {
    const name = profileName.trim() || `Profile ${profiles.length + 1}`;
    const profile: ListingTemplate = {
      id: Date.now().toString(),
      name, agentName, agentPhone, agentEmail, brokerageName, ctaText,
    };
    const updated = [...profiles, profile];
    setProfiles(updated);
    saveTemplates(updated);
    setProfileName('');
    setSavingProfile(false);
  }

  function handleLoadProfile(p: ListingTemplate) {
    setAgentName(p.agentName);
    setAgentPhone(p.agentPhone);
    setAgentEmail(p.agentEmail);
    setBrokerageName(p.brokerageName);
    setCtaText(p.ctaText);
  }

  function handleDeleteProfile(id: string) {
    const updated = profiles.filter(p => p.id !== id);
    setProfiles(updated);
    saveTemplates(updated);
  }

  const fileCount = templates.length;

  return (
    <form id="campaign-form" onSubmit={handleSubmit}>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">New Listing Reel</h1>
            <p className="text-neutral-400 text-sm">
              Fill in the listing details and choose a video template.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-800 text-red-300 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* ── Saved agent profiles ── */}
        {(profiles.length > 0 || savingProfile) && (
          <Card title="Agent Profiles">
            {profiles.length > 0 && (
              <div className="space-y-1.5 mb-4">
                {profiles.map(p => (
                  <div key={p.id} className="flex items-center gap-2 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2">
                    <span className="flex-1 text-sm text-neutral-200 truncate">{p.name}</span>
                    <span className="text-xs text-neutral-500 truncate hidden sm:block">{p.brokerageName}</span>
                    <button type="button" onClick={() => handleLoadProfile(p)}
                      className="text-xs text-white bg-neutral-700 hover:bg-neutral-600 px-2.5 py-1 rounded transition-colors flex-shrink-0">
                      Load
                    </button>
                    <button type="button" onClick={() => handleDeleteProfile(p.id)}
                      className="text-xs text-neutral-600 hover:text-red-400 transition-colors flex-shrink-0 px-1">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            {savingProfile ? (
              <div className="flex gap-2">
                <input
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveProfile(); } if (e.key === 'Escape') setSavingProfile(false); }}
                  placeholder={`Profile ${profiles.length + 1}`}
                  autoFocus
                  className={`${inputClass} flex-1`}
                />
                <button type="button" onClick={handleSaveProfile}
                  className="bg-white hover:bg-neutral-200 text-black text-sm font-medium px-4 py-2 rounded-lg transition-colors flex-shrink-0">
                  Save
                </button>
                <button type="button" onClick={() => setSavingProfile(false)}
                  className="text-neutral-500 hover:text-white text-sm px-3 py-2 rounded-lg transition-colors flex-shrink-0">
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setSavingProfile(true)}
                className="text-xs text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-3 py-1.5 rounded-lg transition-colors">
                + Save current agent details as profile
              </button>
            )}
          </Card>
        )}
        {profiles.length === 0 && !savingProfile && (
          <div className="flex justify-end">
            <button type="button" onClick={() => setSavingProfile(true)}
              className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors">
              + Save agent details as profile
            </button>
          </div>
        )}

        {/* ── Listing folder ── */}
        <Card title="Listing Folder" help="Each listing gets its own folder on disk. Use New for a fresh listing, or Existing to reopen one you've already started.">
          <div className="flex gap-1 bg-neutral-950 border border-neutral-700 rounded-lg p-1 w-fit mb-4">
            <ModeBtn active={mode === 'new'} onClick={() => setMode('new')}>New Listing</ModeBtn>
            <ModeBtn active={mode === 'existing'} onClick={() => setMode('existing')}>Existing Listing</ModeBtn>
          </div>

          {mode === 'existing' ? (
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              className={selectClass}
              required
            >
              <option value="">— Select a listing —</option>
              {projects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                placeholder="123 Magnolia Lane"
                className={`${inputClass} flex-1`}
              />
              <button
                type="button"
                onClick={handleCreateProject}
                disabled={creatingProject || !newProjectName.trim() || projectReady}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0
                  ${projectReady
                    ? 'bg-white/10 text-white border border-white/40'
                    : 'bg-neutral-700 hover:bg-neutral-600 text-white disabled:opacity-40'}`}
              >
                {projectReady ? '✓ Created' : creatingProject ? 'Creating…' : 'Create Folder'}
              </button>
            </div>
          )}
        </Card>

        {/* ── Listing details ── */}
        <Card title="Listing Details">
          <div className="grid grid-cols-2 gap-4">
            <Label text="Property Address *" full>
              <input value={propertyAddress} onChange={e => setPropertyAddress(e.target.value)}
                placeholder="123 Magnolia Lane" className={inputClass} />
            </Label>
            <Label text="City *">
              <input value={city} onChange={e => setCity(e.target.value)}
                placeholder="Austin" className={inputClass} />
            </Label>
            <Label text="State *">
              <select value={state} onChange={e => setState(e.target.value)} className={selectClass}>
                <option value="">—</option>
                {US_STATE_ABBREV.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Label>
            <Label text="Listing Price *">
              <input value={listingPrice} onChange={e => setListingPrice(e.target.value)}
                placeholder="$1,250,000" className={inputClass} />
            </Label>
            <Label text="Beds *">
              <input value={beds} onChange={e => setBeds(e.target.value)} inputMode="numeric"
                placeholder="4" className={inputClass} />
            </Label>
            <Label text="Baths *">
              <input value={baths} onChange={e => setBaths(e.target.value)} inputMode="numeric"
                placeholder="3" className={inputClass} />
            </Label>
            <Label text="Square Feet *">
              <input value={squareFeet} onChange={e => setSquareFeet(e.target.value)}
                placeholder="2,840" className={inputClass} />
            </Label>
            <Label text="Neighborhood">
              <input value={neighborhood} onChange={e => setNeighborhood(e.target.value)}
                placeholder="Travis Heights" className={inputClass} />
            </Label>
            <Label text="Short Description" full>
              <input value={shortDescription} onChange={e => setShortDescription(e.target.value)}
                placeholder="Hill-country light, white-oak floors, and a chef’s kitchen."
                className={inputClass} />
            </Label>
            <Label text="MLS Link" full>
              <input value={mlsLink} onChange={e => setMlsLink(e.target.value)}
                placeholder="https://"
                className={inputClass} />
            </Label>
          </div>
        </Card>

        {/* ── Open house ── */}
        {templates.includes('open-house') && (
          <Card title="Open House Details">
            <div className="grid grid-cols-2 gap-4">
              <Label text="Open House Date">
                <input type="date" value={openHouseDate} onChange={e => setOpenHouseDate(e.target.value)}
                  className={inputClass} />
              </Label>
              <Label text="Open House Time">
                <input value={openHouseTime} onChange={e => setOpenHouseTime(e.target.value)}
                  placeholder="Sat 1:00 – 4:00 PM"
                  className={inputClass} />
              </Label>
            </div>
          </Card>
        )}

        {/* ── Agent branding ── */}
        <Card title="Agent Branding">
          <div className="grid grid-cols-2 gap-4">
            <Label text="Agent Name *">
              <input value={agentName} onChange={e => setAgentName(e.target.value)}
                placeholder="Jordan Carter" className={inputClass} />
            </Label>
            <Label text="Brokerage Name *">
              <input value={brokerageName} onChange={e => setBrokerageName(e.target.value)}
                placeholder="Bluestone Realty" className={inputClass} />
            </Label>
            <Label text="Agent Phone *">
              <input value={agentPhone} onChange={e => setAgentPhone(e.target.value)}
                placeholder="(512) 555-0142" className={inputClass} />
            </Label>
            <Label text="Agent Email *">
              <input type="email" value={agentEmail} onChange={e => setAgentEmail(e.target.value)}
                placeholder="agent@brokerage.com" className={inputClass} />
            </Label>
          </div>

          <div className="mt-4 pt-4 border-t border-neutral-800">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">CTA Text</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {CTA_PRESETS.map(p => (
                <button key={p} type="button"
                  onClick={() => setCtaText(p)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors
                    ${ctaText === p
                      ? 'bg-white/10 border border-white/60 text-white'
                      : 'bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500'}`}>
                  {p}
                </button>
              ))}
            </div>
            <input value={ctaText} onChange={e => setCtaText(e.target.value)}
              placeholder="Schedule a Showing"
              className={inputClass} />
          </div>
        </Card>

        {/* ── Upload Photos ── */}
        <Card
          title={`Listing Photos (${photos.length})`}
          help="JPG or PNG. The first photo is treated as the hero shot. Order matters — earlier photos appear first in the reel."
          action={
            <div className="flex gap-1">
              <button type="button"
                onClick={() => photosInputRef.current?.click()}
                disabled={!projectReady || photosUploading}
                className="text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-3 py-1 rounded transition-colors disabled:opacity-40">
                {photosUploading ? 'Uploading…' : '+ Add Photos'}
              </button>
              <input ref={photosInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={e => { if (e.target.files?.length) handlePhotoUpload(e.target.files); e.target.value = ''; }} />
            </div>
          }
        >
          {photos.length === 0 ? (
            <div
              onClick={() => projectReady && photosInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl py-10 text-center transition-colors
                ${projectReady ? 'border-neutral-700 hover:border-neutral-500 cursor-pointer' : 'border-neutral-800 opacity-50'}`}
            >
              <div className="text-3xl mb-1">🏠</div>
              <p className="text-sm text-neutral-400">
                {projectReady ? 'Drop photos here or click to upload' : 'Create or select a listing first'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {photos.map((p, i) => (
                <div key={p} className="relative aspect-square rounded-lg overflow-hidden border border-neutral-700 bg-neutral-950">
                  <img src={projectFileUrl(activeName, p)} className="w-full h-full object-cover" />
                  <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {i + 1}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhotos(arr => arr.filter(x => x !== p))}
                    className="absolute top-1 right-1 bg-black/70 hover:bg-red-600 text-white text-[10px] w-5 h-5 rounded flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Headshot / Logo / Music ── */}
        <Card title="Optional Branding Assets">
          <div className="grid grid-cols-3 gap-4">
            {/* Headshot */}
            <div>
              <p className="text-xs text-neutral-500 mb-2">Agent Headshot</p>
              <SquareDrop
                src={headshot ? projectFileUrl(activeName, headshot) : null}
                uploading={headshotUploading}
                locked={!projectReady}
                accept="image/*"
                onFile={handleHeadshotUpload}
                inputRef={headshotInputRef}
                emoji="🧑"
                hint="Square works best"
              />
            </div>
            {/* Logo */}
            <div>
              <p className="text-xs text-neutral-500 mb-2">Brokerage Logo</p>
              <SquareDrop
                src={logo ? projectFileUrl(activeName, logo) : null}
                uploading={logoUploading}
                locked={!projectReady}
                accept="image/*"
                onFile={handleLogoUpload}
                inputRef={logoInputRef}
                emoji="🏢"
                hint="PNG with transparency"
              />
            </div>
            {/* Music */}
            <div>
              <p className="text-xs text-neutral-500 mb-2">Background Music</p>
              <SquareDrop
                src={null}
                filename={music ? music.split('/').pop() : ''}
                uploading={musicUploading}
                locked={!projectReady}
                accept="audio/*,.wav,.mp3,.aac,.m4a"
                onFile={handleMusicUpload}
                inputRef={musicInputRef}
                emoji="🎵"
                hint="Optional"
              />
            </div>
          </div>
        </Card>

        {/* ── Templates ── */}
        <Card title="Choose Video Template" help="Pick one or more templates. Each selected template produces one rendered video.">
          <div className="grid grid-cols-3 gap-3">
            {TEMPLATE_OPTIONS.map(opt => {
              const on = templates.includes(opt.id);
              return (
                <button key={opt.id} type="button" onClick={() => toggleTemplate(opt.id)}
                  className={`p-3 rounded-lg border text-left transition-colors
                    ${on ? 'bg-white/10 border-white/60 text-white'
                      : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-500'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-3 h-3 rounded-sm border-2 flex-shrink-0 transition-colors
                      ${on ? 'bg-white border-white' : 'border-neutral-500'}`} />
                    <span className="font-semibold text-sm">{opt.label}</span>
                  </div>
                  <p className="text-xs text-neutral-500 pl-5">{opt.description}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-neutral-800">
            <label className="block text-xs text-neutral-500 mb-1.5">
              Duration — <span className="text-neutral-200 font-mono">{duration}s</span>
            </label>
            <input type="range" value={duration} onChange={e => setDuration(parseInt(e.target.value))}
              min={10} max={30} step={1}
              className="w-full cursor-pointer" />
            <div className="flex justify-between text-xs text-neutral-600 mt-0.5">
              <span>10s</span><span>30s</span>
            </div>
          </div>
        </Card>

        {/* ── Submit ── */}
        <div className="flex flex-wrap items-center gap-3 pb-10">
          <button type="submit" disabled={submitting}
            className="bg-white hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold px-8 py-3 rounded-lg transition-colors text-sm tracking-wide">
            {submitting ? 'Starting…' : 'RENDER NOW'}
          </button>
          <button
            type="button"
            onClick={handleAddToQueue}
            className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm border border-neutral-700"
          >
            {queuedFeedback ? '✓ Added to Queue' : '+ Add to Queue'}
          </button>
          {fileCount > 0 && (
            <span className="text-xs text-neutral-500 ml-1">
              {fileCount} file{fileCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </form>
  );
}

// ── Sub-components ────────────────────────────────────────────

function SquareDrop({
  src, filename, uploading, locked, accept, onFile, inputRef, emoji, hint,
}: {
  src: string | null;
  filename?: string;
  uploading: boolean;
  locked: boolean;
  accept: string;
  onFile: (f: File) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  emoji: string;
  hint: string;
}) {
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }
  return (
    <div
      onClick={() => !locked && inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-colors flex flex-col items-center justify-center gap-2 p-3
        ${locked ? 'border-neutral-800 cursor-not-allowed opacity-50'
          : src || filename ? 'border-neutral-700 bg-neutral-900 cursor-pointer hover:border-neutral-500'
            : 'border-dashed border-neutral-600 cursor-pointer hover:border-neutral-400 bg-neutral-900'}`}
    >
      {src ? (
        <img src={src} className="absolute inset-0 w-full h-full object-cover" />
      ) : filename ? (
        <>
          <div className="text-3xl">{emoji}</div>
          <p className="text-xs text-neutral-300 font-mono text-center break-all leading-snug">{filename}</p>
          <p className="text-[10px] text-neutral-600">Click to replace</p>
        </>
      ) : (
        <>
          <div className="text-3xl text-neutral-600">{emoji}</div>
          <p className="text-xs text-neutral-500 text-center">Drop or click</p>
          <p className="text-[10px] text-neutral-700">{hint}</p>
        </>
      )}
      {uploading && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <span className="text-xs text-white animate-pulse">Uploading…</span>
        </div>
      )}
      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />
    </div>
  );
}

function Card({ title, action, help, children }: { title: string; action?: React.ReactNode; help?: string; children: React.ReactNode }) {
  const [showHelp, setShowHelp] = useState(false);
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">{title}</h2>
          {help && (
            <button
              type="button"
              onClick={() => setShowHelp(s => !s)}
              className={`w-4 h-4 rounded-full border text-[10px] font-bold leading-none flex items-center justify-center transition-colors flex-shrink-0
                ${showHelp ? 'bg-neutral-600 border-neutral-500 text-white' : 'border-neutral-700 text-neutral-600 hover:border-neutral-500 hover:text-neutral-400'}`}
              title="Show help"
            >?</button>
          )}
        </div>
        {action}
      </div>
      {help && showHelp && (
        <div className="mb-4 bg-neutral-800/60 border border-neutral-700 rounded-lg px-3 py-2.5 text-xs text-neutral-400 leading-relaxed">
          {help}
        </div>
      )}
      {children}
    </div>
  );
}

function Label({ text, full, children }: { text: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <label className="block text-xs text-neutral-500 mb-1.5">{text}</label>
      {children}
    </div>
  );
}

function ModeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors
        ${active ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-200'}`}>
      {children}
    </button>
  );
}

const inputClass =
  'w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 ' +
  'placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors';

const selectClass =
  'w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-100 ' +
  'focus:outline-none focus:border-neutral-500 transition-colors cursor-pointer';
