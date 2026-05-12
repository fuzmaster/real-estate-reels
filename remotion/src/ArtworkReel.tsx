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

const WHITE = "#FFFFFF";
const FONT  = "Montserrat, sans-serif";
const SPOTIFY_GREEN = staticFile("Branding/Spotify LOGO-V2.mov");

const BG_BLUR        = 60;
const BG_SCALE_START = 1.1;
const BG_SCALE_END   = 1.25;
const ART_SCALE_START = 1;
const ART_SCALE_END   = 1.08;

const FOREGROUND_FADE_SECONDS     = 3;
const FOREGROUND_FADE_LEAD_FRAMES = 12;
const FOREGROUND_OVERLAY_GRADIENT = "radial-gradient(circle, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.2) 100%)";

const CTA_APPEAR_TEXT = 5;
const CTA_APPEAR_LOGO = 15;
const CTA_TEXT_SIZE   = 70;
const CTA_TEXT_WIDTH  = 380;
const CTA_LOGO_WIDTH  = 380;
const CTA_STYLE: React.CSSProperties = { marginLeft: 65, marginBottom: 20 };
const ARTWORK_SIZE    = 750;

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const RGB_SPLIT_SHADOW = "2px 0px 4px rgba(255,0,0,0.4), -2px 0px 4px rgba(0,255,255,0.4), 0 10px 30px rgba(0,0,0,0.8)";

const SPR_TRACKING = { damping: 15, stiffness: 120 } as const;
const SPR_STOMP    = { damping: 14, stiffness: 220 } as const;

const PERF_TEXT_LAYER: React.CSSProperties      = { contain: "layout paint style", willChange: "transform, opacity, letter-spacing" };
const PERF_TRANSFORM_LAYER: React.CSSProperties = { contain: "layout style", willChange: "transform, opacity" };

// ── Sub-components ────────────────────────────────────────────

