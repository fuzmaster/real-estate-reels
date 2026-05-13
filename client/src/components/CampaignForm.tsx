import { useEffect, useRef, useState } from 'react';
import {
  brandAssetUrl, createProject, getBrandLibrary, getListingAssets, getProjects, projectFileUrl,
  startRender, uploadBrandAsset, uploadHeadshot, uploadListingPhotos, uploadLogo, uploadMusic, useBrandAsset,
} from '../api';
import type { BrandLibrary, CampaignFormData, MusicMood, PacingPreset, ReelTemplate, VideoStyle, PhotoTransition } from '../types';
import type { PhotoFraming } from '../utils/photoFraming';
import { DEFAULT_PHOTO_FRAMING, getPhotoFraming, DEFAULT_PHOTO_SETTING, detectImageDimensions, getSmartFramingLabel, getSmartFramingDescription, recommendPhotoFramingForImage } from '../utils/photoFraming';
import FrameYourShotModal from './FrameYourShotModal';
import LiveReelPlayer from './LiveReelPlayer';
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

const AGENT_PROFILES_KEY = 'rer-agent-profiles-v1';

interface AgentProfile {
  id: string;
  name: string;
  agentName: string;
  agentPhone: string;
  agentEmail: string;
  brokerageName: string;
  ctaText: string;
  videoStyle: VideoStyle;
  pacing: PacingPreset;
  musicMood: MusicMood;
  photoTransition: PhotoTransition;
}

function loadAgentProfiles(): AgentProfile[] {
  try {
    return JSON.parse(localStorage.getItem(AGENT_PROFILES_KEY) || '[]');
  } catch {
    return [];
  }
}

function persistAgentProfiles(profiles: AgentProfile[]) {
  localStorage.setItem(AGENT_PROFILES_KEY, JSON.stringify(profiles));
}

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

let googlePlacesPromise: Promise<void> | null = null;

function loadGooglePlacesScript(apiKey: string): Promise<void> {
  if ((window as typeof window & { google?: any }).google?.maps?.places) return Promise.resolve();
  if (googlePlacesPromise) return googlePlacesPromise;
  googlePlacesPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-places="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google Maps script failed')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.dataset.googlePlaces = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Maps script failed'));
    document.head.appendChild(script);
  });
  return googlePlacesPromise;
}

function getAddressComponent(
  components: Array<{ long_name?: string; short_name?: string; types?: string[] }>,
  type: string,
  useShortName = false,
): string {
  const match = components.find(component => component.types?.includes(type));
  return (useShortName ? match?.short_name : match?.long_name) || '';
}

