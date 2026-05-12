export function formatChapters(
  scenes: { sceneTitle: string; durationSec: number }[],
  introDurationSec = 5,
  outroTitle = "Closing",
) {
  let cursor = 0;
  const lines = [`${formatTimestamp(cursor)} Introduction`];
  cursor += introDurationSec;
  for (const scene of scenes) {
    lines.push(`${formatTimestamp(cursor)} ${scene.sceneTitle}`);
    cursor += scene.durationSec;
  }
  lines.push(`${formatTimestamp(cursor)} ${outroTitle}`);
  return lines.join("\n");
}

function formatTimestamp(totalSeconds: number) {
  const rounded = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
