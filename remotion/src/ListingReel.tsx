import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export type ListingMode = 'just-listed' | 'open-house' | 'just-sold';
export type VideoStyle = 'social-punchy' | 'luxury-cinematic' | 'brokerage-clean' | 'social' | 'luxury' | 'brokerage';
export type PacingPreset = 'fast' | 'balanced' | 'cinematic';
export type MusicMood =
  | 'warm-inviting'
  | 'modern-lofi'
  | 'luxury-cinematic'
  | 'upbeat-open-house'
  | 'corporate-professional'
  | 'urgent-driving'
  | 'high-energy-social';

export type PhotoTransition = 'smart-mix' | 'soft-fade' | 'slide-left' | 'slide-up' | 'zoom-pop' | 'whip-pan' | 'flash-cut' | 'none';

export interface PhotoFraming {
  path: string;
  cropMode?: 'fill' | 'whole';
  mode?: 'fill' | 'show-whole-room';
  x?: number;
  y?: number;
  scale?: number;
  focusX?: number;
  focusY?: number;
}

export interface ListingReelProps {
  mode: ListingMode;
  projectFolder: string;
  photos: string[];
  photoSettings?: PhotoFraming[];
  headshotFile: string;
  logoFile: string;
  musicFile: string;
  propertyAddress: string;
  city: string;
  state: string;
  listingPrice: string;
  beds: string;
  baths: string;
  squareFeet: string;
  agentName: string;
  agentPhone: string;
  agentEmail: string;
  brokerageName: string;
  ctaText: string;
  openHouseDate: string;
  openHouseTime: string;
  shortDescription: string;
  neighborhood: string;
  videoStyle?: VideoStyle;
  pacing?: PacingPreset;
  musicMood?: MusicMood;
  photoTransition?: PhotoTransition;
  autoEnhance?: boolean;
  smartSafeZones?: boolean;
  persistentBranding?: boolean;
  progressBar?: boolean;
}

const FONT = 'Montserrat, Inter, Arial, sans-serif';
const SERIF = 'Playfair Display, Georgia, serif';
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

function asset(projectFolder: string, rel: string): string {
  return staticFile(`${projectFolder}/${rel}`);
}

function modeEyebrow(mode: ListingMode): string {
  if (mode === 'open-house') return 'OPEN HOUSE';
  if (mode === 'just-sold') return 'JUST SOLD';
  return 'JUST LISTED';
}

function modeAccent(mode: ListingMode, style?: VideoStyle): string {
  if (style === 'luxury-cinematic' || style === 'luxury') return '#D4AF37';
  if (mode === 'open-house') return '#9DC8FF';
  if (mode === 'just-sold') return '#FFD27A';
  return '#FFFFFF';
}

function formatPrice(value: string): string {
  const v = String(value || '').trim();
  if (!v) return '';
  if (v.includes('$')) return v;
  const digits = v.replace(/[^0-9]/g, '');
  if (!digits) return v;
  return `$${Number(digits).toLocaleString('en-US')}`;
}

function modeHook(mode: ListingMode, price: string): string {
  if (mode === 'just-sold') return 'SOLD FAST';
  if (mode === 'open-house') return 'OPEN HOUSE THIS WEEK';
  const p = formatPrice(price);
  return p ? `TOUR THIS ${p} HOME` : 'TOUR THIS HOME';
}

function getFrame(path: string, settings?: PhotoFraming[]): Required<PhotoFraming> {
  const found = settings?.find((s) => s.path === path);
  const cropMode = found?.cropMode || (found?.mode === 'show-whole-room' ? 'whole' : 'fill');
  return {
    path,
    cropMode,
    mode: cropMode === 'whole' ? 'show-whole-room' : 'fill',
    x: found?.x ?? 0,
    y: found?.y ?? 0,
    scale: found?.scale ?? 1,
    focusX: found?.focusX ?? 50,
    focusY: found?.focusY ?? 50,
  };
}

function transitionFor(base: PhotoTransition, index: number): PhotoTransition {
  if (base !== 'smart-mix') return base;
  const options: PhotoTransition[] = ['soft-fade', 'slide-left', 'zoom-pop', 'slide-up'];
  return options[index % options.length];
}

