import { AbsoluteFill, Audio, Img, interpolate, useCurrentFrame, useVideoConfig, staticFile } from "remotion";
import type { SceneInput } from "./types";

export function SceneSlide({ scene }: { scene: SceneInput }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, fps * 0.3], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#1a1a1a" }}>
      {scene.imageUrl && (
        <Img
          src={scene.imageUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.85,
          }}
        />
      )}

      {/* Dark gradient overlay at bottom for caption readability */}
      <AbsoluteFill
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%)",
        }}
      />

      {/* Caption text */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "48px 64px",
          opacity,
        }}
      >
        <p
          style={{
            color: "#fff",
            fontSize: 36,
            fontWeight: 700,
            fontFamily: "Arial, sans-serif",
            lineHeight: 1.4,
            textShadow: "0 2px 8px rgba(0,0,0,0.6)",
            maxWidth: 900,
          }}
        >
          {scene.captionText}
        </p>
      </AbsoluteFill>

      {scene.audioUrl && <Audio src={scene.audioUrl} />}
    </AbsoluteFill>
  );
}
