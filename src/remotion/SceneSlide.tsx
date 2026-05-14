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
          background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.15) 40%, transparent 65%)",
        }}
      />

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
        <p
          style={{
            color: "#fff",
            fontSize: isVertical ? 54 : 38,
            fontWeight: 700,
            fontFamily: "Arial, sans-serif",
            lineHeight: 1.22,
            textShadow: "0 2px 12px rgba(0,0,0,0.85)",
            maxWidth: isVertical ? 920 : 1000,
          }}
        >
          {caption}
        </p>
      </AbsoluteFill>

      {scene.audioUrl && <Audio src={scene.audioUrl} />}
    </AbsoluteFill>
  );
}