function transitionStyle(kind: PhotoTransition, frame: number, durationFrames: number, index: number): React.CSSProperties {
  if (kind === 'none') return {};
  const enter = Math.min(10, Math.max(4, Math.floor(durationFrames * 0.22)));
  const exit = Math.min(7, Math.max(3, Math.floor(durationFrames * 0.16)));
  const inP = interpolate(frame, [0, enter], [0, 1], CLAMP);
  const outP = interpolate(frame, [Math.max(0, durationFrames - exit), durationFrames], [1, 0], CLAMP);
  const visible = Math.min(inP, outP);
  const dir = index % 2 === 0 ? 1 : -1;

  if (kind === 'soft-fade') {
    return { opacity: visible };
  }
  if (kind === 'slide-left') {
    const x = interpolate(inP, [0, 1], [80 * dir, 0], CLAMP);
    return { opacity: visible, transform: `translateX(${x}px)` };
  }
  if (kind === 'slide-up') {
    const y = interpolate(inP, [0, 1], [90, 0], CLAMP);
    return { opacity: visible, transform: `translateY(${y}px)` };
  }
  if (kind === 'zoom-pop') {
    const s = interpolate(inP, [0, 1], [0.92, 1], CLAMP);
    return { opacity: visible, transform: `scale(${s})` };
  }
  if (kind === 'whip-pan') {
    const x = interpolate(inP, [0, 1], [170 * dir, 0], CLAMP);
    const blur = interpolate(inP, [0, 1], [8, 0], CLAMP);
    return { opacity: visible, transform: `translateX(${x}px) rotate(${dir * (1 - inP) * 1.2}deg)`, filter: `blur(${blur}px)` };
  }
  if (kind === 'flash-cut') {
    return { opacity: visible, filter: frame < 3 ? 'brightness(1.55) contrast(1.15)' : 'none' };
  }
  return { opacity: visible };
}

const SpringIn: React.FC<{ from: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ from, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rel = Math.max(0, frame - from);
  const sRaw = spring({ frame: rel, fps, config: { damping: 14, stiffness: 180 } });
  const scale = interpolate(sRaw, [0, 1], [0.86, 1], CLAMP);
  const y = interpolate(sRaw, [0, 1], [32, 0], CLAMP);
  const opacity = interpolate(frame, [from, from + 8], [0, 1], CLAMP);
  return <div style={{ opacity, transform: `translateY(${y}px) scale(${scale})`, ...style }}>{children}</div>;
};

const PhotoScene: React.FC<{
  src: string;
  photoPath: string;
  framing?: PhotoFraming[];
  durationFrames: number;
  autoEnhance?: boolean;
  darken?: number;
  transition?: PhotoTransition;
  index?: number;
}> = ({ src, photoPath, framing, durationFrames, autoEnhance = true, darken = 0.25, transition = 'soft-fade', index = 0 }) => {
  const frame = useCurrentFrame();
  const f = getFrame(photoPath, framing);
  const motion = interpolate(frame, [0, durationFrames], [1, f.cropMode === 'whole' ? 1.025 : 1.075], CLAMP);
  const filter = autoEnhance ? 'brightness(1.08) contrast(1.10) saturate(1.12)' : 'none';
  const trans = transitionStyle(transition, frame, durationFrames, index);

  const focus = `${f.focusX}% ${f.focusY}%`;
  const translateX = f.cropMode === 'fill' ? f.x : 0;
  const translateY = f.cropMode === 'fill' ? f.y : 0;
  const imgScale = Math.max(1, f.scale) * motion;

  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#050505', ...trans }}>
      {f.cropMode === 'whole' && (
        <>
          <Img
            src={src}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: focus,
              filter: `${filter} blur(40px) brightness(0.2)`,
              transform: 'scale(1.2)',
            }}
          />
          <AbsoluteFill style={{ background: 'rgba(0,0,0,0.28)' }} />
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: 56 }}>
            <Img
              src={src}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '86%',
                objectFit: 'contain',
                filter,
                transform: `scale(${motion})`,
                boxShadow: '0 28px 70px rgba(0,0,0,0.48)',
                borderRadius: 18,
              }}
            />
          </AbsoluteFill>
        </>
      )}

      {f.cropMode !== 'whole' && (
        <Img
          src={src}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: focus,
            filter,
            transform: `translate(${translateX}px, ${translateY}px) scale(${imgScale})`,
            transformOrigin: `${f.focusX}% ${f.focusY}%`,
          }}
        />
      )}

      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(0,0,0,${darken + 0.10}) 0%, rgba(0,0,0,0.06) 45%, rgba(0,0,0,${darken + 0.18}) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};

