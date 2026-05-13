import { Player } from '@remotion/player';

export default function LiveReelPlayer({
  heroSrc,
  propertyAddress,
  location,
  description,
  ctaText,
  mode,
}: {
  heroSrc: string | null;
  propertyAddress: string;
  location: string;
  description: string;
  ctaText: string;
  mode: string;
}) {
  return (
    <div className="border border-neutral-800 bg-neutral-950 p-4">
      <div className="text-[11px] uppercase tracking-widest text-neutral-500">Live Player</div>
      <div className="text-sm font-semibold text-white mt-1 mb-3">Animated preview</div>
      <Player
        component={PreviewComposition}
        inputProps={{ heroSrc, propertyAddress, location, description, ctaText, mode }}
        durationInFrames={180}
        compositionWidth={540}
        compositionHeight={960}
        fps={30}
        controls
        loop
        style={{ width: '100%' }}
      />
    </div>
  );
}

function PreviewComposition({
  heroSrc,
  propertyAddress,
  location,
  description,
  ctaText,
  mode,
}: {
  heroSrc: string | null;
  propertyAddress: string;
  location: string;
  description: string;
  ctaText: string;
  mode: string;
}) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#050505', color: '#fff', fontFamily: 'Arial, sans-serif' }}>
      {heroSrc ? (
        <img src={heroSrc} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#666', fontSize: 20 }}>Add photos to preview</div>
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.25), rgba(0,0,0,.15) 45%, rgba(0,0,0,.84))' }} />
      <div style={{ position: 'absolute', top: 48, left: 34, right: 34, fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2 }}>{mode}</div>
      <div style={{ position: 'absolute', left: 34, right: 34, bottom: 170 }}>
        <div style={{ fontSize: 40, lineHeight: 1.02, fontWeight: 900, textTransform: 'uppercase' }}>{propertyAddress || 'Property address'}</div>
        <div style={{ fontSize: 20, color: '#e5e5e5', marginTop: 12, textTransform: 'uppercase' }}>{location || 'City, State'}</div>
        <div style={{ fontSize: 18, color: '#f5f5f5', marginTop: 18, lineHeight: 1.3 }}>{description || 'Short property description'}</div>
      </div>
      <div style={{ position: 'absolute', left: 34, right: 34, bottom: 52, background: '#fff', color: '#050505', padding: '18px 20px', fontWeight: 900, fontSize: 20, textTransform: 'uppercase' }}>
        {ctaText || 'DM TOUR FOR DETAILS'}
      </div>
    </div>
  );
}
