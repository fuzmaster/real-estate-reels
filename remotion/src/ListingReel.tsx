import React from 'react';
import {
  AbsoluteFill, Audio, Img, Sequence,
  interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from 'remotion';

export type ListingMode = 'just-listed' | 'open-house' | 'just-sold';

export interface ListingReelProps {
  mode: ListingMode;
  projectFolder: string;
  photos: string[];
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
}

const FONT = 'Montserrat, sans-serif';
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

function asset(projectFolder: string, rel: string): string {
  return staticFile(`${projectFolder}/${rel}`);
}

function modeLabel(m: ListingMode): string {
  if (m === 'open-house') return 'OPEN HOUSE';
  if (m === 'just-sold')  return 'JUST SOLD';
  return 'JUST LISTED';
}

function modeAccent(m: ListingMode): string {
  if (m === 'open-house') return '#9DC8FF';
  if (m === 'just-sold')  return '#FFD27A';
  return '#FFFFFF';
}

const FadeIn: React.FC<{ from: number; duration?: number; children: React.ReactNode; style?: React.CSSProperties }>
  = ({ from, duration = 12, children, style }) => {
    const frame = useCurrentFrame();
    const opacity = interpolate(frame, [from, from + duration], [0, 1], CLAMP);
    return <div style={{ opacity, ...style }}>{children}</div>;
  };

const Pop: React.FC<{ from: number; children: React.ReactNode; style?: React.CSSProperties }>
  = ({ from, children, style }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const rel = Math.max(0, frame - from);
    const scale = spring({ frame: rel, fps, config: { damping: 14, stiffness: 180 } });
    const s = interpolate(scale, [0, 1], [0.85, 1]);
    const opacity = interpolate(frame, [from, from + 8], [0, 1], CLAMP);
    return <div style={{ transform: `scale(${s})`, opacity, ...style }}>{children}</div>;
  };

// Ken Burns slow zoom on a photo
const PhotoScene: React.FC<{
  src: string;
  zoomFrom?: number;
  zoomTo?: number;
  durationFrames: number;
}> = ({ src, zoomFrom = 1.05, zoomTo = 1.18, durationFrames }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, durationFrames], [zoomFrom, zoomTo], CLAMP);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Img
        src={src}
        style={{
          width: '100%', height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      />
      <AbsoluteFill style={{
        background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.55) 100%)',
      }} />
    </AbsoluteFill>
  );
};

