import { memo, useEffect, useState } from 'react';

const SCALE = 270 / 1080;
const PREVIEW_W = 270;
const PREVIEW_H = Math.round(1920 * SCALE); // 480

const YELLOW = '#FFD500';
const WHITE = '#FFFFFF';
const FONT = "'Montserrat', sans-serif";
const TEXT_SHADOW =
  '2px 0px 4px rgba(255,0,0,0.4), -2px 0px 4px rgba(0,255,255,0.4), 0 10px 30px rgba(0,0,0,0.8)';

interface Props {
  eyebrow: string;
  firstLine: string;
  secondLine: string;
  secondLine2: string;
  fontSize: number;
  artworkSrc: string | null;
  artistList: string[];
  punchline: string;
  sceneMode?: string;
  ctaText?: string;
}

type Scene = 'scene1' | 'scene2' | 'artwork';

function defaultScene(mode: string): Scene {
  if (mode === 'scene2-only' || mode === '2+3') return 'scene2';
  if (mode === 'scene3-only') return 'artwork';
  return 'scene1';
}

const ReelPreview = memo(function ReelPreview({
  eyebrow, firstLine, secondLine, secondLine2,
  fontSize, artworkSrc, artistList, punchline,
  sceneMode = 'default', ctaText = 'LISTEN ON',
}: Props) {
  const [scene, setScene] = useState<Scene>(defaultScene(sceneMode));

  // Sync active tab when the scene layout mode changes
  useEffect(() => {
    setScene(defaultScene(sceneMode));
  }, [sceneMode]);

  const scene1Disabled = sceneMode === 'scene2-only' || sceneMode === 'scene3-only';
  const scene2Disabled = sceneMode === 'scene1-only' || sceneMode === 'scene3-only';
  const artworkDisabled = sceneMode === 'scene1-only' || sceneMode === 'scene2-only';

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Scene toggle */}
      <div className="flex gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
        <SceneBtn active={scene === 'scene1'} disabled={scene1Disabled} onClick={() => !scene1Disabled && setScene('scene1')}>
          Hook
        </SceneBtn>
        <SceneBtn active={scene === 'scene2'} disabled={scene2Disabled} onClick={() => !scene2Disabled && setScene('scene2')}>
          Artists
        </SceneBtn>
        <SceneBtn active={scene === 'artwork'} disabled={artworkDisabled} onClick={() => !artworkDisabled && setScene('artwork')}>
          Artwork
        </SceneBtn>
      </div>

      {/* Phone frame */}
      <div
        className="relative overflow-hidden border border-white/10 shadow-2xl shadow-black/80 rounded-[28px]"
        style={{ width: PREVIEW_W, height: PREVIEW_H }}
      >
        {/* Inner 1080×1920 canvas scaled down */}
        <div
          style={{
            width: 1080,
            height: 1920,
            transform: `scale(${SCALE})`,
            transformOrigin: 'top left',
            fontFamily: FONT,
            backgroundColor: '#000',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background: blurred artwork or dark gradient */}
          {artworkSrc ? (
            <img
              src={artworkSrc}
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover',
                filter: 'blur(60px) saturate(130%) brightness(0.6)',
                transform: 'scale(1.15)',
                transformOrigin: 'center',
              }}
            />
          ) : (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg, #1a0828 0%, #080010 100%)',
            }} />
          )}

          {/* Dark vignette */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle, rgba(100,20,80,0.15) 0%, rgba(10,0,20,0.7) 100%)',
          }} />

          {/* ── Scene 1: Hook text ── */}
          {scene === 'scene1' && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', justifyContent: 'center', alignItems: 'center',
            }}>
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 30, width: '100%', marginTop: 50,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', width: '100%' }}>
                  {eyebrow ? (
                    <div style={{
                      color: WHITE, fontSize: 45, fontWeight: 900,
                      textTransform: 'uppercase', letterSpacing: '0.18em',
                      textShadow: TEXT_SHADOW,
                    }}>
                      {eyebrow}
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, width: '100%', marginTop: 10 }}>
                    {firstLine ? (
                      <div style={{
                        color: WHITE, fontWeight: 900, fontSize,
                        textTransform: 'uppercase', textShadow: TEXT_SHADOW,
                        textAlign: 'center',
                      }}>
                        {firstLine}
                      </div>
                    ) : (
                      <div style={{ color: 'rgba(255,255,255,0.12)', fontSize: 44, fontWeight: 700, letterSpacing: '0.05em' }}>LINE 1</div>
                    )}
                    {secondLine ? (
                      <div style={{
                        color: YELLOW, fontWeight: 900, fontSize,
                        textTransform: 'uppercase', textShadow: TEXT_SHADOW,
                        textAlign: 'center',
                      }}>
                        {secondLine}
                      </div>
                    ) : null}
                    {secondLine2 ? (
                      <div style={{
                        color: YELLOW, fontWeight: 900, fontSize,
                        textTransform: 'uppercase', textShadow: TEXT_SHADOW,
                        textAlign: 'center',
                      }}>
                        {secondLine2}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Spotify green circle placeholder */}
                <div style={{
                  width: 54, height: 54, borderRadius: '50%',
                  backgroundColor: '#1DB954',
                }} />
              </div>
            </div>
          )}

          {/* ── Scene 2: Sounds Like / Artists ── */}
          {scene === 'scene2' && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              justifyContent: 'center', alignItems: 'center', gap: 20,
            }}>
              <div style={{
                color: WHITE, fontSize: 38, fontWeight: 900,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                textShadow: TEXT_SHADOW, opacity: 0.65,
              }}>
                SOUNDS LIKE
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                {artistList.length > 0 ? artistList.map((a, i) => (
                  <div key={i} style={{
                    color: YELLOW, fontSize: 60, fontWeight: 900,
                    lineHeight: 0.95, textShadow: TEXT_SHADOW, textTransform: 'uppercase',
                  }}>
                    {a}
                  </div>
                )) : (
                  <div style={{ color: 'rgba(255,213,0,0.18)', fontSize: 60, fontWeight: 900 }}>ARTIST NAME</div>
                )}
              </div>

              {punchline && (
                <div style={{ marginTop: 20 }}>
                  <div style={{
                    color: WHITE, fontSize: 36, fontWeight: 900,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    textShadow: TEXT_SHADOW, textAlign: 'center',
                  }}>
                    {punchline}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 30 }}>
                <div style={{ color: WHITE, fontSize: 42, fontWeight: 900, letterSpacing: '0.05em' }}>{ctaText}</div>
                <div style={{ width: 54, height: 54, borderRadius: '50%', backgroundColor: '#1DB954', flexShrink: 0 }} />
              </div>
            </div>
          )}

          {/* ── Scene 3: Artwork outro ── */}
          {scene === 'artwork' && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              justifyContent: 'center', alignItems: 'center', gap: 40,
            }}>
              {/* Cover art square */}
              <div style={{
                width: 750, height: 750,
                borderRadius: 24,
                overflow: 'hidden',
                boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
                flexShrink: 0,
              }}>
                {artworkSrc ? (
                  <img
                    src={artworkSrc}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    background: 'linear-gradient(135deg, #2a1040 0%, #0d0020 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(255,255,255,0.15)', fontSize: 80,
                  }}>
                    🎵
                  </div>
                )}
              </div>

              {/* CTA */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <div style={{
                  color: WHITE, fontSize: 52, fontWeight: 900,
                  letterSpacing: '0.06em', textShadow: TEXT_SHADOW,
                }}>
                  {ctaText}
                </div>
                <div style={{
                  width: 68, height: 68, borderRadius: '50%',
                  backgroundColor: '#1DB954', flexShrink: 0,
                  boxShadow: '0 4px 20px rgba(29,185,84,0.4)',
                }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-neutral-600">
        {scene === 'scene1' ? '0–5 sec · Hook'
          : scene === 'scene2' ? '5–11 sec · Sounds Like'
            : '11 sec+ · Outro'}
      </p>
    </div>
  );
});

export default ReelPreview;

function SceneBtn({
  children, active, disabled, onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1 rounded text-xs font-medium transition-colors
        ${active ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  );
}
