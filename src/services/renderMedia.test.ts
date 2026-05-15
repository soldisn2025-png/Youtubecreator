import { describe, expect, it } from "vitest";
import { buildSceneMedia, type RenderAsset } from "./renderMedia";

const assets: RenderAsset[] = [
  { id: "photo-1", type: "photo", r2Key: "photos/one.jpg", validationStatus: "valid" },
  { id: "photo-2", type: "photo", r2Key: "photos/two.jpg", validationStatus: "valid" },
  { id: "clip-1", type: "clip", r2Key: "clips/one.mp4", validationStatus: "valid" },
  { id: "photo-3", type: "photo", r2Key: "photos/three.jpg", validationStatus: "valid" },
];

describe("render media selection", () => {
  it("keeps the assigned scene asset and intentionally includes an uploaded clip", () => {
    const result = buildSceneMedia({
      assets,
      baseUrl: "https://cdn.example.com",
      sceneAssetId: "photo-1",
      assetCursor: 0,
      clipCursor: 0,
      maxItems: 3,
    });

    expect(result.mediaItems[0]).toEqual({
      url: "https://cdn.example.com/photos/one.jpg",
      type: "image",
    });
    expect(result.mediaItems).toContainEqual({
      url: "https://cdn.example.com/clips/one.mp4",
      type: "video",
    });
    expect(result.videoUrl).toBe("https://cdn.example.com/clips/one.mp4");
  });

  it("does not duplicate a clip when the scene is already assigned to that clip", () => {
    const result = buildSceneMedia({
      assets,
      baseUrl: "https://cdn.example.com",
      sceneAssetId: "clip-1",
      assetCursor: 0,
      clipCursor: 0,
      maxItems: 3,
    });

    expect(result.mediaItems.filter((media) => media.type === "video")).toHaveLength(1);
    expect(result.mediaItems[0]).toEqual({
      url: "https://cdn.example.com/clips/one.mp4",
      type: "video",
    });
  });

  it("ignores rejected uploaded assets", () => {
    const result = buildSceneMedia({
      assets: [
        { id: "bad-clip", type: "clip", r2Key: "clips/bad.mov", validationStatus: "rejected" },
        { id: "photo-1", type: "photo", r2Key: "photos/one.jpg", validationStatus: "valid" },
      ],
      baseUrl: "https://cdn.example.com",
      sceneAssetId: "bad-clip",
      assetCursor: 0,
      clipCursor: 0,
    });

    expect(result.mediaItems).toEqual([
      { url: "https://cdn.example.com/photos/one.jpg", type: "image" },
    ]);
    expect(result.videoUrl).toBeNull();
  });
});