const KineticTracking: React.FC<{
  appear: number; text: string;
  baseSpacing?: number; expandTo?: number; style?: React.CSSProperties;
}> = ({ appear, text, baseSpacing = 2, expandTo = 16, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relFrame      = Math.max(0, frame - appear);
  const progress      = spring({ frame: relFrame, fps, config: SPR_TRACKING });
  const letterSpacing = interpolate(progress, [0, 1], [baseSpacing, expandTo]);
  const opacity       = interpolate(frame, [appear, appear + 10], [0, 1], CLAMP);
  return (
    <div style={{ ...PERF_TEXT_LAYER, ...style, opacity, letterSpacing, marginRight: -letterSpacing }}>
      {text}
    </div>
  );
};

const KineticStomp: React.FC<{
  appear: number; children: React.ReactNode; scaleFrom?: number;
}> = ({ appear, children, scaleFrom = 1.4 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relFrame = Math.max(0, frame - appear);
  const entrance = spring({ frame: relFrame, fps, config: SPR_STOMP });
  const scale    = interpolate(entrance, [0, 1], [scaleFrom, 1]);
  const opacity  = interpolate(frame, [appear, appear + 5], [0, 1], CLAMP);
  return (
    <div style={{
      ...PERF_TRANSFORM_LAYER,
      width: "100%", opacity,
      transform: `scale(${scale})`,
      display: "flex", justifyContent: "center", alignItems: "center",
    }}>
      {children}
    </div>
  );
};

const CinematicFadeIn: React.FC<{ appear: number; children: React.ReactNode }> = ({ appear, children }) => {
  const frame   = useCurrentFrame();
  const opacity = interpolate(frame, [appear, appear + 20], [0, 1], CLAMP);
  const blur    = interpolate(frame, [appear, appear + 15], [20, 0], CLAMP);
  return (
    <div style={{ width: "100%", height: "100%", opacity, filter: `blur(${blur}px)`, willChange: "opacity, filter" }}>
      {children}
    </div>
  );
};

const HorizontalCTALockup: React.FC<{
  appearText: number; appearLogo: number;
  textSize: number; textWidth: number; logoWidth: number;
  src: string; ctaText: string; style?: React.CSSProperties;
}> = ({ appearText, appearLogo, textSize, textWidth, logoWidth, src, ctaText, style }) => (
  <div style={{
    display: "flex", flexDirection: "row", alignItems: "center",
    justifyContent: "center", width: "100%", gap: 20, padding: "20px 0",
    ...PERF_TRANSFORM_LAYER, ...style,
  }}>
    <div style={{ width: textWidth, flexShrink: 0, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
      <KineticTracking
        appear={appearText} text={ctaText}
        baseSpacing={0} expandTo={4}
        style={{ color: WHITE, fontSize: textSize, fontWeight: 900, textShadow: RGB_SPLIT_SHADOW, whiteSpace: "nowrap" }}
      />
    </div>
    <div style={{
      position: "relative", width: logoWidth,
      minWidth: logoWidth, maxWidth: logoWidth,
      flex: `0 0 ${logoWidth}px`, flexShrink: 0,
      aspectRatio: "700 / 454", ...PERF_TRANSFORM_LAYER,
    }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
        <KineticStomp appear={appearLogo} scaleFrom={1.4}>
          <Sequence layout="none" from={appearLogo} premountFor={30}>
            <OffthreadVideo
              transparent src={src} muted
              style={{ width: logoWidth, display: "block", filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.6))" }}
            />
          </Sequence>
        </KineticStomp>
      </div>
    </div>
  </div>
);

// ── Props ─────────────────────────────────────────────────────

export interface ArtworkReelProps {
  startTime:      number;
  audioPath:      string;
  artPath:        string;
  isPreCutAudio?: boolean;
  ctaText:        string;
  muteSections?:  { start: number; end: number }[];
}

// ── Component ─────────────────────────────────────────────────

export const ArtworkReel: React.FC<ArtworkReelProps> = ({
  startTime,
  audioPath,
  artPath,
  isPreCutAudio = false,
  ctaText,
  muteSections = [],
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  const cleanBgStart = durationInFrames - FOREGROUND_FADE_SECONDS * fps;
  const fgFade       = interpolate(frame, [cleanBgStart - FOREGROUND_FADE_LEAD_FRAMES, cleanBgStart], [1, 0], CLAMP);
  const bgScale      = interpolate(frame, [0, durationInFrames], [BG_SCALE_START, BG_SCALE_END], CLAMP);
  const artScale     = interpolate(frame, [0, durationInFrames], [ART_SCALE_START, ART_SCALE_END], CLAMP);

  return (
    <AbsoluteFill style={{ backgroundColor: "black", fontFamily: FONT }}>

      <Audio
        src={audioPath}
        startFrom={isPreCutAudio ? 0 : Math.round(startTime * fps)}
        volume={muteSections.length === 0 ? 1 : (f) => {
          const audioSec = (isPreCutAudio ? 0 : startTime) + f / fps;
          return muteSections.some(s => audioSec >= s.start && audioSec < s.end) ? 0 : 1;
        }}
      />

      {/* Blurred background */}
      <AbsoluteFill>
        <Img
          src={artPath}
          style={{
            width: "100%", height: "100%",
            objectFit: "cover",
            filter: `blur(${BG_BLUR}px)`,
            transform: `scale(${bgScale})`,
            transformOrigin: "center center",
          }}
        />
      </AbsoluteFill>

      <AbsoluteFill style={{ opacity: fgFade }}>
        <AbsoluteFill style={{ background: FOREGROUND_OVERLAY_GRADIENT }} />

        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 60, width: "100%", marginTop: 0 }}>

            <HorizontalCTALockup
              appearText={CTA_APPEAR_TEXT}
              appearLogo={CTA_APPEAR_LOGO}
              textSize={CTA_TEXT_SIZE}
              textWidth={CTA_TEXT_WIDTH}
              logoWidth={CTA_LOGO_WIDTH}
              src={SPOTIFY_GREEN}
              ctaText={ctaText}
              style={CTA_STYLE}
            />

            <div style={{ width: ARTWORK_SIZE, height: ARTWORK_SIZE, transform: `scale(${artScale})`, willChange: "transform" }}>
              <CinematicFadeIn appear={10}>
                <Img
                  src={artPath}
                  style={{
                    width: "100%", height: "100%", borderRadius: 16,
                    boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
                    objectFit: "cover", border: "2px solid rgba(255,255,255,0.15)",
                  }}
                />
              </CinematicFadeIn>
            </div>

          </div>
        </AbsoluteFill>
      </AbsoluteFill>

    </AbsoluteFill>
  );
};
