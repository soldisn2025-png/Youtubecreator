export interface SceneInput {
  sceneTitle: string;
  captionText: string;
  imageUrl: string | null;
  audioUrl: string | null;
  durationSec: number;
}

export interface VideoProps {
  scenes: SceneInput[];
  introImageUrl: string | null;
  outroImageUrl: string | null;
  projectTitle: string;
  fps: number;
}
