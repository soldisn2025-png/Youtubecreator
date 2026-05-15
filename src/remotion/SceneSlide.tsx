"use client";
import { AbsoluteFill, Audio, Img, Video, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { AspectRatio, MediaInput, SceneInput } from "./types";
import { getBeatCount, splitCaptionIntoBeats } from "./timeline";

// Four Ken Burns presets — alternates per scene so consecutive scenes feel different
const KB = [
  { s0: 1.0,  s1: 1.20, x0: 0,  x1: -4, y0: 0,  y1: -3 },
  { s0: 1.20, s1: 1.0,  x0: -4, x1: 0,  y0: -3, y1: 0  },
  { s0: 1.0,  s1: 1.18, x0: 4,  x1: -2, y0: 0,  y1: -4 },
  { s0: 1.18, s1: 1.0,  x0: -2, x1: 4,  y0: -4, y1: 0  },
];

const ACCENTS = ["#f26a3d", "#37a987", "#f0b13e", "#5c8df6"];

function MediaLayer({
  media,
  opacity,
  scale,
  tx,
  ty,
}: {
  media: MediaInput;
  opacity: number;
  scale: number;
  tx: number;
  ty: number;
}) {
  const style = {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    opacity,
    transform: `scale(${scale}) translate(${tx}%, ${ty}%)`,
    transformOrigin: "center center",
  };

  return media.type === "video" ? (
    <Video src={media.url} style={style} startFrom={0} loop volume={0} />
  ) : (
    <Img src={media.url} style={style} />
  );
}

export function SceneSlide({
  scene,
  index = 0,
  aspectRatio = "horizontal_16_9",
}: {
  scene: SceneInput;
  index?: number;
  aspectRatio?: AspectRatio;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = Math.max(1, Math.round((scene.durationSec || 8) * fps));
  const beatCount = Math.max(getBeatCount(scene.durationSec), scene.mediaItems.length || 0);
  const beatFrames = Math.max(1, Math.ceil(durationInFrames / beatCount));
  const beatIndex = Math.min(beatCount - 1, Math.floor(frame / beatFrames));
  const beatFrame = frame - beatIndex * beatFrames;
  const mediaItems: MediaInput[] = scene.mediaItems.length
    ? scene.mediaItems
    : scene.videoUrl
      ? [{ url: scene.videoUrl, type: "video" }]
      : scene.imageUrl
        ? [{ url: scene.imageUrl, type: "image" }]
        : [];
  const currentMedia = mediaItems[beatIndex % Math.max(1, mediaItems.length)];
  const previousMedia = mediaItems.length > 1 ? mediaItems[(beatIndex - 1 + mediaItems.length) % mediaItems.length] : null;
  const captions = scene.beatCaptions.length ? scene.beatCaptions : splitCaptionIntoBeats(scene.captionText, beatCount);
  const caption = captions[beatIndex % Math.max(1, captions.length)] || scene.captionText;
  const isVertical = aspectRatio === "vertical_9_16";

  const kb = KB[index % KB.length];
  const scale = interpolate(beatFrame, [0, beatFrames], [kb.s0, kb.s1]);
  const tx = interpolate(beatFrame, [0, beatFrames], [kb.x0, kb.x1]);
  const ty = interpolate(beatFrame, [0, beatFrames], [kb.y0, kb.y1]);
  const mediaOpacity = interpolate(beatFrame, [0, fps * 0.35], [0, 0.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const previousOpacity = interpolate(beatFrame, [0, fps * 0.35], [0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const captionOpacity = interpolate(beatFrame, [fps * 0.1, fps * 0.45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const captionY = interpolate(beatFrame, [fps * 0.1, fps * 0.45], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const accent = ACCENTS[index % ACCENTS.length];
  const progressWidth = interpolate(frame, [0, durationInFrames], [0, 100], { extrapolateRight: "clamp" });
  const patternX = interpolate(frame, [0, durationInFrames], [-12, 12], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const labelOpacity = interpolate(frame, [0, fps * 0.25], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#111", overflow: "hidden" }}>

      {/* Media layer */}
      {currentMedia ? (
        <AbsoluteFill style={{ overflow: "hidden" }}>
          {previousMedia && <MediaLayer media={previousMedia} opacity={previousOpacity} scale={1.08} tx={0} ty={0} />}
          <MediaLayer media={currentMedia} opacity={mediaOpacity} scale={scale} tx={tx} ty={ty} />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ background: "linear-gradient(135deg, #17201b 0%, #2d4a3e 100%)" }} />
      )}

      {/* Gradient for caption readability */}
      <AbsoluteFill
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.22) 42%, rgba(0,0,0,0.08) 70%, rgba(0,0,0,0.34) 100%)",
        }}
      />

      <AbsoluteFill
        style={{
          opacity: 0.16,
          mixBlendMode: "screen",
          background: `repeating-linear-gradient(115deg, transparent 0 26px, ${accent} 27px 29px, transparent 30px 58px)`,
          transform: `translateX(${patternX}%)`,
        }}
      />

      <AbsoluteFill
        style={{
          padding: isVertical ? "70px 56px" : "40px 56px",
          opacity: labelOpacity,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            width: "fit-content",
            maxWidth: isVertical ? 880 : 1120,
            color: "#fff",
            fontFamily: "Arial, sans-serif",
            fontSize: isVertical ? 25 : 21,
            fontWeight: 800,
            letterSpacing: 0,
            textShadow: "0 2px 12px rgba(0,0,0,0.65)",
          }}
        >
          <span
            style={{
              display: "inline-grid",
              placeItems: "center",
              width: isVertical ? 58 : 46,
              height: isVertical ? 58 : 46,
              background: accent,
              color: "#111",
            }}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {scene.sceneTitle}
          </span>
        </div>
      </AbsoluteFill>

      {/* Caption */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: isVertical ? "0 64px 180px" : "48px 64px",
          opacity: captionOpacity,
          transform: `translateY(${captionY}px)`,
        }}
      >
        <div
          style={{
            maxWidth: isVertical ? 920 : 1080,
            borderLeft: `10px solid ${accent}`,
            background: "rgba(10, 14, 12, 0.62)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.34)",
            padding: isVertical ? "30px 34px" : "22px 28px",
            backdropFilter: "blur(10px)",
          }}
        >
          <p
            style={{
            color: "#fff",
            fontSize: isVertical ? 56 : 40,
            fontWeight: 800,
            fontFamily: "Arial, sans-serif",
            lineHeight: 1.22,
            textShadow: "0 2px 12px rgba(0,0,0,0.85)",
            margin: 0,
          }}
          >
            {caption}
          </p>
        </div>
      </AbsoluteFill>

      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          width: `${progressWidth}%`,
          height: isVertical ? 12 : 8,
          background: accent,
          boxShadow: `0 0 24px ${accent}`,
        }}
      />

      {scene.audioUrl && <Audio src={scene.audioUrl} />}
    </AbsoluteFill>
  );
}
