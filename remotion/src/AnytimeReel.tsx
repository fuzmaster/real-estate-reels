import React from "react";
import {
  AbsoluteFill, Audio, Img, OffthreadVideo, Sequence,
  interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from "remotion";

// ============================================================
//  🔧  INTERNAL — All campaign values arrive via props from Root.tsx.
//      Edit campaigns.txt and re-run render-batch.ps1.
// ============================================================

const YELLOW = "#FFD500";
const WHITE  = "#FFFFFF";
const FONT   = "Montserrat, sans-serif";
const SPOTIFY_LOGO = staticFile("Branding/Spotify LOGO-V2.mov");

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// ── Props ─────────────────────────────────────────────────────

export interface AnytimeReelProps {
  visualType:     "driving" | "artwork";
  startTime:      number;
  audioPath:      string;
  artPath:        string;
  footage?:       string[];
  isPreCutAudio?: boolean;
  scene1Eyebrow?: string;
  scene1LineTop?: string;
  scene1LineBottom?: string;
  scene1FontSize?:  number;
  artistList?:    string[];
  punchline?:     string;
}

// ── Component ─────────────────────────────────────────────────

export const AnytimeReel: React.FC<AnytimeReelProps> = ({
  startTime,
  audioPath,
  artPath,
  footage = [],
  isPreCutAudio = false,
  scene1Eyebrow     = "NEXT ON AUX",
  scene1LineTop     = "",
  scene1LineBottom  = "",
  scene1FontSize    = 60,
  artistList        = [],
  punchline         = "YOUR NEXT FAVORITE ARTIST",
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  const entry = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });

  // Smooth cross-fade between footage clips
  const getOpacity = (index: number) => {
    const clipDuration = 5 * fps;
    const start        = index * clipDuration;
    const fadeDuration = 15;

    if (index === 0) {
      return interpolate(frame, [clipDuration - fadeDuration, clipDuration], [1, 0], {
        extrapolateRight: "clamp",
      });
    }

    return interpolate(
      frame,
      [start - fadeDuration, start, start + clipDuration - fadeDuration, start + clipDuration],
      [0, 1, 1, 0],
      CLAMP,
    );
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "black", fontFamily: FONT }}>
      <Audio src={audioPath} startFrom={isPreCutAudio ? 0 : Math.round(startTime * fps)} />

      {/* Background footage */}
      <AbsoluteFill>
        {footage.map((src, i) => (
          <AbsoluteFill key={i} style={{ opacity: getOpacity(i) }}>
            <OffthreadVideo src={src} muted style={{ objectFit: "cover", width: "100%", height: "100%" }} />
          </AbsoluteFill>
        ))}
        <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.85))" }} />
      </AbsoluteFill>

      {/* Act 1: Hook (0s – 5s) */}
      {frame < 5 * fps && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 60 }}>
          <div style={{ transform: `translateY(${interpolate(entry, [0, 1], [150, 0])}px)`, opacity: entry }}>
            <h2 style={{
              color: YELLOW, fontSize: 45, fontWeight: 900,
              textShadow: "0 4px 15px rgba(0,0,0,1)", textAlign: "center",
            }}>
              {scene1Eyebrow}
            </h2>
            <h1 style={{
              color: WHITE, fontSize: scene1FontSize, fontWeight: 900,
              textShadow: "0 4px 25px rgba(0,0,0,1)", textAlign: "center",
              textTransform: "uppercase", lineHeight: 1.1,
            }}>
              {scene1LineTop}{scene1LineTop && scene1LineBottom && <br />}{scene1LineBottom}
            </h1>
          </div>
        </AbsoluteFill>
      )}

      {/* Act 2: Sounds Like (5s – 12s) */}
      {frame >= 5 * fps && frame < 12 * fps && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <h3 style={{ color: WHITE, fontSize: 35, marginBottom: 25, letterSpacing: 6, textShadow: "0 4px 10px black" }}>
            SOUNDS LIKE
          </h3>
          {artistList.map((name, i) => {
            const rowSpring = spring({ frame: frame - 5 * fps - i * 3, fps });
            return (
              <h2 key={i} style={{
                color: YELLOW, fontSize: 58, fontWeight: 900, margin: "2px 0",
                transform: `translateX(${interpolate(rowSpring, [0, 1], [-100, 0])}px)`,
                opacity: rowSpring,
                textShadow: "4px 4px 12px rgba(0,0,0,0.8)",
              }}>
                {name}
              </h2>
            );
          })}
          {punchline && (
            <h2 style={{
              color: WHITE, fontSize: 38, fontWeight: 900, margin: "12px 0 0",
              opacity: interpolate(frame, [5 * fps + artistList.length * 3 + 10, 5 * fps + artistList.length * 3 + 20], [0, 1], CLAMP),
              textShadow: "4px 4px 12px rgba(0,0,0,0.8)",
            }}>
              {punchline}
            </h2>
          )}
        </AbsoluteFill>
      )}

      {/* Act 3: CTA (12s – End) */}
      {frame >= 12 * fps && (
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <Sequence layout="none" from={12 * fps} premountFor={30}>
            <OffthreadVideo
              transparent src={SPOTIFY_LOGO} muted
              style={{
                width: 850,
                transform: `translateY(${interpolate(spring({ frame: frame - 12 * fps, fps }), [0, 1], [300, 0])}px)`,
              }}
            />
          </Sequence>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