export const ListingReel: React.FC<ListingReelProps> = (props) => {
  const {
    mode, projectFolder, photos, headshotFile, logoFile, musicFile,
    propertyAddress, city, state, listingPrice, beds, baths, squareFeet,
    agentName, agentPhone, brokerageName, ctaText,
    openHouseDate, openHouseTime, shortDescription,
  } = props;

  const { fps, durationInFrames } = useVideoConfig();
  const accent = modeAccent(mode);
  const hook = modeLabel(mode);

  // Scene timing (frames). We design for 18s @ 24fps = 432f, but scale to actual durationInFrames.
  const baseTotal = 18 * fps;
  const scale = durationInFrames / baseTotal;
  const f = (sec: number) => Math.round(sec * fps * scale);

  const SCENE_HOOK_END  = f(2);
  const SCENE_HERO_END  = f(6);
  const SCENE_STATS_END = f(10);
  const SCENE_MONTAGE_END = f(14);
  // Outro fills the remainder

  // Photo paths (fall back to placeholder if empty)
  const photoSrcs = photos.map(p => asset(projectFolder, p));
  const heroPhoto = photoSrcs[0] || null;
  const montagePhotos = photoSrcs.length > 1 ? photoSrcs.slice(1, 5) : photoSrcs;

  const headshotSrc = headshotFile ? asset(projectFolder, headshotFile) : null;
  const logoSrc     = logoFile     ? asset(projectFolder, logoFile)     : null;
  const musicSrc    = musicFile    ? asset(projectFolder, musicFile)    : null;

  // Montage: divide remaining 4 seconds across available montage photos
  const montageLen = SCENE_MONTAGE_END - SCENE_STATS_END;
  const perPhoto = Math.max(1, Math.floor(montageLen / Math.max(1, montagePhotos.length)));

  return (
    <AbsoluteFill style={{ backgroundColor: '#0A0A0A', fontFamily: FONT }}>
      {musicSrc && <Audio src={musicSrc} volume={0.55} />}

      {/* ── Scene 1: Hook (0–2s) ── */}
      <Sequence from={0} durationInFrames={SCENE_HOOK_END} layout="none">
        <AbsoluteFill style={{
          background: 'radial-gradient(circle at 50% 35%, #1f1f1f 0%, #050505 70%)',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Pop from={2} style={{ textAlign: 'center', padding: '0 60px' }}>
            <div style={{
              color: accent, fontSize: 130, fontWeight: 900,
              letterSpacing: 6, textTransform: 'uppercase', lineHeight: 0.95,
              textShadow: '0 12px 40px rgba(0,0,0,0.6)',
            }}>
              {hook.split(' ').map((w, i) => (
                <div key={i}>{w}</div>
              ))}
            </div>
            <div style={{
              marginTop: 30, color: '#A8A8A8', fontSize: 32, letterSpacing: 6,
              textTransform: 'uppercase', fontWeight: 700,
            }}>
              {city || ''}{state ? `, ${state}` : ''}
            </div>
          </Pop>
        </AbsoluteFill>
      </Sequence>

      {/* ── Scene 2: Hero photo + address (2–6s) ── */}
      <Sequence from={SCENE_HOOK_END} durationInFrames={SCENE_HERO_END - SCENE_HOOK_END} layout="none">
        {heroPhoto && <PhotoScene src={heroPhoto} durationFrames={SCENE_HERO_END - SCENE_HOOK_END} />}
        <AbsoluteFill style={{
          padding: 80,
          alignItems: 'flex-start', justifyContent: 'flex-end',
        }}>
          <FadeIn from={4}>
            {mode === 'open-house' && openHouseDate && (
              <div style={{
                display: 'inline-block', background: accent, color: '#0A0A0A',
                padding: '8px 18px', borderRadius: 6, fontSize: 28, fontWeight: 800,
                letterSpacing: 2, marginBottom: 20, textTransform: 'uppercase',
              }}>
                {openHouseDate}{openHouseTime ? ` · ${openHouseTime}` : ''}
              </div>
            )}
            <div style={{
              color: '#fff', fontSize: 78, fontWeight: 900,
              textShadow: '0 6px 30px rgba(0,0,0,0.7)', lineHeight: 1.05,
              maxWidth: 920,
            }}>
              {propertyAddress}
            </div>
            <div style={{
              marginTop: 14, color: '#E5E5E5', fontSize: 38, fontWeight: 500,
              textShadow: '0 4px 20px rgba(0,0,0,0.7)',
            }}>
              {[city, state].filter(Boolean).join(', ')}
            </div>
            <div style={{
              marginTop: 26, color: accent, fontSize: 56, fontWeight: 900,
              textShadow: '0 4px 20px rgba(0,0,0,0.7)', letterSpacing: 1,
            }}>
              {listingPrice}
            </div>
          </FadeIn>
        </AbsoluteFill>
      </Sequence>

      {/* ── Scene 3: Stats card (6–10s) ── */}
      <Sequence from={SCENE_HERO_END} durationInFrames={SCENE_STATS_END - SCENE_HERO_END} layout="none">
        {heroPhoto && <PhotoScene src={heroPhoto} zoomFrom={1.15} zoomTo={1.25} durationFrames={SCENE_STATS_END - SCENE_HERO_END} />}
        <AbsoluteFill style={{
          background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%)',
          alignItems: 'center', justifyContent: 'center', padding: 60,
        }}>
          <Pop from={2}>
            <div style={{
              background: 'rgba(10,10,10,0.85)', border: '1px solid rgba(255,255,255,0.15)',
              backdropFilter: 'blur(20px)', borderRadius: 24, padding: '40px 60px',
              display: 'flex', gap: 60, alignItems: 'center',
            }}>
              <Stat label="BEDS"  value={beds} accent={accent} />
              <Divider />
              <Stat label="BATHS" value={baths} accent={accent} />
              <Divider />
              <Stat label="SQ FT" value={squareFeet} accent={accent} />
            </div>
          </Pop>
          {shortDescription && (
            <FadeIn from={20}>
              <div style={{
                marginTop: 30, color: '#fff', fontSize: 34, fontWeight: 500,
                textAlign: 'center', maxWidth: 900, lineHeight: 1.3,
                textShadow: '0 4px 20px rgba(0,0,0,0.8)',
              }}>
                {shortDescription}
              </div>
            </FadeIn>
          )}
        </AbsoluteFill>
      </Sequence>

      {/* ── Scene 4: Photo montage (10–14s) ── */}
      <Sequence from={SCENE_STATS_END} durationInFrames={SCENE_MONTAGE_END - SCENE_STATS_END} layout="none">
        <AbsoluteFill style={{ backgroundColor: '#000' }}>
          {montagePhotos.length === 0 && heroPhoto && (
            <PhotoScene src={heroPhoto} durationFrames={SCENE_MONTAGE_END - SCENE_STATS_END} />
          )}
          {montagePhotos.map((src, i) => (
            <Sequence key={`${src}-${i}`} from={i * perPhoto} durationInFrames={perPhoto} layout="none">
              <PhotoScene src={src} durationFrames={perPhoto} />
            </Sequence>
          ))}
        </AbsoluteFill>
      </Sequence>

      {/* ── Scene 5: Agent + CTA (14s–end) ── */}
      <Sequence from={SCENE_MONTAGE_END} durationInFrames={Math.max(1, durationInFrames - SCENE_MONTAGE_END)} layout="none">
        <AbsoluteFill style={{
          background: 'linear-gradient(180deg, #0A0A0A 0%, #1a1a1a 100%)',
          alignItems: 'center', justifyContent: 'center', padding: 80, gap: 30,
        }}>
          {logoSrc && (
            <FadeIn from={4}>
              <Img src={logoSrc} style={{ maxWidth: 360, maxHeight: 120, objectFit: 'contain', opacity: 0.9 }} />
            </FadeIn>
          )}
          {headshotSrc && (
            <Pop from={6}>
              <div style={{
                width: 220, height: 220, borderRadius: '50%', overflow: 'hidden',
                border: `4px solid ${accent}`,
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              }}>
                <Img src={headshotSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </Pop>
          )}
          <FadeIn from={12} style={{ textAlign: 'center' }}>
            <div style={{ color: '#fff', fontSize: 58, fontWeight: 900, letterSpacing: 1 }}>
              {agentName}
            </div>
            {brokerageName && (
              <div style={{ color: '#A8A8A8', fontSize: 32, fontWeight: 500, marginTop: 8 }}>
                {brokerageName}
              </div>
            )}
            {agentPhone && (
              <div style={{ color: '#D4D4D4', fontSize: 30, fontWeight: 500, marginTop: 6, fontFamily: 'monospace' }}>
                {agentPhone}
              </div>
            )}
          </FadeIn>
          <FadeIn from={18}>
            <div style={{
              marginTop: 14, padding: '20px 44px',
              background: accent, color: '#0A0A0A',
              borderRadius: 999, fontSize: 38, fontWeight: 900,
              letterSpacing: 1, textTransform: 'uppercase',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            }}>
              {ctaText}
            </div>
          </FadeIn>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

const Stat: React.FC<{ label: string; value: string; accent: string }> = ({ label, value, accent }) => (
  <div style={{ textAlign: 'center', minWidth: 140 }}>
    <div style={{ color: accent, fontSize: 86, fontWeight: 900, lineHeight: 1 }}>
      {value || '—'}
    </div>
    <div style={{ color: '#A8A8A8', fontSize: 22, fontWeight: 700, letterSpacing: 4, marginTop: 8 }}>
      {label}
    </div>
  </div>
);

const Divider: React.FC = () => (
  <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.18)' }} />
);
