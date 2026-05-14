import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { AspectRatio } from "./types";

export function TitleSlide({
  title,
  imageUrl,
  isOutro,
  aspectRatio = "horizontal_16_9",
}: {
  title: string;
  imageUrl: string | null;
  isOutro?: boolean;
  aspectRatio?: AspectRatio;
}) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const isVertical = aspectRatio === "vertical_9_16";

  // Gentle Ken Burns zoom on title slides
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.06]);

  const opacity = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });
  const textY = interpolate(frame, [0, fps * 0.4], [20, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#17201b", overflow: "hidden" }}>
      {imageUrl && (
        <AbsoluteFill style={{ overflow: "hidden" }}>
          <Img
            src={imageUrl}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.6,
              transform: `scale(${scale})`,
              transformOrigin: "center center",
            }}
          />
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ background: "rgba(0,0,0,0.45)" }} />
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity,
          transform: `translateY(${textY}px)`,
        }}
      >
        <p
          style={{
            color: "#fff",
            fontSize: isVertical ? (isOutro ? 54 : 68) : (isOutro ? 40 : 52),
            fontWeight: 800,
            fontFamily: "Arial, sans-serif",
            textAlign: "center",
            padding: isVertical ? "0 72px" : "0 80px",
            textShadow: "0 4px 16px rgba(0,0,0,0.7)",
            lineHeight: 1.3,
          }}
        >
          {title}
        </p>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
