import React from "react";
import { AbsoluteFill, OffthreadVideo, Audio, useVideoConfig } from "remotion";

export const CleanMusicVideo: React.FC<{
  startTime:    number;
  videoPath:    string;
  audioPath:    string;
  focusPoint?:  string; // e.g. "center center", "20% center", "80% center"
}> = ({ startTime, videoPath, audioPath, focusPoint = "center center" }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {/* High-quality separated audio */}
      <Audio src={audioPath} startFrom={Math.round(startTime * fps)} />

      {/* Muted video visuals */}
      <AbsoluteFill>
        <OffthreadVideo
          src={videoPath}
          startFrom={Math.round(startTime * fps)}
          muted
          style={{
            height: "100%",
            width: "100%",
            objectFit: "cover",
            objectPosition: focusPoint,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
