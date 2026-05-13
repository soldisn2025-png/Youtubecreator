"use client";
import { AbsoluteFill, Audio, Img, Video, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { SceneInput } from "./types";

// Four Ken Burns presets — alternates per scene so consecutive scenes feel different
const KB = [
  { s0: 1.0,  s1: 1.20, x0: 0,  x1: -4, y0: 0,  y1: -3 },
  { s0: 1.20, s1: 1.0,  x0: -4, x1: 0,  y0: -3, y1: 0  },
  { s0: 1.0,  s1: 1.18, x0: 4,  x1: -2, y0: 0,  y1: -4 },
  { s0: 1.18, s1: 1.0,  x0: -2, x1: 4,  y0: -4, y1: 0  },
];

export function SceneSlide({ scene, index = 0 }: { scene: SceneInput; index?: number }) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const kb = KB[index % KB.length];
  const scale = interpolate(frame, [0, durationInFrames], [kb.s0, kb.s1]);
  const tx = interpolate(frame, [0, durationInFrames], [kb.x0, kb.x1]);
  const ty = interpolate(frame, [0, durationInFrames], [kb.y0, kb.y1]);

  const fadeIn = fps * 0.25;
  const captionOpacity = interpolate(frame, [fadeIn, fadeIn + fps * 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const captionY = interpolate(frame, [fadeIn, fadeIn + fps * 0.5], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#111", overflow: "hidden" }}>

      {/* Media layer */}
      {scene.videoUrl ? (
        <Video
          src={scene.videoUrl}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          startFrom={0}
          loop
          volume={0}
        />
      ) : scene.imageUrl ? (
        <AbsoluteFill style={{ overflow: "hidden" }}>
          <Img
            src={scene.imageUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.88,
              transform: `scale(${scale}) translate(${tx}%, ${ty}%)`,
              transformOrigin: "center center",
            }}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ background: "linear-gradient(135deg, #17201b 0%, #2d4a3e 100%)" }} />
      )}

      {/* Gradient for caption readability */}
      <AbsoluteFill
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.15) 40%, transparent 65%)",
        }}
      />

      {/* Caption */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "48px 64px",
          opacity: captionOpacity,
          transform: `translateY(${captionY}px)`,
        }}
      >
        <p
          style={{
            color: "#fff",
            fontSize: 38,
            fontWeight: 700,
            fontFamily: "Arial, sans-serif",
            lineHeight: 1.45,
            textShadow: "0 2px 12px rgba(0,0,0,0.85)",
            maxWidth: 1000,
          }}
        >
          {scene.captionText}
        </p>
      </AbsoluteFill>

      {scene.audioUrl && <Audio src={scene.audioUrl} />}
    </AbsoluteFill>
  );
}