const StatChip: React.FC<{ value: string; label: string; accent: string; from: number }> = ({ value, label, accent, from }) => (
  <SpringIn from={from}>
    <div style={{ minWidth: 178, padding: '22px 24px', borderRadius: 24, background: 'rgba(10,10,10,0.72)', border: '1px solid rgba(255,255,255,0.16)', boxShadow: '0 20px 50px rgba(0,0,0,0.35)' }}>
      <div style={{ color: accent, fontSize: 48, fontWeight: 950, lineHeight: 1 }}>{value || '—'}</div>
      <div style={{ color: '#D4D4D4', fontSize: 18, fontWeight: 850, letterSpacing: 3, marginTop: 8 }}>{label}</div>
    </div>
  </SpringIn>
);

export const ListingReel: React.FC<ListingReelProps> = (props) => {
  const {
    mode,
    projectFolder,
    photos,
    photoSettings = [],
    headshotFile,
    logoFile,
    musicFile,
    propertyAddress,
    city,
    state,
    listingPrice,
    beds,
    baths,
    squareFeet,
    agentName,
    agentPhone,
    brokerageName,
    ctaText,
    openHouseDate,
    openHouseTime,
    shortDescription,
    videoStyle = 'social-punchy',
    pacing = 'fast',
    photoTransition = 'smart-mix',
    autoEnhance = true,
    smartSafeZones = true,
    persistentBranding = true,
    progressBar = true,
  } = props;

  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const accent = modeAccent(mode, videoStyle);
  const location = [city, state].filter(Boolean).join(', ');
  const photoPaths = photos.filter(Boolean);
  const photoSrcs = photoPaths.map((p) => asset(projectFolder, p));
  const heroPhoto = photoSrcs[0];
  const heroPath = photoPaths[0];
  const secondPhoto = photoSrcs[1] || heroPhoto;
  const secondPath = photoPaths[1] || heroPath;
  const montagePhotos = photoSrcs.slice(2).length ? photoSrcs.slice(2) : photoSrcs.slice(1);
  const montagePaths = photoPaths.slice(2).length ? photoPaths.slice(2) : photoPaths.slice(1);

  const musicSrc = musicFile ? asset(projectFolder, musicFile) : null;
  const logoSrc = logoFile ? asset(projectFolder, logoFile) : null;
  const headshotSrc = headshotFile ? asset(projectFolder, headshotFile) : null;

  const heroSeconds = pacing === 'cinematic' ? 4.0 : pacing === 'balanced' ? 3.4 : 2.8;
  const statsSeconds = pacing === 'cinematic' ? 3.0 : pacing === 'balanced' ? 2.5 : 2.1;
  const ctaSeconds = pacing === 'cinematic' ? 3.3 : 2.8;

  const HERO_END = Math.min(Math.round(heroSeconds * fps), Math.floor(durationInFrames * 0.35));
  const STATS_END = Math.min(durationInFrames - Math.round(ctaSeconds * fps), HERO_END + Math.round(statsSeconds * fps));
  const CTA_START = Math.max(STATS_END + 1, durationInFrames - Math.round(ctaSeconds * fps));
  const montageDuration = Math.max(1, CTA_START - STATS_END);
  const perPhoto = Math.max(24, Math.floor(montageDuration / Math.max(1, montagePhotos.length)));
  const ctaPhoto = montagePhotos[montagePhotos.length - 1] || secondPhoto || heroPhoto;
  const ctaPath = montagePaths[montagePaths.length - 1] || secondPath || heroPath;

  const openHouseLine = [openHouseDate, openHouseTime].filter(Boolean).join(' · ');
  const safePadding = smartSafeZones ? { paddingLeft: 78, paddingRight: 156, paddingTop: 132, paddingBottom: 244 } : { padding: 70 };
  const transitionBase = photoTransition || 'smart-mix';

  return (
    <AbsoluteFill style={{ backgroundColor: '#050505', fontFamily: FONT }}>
      {musicSrc && <Audio src={musicSrc} volume={0.52} />}

      {persistentBranding && (
        <AbsoluteFill style={{ pointerEvents: 'none', paddingTop: 92, paddingLeft: 52, paddingRight: 52 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 'fit-content', maxWidth: 720, padding: '9px 13px', borderRadius: 999, background: 'rgba(0,0,0,0.44)', border: '1px solid rgba(255,255,255,0.13)', boxShadow: '0 10px 30px rgba(0,0,0,0.24)' }}>
            {logoSrc && <Img src={logoSrc} style={{ height: 28, maxWidth: 130, objectFit: 'contain' }} />}
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 850, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {agentName || brokerageName || 'REAL ESTATE'}
            </div>
          </div>
        </AbsoluteFill>
      )}

      <Sequence from={0} durationInFrames={HERO_END} layout="none">
        {heroPhoto && (
          <PhotoScene
            src={heroPhoto}
            photoPath={heroPath}
            framing={photoSettings}
            durationFrames={HERO_END}
            transition={transitionFor(transitionBase, 0)}
            index={0}
            autoEnhance={autoEnhance}
            darken={0.30}
          />
        )}
        <AbsoluteFill style={{ justifyContent: 'center', ...safePadding }}>
          <SpringIn from={3}>
            <div style={{ display: 'inline-block', padding: '10px 18px', borderRadius: 999, background: accent, color: '#050505', fontSize: 23, lineHeight: 1, fontWeight: 950, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 22 }}>
              {modeEyebrow(mode)}
            </div>
          </SpringIn>
          <SpringIn from={7}>
            <div style={{ color: '#fff', fontSize: 74, lineHeight: 0.96, fontWeight: 950, letterSpacing: -2, textTransform: 'uppercase', textShadow: '0 10px 42px rgba(0,0,0,0.62)' }}>
              {modeHook(mode, listingPrice)}
            </div>
          </SpringIn>
          <SpringIn from={15}>
            <div style={{ color: '#f0f0f0', fontSize: 34, lineHeight: 1.12, fontWeight: 850, marginTop: 22, textTransform: 'uppercase', letterSpacing: 0.6, textShadow: '0 8px 28px rgba(0,0,0,0.68)' }}>
              {propertyAddress}
            </div>
            {location && <div style={{ color: accent, fontSize: 27, fontWeight: 900, marginTop: 10, textTransform: 'uppercase', letterSpacing: 2 }}>{location}</div>}
          </SpringIn>
        </AbsoluteFill>
      </Sequence>

      <Sequence from={HERO_END} durationInFrames={Math.max(1, STATS_END - HERO_END)} layout="none">
        {secondPhoto && (
          <PhotoScene
            src={secondPhoto}
            photoPath={secondPath}
            framing={photoSettings}
            durationFrames={Math.max(1, STATS_END - HERO_END)}
            transition={transitionFor(transitionBase, 1)}
            index={1}
            autoEnhance={autoEnhance}
            darken={0.48}
          />
        )}
        <AbsoluteFill style={{ justifyContent: 'center', paddingLeft: 72, paddingRight: 158, paddingTop: 110, paddingBottom: 230 }}>
          <div style={{ display: 'flex', gap: 18, alignItems: 'stretch', flexWrap: 'wrap' }}>
            <StatChip value={beds} label="BEDS" accent={accent} from={2} />
            <StatChip value={baths} label="BATHS" accent={accent} from={7} />
            <StatChip value={squareFeet} label="SQ FT" accent={accent} from={12} />
          </div>
          {mode === 'open-house' && openHouseLine ? (
            <SpringIn from={20}>
              <div style={{ display: 'inline-block', marginTop: 26, padding: '16px 24px', borderRadius: 22, background: 'rgba(255,255,255,0.92)', color: '#050505', fontSize: 32, fontWeight: 950, textTransform: 'uppercase' }}>
                {openHouseLine}
              </div>
            </SpringIn>
          ) : shortDescription ? (
            <SpringIn from={20}>
              <div style={{ color: '#fff', fontSize: 31, lineHeight: 1.2, fontWeight: 750, marginTop: 26, maxWidth: 810, textShadow: '0 8px 30px rgba(0,0,0,0.7)' }}>
                {shortDescription}
              </div>
            </SpringIn>
          ) : null}
        </AbsoluteFill>
      </Sequence>

      <Sequence from={STATS_END} durationInFrames={montageDuration} layout="none">
        <AbsoluteFill style={{ backgroundColor: '#050505' }}>
          {montagePhotos.length === 0 && heroPhoto && (
            <PhotoScene
              src={heroPhoto}
              photoPath={heroPath}
              framing={photoSettings}
              durationFrames={montageDuration}
              transition={transitionFor(transitionBase, 2)}
              index={2}
              autoEnhance={autoEnhance}
              darken={0.36}
            />
          )}
          {montagePhotos.map((src, i) => {
            const from = i * perPhoto;
            if (from >= montageDuration) return null;
            const duration = Math.max(1, Math.min(perPhoto + 4, montageDuration - from));
            return (
              <Sequence key={`${src}-${i}`} from={from} durationInFrames={duration} layout="none">
                <PhotoScene
                  src={src}
                  photoPath={montagePaths[i]}
                  framing={photoSettings}
                  durationFrames={duration}
                  transition={transitionFor(transitionBase, i + 2)}
                  index={i + 2}
                  autoEnhance={autoEnhance}
                  darken={0.32}
                />
              </Sequence>
            );
          })}
        </AbsoluteFill>
      </Sequence>

      <Sequence from={CTA_START} durationInFrames={Math.max(1, durationInFrames - CTA_START)} layout="none">
        {ctaPhoto && (
          <PhotoScene
            src={ctaPhoto}
            photoPath={ctaPath}
            framing={photoSettings}
            durationFrames={Math.max(1, durationInFrames - CTA_START)}
            transition={transitionFor(transitionBase, 99)}
            index={99}
            autoEnhance={autoEnhance}
            darken={0.58}
          />
        )}
        <AbsoluteFill style={{ justifyContent: 'flex-end', paddingLeft: 70, paddingRight: 152, paddingBottom: 240 }}>
          <SpringIn from={2}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              {headshotSrc && (
                <div style={{ width: 112, height: 112, borderRadius: '50%', overflow: 'hidden', border: `3px solid ${accent}`, boxShadow: '0 16px 42px rgba(0,0,0,0.55)' }}>
                  <Img src={headshotSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div>
                <div style={{ color: '#fff', fontSize: 40, fontWeight: 950, textTransform: 'uppercase', lineHeight: 1.02 }}>{agentName}</div>
                <div style={{ color: '#d4d4d4', fontSize: 24, fontWeight: 750, marginTop: 5 }}>{brokerageName}</div>
                <div style={{ color: accent, fontSize: 23, fontWeight: 900, marginTop: 5 }}>{agentPhone}</div>
              </div>
            </div>
          </SpringIn>
          <SpringIn from={14}>
            <div style={{ display: 'inline-block', marginTop: 22, padding: '18px 26px', borderRadius: 20, background: 'rgba(255,255,255,0.94)', color: '#050505', fontSize: 34, fontWeight: 950, textTransform: 'uppercase', boxShadow: '0 18px 46px rgba(0,0,0,0.42)' }}>
              {ctaText || 'DM "TOUR" FOR DETAILS'}
            </div>
          </SpringIn>
        </AbsoluteFill>
      </Sequence>

      {progressBar && (
        <AbsoluteFill style={{ justifyContent: 'flex-end' }}>
          <div style={{ height: 6, width: `${interpolate(frame, [0, durationInFrames], [0, 100], CLAMP)}%`, background: accent, opacity: 0.92 }} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
