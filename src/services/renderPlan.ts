import { appConfig } from "@/lib/config";
import { getBeatCount, splitCaptionIntoBeats } from "@/remotion/timeline";
import type { SceneInput } from "@/remotion/types";
import { buildSceneMedia, type RenderAsset } from "./renderMedia";

export interface RenderSceneSource {
  sceneTitle: string;
  captionText: string;
  assetId: string | null;
  ttsAudioDurationSec: number | null;
  audioUrl: string | null;
}

export function getRemotionLambdaOptions() {
  return {
    functionName: appConfig.remotionFunctionName,
    serveUrl: appConfig.remotionServeUrl,
    framesPerLambda: appConfig.remotionFramesPerLambda,
    concurrencyPerLambda: appConfig.remotionConcurrencyPerLambda,
    timeoutInMilliseconds: appConfig.remotionTimeoutMs,
  };
}

export function buildRenderScenes(input: {
  scenes: RenderSceneSource[];
  assets: RenderAsset[];
  baseUrl: string;
}): SceneInput[] {
  let reusableAssetCursor = 0;
  let clipAssetCursor = 0;

  return input.scenes.map((scene) => {
    const mediaPlan = buildSceneMedia({
      assets: input.assets,
      baseUrl: input.baseUrl,
      sceneAssetId: scene.assetId,
      assetCursor: reusableAssetCursor,
      clipCursor: clipAssetCursor,
    });
    reusableAssetCursor = mediaPlan.nextAssetCursor;
    clipAssetCursor = mediaPlan.nextClipCursor;

    const durationSec = scene.ttsAudioDurationSec ?? 8;
    return {
      sceneTitle: scene.sceneTitle,
      captionText: scene.captionText,
      beatCaptions: splitCaptionIntoBeats(scene.captionText, getBeatCount(durationSec)),
      mediaItems: mediaPlan.mediaItems,
      imageUrl: mediaPlan.imageUrl,
      videoUrl: mediaPlan.videoUrl,
      audioUrl: scene.audioUrl,
      durationSec,
    };
  });
}
