import React, { useMemo } from "react";
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

const SPOTIFY_GREEN  = staticFile("Branding/Spotify LOGO-V2.mov");
const SPOTIFY_YELLOW = staticFile("Branding/Spotify LOGO-V2-Yellow.mov");

const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const RGB_SPLIT_SHADOW = "2px 0px 4px rgba(255,0,0,0.4), -2px 0px 4px rgba(0,255,255,0.4), 0 10px 30px rgba(0,0,0,0.8)";

const SPR_TRACKING = { damping: 15, stiffness: 120 } as const;
const SPR_STOMP    = { damping: 14, stiffness: 220 } as const;
const SPR_PUNCH    = { damping: 14, stiffness: 160 } as const;
const SPR_REVEAL   = { damping: 16, stiffness: 140 } as const;

const PERF_TEXT_LAYER: React.CSSProperties = {
  contain: "layout paint style",
  willChange: "transform, opacity, letter-spacing",
  WebkitFontSmoothing: "antialiased",
  backfaceVisibility: "hidden",
  transformStyle: "preserve-3d",
};
const PERF_TRANSFORM_LAYER: React.CSSProperties = {
  contain: "layout style",
  willChange: "transform, opacity",
};

const safeOpacity = (frame: number, appear: number, disappear: number, inDur = 10, outDur = 10) => {
  if (disappear <= appear) return 0;
  const inEnd     = Math.min(appear + inDur, disappear);
  const outStart  = Math.max(disappear - outDur, appear);
  const opacityIn  = interpolate(frame, [appear, inEnd],       [0, 1], CLAMP);
  const opacityOut = interpolate(frame, [outStart, disappear], [1, 0], CLAMP);
  return opacityIn * opacityOut;
};

const ProceduralFilmGrain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{
      position: "absolute", inset: 0, opacity: 0.07, pointerEvents: "none",
      mixBlendMode: "overlay", zIndex: 9999,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' seed='${frame}' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
    }} />
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

