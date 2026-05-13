import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export function TitleSlide({
  title,
  imageUrl,
  isOutro,
}: {
  title: string;
  imageUrl: string | null;
  isOutro?: boolean;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "#17201b" }}>
      {imageUrl && (
        <Img
          src={imageUrl}
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }}
        />
      )}
      <AbsoluteFill
        style={{
          background: "rgba(0,0,0,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity,
        }}
      >
        <p
          style={{
            color: "#fff",
            fontSize: isOutro ? 40 : 52,
            fontWeight: 800,
            fontFamily: "Arial, sans-serif",
            textAlign: "center",
            padding: "0 80px",
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
