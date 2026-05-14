import type { AspectRatio } from "./types";

export function getCanvasSize(aspectRatio: AspectRatio): { width: number; height: number } {
  return aspectRatio === "vertical_9_16"
    ? { width: 1080, height: 1920 }
    : { width: 1920, height: 1080 };
}

export function parseAspectRatio(value: unknown): AspectRatio {
  return value === "vertical_9_16" ? "vertical_9_16" : "horizontal_16_9";
}

export function getBeatCount(durationSec: number): number {
  if (durationSec <= 0) return 1;
  return Math.max(1, Math.min(6, Math.ceil(durationSec / 5)));
}

export function splitCaptionIntoBeats(captionText: string, beatCount: number): string[] {
  const clean = captionText.replace(/\s+/g, " ").trim();
  if (!clean) return Array.from({ length: beatCount }, () => "");

  const sentences = clean.match(/[^.!?]+[.!?]?/g)?.map((s) => s.trim()).filter(Boolean) ?? [clean];
  if (sentences.length >= beatCount) {
    return sentences.slice(0, beatCount - 1).concat(sentences.slice(beatCount - 1).join(" "));
  }

  const words = clean.split(" ");
  const wordsPerBeat = Math.ceil(words.length / beatCount);
  return Array.from({ length: beatCount }, (_, index) =>
    words.slice(index * wordsPerBeat, (index + 1) * wordsPerBeat).join(" "),
  ).filter(Boolean);
}