export default function CampaignForm({
  onRenderStarted,
  onAddToQueue,
  serverOk,
  projectToOpen,
  onProjectOpened,
  onProjectChanged,
}: {
  onRenderStarted: (jobId: string, label: string, payload: CampaignFormData) => void;
  onAddToQueue: (campaign: CampaignFormData) => void;
  serverOk: boolean | null;
  projectToOpen?: string;
  onProjectOpened?: () => void;
  onProjectChanged?: () => void;
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
  const [agentProfiles, setAgentProfiles] = useState<AgentProfile[]>(loadAgentProfiles);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [profileName, setProfileName] = useState('');
  const [brandLibrary, setBrandLibrary] = useState<BrandLibrary>({ headshots: [], logos: [], music: [] });
  const [selectedBrandHeadshot, setSelectedBrandHeadshot] = useState('');
  const [selectedBrandLogo, setSelectedBrandLogo] = useState('');
  const [selectedBrandMusic, setSelectedBrandMusic] = useState('');
  const [brandBusy, setBrandBusy] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [queuedFeedback, setQueuedFeedback] = useState(false);
  const [error, setError] = useState('');
  const [frameEditorPhoto, setFrameEditorPhoto] = useState<string | null>(null);

  const photosInputRef = useRef<HTMLInputElement>(null);
  const headshotInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const preserveSelectionRef = useRef(false);
  const propertyAddressRef = useRef<HTMLInputElement>(null);

  const activeName = mode === 'new' ? newProjectName.trim() : selectedProject;


  const smartDuration = calculateSmartDuration(photos.length);
  const effectiveDuration = useSmartDuration ? smartDuration : duration;
  const smartDurationExplanation = explainSmartDuration(photos.length, smartDuration);
  const readinessChecks = [
    { ok: !!activeName && projectReady, label: 'Listing folder is ready.' },
    { ok: photos.length >= 4, label: photos.length >= 4 ? `${photos.length} photos loaded.` : 'Add at least 4 photos for a stronger reel.' },
    { ok: !!headshot, label: headshot ? 'Agent headshot is ready.' : 'Headshot is optional, but improves the CTA outro.' },
    { ok: !!logo, label: logo ? 'Brokerage logo is ready.' : 'Logo is optional, but helps the video feel branded.' },
    { ok: !templates.includes('open-house') || (!!openHouseDate && !!openHouseTime), label: 'Open House videos have date and time.' },
    { ok: ctaText.trim().length > 0 && ctaText.trim().length <= 44, label: 'CTA is compact enough for the outro card.' },
    { ok: !mlsLink || /^https?:\/\//i.test(mlsLink), label: 'MLS link is valid for QR generation.' },
  ];
  const hardWarnings = readinessChecks.filter(check =>
    check.label === 'Open House videos have date and time.' || check.label === 'MLS link is valid for QR generation.'
  ).filter(check => !check.ok);
  const readyCount = readinessChecks.filter(check => check.ok).length;
  const readinessScore = Math.round((readyCount / readinessChecks.length) * 100);
  const storyboardPhotos = photos.slice(0, 4);
  const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  useEffect(() => {
    getProjects().then(setProjects).catch(() => {
      if (serverOk !== false) setError('Could not load listings. Is the server running?');
    });
    getBrandLibrary().then(setBrandLibrary).catch(() => {});
  }, [serverOk]);

  useEffect(() => {
    if (!googleMapsKey || !propertyAddressRef.current) return;
    let cancelled = false;

    loadGooglePlacesScript(googleMapsKey)
      .then(() => {
        if (cancelled || !propertyAddressRef.current) return;
        const googleAny = (window as typeof window & { google?: any }).google;
        if (!googleAny?.maps?.places?.Autocomplete) return;
        const autocomplete = new googleAny.maps.places.Autocomplete(propertyAddressRef.current, {
          fields: ['address_components', 'formatted_address'],
          types: ['address'],
          componentRestrictions: { country: 'us' },
        });
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          const components = Array.isArray(place?.address_components) ? place.address_components : [];
          const streetNumber = getAddressComponent(components, 'street_number');
          const route = getAddressComponent(components, 'route');
          const locality = getAddressComponent(components, 'locality') || getAddressComponent(components, 'postal_town');
          const admin = getAddressComponent(components, 'administrative_area_level_1', true);
          const neighborhoodGuess = getAddressComponent(components, 'neighborhood') || getAddressComponent(components, 'sublocality');
          const street = [streetNumber, route].filter(Boolean).join(' ').trim();
          if (street) setPropertyAddress(street);
          if (locality) setCity(locality);
          if (admin) setState(admin);
          if (neighborhoodGuess && !neighborhood.trim()) setNeighborhood(neighborhoodGuess);
        });
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [googleMapsKey, neighborhood]);

  useEffect(() => {
    if (!projectToOpen) return;
    preserveSelectionRef.current = true;
    setMode('existing');
    setSelectedProject(projectToOpen);
    setProjectReady(true);
    onProjectOpened?.();
  }, [projectToOpen, onProjectOpened]);

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
    if (preserveSelectionRef.current) {
      preserveSelectionRef.current = false;
      return;
    }
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
      onProjectChanged?.();
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
      const sourceFiles = Array.from(files).filter(file => /image/i.test(file.type));
      const uploaded = await uploadListingPhotos(activeName, sourceFiles);
      const smartFramingBySavedPath: Record<string, any> = {};
      for (let i = 0; i < uploaded.length; i++) {
        const f = sourceFiles[i];
        const saved = uploaded[i];
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
        for (const p of uploaded) next[p] = smartFramingBySavedPath[p] || DEFAULT_PHOTO_FRAMING;
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

  async function handleBrandUpload(kind: keyof BrandLibrary, file: File) {
    setBrandBusy(`upload-${kind}`);
    setError('');
    try {
      await uploadBrandAsset(kind, file);
      setBrandLibrary(await getBrandLibrary());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Brand upload failed');
    } finally {
      setBrandBusy('');
    }
  }

  async function applyBrandAsset(kind: keyof BrandLibrary, file: string) {
    if (!activeName || !projectReady || !file) return setError('Create or select a listing first.');
    setBrandBusy(`apply-${kind}`);
    setError('');
    try {
      const result = await useBrandAsset(activeName, kind, file);
      if (kind === 'headshots') setHeadshot(result.file);
      if (kind === 'logos') setLogo(result.file);
      if (kind === 'music') setMusic(result.file);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not attach brand asset.');
    } finally {
      setBrandBusy('');
    }
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

  function saveAgentProfile() {
    const name = profileName.trim() || `${agentName || 'Agent'} profile`;
    const nextProfile: AgentProfile = {
      id: selectedProfileId || crypto.randomUUID(),
      name,
      agentName,
      agentPhone,
      agentEmail,
      brokerageName,
      ctaText,
      videoStyle,
      pacing,
      musicMood,
      photoTransition,
    };
    setAgentProfiles(prev => {
      const next = [...prev.filter(profile => profile.id !== nextProfile.id), nextProfile].sort((a, b) => a.name.localeCompare(b.name));
      persistAgentProfiles(next);
      return next;
    });
    setSelectedProfileId(nextProfile.id);
    setProfileName(name);
  }

  function loadAgentProfile(profileId: string) {
    setSelectedProfileId(profileId);
    const profile = agentProfiles.find(item => item.id === profileId);
    if (!profile) return;
    setProfileName(profile.name);
    setAgentName(profile.agentName);
    setAgentPhone(profile.agentPhone);
    setAgentEmail(profile.agentEmail);
    setBrokerageName(profile.brokerageName);
    setCtaText(profile.ctaText);
    setVideoStyle(profile.videoStyle);
    setPacing(profile.pacing);
    setMusicMood(profile.musicMood);
    setPhotoTransition(profile.photoTransition);
  }

  function deleteAgentProfile() {
    if (!selectedProfileId) return;
    setAgentProfiles(prev => {
      const next = prev.filter(profile => profile.id !== selectedProfileId);
      persistAgentProfiles(next);
      return next;
    });
    setSelectedProfileId('');
    setProfileName('');
  }

  function buildPayload(): CampaignFormData | null {
    if (!activeName) { setError('Select or create a listing.'); return null; }
    if (!projectReady) { setError('Create the listing folder first.'); return null; }
    if (templates.length === 0) { setError('Choose at least one video template.'); return null; }
    if (!propertyAddress.trim()) { setError('Property address is required.'); return null; }
    if (!agentName.trim()) { setError('Agent name is required.'); return null; }
    if (photos.length === 0) { setError('Upload at least one listing photo.'); return null; }
    if (hardWarnings.length > 0) { setError(hardWarnings[0].label); return null; }
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
      <div className="space-y-6">
        <div className="studio-hero border border-neutral-800 bg-neutral-900/80 p-5 md:p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-emerald-300/80">Build Workspace</div>
              <h1 className="text-3xl font-bold text-white mt-2">New Listing Reel</h1>
              <p className="text-neutral-400 text-sm leading-relaxed mt-2 max-w-2xl">
                Shape the listing, preview the story, and move into rendering with a cleaner production checklist.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="studio-pill">{activeName || 'No project selected'}</span>
                <span className="studio-pill">{photos.length} photo{photos.length === 1 ? '' : 's'}</span>
                <span className="studio-pill">{templates.length} template{templates.length === 1 ? '' : 's'}</span>
                <span className="studio-pill">{effectiveDuration}s reel</span>
              </div>
            </div>
            <div className="border border-neutral-800 bg-neutral-950/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-neutral-500">Render Readiness</div>
                  <div className="text-3xl font-black text-white mt-1">{readinessScore}%</div>
                </div>
                <div className={`status-orb ${hardWarnings.length === 0 ? 'status-orb-ready' : 'status-orb-warn'}`} />
              </div>
              <div className="mt-4 h-2 bg-neutral-900 border border-neutral-800 overflow-hidden">
                <div className="h-full readiness-meter" style={{ width: `${readinessScore}%` }} />
              </div>
              <p className="text-xs text-neutral-500 mt-3 leading-relaxed">
                {hardWarnings.length === 0 ? 'No blocking issues detected. You can render when ready.' : `${hardWarnings.length} blocking item${hardWarnings.length === 1 ? '' : 's'} still need attention.`}
              </p>
            </div>
          </div>
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
            <Label text="Property Address *" full>
              <input ref={propertyAddressRef} value={propertyAddress} onChange={e => setPropertyAddress(e.target.value)} className={inputClass} placeholder={googleMapsKey ? 'Start typing an address...' : '123 Maple Street'} />
              {googleMapsKey && <span className="block text-[11px] text-neutral-600 mt-1">Google address suggestions are enabled.</span>}
            </Label>
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
          <div className="mb-4 border border-neutral-800 bg-neutral-950 p-3">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] items-end">
              <Label text="Saved Profile">
                <select value={selectedProfileId} onChange={e => loadAgentProfile(e.target.value)} className={selectClass}>
                  <option value="">— Select profile —</option>
                  {agentProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
                </select>
              </Label>
              <Label text="Profile Name">
                <input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Jordan - Luxury" className={inputClass} />
              </Label>
              <button type="button" onClick={saveAgentProfile} className="h-10 bg-white hover:bg-neutral-200 text-black px-4 text-sm font-bold">Save</button>
              <button type="button" onClick={deleteAgentProfile} disabled={!selectedProfileId} className="h-10 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-neutral-200 px-4 text-sm">Delete</button>
            </div>
          </div>
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

        <Card title="Live Storyboard" help="A quick preview of the reel structure before rendering. It follows the current template, copy, and photo order.">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Storyboard
              photos={storyboardPhotos}
              activeName={activeName}
              propertyAddress={propertyAddress}
              city={city}
              state={state}
              shortDescription={shortDescription}
              ctaText={ctaText}
              templates={templates}
              mlsLink={mlsLink}
            />
            <LiveReelPlayer
              heroSrc={storyboardPhotos[0] && activeName ? projectFileUrl(activeName, storyboardPhotos[0]) : null}
              propertyAddress={propertyAddress}
              location={[city, state].filter(Boolean).join(', ')}
              description={shortDescription}
              ctaText={ctaText}
              mode={templates[0] === 'open-house' ? 'Open House' : templates[0] === 'just-sold' ? 'Just Sold' : 'Just Listed'}
            />
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

        <Card title="Reusable Brand Library" help="Upload reusable local assets once, then attach them to any listing without re-uploading every time.">
          <div className="grid gap-3 lg:grid-cols-3">
            <BrandLibraryPicker
              label="Headshot Library"
              kind="headshots"
              items={brandLibrary.headshots}
              selected={selectedBrandHeadshot}
              onSelect={setSelectedBrandHeadshot}
              onApply={() => applyBrandAsset('headshots', selectedBrandHeadshot)}
              onUpload={file => handleBrandUpload('headshots', file)}
              busy={brandBusy}
            />
            <BrandLibraryPicker
              label="Logo Library"
              kind="logos"
              items={brandLibrary.logos}
              selected={selectedBrandLogo}
              onSelect={setSelectedBrandLogo}
              onApply={() => applyBrandAsset('logos', selectedBrandLogo)}
              onUpload={file => handleBrandUpload('logos', file)}
              busy={brandBusy}
            />
            <BrandLibraryPicker
              label="Music Library"
              kind="music"
              items={brandLibrary.music}
              selected={selectedBrandMusic}
              onSelect={setSelectedBrandMusic}
              onApply={() => applyBrandAsset('music', selectedBrandMusic)}
              onUpload={file => handleBrandUpload('music', file)}
              busy={brandBusy}
            />
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

        <Card title="Pre-render Check" help="This pass catches missing or risky inputs before you spend time on a render.">
          <div className="grid gap-2">
            {readinessChecks.map(check => (
              <div key={check.label} className={`border px-3 py-2 text-sm ${check.ok ? 'border-emerald-900 bg-emerald-950/30 text-emerald-200' : 'border-yellow-900 bg-yellow-950/30 text-yellow-200'}`}>
                <span className="font-bold mr-2">{check.ok ? 'OK' : 'Check'}</span>
                {check.label}
              </div>
            ))}
          </div>
        </Card>

        <div className="sticky-render-bar flex flex-wrap items-center gap-3 pb-10">
          <button type="submit" disabled={submitting} className="primary-render-btn bg-white hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold px-8 py-3 rounded-none transition-colors text-sm tracking-wide">{submitting ? 'Starting…' : 'RENDER NOW'}</button>
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

function Storyboard({
  photos,
  activeName,
  propertyAddress,
  city,
  state,
  shortDescription,
  ctaText,
  templates,
  mlsLink,
}: {
  photos: string[];
  activeName: string;
  propertyAddress: string;
  city: string;
  state: string;
  shortDescription: string;
  ctaText: string;
  templates: ReelTemplate[];
  mlsLink: string;
}) {
  const [platform, setPlatform] = useState<'instagram' | 'tiktok' | 'shorts'>('instagram');
  const location = [city, state].filter(Boolean).join(', ');
  const mode = templates[0] === 'open-house' ? 'Open House' : templates[0] === 'just-sold' ? 'Just Sold' : 'Just Listed';
  const cards = [
    { title: 'Hook', body: `${mode} opener`, detail: propertyAddress || 'Property address' },
    { title: 'Stats', body: location || 'City, State', detail: shortDescription || 'Short property detail line' },
    { title: 'Montage', body: `${photos.length || 0} photos queued`, detail: photos.length > 0 ? 'Hero order follows the gallery above.' : 'Upload photos to shape the reel.' },
    { title: 'Outro', body: ctaText || 'CTA text', detail: mlsLink ? 'QR code will appear from the MLS link.' : 'Add an MLS link to enable QR.' },
  ];

  async function downloadCover() {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (photos[0] && activeName) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = projectFileUrl(activeName, photos[0]);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Could not load cover photo'));
      });
      const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
      const width = img.width * scale;
      const height = img.height * scale;
      ctx.drawImage(img, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(0,0,0,0.28)');
    gradient.addColorStop(0.58, 'rgba(0,0,0,0.12)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.78)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 54px Arial';
    ctx.fillText(mode.toUpperCase(), 72, 160);
    ctx.font = '900 76px Arial';
    wrapCanvasText(ctx, propertyAddress || 'Property address', 72, 1300, 900, 88);
    ctx.font = '700 36px Arial';
    ctx.fillStyle = '#f5f5f5';
    ctx.fillText(location || 'City, State', 72, 1510);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(72, 1600, 936, 120);
    ctx.fillStyle = '#050505';
    ctx.font = '900 38px Arial';
    wrapCanvasText(ctx, ctaText || 'DM TOUR FOR DETAILS', 104, 1675, 860, 46);

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${(propertyAddress || 'listing-cover').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'listing-cover'}-cover.png`;
    a.click();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="border border-neutral-800 bg-neutral-950 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-neutral-500">Preview Surface</div>
            <div className="text-sm font-semibold text-white mt-1">Phone storyboard</div>
          </div>
          <div className="text-[11px] text-neutral-500 border border-neutral-800 px-2 py-1">{photos.length} scenes</div>
        </div>
        <div className="flex gap-1 mb-3">
          {(['instagram', 'tiktok', 'shorts'] as const).map(item => (
            <button key={item} type="button" onClick={() => setPlatform(item)} className={`px-2 py-1 text-[11px] uppercase border ${platform === item ? 'border-white text-white bg-white/10' : 'border-neutral-700 text-neutral-500'}`}>
              {item}
            </button>
          ))}
        </div>
        <div className="rounded-[28px] border border-neutral-700 bg-black p-2 shadow-[0_22px_60px_rgba(0,0,0,0.45)]">
          <div className="aspect-[9/16] overflow-hidden bg-black relative rounded-[20px]">
          {photos[0] && activeName ? (
            <img src={projectFileUrl(activeName, photos[0])} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-neutral-600">No hero photo yet</div>
          )}
          <div className="absolute left-3 top-3 border border-white/15 bg-black/70 px-2 py-1 text-[10px] uppercase tracking-widest text-white">
            {platform}
          </div>
          <div className="absolute inset-x-3 bottom-3 bg-black/78 border border-white/10 p-3">
            <div className="text-[10px] uppercase tracking-widest text-neutral-400">{mode}</div>
            <div className="text-sm font-bold text-white mt-1 line-clamp-2">{propertyAddress || 'Property address'}</div>
            <div className="mt-2 h-1 bg-white/10">
              <div className="h-full w-2/3 bg-white/80" />
            </div>
          </div>
          <PlatformOverlay platform={platform} />
          </div>
        </div>
        <button type="button" onClick={downloadCover} className="mt-3 w-full bg-white hover:bg-neutral-200 text-black text-xs font-bold px-3 py-2">Download Cover PNG</button>
      </div>
      <div className="border border-neutral-800 bg-neutral-950 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-neutral-500">Sequence Map</div>
            <div className="text-lg font-semibold text-white mt-1">{mode} structure</div>
          </div>
          <div className="text-xs text-neutral-500">{mlsLink ? 'QR enabled in outro' : 'No QR yet'}</div>
        </div>
        <div className="mt-4 grid gap-3">
          {cards.map((card, index) => (
            <div key={card.title} className="grid grid-cols-[42px_1fr] gap-3 border border-neutral-800 bg-neutral-900/70 px-3 py-3">
              <div className="h-10 w-10 border border-neutral-700 bg-neutral-950 text-white text-sm font-black flex items-center justify-center">
                {index + 1}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[11px] uppercase tracking-widest text-neutral-500">{card.title}</div>
                  <div className="text-[11px] text-neutral-600">scene</div>
                </div>
                <div className="text-sm text-white font-semibold mt-1">{card.body}</div>
                <div className="text-xs text-neutral-500 mt-2 leading-relaxed">{card.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlatformOverlay({ platform }: { platform: 'instagram' | 'tiktok' | 'shorts' }) {
  if (platform === 'instagram') {
    return (
      <>
        <div className="absolute inset-x-0 top-0 h-20 bg-red-500/10 border-b border-red-300/30" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-red-500/10 border-t border-red-300/30" />
        <div className="absolute right-0 top-20 bottom-28 w-12 bg-red-500/10 border-l border-red-300/30" />
      </>
    );
  }
  if (platform === 'tiktok') {
    return (
      <>
        <div className="absolute inset-x-0 top-0 h-16 bg-cyan-500/10 border-b border-cyan-300/30" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-cyan-500/10 border-t border-cyan-300/30" />
        <div className="absolute right-0 top-16 bottom-32 w-14 bg-cyan-500/10 border-l border-cyan-300/30" />
      </>
    );
  }
  return (
    <>
      <div className="absolute inset-x-0 top-0 h-16 bg-yellow-500/10 border-b border-yellow-300/30" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-yellow-500/10 border-t border-yellow-300/30" />
    </>
  );
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  let line = '';
  let offset = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + offset);
      line = word;
      offset += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y + offset);
}

function BrandLibraryPicker({
  label,
  kind,
  items,
  selected,
  onSelect,
  onApply,
  onUpload,
  busy,
}: {
  label: string;
  kind: keyof BrandLibrary;
  items: Array<{ file: string; label: string }>;
  selected: string;
  onSelect: (value: string) => void;
  onApply: () => void;
  onUpload: (file: File) => void;
  busy: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedItem = items.find(item => item.file === selected);
  return (
    <div className="border border-neutral-800 bg-neutral-950 p-3 space-y-3">
      <div className="text-xs uppercase tracking-widest text-neutral-500">{label}</div>
      <select value={selected} onChange={e => onSelect(e.target.value)} className={selectClass}>
        <option value="">— Select asset —</option>
        {items.map(item => <option key={item.file} value={item.file}>{item.label}</option>)}
      </select>
      {selectedItem && kind !== 'music' && (
        <div className="border border-neutral-800 bg-black h-28 flex items-center justify-center overflow-hidden">
          <img src={brandAssetUrl(kind, selectedItem.file)} className="max-h-full max-w-full object-contain" />
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={onApply} disabled={!selected || !!busy} className="flex-1 border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 px-3 py-2 text-xs text-white">Use</button>
        <button type="button" onClick={() => inputRef.current?.click()} className="flex-1 bg-white hover:bg-neutral-200 px-3 py-2 text-xs font-bold text-black">
          {busy === `upload-${kind}` ? 'Uploading...' : 'Upload'}
        </button>
      </div>
      <input ref={inputRef} type="file" accept={kind === 'music' ? 'audio/*,.wav,.mp3,.aac,.m4a' : 'image/*'} className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) onUpload(file); e.target.value = ''; }} />
    </div>
  );
}

function SquareDrop({ label, src, filename, uploading, locked, accept, onFile, inputRef, emoji, hint }: { label: string; src: string | null; filename?: string; uploading: boolean; locked: boolean; accept: string; onFile: (f: File) => void; inputRef: React.RefObject<HTMLInputElement>; emoji: string; hint: string; }) {
  return <div><p className="text-xs text-neutral-500 mb-2">{label}</p><div onClick={() => !locked && inputRef.current?.click()} className={`aspect-square rounded-none border border-neutral-700 bg-neutral-950 flex items-center justify-center text-center overflow-hidden ${locked ? 'opacity-50' : 'cursor-pointer hover:border-neutral-500'}`}>{src ? <img src={src} className="w-full h-full object-cover" /> : <div className="p-3"><div className="text-3xl mb-2">{emoji}</div><p className="text-xs text-neutral-400">{uploading ? 'Uploading…' : filename || hint}</p></div>}</div><input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} /></div>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <button type="button" onClick={() => onChange(!checked)} className={`rounded-none border px-3 py-2 text-xs font-bold transition-colors ${checked ? 'bg-white/10 border-white/50 text-white' : 'bg-neutral-900 border-neutral-700 text-neutral-500'}`}>{checked ? '✓ ' : ''}{label}</button>;
}

function Card({ title, help, action, children }: { title: string; help?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="studio-card bg-neutral-900 border border-neutral-800 rounded-none p-5 md:p-6"><div className="flex items-start justify-between gap-4 mb-5"><div><h2 className="text-white font-semibold text-lg">{title}</h2>{help && <p className="text-xs text-neutral-500 mt-1 leading-relaxed max-w-3xl">{help}</p>}</div>{action}</div>{children}</section>;
}

function Label({ text, full, children }: { text: string; full?: boolean; children: React.ReactNode }) {
  return <label className={full ? 'col-span-2' : ''}><span className="block text-xs text-neutral-500 mb-1.5 uppercase tracking-wider font-semibold">{text}</span>{children}</label>;
}

function ModeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`px-3 py-1.5 rounded-none text-sm font-medium transition-colors ${active ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-white'}`}>{children}</button>;
}

const inputClass = 'w-full bg-neutral-950 border border-neutral-700 rounded-none px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500';
const selectClass = `${inputClass} appearance-none`;


