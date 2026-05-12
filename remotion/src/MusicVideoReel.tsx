import React from "react";
import { AbsoluteFill, OffthreadVideo, useVideoConfig } from "remotion";

export const CleanMusicVideo: React.FC<{
  startTime: number;
  videoPath: string;
}> = ({ startTime, videoPath }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill>
        <OffthreadVideo
          src={videoPath}
          startFrom={Math.round(startTime * fps)} // converts seconds to frames, respects fps
          style={{
            height: "100%",
            width: "100%",
            objectFit: "cover",
            objectPosition: "center center",
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
