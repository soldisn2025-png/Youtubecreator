export type AspectRatio = "vertical_9_16" | "horizontal_16_9";

export interface MediaInput {
  url: string;
  type: "image" | "video";
}

export interface SceneInput {
  sceneTitle: string;
  captionText: string;
  beatCaptions: string[];
  mediaItems: MediaInput[];
  imageUrl: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  durationSec: number;
}

export interface VideoProps {
  scenes: SceneInput[];
  introImageUrl: string | null;
  outroImageUrl: string | null;
  projectTitle: string;
  fps: number;
  aspectRatio: AspectRatio;
}
