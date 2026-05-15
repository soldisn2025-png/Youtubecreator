import type { MediaInput } from "@/remotion/types";

export interface RenderAsset {
  id: string;
  type: string;
  r2Key: string;
  validationStatus?: string | null;
}

interface BuildSceneMediaInput {
  assets: RenderAsset[];
  baseUrl: string;
  sceneAssetId: string | null;
  assetCursor: number;
  clipCursor: number;
  maxItems?: number;
}

interface BuildSceneMediaResult {
  mediaItems: MediaInput[];
  imageUrl: string | null;
  videoUrl: string | null;
  nextAssetCursor: number;
  nextClipCursor: number;
}

function isReusable(asset: RenderAsset) {
  return (
    (asset.type === "photo" || asset.type === "clip") &&
    (asset.validationStatus == null || asset.validationStatus === "valid")
  );
}

function toMediaInput(asset: RenderAsset, baseUrl: string): MediaInput {
  return {
    url: `${baseUrl}/${asset.r2Key}`,
    type: asset.type === "clip" ? "video" : "image",
  };
}

export function buildSceneMedia(input: BuildSceneMediaInput): BuildSceneMediaResult {
  const maxItems = input.maxItems ?? 4;
  const reusableAssets = input.assets.filter(isReusable);
  const clipAssets = reusableAssets.filter((asset) => asset.type === "clip");
  const mediaItems: MediaInput[] = [];
  const usedAssetIds = new Set<string>();
  let imageUrl: string | null = null;
  let videoUrl: string | null = null;
  let nextAssetCursor = input.assetCursor;
  let nextClipCursor = input.clipCursor;

  function addAsset(asset: RenderAsset | undefined) {
    if (!asset || usedAssetIds.has(asset.id) || mediaItems.length >= maxItems) return false;
    usedAssetIds.add(asset.id);
    const media = toMediaInput(asset, input.baseUrl);
    mediaItems.push(media);
    if (asset.type === "clip") videoUrl ??= media.url;
    if (asset.type === "photo") imageUrl ??= media.url;
    return true;
  }

  const sceneAsset = input.sceneAssetId
    ? reusableAssets.find((asset) => asset.id === input.sceneAssetId)
    : undefined;
  addAsset(sceneAsset);

  const alreadyHasClip = mediaItems.some((media) => media.type === "video");
  if (!alreadyHasClip && clipAssets.length > 0) {
    for (let attempts = 0; attempts < clipAssets.length; attempts += 1) {
      const clip = clipAssets[nextClipCursor % clipAssets.length];
      nextClipCursor += 1;
      if (addAsset(clip)) break;
    }
  }

  for (
    let attempts = 0;
    mediaItems.length < maxItems && attempts < reusableAssets.length * 2;
    attempts += 1
  ) {
    const asset = reusableAssets[nextAssetCursor % reusableAssets.length];
    nextAssetCursor += 1;
    addAsset(asset);
  }

  return { mediaItems, imageUrl, videoUrl, nextAssetCursor, nextClipCursor };
}
