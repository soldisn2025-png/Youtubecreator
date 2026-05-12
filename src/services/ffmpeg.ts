import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath ?? "ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(stderr || `FFmpeg exited with code ${code}`));
      }
    });
  });
}

export async function renderImageScene(input: {
  imagePath: string;
  audioPath: string;
  outputPath: string;
  caption: string;
  durationSec: number;
}) {
  await runFfmpeg([
    "-y",
    "-loop",
    "1",
    "-t",
    String(input.durationSec),
    "-i",
    input.imagePath,
    "-i",
    input.audioPath,
    "-vf",
    `scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,drawtext=text='${escapeDrawText(input.caption)}':fontcolor=white:fontsize=48:box=1:boxcolor=black@0.55:boxborderw=18:x=(w-text_w)/2:y=h-170`,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    input.outputPath,
  ]);
}

export async function assembleVideo(input: {
  scenePaths: string[];
  outputPath: string;
}) {
  const listPath = `${input.outputPath}.txt`;
  const { writeFile } = await import("fs/promises");
  await writeFile(
    listPath,
    input.scenePaths.map((scene) => `file '${scene.replace(/\\/g, "/")}'`).join("\n"),
  );
  await runFfmpeg([
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-c",
    "copy",
    input.outputPath,
  ]);
}

function escapeDrawText(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}
