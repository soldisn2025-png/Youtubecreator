import { Composition, Series } from "remotion";
import type { ComponentType } from "react";
import { TitleSlide } from "./TitleSlide";
import { SceneSlide } from "./SceneSlide";
import type { VideoProps } from "./types";
import { getCanvasSize } from "./timeline";

const DEFAULT_SCENE_DURATION_SEC = 8;
const TITLE_DURATION_SEC = 3;

export function VideoComposition(props: VideoProps) {
  const { scenes, introImageUrl, outroImageUrl, projectTitle, fps, aspectRatio } = props;
  const introDurationFrames = TITLE_DURATION_SEC * fps;
  const outroDurationFrames = TITLE_DURATION_SEC * fps;

  return (
    <Series>
      <Series.Sequence durationInFrames={introDurationFrames}>
        <TitleSlide title={projectTitle} imageUrl={introImageUrl} aspectRatio={aspectRatio} />
      </Series.Sequence>

      {scenes.map((scene, i) => {
        const durationFrames = Math.round((scene.durationSec || DEFAULT_SCENE_DURATION_SEC) * fps);
        return (
          <Series.Sequence key={i} durationInFrames={durationFrames}>
            <SceneSlide scene={scene} index={i} aspectRatio={aspectRatio} />
          </Series.Sequence>
        );
      })}

      <Series.Sequence durationInFrames={outroDurationFrames}>
        <TitleSlide
          title="Like & Subscribe for more tips!"
          imageUrl={outroImageUrl}
          isOutro
          aspectRatio={aspectRatio}
        />
      </Series.Sequence>
    </Series>
  );
}

function getTotalFrames(props: VideoProps): number {
  const fps = props.fps || 30;
  const scenesFrames = props.scenes.reduce(
    (sum, s) => sum + Math.round((s.durationSec || 8) * fps),
    0,
  );
  return TITLE_DURATION_SEC * fps + scenesFrames + TITLE_DURATION_SEC * fps;
}

export function RemotionRoot() {
  const component = VideoComposition as unknown as ComponentType<Record<string, unknown>>;
  return (
    <Composition
      id="YoutubeVideo"
      component={component}
      fps={30}
      width={1920}
      height={1080}
      durationInFrames={30 * 60 * 3}
      defaultProps={{
        scenes: [],
        introImageUrl: null,
        outroImageUrl: null,
        projectTitle: "My Video",
        fps: 30,
        aspectRatio: "horizontal_16_9",
      }}
      calculateMetadata={({ props }) => {
        const videoProps = props as unknown as VideoProps;
        const { width, height } = getCanvasSize(videoProps.aspectRatio ?? "horizontal_16_9");
        return {
          durationInFrames: getTotalFrames({ ...videoProps, fps: 30 }),
          fps: 30,
          width,
          height,
        };
      }}
    />
  );
}
