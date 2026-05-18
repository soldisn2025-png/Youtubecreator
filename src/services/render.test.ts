import { describe, expect, it } from "vitest";
import { buildRenderScenes, getRemotionLambdaOptions } from "./renderPlan";
import type { RenderAsset } from "./renderMedia";

const assets: RenderAsset[] = [
  { id: "photo-1", type: "photo", r2Key: "assets/photo-1.jpg", validationStatus: "valid" },
  { id: "clip-1", type: "clip", r2Key: "assets/clip-1.mp4", validationStatus: "valid" },
  { id: "photo-2", type: "photo", r2Key: "assets/photo-2.png", validationStatus: "valid" },
];

describe("render scene assembly", () => {
  it("preserves assigned uploaded photo and adds uploaded clip to the render props", () => {
    const scenes = buildRenderScenes({
      assets,
      baseUrl: "https://cdn.example.com",
      scenes: [
        {
          sceneTitle: "Visual schedule",
          captionText: "Show the photo while explaining the first step.",
          assetId: "photo-1",
          ttsAudioDurationSec: 12,
          audioUrl: "https://cdn.example.com/audio/scene-1.mp3",
        },
      ],
    });

    expect(scenes[0].mediaItems).toEqual([
      { url: "https://cdn.example.com/assets/photo-1.jpg", type: "image" },
      { url: "https://cdn.example.com/assets/clip-1.mp4", type: "video" },
      { url: "https://cdn.example.com/assets/photo-2.png", type: "image" },
    ]);
    expect(scenes[0].imageUrl).toBe("https://cdn.example.com/assets/photo-1.jpg");
    expect(scenes[0].videoUrl).toBe("https://cdn.example.com/assets/clip-1.mp4");
    expect(scenes[0].audioUrl).toBe("https://cdn.example.com/audio/scene-1.mp3");
  });

  it("rotates reusable media across scenes so one scene does not consume the whole project", () => {
    const scenes = buildRenderScenes({
      assets,
      baseUrl: "https://cdn.example.com",
      scenes: [
        {
          sceneTitle: "First",
          captionText: "First caption",
          assetId: "photo-1",
          ttsAudioDurationSec: 5,
          audioUrl: null,
        },
        {
          sceneTitle: "Second",
          captionText: "Second caption",
          assetId: "photo-2",
          ttsAudioDurationSec: 5,
          audioUrl: null,
        },
      ],
    });

    expect(scenes[0].mediaItems[0]).toEqual({
      url: "https://cdn.example.com/assets/photo-1.jpg",
      type: "image",
    });
    expect(scenes[1].mediaItems[0]).toEqual({
      url: "https://cdn.example.com/assets/photo-2.png",
      type: "image",
    });
    expect(scenes[1].mediaItems).toContainEqual({
      url: "https://cdn.example.com/assets/clip-1.mp4",
      type: "video",
    });
  });

  it("uses bounded Lambda defaults that split long videos into multiple chunks", () => {
    expect(getRemotionLambdaOptions()).toMatchObject({
      framesPerLambda: 120,
      concurrencyPerLambda: 1,
      timeoutInMilliseconds: 840000,
    });
    expect(getRemotionLambdaOptions()).not.toHaveProperty("concurrency");
  });
});