const KineticTracking: React.FC<{
  appear: number; disappear: number; text: string;
  baseSpacing?: number; expandTo?: number; style?: React.CSSProperties;
}> = ({ appear, disappear, text, baseSpacing = 2, expandTo = 16, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relFrame      = Math.max(0, frame - appear);
  const progress      = spring({ frame: relFrame, fps, config: SPR_TRACKING });
  const letterSpacing = interpolate(progress, [0, 1], [baseSpacing, expandTo]);
  const opacity       = safeOpacity(frame, appear, disappear, 10, 10);
  return (
    <div style={{ ...PERF_TEXT_LAYER, ...style, opacity, letterSpacing, marginRight: -letterSpacing }}>
      {text}
    </div>
  );
};

const KineticStomp: React.FC<{
  appear: number; disappear: number; children: React.ReactNode;
  scaleFrom?: number; fadeDuration?: number;
}> = ({ appear, disappear, children, scaleFrom = 1.4, fadeDuration = 5 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relFrame = Math.max(0, frame - appear);
  const entrance = spring({ frame: relFrame, fps, config: SPR_STOMP });
  const scale    = interpolate(entrance, [0, 1], [scaleFrom, 1]);
  const opacity  = safeOpacity(frame, appear, disappear, fadeDuration, 10);
  return (
    <div style={{
      ...PERF_TRANSFORM_LAYER, width: "100%", opacity,
      transform: `scale(${scale})`,
      display: "flex", justifyContent: "center", alignItems: "center",
    }}>
      {children}
    </div>
  );
};

const KineticLinePunch: React.FC<{
  text: string; appear: number; disappear: number; style?: React.CSSProperties;
}> = ({ text, appear, disappear, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relFrame = Math.max(0, frame - appear);
  const progress = spring({ frame: relFrame, fps, config: SPR_PUNCH });
  const scale    = interpolate(progress, [0, 1], [0.85, 1]);
  const y        = interpolate(progress, [0, 1], [40, 0]);
  const opacity  = safeOpacity(frame, appear, disappear, 5, 8);
  return (
    <div style={{ ...PERF_TEXT_LAYER, opacity, transform: `translate3d(0, ${y}px, 0) scale(${scale})`, ...style }}>
      {text}
    </div>
  );
};

const KineticMaskReveal: React.FC<{
  appear: number; disappear: number; children: React.ReactNode;
}> = ({ appear, disappear, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relFrame   = Math.max(0, frame - appear);
  const progress   = spring({ frame: relFrame, fps, config: SPR_REVEAL });
  const yPercent   = interpolate(progress, [0, 1], [100, 0]);
  const opacityOut = interpolate(frame, [disappear - 8, disappear], [1, 0], CLAMP);
  return (
    <div style={{ overflow: "hidden", opacity: opacityOut, display: "flex", justifyContent: "center" }}>
      <div style={{ transform: `translateY(${yPercent}%)`, padding: "2px 0", willChange: "transform" }}>
        {children}
      </div>
    </div>
  );
};

const CenteredLogo: React.FC<{
  appear: number; disappear: number; logoWidth: number; src: string;
}> = ({ appear, disappear, logoWidth, src }) => (
  <div style={{
    display: "flex", justifyContent: "center", alignItems: "center",
    width: "100%", padding: "40px 0", ...PERF_TRANSFORM_LAYER,
  }}>
    <div style={{ position: "relative", width: logoWidth, aspectRatio: "700 / 454" }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <KineticStomp appear={appear} disappear={disappear} scaleFrom={1.4}>
          <Sequence layout="none" from={appear} premountFor={30}>
            <OffthreadVideo transparent src={src} muted
              style={{ width: logoWidth, display: "block", filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.6))" }}
            />
          </Sequence>
        </KineticStomp>
      </div>
    </div>
  </div>
);

const HorizontalCTALockup: React.FC<{
  appearText: number; appearLogo: number; disappear: number;
  textSize: number; textWidth: number; logoWidth: number;
  src: string; ctaText: string; style?: React.CSSProperties;
}> = ({ appearText, appearLogo, disappear, textSize, textWidth, logoWidth, src, ctaText, style }) => (
  <div style={{
    display: "flex", flexDirection: "row", alignItems: "center",
    justifyContent: "center", width: "100%", gap: 20, padding: "20px 0",
    ...PERF_TRANSFORM_LAYER, ...style,
  }}>
    <div style={{ width: textWidth, flexShrink: 0, display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
      <KineticTracking appear={appearText} disappear={disappear} text={ctaText}
        baseSpacing={0} expandTo={4}
        style={{ color: WHITE, fontSize: textSize, fontWeight: 900, textShadow: RGB_SPLIT_SHADOW, whiteSpace: "nowrap" }}
      />
    </div>
    <div style={{
      position: "relative", width: logoWidth, minWidth: logoWidth, maxWidth: logoWidth,
      flex: `0 0 ${logoWidth}px`, flexShrink: 0, aspectRatio: "700 / 454", ...PERF_TRANSFORM_LAYER,
    }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "flex-start", alignItems: "center" }}>
        <KineticStomp appear={appearLogo} disappear={disappear} scaleFrom={1.4}>
          <Sequence layout="none" from={appearLogo} premountFor={30}>
            <OffthreadVideo transparent src={src} muted
              style={{ width: logoWidth, display: "block", filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.6))" }}
            />
          </Sequence>
        </KineticStomp>
      </div>
    </div>
  </div>
);

const BgClip: React.FC<{
  src: string; position: string; fadeDuration: number;
  isFirst: boolean; isLast: boolean; segmentLength: number; bgScale: number; bgFilter?: string;
  startFromSeconds?: number;
}> = ({ src, position, fadeDuration, isFirst, isLast, segmentLength, bgScale, bgFilter = "", startFromSeconds = 0 }) => {
  const { fps } = useVideoConfig();
  const localFrame = useCurrentFrame();
  const fadeIn  = isFirst ? 1 : interpolate(localFrame, [0, fadeDuration], [0, 1], CLAMP);
  const fadeOut = isLast  ? 1 : interpolate(localFrame, [segmentLength - fadeDuration, segmentLength], [1, 0], CLAMP);
  const startFromFrames = Math.round(startFromSeconds * fps);
  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>
      <OffthreadVideo src={src} muted
        startFrom={startFromFrames > 0 ? startFromFrames : undefined}
        style={{
          width: "100%", height: "100%", objectFit: "cover", objectPosition: position,
          transform: `scale(${bgScale})`, transformOrigin: "center center",
          filter: "saturate(130%) contrast(120%) brightness(95%)",
        }} />
    </AbsoluteFill>
  );
};

const BackgroundMontage: React.FC<{
  footage: (string | { src: string; position: string; offset?: number })[]; bgScale: number; bgFilter?: string;
}> = ({ footage, bgScale, bgFilter = "" }) => {
  const { durationInFrames } = useVideoConfig();
  const fadeDuration = 24;
  const { segmentLength, step } = useMemo(() => {
    const n      = Math.max(1, footage.length);
    const segLen = Math.round((durationInFrames + (n - 1) * fadeDuration) / n);
    return { segmentLength: segLen, step: segLen - fadeDuration };
  }, [durationInFrames, footage.length]);
  const sequences = useMemo(() => footage.map((item, i) => {
    const src      = typeof item === "string" ? item : item.src;
    const position = typeof item === "string" ? "center center" : item.position;
    const offset   = typeof item === "string" ? 0 : (item.offset ?? 0);
    return (
      <Sequence key={`${src}-${i}-${offset}`} from={i * step} durationInFrames={segmentLength}>
        <BgClip src={src} position={position} fadeDuration={fadeDuration}
          isFirst={i === 0} isLast={i === footage.length - 1}
          segmentLength={segmentLength} bgScale={bgScale} bgFilter={bgFilter}
          startFromSeconds={offset}
        />
      </Sequence>
    );
  }), [footage, step, segmentLength]);
  return <AbsoluteFill>{sequences}</AbsoluteFill>;
};

// ── Props ─────────────────────────────────────────────────────

export interface MuteSection {
  start: number; // seconds into the audio file
  end: number;
}

export interface DrivingReelProps {
  startTime:          number;
  audioPath:          string;
  artPath:            string;
  footage?:           (string | { src: string; position: string })[];
  isPreCutAudio?:     boolean;
  scene1Eyebrow:      string;   // leave "" to hide eyebrow entirely
  scene1LineTop:      string;
  scene1LineBottom:   string;
  scene1LineBottom2?: string;   // optional second yellow line for long copy
  scene1FontSize:     number;
  artistList:         string[];
  punchline:          string;
  ctaText:            string;
  bgFilter?:          string;  // optional CSS filter on background footage e.g. "grayscale(100%)"
  sceneMode?:         string;  // 'default' | '1+3' | '2+3' | 'scene1-only' | 'scene2-only' | 'scene3-only'
  muteSections?:      MuteSection[];
}

// ── Component ─────────────────────────────────────────────────

export const DrivingReel: React.FC<DrivingReelProps> = ({
  startTime, audioPath, artPath, footage = [], isPreCutAudio = false,
  scene1Eyebrow, scene1LineTop, scene1LineBottom, scene1LineBottom2 = "",
  scene1FontSize, artistList, punchline, ctaText, bgFilter = "",
  sceneMode = 'default', muteSections = [],
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  const cleanBgStart = durationInFrames - 3 * fps;
  const fgFade       = interpolate(frame, [cleanBgStart - 12, cleanBgStart], [1, 0], CLAMP);
  const bgScale      = interpolate(frame, [0, durationInFrames], [1.04, 1.14], CLAMP);

  const showScene1 = sceneMode !== 'scene2-only' && sceneMode !== 'scene3-only';
  const showScene2 = sceneMode !== 'scene1-only' && sceneMode !== 'scene3-only';
  const showOutro  = sceneMode !== 'scene1-only' && sceneMode !== 'scene2-only';

  const scene1Exit = !showScene1 ? 0
    : sceneMode === 'scene1-only' ? durationInFrames
    : 5 * fps;

  const scene2Start = (sceneMode === 'scene2-only' || sceneMode === '2+3') ? 0 : 5 * fps;

  const scene2ExitStart = sceneMode === 'scene2-only' ? durationInFrames
    : Math.round(Math.max(
        scene2Start + 10 + artistList.length * 7 + 8 + 96,
        scene2Start + 60 + 60,
        11 * fps,
      ));

  const outroStart = !showOutro ? durationInFrames + 1
    : sceneMode === 'scene3-only' ? 0
    : sceneMode === '1+3' ? scene1Exit
    : Math.round(10.5 * fps);

  const artScale = interpolate(frame, [outroStart, durationInFrames], [1, 1.08], CLAMP);

  const artistCascade = useMemo(() => artistList.map((name, i) => (
    <KineticMaskReveal key={name} appear={scene2Start + 10 + i * 7} disappear={scene2ExitStart}>
      <h2 style={{ color: YELLOW, fontSize: 60, fontWeight: 900, lineHeight: 0.95, margin: 0, textShadow: RGB_SPLIT_SHADOW }}>
        {name}
      </h2>
    </KineticMaskReveal>
  )), [artistList, scene2Start, scene2ExitStart]);

  return (
    <AbsoluteFill style={{ backgroundColor: "black", fontFamily: FONT }}>
      <ProceduralFilmGrain />
      <Audio
        src={audioPath}
        startFrom={isPreCutAudio ? 0 : Math.round(startTime * fps)}
        volume={muteSections.length === 0 ? 1 : (f) => {
          const audioSec = (isPreCutAudio ? 0 : startTime) + f / fps;
          return muteSections.some(s => audioSec >= s.start && audioSec < s.end) ? 0 : 1;
        }}
      />
      <BackgroundMontage footage={footage} bgScale={bgScale} bgFilter={bgFilter} />

      <AbsoluteFill style={{ opacity: fgFade }}>
        <AbsoluteFill style={{
          background: "radial-gradient(circle, rgba(100,20,80,0.15) 0%, rgba(10,0,20,0.7) 100%)",
          mixBlendMode: "overlay",
        }} />

        {/* ── Scene 1: Hook ── */}
        {showScene1 && frame < scene1Exit && (
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30, width: "100%", marginTop: 50 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center", width: "100%" }}>

                {/* Eyebrow — hidden if empty string */}
                {scene1Eyebrow ? (
                  <KineticTracking
                    appear={5} disappear={scene1Exit} text={scene1Eyebrow}
                    baseSpacing={4} expandTo={12}
                    style={{ color: WHITE, fontSize: 45, fontWeight: 900, textShadow: RGB_SPLIT_SHADOW, textTransform: "uppercase" }}
                  />
                ) : null}

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, width: "100%", marginTop: 10 }}>
                  <KineticLinePunch
                    text={scene1LineTop} appear={15} disappear={scene1Exit}
                    style={{ color: WHITE, fontWeight: 900, fontSize: scene1FontSize, textTransform: "uppercase", textShadow: RGB_SPLIT_SHADOW, textAlign: "center", whiteSpace: "nowrap" }}
                  />
                  {scene1LineBottom2 ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <KineticLinePunch
                        text={scene1LineBottom} appear={22} disappear={scene1Exit}
                        style={{ color: YELLOW, fontWeight: 900, fontSize: scene1FontSize, textTransform: "uppercase", textShadow: RGB_SPLIT_SHADOW, textAlign: "center", whiteSpace: "nowrap" }}
                      />
                      <KineticLinePunch
                        text={scene1LineBottom2} appear={28} disappear={scene1Exit}
                        style={{ color: YELLOW, fontWeight: 900, fontSize: scene1FontSize, textTransform: "uppercase", textShadow: RGB_SPLIT_SHADOW, textAlign: "center", whiteSpace: "nowrap" }}
                      />
                    </div>
                  ) : (
                    <KineticLinePunch
                      text={scene1LineBottom} appear={22} disappear={scene1Exit}
                      style={{ color: YELLOW, fontWeight: 900, fontSize: scene1FontSize, textTransform: "uppercase", textShadow: RGB_SPLIT_SHADOW, textAlign: "center", whiteSpace: "nowrap" }}
                    />
                  )}
                </div>
              </div>
              <CenteredLogo appear={35} disappear={scene1Exit} logoWidth={350} src={SPOTIFY_YELLOW} />
            </div>
          </AbsoluteFill>
        )}

        {/* ── Scene 2: Sounds Like ── */}
        {showScene2 && frame >= scene2Start && frame < scene2ExitStart + 30 && (
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 80, width: "100%" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                <KineticTracking
                  appear={scene2Start} disappear={scene2ExitStart} text="SOUNDS LIKE"
                  baseSpacing={4} expandTo={14}
                  style={{ color: WHITE, fontSize: 45, marginBottom: 35, textShadow: RGB_SPLIT_SHADOW, fontWeight: 900 }}
                />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  {artistCascade}
                </div>
                <div style={{ marginTop: 25 }}>
                  <KineticMaskReveal appear={scene2Start + 10 + artistList.length * 7 + 8} disappear={scene2ExitStart}>
                    <h2 style={{ color: WHITE, fontSize: 45, fontWeight: 900, margin: 0, letterSpacing: 2, textShadow: RGB_SPLIT_SHADOW }}>
                      {punchline}
                    </h2>
                  </KineticMaskReveal>
                </div>
              </div>
              <HorizontalCTALockup
                appearText={scene2Start + 50} appearLogo={scene2Start + 60}
                disappear={scene2ExitStart}
                textSize={45} textWidth={260} logoWidth={250}
                src={SPOTIFY_GREEN} ctaText={ctaText}
              />
            </div>
          </AbsoluteFill>
        )}

        {/* ── Outro ── */}
        <Sequence from={outroStart}>
          <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 60, width: "100%", marginTop: 0 }}>
              <HorizontalCTALockup
                appearText={5} appearLogo={15} disappear={9999}
                textSize={70} textWidth={380} logoWidth={380}
                src={SPOTIFY_GREEN} ctaText={ctaText}
                style={{ marginLeft: 90 }}
              />
              <div style={{ width: 750, height: 750, transform: `scale(${artScale})`, transformOrigin: "50% 0", willChange: "transform" }}>
                <CinematicFadeIn appear={10}>
                  <Img src={artPath} style={{
                    width: "100%", height: "100%", borderRadius: 16,
                    boxShadow: "0 40px 80px rgba(0,0,0,0.6)",
                    objectFit: "cover", border: "2px solid rgba(255,255,255,0.15)",
                  }} />
                </CinematicFadeIn>
              </div>
            </div>
          </AbsoluteFill>
        </Sequence>

      </AbsoluteFill>
    </AbsoluteFill>
  );
};
