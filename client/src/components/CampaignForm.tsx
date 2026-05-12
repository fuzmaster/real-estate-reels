import { useEffect, useRef, useState } from 'react';
import {
  createProject, getListingAssets, getProjects, projectFileUrl,
  startRender, uploadHeadshot, uploadListingPhoto, uploadLogo, uploadMusic,
} from '../api';
import type { CampaignFormData, MusicMood, PacingPreset, ReelTemplate, VideoStyle, PhotoTransition } from '../types';
import type { PhotoFraming } from '../utils/photoFraming';
import { DEFAULT_PHOTO_FRAMING, getPhotoFraming, DEFAULT_PHOTO_SETTING, detectImageDimensions, getSmartFramingLabel, getSmartFramingDescription, recommendPhotoFramingForImage } from '../utils/photoFraming';
import FrameYourShotModal from './FrameYourShotModal';
import { calculateSmartDuration, explainSmartDuration } from '../utils/smartDuration';

const TEMPLATE_OPTIONS: { id: ReelTemplate; label: string; description: string; defaultCta: string }[] = [
  { id: 'just-listed', label: 'Just Listed', description: 'New listing tour with property hook', defaultCta: 'DM TOUR FOR DETAILS' },
  { id: 'open-house', label: 'Open House', description: 'Date, time, and showing CTA', defaultCta: 'DM OPEN HOUSE' },
  { id: 'just-sold', label: 'Just Sold', description: 'Agent proof and seller CTA', defaultCta: 'SEE WHAT YOUR HOME IS WORTH' },
];

const CTA_PRESETS = [
  'DM TOUR FOR DETAILS',
  'COMMENT INFO FOR DETAILS',
  'MESSAGE ME TO BOOK A TOUR',
  'SEND THIS TO YOUR PARTNER',
  'SEE WHAT YOUR HOME IS WORTH',
];

const TRANSITION_OPTIONS: { id: PhotoTransition; label: string; description: string; tier: 'Free' | 'Pro' }[] = [
  { id: 'smart-mix', label: 'Smart Mix', description: 'Rotates between clean motion styles automatically.', tier: 'Free' },
  { id: 'soft-fade', label: 'Soft Fade', description: 'Simple safe crossfade-style entry.', tier: 'Free' },
  { id: 'slide-left', label: 'Slide In', description: 'Photos slide into place with motion.', tier: 'Free' },
  { id: 'zoom-pop', label: 'Zoom Pop', description: 'Fast social-media punch-in.', tier: 'Pro' },
  { id: 'slide-up', label: 'Slide Up', description: 'Clean brokerage-style upward motion.', tier: 'Pro' },
  { id: 'whip-pan', label: 'Whip Pan', description: 'Fast energetic movement for social reels.', tier: 'Pro' },
  { id: 'flash-cut', label: 'Flash Cut', description: 'Bright transition for high-energy videos.', tier: 'Pro' },
  { id: 'none', label: 'No Transition', description: 'Plain hard cuts.', tier: 'Free' },
];
const US_STATE_ABBREV = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

const DEFAULT_SAMPLE = {
  propertyAddress: '123 Maple Street',
  city: 'Windsor',
  state: 'CT',
  listingPrice: '$500,000',
  beds: '4',
  baths: '2',
  squareFeet: '2,100',
  agentName: 'Jordan Carter',
  agentPhone: '(860) 555-0142',
  agentEmail: 'jordan@example.com',
  brokerageName: 'Bluestone Realty',
  ctaText: 'DM TOUR FOR DETAILS',
  shortDescription: 'A bright move-in ready home with flexible living space.',
  neighborhood: 'Windsor Center',
};

function formatPriceInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.includes('$')) return trimmed;
  const digits = trimmed.replace(/[^0-9]/g, '');
  if (!digits) return trimmed;
  return `$${Number(digits).toLocaleString('en-US')}`;
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function CampaignForm({
  onRenderStarted,
  onAddToQueue,
  serverOk,
}: {
  onRenderStarted: (jobId: string, label: string, payload: CampaignFormData) => void;
  onAddToQueue: (campaign: CampaignFormData) => void;
  serverOk: boolean | null;
}) {
  const [mode, setMode] = useState<'existing' | 'new'>('new');
  const [projects, setProjects] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectReady, setProjectReady] = useState(false);

  const [propertyAddress, setPropertyAddress] = useState(DEFAULT_SAMPLE.propertyAddress);
  const [city, setCity] = useState(DEFAULT_SAMPLE.city);
  const [state, setState] = useState(DEFAULT_SAMPLE.state);
  const [listingPrice, setListingPrice] = useState(DEFAULT_SAMPLE.listingPrice);
  const [beds, setBeds] = useState(DEFAULT_SAMPLE.beds);
  const [baths, setBaths] = useState(DEFAULT_SAMPLE.baths);
  const [squareFeet, setSquareFeet] = useState(DEFAULT_SAMPLE.squareFeet);
  const [agentName, setAgentName] = useState(DEFAULT_SAMPLE.agentName);
  const [agentPhone, setAgentPhone] = useState(DEFAULT_SAMPLE.agentPhone);
  const [agentEmail, setAgentEmail] = useState(DEFAULT_SAMPLE.agentEmail);
  const [brokerageName, setBrokerageName] = useState(DEFAULT_SAMPLE.brokerageName);
  const [ctaText, setCtaText] = useState(DEFAULT_SAMPLE.ctaText);
  const [openHouseDate, setOpenHouseDate] = useState('');
  const [openHouseTime, setOpenHouseTime] = useState('');
  const [shortDescription, setShortDescription] = useState(DEFAULT_SAMPLE.shortDescription);
  const [neighborhood, setNeighborhood] = useState(DEFAULT_SAMPLE.neighborhood);
  const [mlsLink, setMlsLink] = useState('');

  const [photos, setPhotos] = useState<string[]>([]);
  const [photoFraming, setPhotoFraming] = useState<Record<string, PhotoFraming>>({});
  const [photosUploading, setPhotosUploading] = useState(false);
  const [headshot, setHeadshot] = useState('');
  const [headshotUploading, setHeadshotUploading] = useState(false);
  const [logo, setLogo] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [music, setMusic] = useState('');
  const [musicUploading, setMusicUploading] = useState(false);

  const [templates, setTemplates] = useState<ReelTemplate[]>(['just-listed']);
  const [duration, setDuration] = useState(15);
  const [useSmartDuration, setUseSmartDuration] = useState(true);
  const [videoStyle, setVideoStyle] = useState<VideoStyle>('social-punchy');
  const [pacing, setPacing] = useState<PacingPreset>('fast');
  const [musicMood, setMusicMood] = useState<MusicMood>('warm-inviting');
  const [photoTransition, setPhotoTransition] = useState<PhotoTransition>('smart-mix');
  const [safeZones, setSafeZones] = useState(true);
  const [autoEnhance, setAutoEnhance] = useState(true);
  const [persistentBranding, setPersistentBranding] = useState(true);
  const [progressBar, setProgressBar] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [queuedFeedback, setQueuedFeedback] = useState(false);
  const [error, setError] = useState('');
  const [frameEditorPhoto, setFrameEditorPhoto] = useState<string | null>(null);

  const photosInputRef = useRef<HTMLInputElement>(null);
  const headshotInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);

  const activeName = mode === 'new' ? newProjectName.trim() : selectedProject;


  const smartDuration = calculateSmartDuration(photos.length);
  const effectiveDuration = useSmartDuration ? smartDuration : duration;
  const smartDurationExplanation = explainSmartDuration(photos.length, smartDuration);
  useEffect(() => {
    getProjects().then(setProjects).catch(() => {
      if (serverOk !== false) setError('Could not load listings. Is the server running?');
    });
  }, [serverOk]);

  useEffect(() => {
    if (mode !== 'existing' || !selectedProject) return;
    setProjectReady(true);
    getListingAssets(selectedProject).then(a => {
      setPhotos(a.photos);
      setHeadshot(a.headshot || '');
      setLogo(a.logo || '');
      setMusic(a.music || '');
      setPhotoFraming(prev => {
        const next = { ...prev };
        for (const p of a.photos) if (!next[p]) next[p] = DEFAULT_PHOTO_FRAMING;
        return next;
      });
    }).catch(() => {});
  }, [selectedProject, mode]);

  useEffect(() => {
    setSelectedProject('');
    setNewProjectName('');
    setProjectReady(false);
    setPhotos([]);
    setPhotoFraming({});
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
      if (msg.includes('already exists')) setProjectReady(true);
      else setError(msg);
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
      const smartFramingBySavedPath: Record<string, any> = {};
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (!/image/i.test(f.type)) continue;
        const saved = await uploadListingPhoto(activeName, f);
        uploaded.push(saved);
        try {
          const dims = await detectImageDimensions(f);
          smartFramingBySavedPath[saved] = recommendPhotoFramingForImage({
            width: dims.width,
            height: dims.height,
            photoPath: saved,
            index: uploaded.length - 1,
          });
        } catch {
          smartFramingBySavedPath[saved] = recommendPhotoFramingForImage({
            photoPath: saved,
            index: uploaded.length - 1,
          });
        }
      }
      setPhotos(p => Array.from(new Set([...p, ...uploaded])));
      setPhotoFraming(prev => {
        const next = { ...prev };
        for (const p of uploaded) next[p] = DEFAULT_PHOTO_FRAMING;
        return next;
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setPhotosUploading(false);
    }
  }

  async function handleHeadshotUpload(file: File) {
    if (!activeName || !projectReady) return setError('Create or select a listing first.');
    setHeadshotUploading(true);
    try { setHeadshot(await uploadHeadshot(activeName, file)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Upload failed'); }
    finally { setHeadshotUploading(false); }
  }

  async function handleLogoUpload(file: File) {
    if (!activeName || !projectReady) return setError('Create or select a listing first.');
    setLogoUploading(true);
    try { setLogo(await uploadLogo(activeName, file)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Upload failed'); }
    finally { setLogoUploading(false); }
  }

  async function handleMusicUpload(file: File) {
    if (!activeName || !projectReady) return setError('Create or select a listing first.');
    setMusicUploading(true);
    try { setMusic(await uploadMusic(activeName, file)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Upload failed'); }
    finally { setMusicUploading(false); }
  }

  function toggleTemplate(id: ReelTemplate) {
    setTemplates(prev => {
      const next = prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id];
      const opt = TEMPLATE_OPTIONS.find(t => t.id === id);
      if (opt && !prev.includes(id)) setCtaText(opt.defaultCta);
      return next;
    });
  }

  function makeHero(index: number) {
    if (index <= 0) return;
    setPhotos(p => moveItem(p, index, 0));
  }

  function movePhoto(index: number, direction: -1 | 1) {
    const to = index + direction;
    if (to < 0 || to >= photos.length) return;
    setPhotos(p => moveItem(p, index, to));
  }

  function removePhoto(photo: string) {
    setPhotos(arr => arr.filter(x => x !== photo));
    setPhotoFraming(prev => {
      const next = { ...prev };
      delete next[photo];
      return next;
    });
  }

  function saveFraming(photo: string, settings: PhotoFraming) {
    setPhotoFraming(prev => ({ ...prev, [photo]: settings }));
    setFrameEditorPhoto(null);
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
      listingPrice: formatPriceInput(listingPrice),
      beds,
      baths,
      squareFeet,
      agentName,
      agentPhone,
      agentEmail,
      brokerageName,
      ctaText: ctaText.trim().toUpperCase() || 'DM TOUR FOR DETAILS',
      openHouseDate,
      openHouseTime,
      shortDescription,
      neighborhood,
      mlsLink,
      photos,
      photoFraming,
      headshot,
      logo,
      music,
      duration: effectiveDuration,
      useSmartDuration,
      recommendedDuration: smartDuration,
      videoStyle,
      pacing,
      musicMood,
      photoTransition,
      safeZones,
      autoEnhance,
      persistentBranding,
      progressBar,
    };
  }

  function handleAddToQueue() {
    setError('');
    const payload = buildPayload();
    if (!payload) return;
    onAddToQueue(payload);
    setQueuedFeedback(true);
    setTimeout(() => setQueuedFeedback(false), 2200);
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

  const frameEditorUrl = frameEditorPhoto && activeName ? projectFileUrl(activeName, frameEditorPhoto) : '';

  return (
    <form id="campaign-form" onSubmit={handleSubmit}>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">New Listing Reel</h1>
          <p className="text-neutral-400 text-sm">Upload photos, frame each shot, choose a vibe, then render.</p>
        </div>

        {error && <div className="bg-red-950/50 border border-red-800 text-red-300 px-4 py-3 rounded-none text-sm">{error}</div>}

        <Card title="1. Listing Project" help="Each listing gets its own folder. Use New for a fresh listing or Existing to reopen one.">
          <div className="flex gap-1 bg-neutral-950 border border-neutral-700 rounded-none p-1 w-fit mb-4">
            <ModeBtn active={mode === 'new'} onClick={() => setMode('new')}>New Listing</ModeBtn>
            <ModeBtn active={mode === 'existing'} onClick={() => setMode('existing')}>Existing Listing</ModeBtn>
          </div>
          {mode === 'existing' ? (
            <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className={selectClass} required>
              <option value="">— Select a listing —</option>
              {projects.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          ) : (
            <div className="flex gap-2">
              <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="123 Maple Street" className={`${inputClass} flex-1`} />
              <button type="button" onClick={handleCreateProject} disabled={creatingProject || !newProjectName.trim() || projectReady}
                className={`px-4 py-2 rounded-none text-sm font-medium transition-colors flex-shrink-0 ${projectReady ? 'bg-white/10 text-white border border-white/40' : 'bg-neutral-700 hover:bg-neutral-600 text-white disabled:opacity-40'}`}>
                {projectReady ? '✓ Created' : creatingProject ? 'Creating…' : 'Create Folder'}
              </button>
            </div>
          )}
        </Card>

        <Card title="2. Property Details">
          <div className="grid grid-cols-2 gap-4">
            <Label text="Property Address *" full><input value={propertyAddress} onChange={e => setPropertyAddress(e.target.value)} className={inputClass} /></Label>
            <Label text="City *"><input value={city} onChange={e => setCity(e.target.value)} className={inputClass} /></Label>
            <Label text="State *"><select value={state} onChange={e => setState(e.target.value)} className={selectClass}><option value="">—</option>{US_STATE_ABBREV.map(s => <option key={s} value={s}>{s}</option>)}</select></Label>
            <Label text="Listing Price *"><input value={listingPrice} onChange={e => setListingPrice(e.target.value)} onBlur={() => setListingPrice(formatPriceInput(listingPrice))} className={inputClass} /></Label>
            <Label text="Beds *"><input value={beds} onChange={e => setBeds(e.target.value)} className={inputClass} /></Label>
            <Label text="Baths *"><input value={baths} onChange={e => setBaths(e.target.value)} className={inputClass} /></Label>
            <Label text="Square Feet *"><input value={squareFeet} onChange={e => setSquareFeet(e.target.value)} className={inputClass} /></Label>
            <Label text="Neighborhood"><input value={neighborhood} onChange={e => setNeighborhood(e.target.value)} className={inputClass} /></Label>
            <Label text="Short Description" full><input value={shortDescription} onChange={e => setShortDescription(e.target.value)} className={inputClass} /></Label>
            <Label text="MLS Link" full><input value={mlsLink} onChange={e => setMlsLink(e.target.value)} placeholder="https://" className={inputClass} /></Label>
          </div>
        </Card>

        {templates.includes('open-house') && (
          <Card title="Open House Details">
            <div className="grid grid-cols-2 gap-4">
              <Label text="Open House Date"><input type="date" value={openHouseDate} onChange={e => setOpenHouseDate(e.target.value)} className={inputClass} /></Label>
              <Label text="Open House Time"><input value={openHouseTime} onChange={e => setOpenHouseTime(e.target.value)} placeholder="Sat 1:00 – 4:00 PM" className={inputClass} /></Label>
            </div>
          </Card>
        )}

        <Card title="3. Agent Branding">
          <div className="grid grid-cols-2 gap-4">
            <Label text="Agent Name *"><input value={agentName} onChange={e => setAgentName(e.target.value)} className={inputClass} /></Label>
            <Label text="Brokerage Name *"><input value={brokerageName} onChange={e => setBrokerageName(e.target.value)} className={inputClass} /></Label>
            <Label text="Agent Phone *"><input value={agentPhone} onChange={e => setAgentPhone(e.target.value)} className={inputClass} /></Label>
            <Label text="Agent Email *"><input type="email" value={agentEmail} onChange={e => setAgentEmail(e.target.value)} className={inputClass} /></Label>
          </div>
          <div className="mt-4 pt-4 border-t border-neutral-800">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">CTA Text</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {CTA_PRESETS.map(p => <button key={p} type="button" onClick={() => setCtaText(p)} className={`px-2.5 py-1 rounded text-xs transition-colors ${ctaText === p ? 'bg-white/10 border border-white/60 text-white' : 'bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500'}`}>{p}</button>)}
            </div>
            <input value={ctaText} onChange={e => setCtaText(e.target.value.toUpperCase())} className={inputClass} />
          </div>
        </Card>

        <Card title={`Photos + Framing (${photos.length})`} help="First photo becomes the hero opener. Drag/reorder later; for now use the arrows or Make Hero." action={<button type="button" onClick={() => photosInputRef.current?.click()} disabled={!projectReady || photosUploading} className="text-xs text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-3 py-1 rounded transition-colors disabled:opacity-40">{photosUploading ? 'Uploading…' : '+ Add Photos'}</button>}>
          <input ref={photosInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { if (e.target.files?.length) handlePhotoUpload(e.target.files); e.target.value = ''; }} />
          {photos.length === 0 ? (
            <div onClick={() => projectReady && photosInputRef.current?.click()} className={`border-2 border-dashed rounded-none py-10 text-center transition-colors ${projectReady ? 'border-neutral-700 hover:border-neutral-500 cursor-pointer' : 'border-neutral-800 opacity-50'}`}>
              <div className="text-3xl mb-1">🏠</div>
              <p className="text-sm text-neutral-400">{projectReady ? 'Click to upload listing photos' : 'Create or select a listing first'}</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {photos.map((p, i) => {
                const framing = getPhotoFraming(photoFraming, p);
                return (
                  <div key={p} className="rounded-none overflow-hidden border border-neutral-700 bg-neutral-950">
                    <div className="relative aspect-[9/10] overflow-hidden bg-black">
                      {framing.cropMode === 'whole' ? (
                        <>
                          <img src={projectFileUrl(activeName, p)} className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'blur(18px) brightness(0.25)', transform: 'scale(1.18)' }} />
                          <img src={projectFileUrl(activeName, p)} className="absolute inset-0 w-full h-full object-contain" />
                        </>
                      ) : (
                        <img src={projectFileUrl(activeName, p)} className="w-full h-full object-cover" style={{ objectPosition: `${50 + framing.x}% ${50 + framing.y}%`, transform: `scale(${framing.scale})` }} />
                      )}
                      <div className="absolute top-2 left-2 bg-black/75 text-white text-[10px] font-bold px-2 py-1 rounded-sm">{i === 0 ? 'HERO' : `#${i + 1}`}</div>
                      <div className="absolute bottom-2 left-2 bg-black/75 text-white text-[10px] font-bold px-2 py-1 rounded-sm">{framing.cropMode === 'whole' ? 'WHOLE ROOM' : 'FILL SCREEN'}</div>
                      <button type="button" onClick={() => removePhoto(p)} className="absolute top-2 right-2 bg-black/75 hover:bg-red-600 text-white text-xs w-7 h-7 rounded-sm">×</button>
                    </div>
                    <div className="p-3 space-y-2">
                      <button type="button" onClick={() => setFrameEditorPhoto(p)} className="w-full bg-white hover:bg-neutral-200 text-black text-xs font-bold px-3 py-2 rounded-none">FRAME SHOT</button>
                      <div className="grid grid-cols-3 gap-1">
                        <button type="button" disabled={i === 0} onClick={() => movePhoto(i, -1)} className="bg-neutral-800 disabled:opacity-30 hover:bg-neutral-700 text-neutral-200 text-xs px-2 py-1.5 rounded">↑</button>
                        <button type="button" disabled={i === 0} onClick={() => makeHero(i)} className="bg-neutral-800 disabled:opacity-30 hover:bg-neutral-700 text-neutral-200 text-xs px-2 py-1.5 rounded">Hero</button>
                        <button type="button" disabled={i === photos.length - 1} onClick={() => movePhoto(i, 1)} className="bg-neutral-800 disabled:opacity-30 hover:bg-neutral-700 text-neutral-200 text-xs px-2 py-1.5 rounded">↓</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        {/* V8_SMART_FRAMING_PANEL */}
        {photos.length > 0 && (
          <Card
            title="Smart Framing"
            help="Real Estate Reels automatically chooses a starting crop based on each photo shape. Most photos stay full-screen vertical. Ultra-wide rooms are flagged so you can review them."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {photos.slice(0, 8).map((photo, index) => {
                const settings = photoFraming[photo] ?? DEFAULT_PHOTO_FRAMING;
                return (
                  <button
                    key={photo}
                    type="button"
                    onClick={() => setFrameEditorPhoto(photo)}
                    className="text-left border border-neutral-700 bg-neutral-950 px-3 py-2 hover:border-neutral-400 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-white truncate">
                        {index === 0 ? 'Hero opener' : `Photo ${index + 1}`}
                      </span>
                      <span className="text-[10px] text-neutral-500 uppercase tracking-widest">
                        {settings?.cropMode === 'whole' ? 'Whole' : 'Fill'}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-neutral-400">
                      {getSmartFramingLabel(settings)}
                    </div>
                    <div className="mt-1 text-[11px] text-neutral-600 line-clamp-2">
                      {getSmartFramingDescription(settings)}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-500 leading-relaxed">
              Default rule: <span className="text-neutral-300">Fill Screen first.</span> Use Show Whole Room only when a room is so wide that vertical crop ruins the layout.
            </div>
          </Card>
        )}



        <Card title="5. Media Assets">
          <div className="grid grid-cols-3 gap-4">
            <SquareDrop label="Agent Headshot" src={headshot ? projectFileUrl(activeName, headshot) : null} filename="" uploading={headshotUploading} locked={!projectReady} accept="image/*" onFile={handleHeadshotUpload} inputRef={headshotInputRef} emoji="🧑" hint="Square works best" />
            <SquareDrop label="Brokerage Logo" src={logo ? projectFileUrl(activeName, logo) : null} filename="" uploading={logoUploading} locked={!projectReady} accept="image/*" onFile={handleLogoUpload} inputRef={logoInputRef} emoji="🏢" hint="PNG preferred" />
            <SquareDrop label="Music Track" src={null} filename={music ? music.split('/').pop() : ''} uploading={musicUploading} locked={!projectReady} accept="audio/*,.wav,.mp3,.aac,.m4a" onFile={handleMusicUpload} inputRef={musicInputRef} emoji="🎵" hint="Optional" />
          </div>
        </Card>

        <Card title="Video Controls" help="Keep this simple. These are the controls that can later become Free / Pro / Brokerage gates.">
          <div className="grid sm:grid-cols-2 gap-4">
            <Label text="Video Style"><select value={videoStyle} onChange={e => setVideoStyle(e.target.value as VideoStyle)} className={selectClass}><option value="social-punchy">Social Punchy</option><option value="luxury-cinematic">Luxury Cinematic</option><option value="brokerage-clean">Brokerage Clean</option></select></Label>
            <Label text="Pacing"><select value={pacing} onChange={e => setPacing(e.target.value as PacingPreset)} className={selectClass}><option value="fast">Fast Cuts</option><option value="balanced">Balanced</option><option value="cinematic">Cinematic</option></select></Label>
            <Label text="Music Mood"><select value={musicMood} onChange={e => setMusicMood(e.target.value as MusicMood)} className={selectClass}><option value="warm-inviting">Warm & Inviting</option><option value="modern-lofi">Modern Lo-Fi</option><option value="luxury-cinematic">Luxury Cinematic</option><option value="upbeat-open-house">Upbeat Open House</option><option value="corporate-professional">Corporate Professional</option><option value="urgent-driving">Urgent & Driving</option><option value="high-energy-social">High Energy Social</option></select></Label>
            <Label text={`Duration — ${duration}s`}><input type="range" value={duration} onChange={e => setDuration(parseInt(e.target.value))} min={10} max={30} step={1} className="w-full cursor-pointer" /></Label>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-4">
            <Toggle label="Safe Zones" checked={safeZones} onChange={setSafeZones} />
            <Toggle label="Auto-Enhance" checked={autoEnhance} onChange={setAutoEnhance} />
            <Toggle label="Agent Branding" checked={persistentBranding} onChange={setPersistentBranding} />
            <Toggle label="Progress Bar" checked={progressBar} onChange={setProgressBar} />
          </div>
        </Card>

        {/* V7_SMART_DURATION_CARD_START */}
        <Card
          title="Smart Duration"
          help="Auto Length protects agents from making slow reels. It recommends a reel length from the number of photos."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setUseSmartDuration(true)}
              className={`rounded-none border px-4 py-3 text-left transition-colors ${useSmartDuration ? 'border-white/70 bg-white/10 text-white' : 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-white'}`}
            >
              <div className="text-sm font-bold">✓ Auto Length</div>
              <div className="text-xs text-neutral-500 mt-1">Recommended for agents</div>
            </button>
            <button
              type="button"
              onClick={() => setUseSmartDuration(false)}
              className={`rounded-none border px-4 py-3 text-left transition-colors ${!useSmartDuration ? 'border-white/70 bg-white/10 text-white' : 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-white'}`}
            >
              <div className="text-sm font-bold">Manual Length</div>
              <div className="text-xs text-neutral-500 mt-1">Uses the duration slider above</div>
            </button>
          </div>

          <div className="mt-4 rounded-none border border-neutral-800 bg-neutral-950/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-neutral-500">Recommended Reel Length</p>
                <p className="text-2xl font-black text-white mt-1">{smartDuration}s</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-neutral-500">Render will use</p>
                <p className="text-xl font-bold text-white mt-1">{effectiveDuration}s</p>
              </div>
            </div>
            <p className="text-sm text-neutral-400 mt-3 leading-relaxed">{smartDurationExplanation}</p>
            <p className="text-xs text-neutral-600 mt-2">Formula: hero shot 2.5s + each extra photo 1.5s + CTA 2.5s. Minimum 6s. Maximum 30s.</p>
          </div>
        </Card>
        {/* V7_SMART_DURATION_CARD_END */}
        <Card title="7. Transitions" help="How listing photos move between scenes. Smart Mix works for any listing. Pro transitions unlock with upgrade.">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TRANSITION_OPTIONS.map(opt => {
              const selected = photoTransition === opt.id;
              const isPro = opt.tier === 'Pro';
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPhotoTransition(opt.id as PhotoTransition)}
                  className={`relative text-left rounded-none border p-3 transition-colors ${
                    selected
                      ? 'bg-white/10 border-white/50 text-white'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <span className="text-base leading-none">
                      {opt.id === 'smart-mix'  ? '✦' :
                       opt.id === 'soft-fade'  ? '◑' :
                       opt.id === 'slide-left' ? '→' :
                       opt.id === 'slide-up'   ? '↑' :
                       opt.id === 'zoom-pop'   ? '⊕' :
                       opt.id === 'whip-pan'   ? '⚡' :
                       opt.id === 'flash-cut'  ? '◈' : '▣'}
                    </span>
                    {isPro && (
                      <span className="text-[9px] font-black uppercase tracking-wider bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30 px-1.5 py-0.5 rounded-sm flex-shrink-0">
                        Pro
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold leading-tight mb-1">{opt.label}</div>
                  <div className="text-[11px] text-neutral-500 leading-snug">{opt.description}</div>
                  {selected && (
                    <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-sm bg-white" />
                  )}
                </button>
              );
            })}
          </div>
        </Card>





        <Card title="8. Template & Render">
          <div className="grid grid-cols-3 gap-3">
            {TEMPLATE_OPTIONS.map(opt => {
              const on = templates.includes(opt.id);
              return <button key={opt.id} type="button" onClick={() => toggleTemplate(opt.id)} className={`p-3 rounded-none border text-left transition-colors ${on ? 'bg-white/10 border-white/60 text-white' : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-500'}`}><div className="font-semibold text-sm">{opt.label}</div><p className="text-xs text-neutral-500 mt-1">{opt.description}</p></button>;
            })}
          </div>
        </Card>

        <div className="flex flex-wrap items-center gap-3 pb-10">
          <button type="submit" disabled={submitting} className="bg-white hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold px-8 py-3 rounded-none transition-colors text-sm tracking-wide">{submitting ? 'Starting…' : 'RENDER NOW'}</button>
          <button type="button" onClick={handleAddToQueue} className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-6 py-3 rounded-none transition-colors text-sm border border-neutral-700">{queuedFeedback ? '✓ Added to Queue' : '+ Add to Queue'}</button>
          <span className="text-xs text-neutral-500">{templates.length} output{templates.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {frameEditorPhoto && frameEditorUrl && (
        <FrameYourShotModal
          open={!!frameEditorPhoto}
          photoPath={frameEditorPhoto}
          photoUrl={frameEditorUrl}
          initial={getPhotoFraming(photoFraming, frameEditorPhoto)}
          onClose={() => setFrameEditorPhoto(null)}
          onSave={settings => saveFraming(frameEditorPhoto, settings)}
        />
      )}
    </form>
  );
}

function SquareDrop({ label, src, filename, uploading, locked, accept, onFile, inputRef, emoji, hint }: { label: string; src: string | null; filename?: string; uploading: boolean; locked: boolean; accept: string; onFile: (f: File) => void; inputRef: React.RefObject<HTMLInputElement>; emoji: string; hint: string; }) {
  return <div><p className="text-xs text-neutral-500 mb-2">{label}</p><div onClick={() => !locked && inputRef.current?.click()} className={`aspect-square rounded-none border border-neutral-700 bg-neutral-950 flex items-center justify-center text-center overflow-hidden ${locked ? 'opacity-50' : 'cursor-pointer hover:border-neutral-500'}`}>{src ? <img src={src} className="w-full h-full object-cover" /> : <div className="p-3"><div className="text-3xl mb-2">{emoji}</div><p className="text-xs text-neutral-400">{uploading ? 'Uploading…' : filename || hint}</p></div>}</div><input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} /></div>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <button type="button" onClick={() => onChange(!checked)} className={`rounded-none border px-3 py-2 text-xs font-bold transition-colors ${checked ? 'bg-white/10 border-white/50 text-white' : 'bg-neutral-900 border-neutral-700 text-neutral-500'}`}>{checked ? '✓ ' : ''}{label}</button>;
}

function Card({ title, help, action, children }: { title: string; help?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="bg-neutral-900 border border-neutral-800 rounded-none p-5"><div className="flex items-start justify-between gap-4 mb-4"><div><h2 className="text-white font-semibold">{title}</h2>{help && <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{help}</p>}</div>{action}</div>{children}</section>;
}

function Label({ text, full, children }: { text: string; full?: boolean; children: React.ReactNode }) {
  return <label className={full ? 'col-span-2' : ''}><span className="block text-xs text-neutral-500 mb-1.5 uppercase tracking-wider font-semibold">{text}</span>{children}</label>;
}

function ModeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`px-3 py-1.5 rounded-none text-sm font-medium transition-colors ${active ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-white'}`}>{children}</button>;
}

const inputClass = 'w-full bg-neutral-950 border border-neutral-700 rounded-none px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500';
const selectClass = `${inputClass} appearance-none`;


