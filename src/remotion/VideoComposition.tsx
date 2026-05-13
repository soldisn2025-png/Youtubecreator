import { Composition, Series } from "remotion";
import { TitleSlide } from "./TitleSlide";
import { SceneSlide } from "./SceneSlide";
import type { VideoProps } from "./types";

const DEFAULT_SCENE_DURATION_SEC = 8;
const TITLE_DURATION_SEC = 3;

export function VideoComposition(props: VideoProps) {
  const { scenes, introImageUrl, outroImageUrl, projectTitle, fps } = props;
  const introDurationFrames = TITLE_DURATION_SEC * fps;
  const outroDurationFrames = TITLE_DURATION_SEC * fps;

  return (
    <Series>
      <Series.Sequence durationInFrames={introDurationFrames}>
        <TitleSlide title={projectTitle} imageUrl={introImageUrl} />
      </Series.Sequence>

      {scenes.map((scene, i) => {
        const durationFrames = Math.round((scene.durationSec || DEFAULT_SCENE_DURATION_SEC) * fps);
        return (
          <Series.Sequence key={i} durationInFrames={durationFrames}>
            <SceneSlide scene={scene} index={i} />
          </Series.Sequence>
        );
      })}

      <Series.Sequence durationInFrames={outroDurationFrames}>
        <TitleSlide
          title="Like & Subscribe for more tips!"
          imageUrl={outroImageUrl}
          isOutro
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
  return (
    <Composition
      id="YoutubeVideo"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      component={VideoComposition as any}
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
      }}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      calculateMetadata={(({ props }: any) => ({
        durationInFrames: getTotalFrames({ ...props, fps: 30 }),
        fps: 30,
        width: 1920,
        height: 1080,
      })) as any}
    />
  );
}
