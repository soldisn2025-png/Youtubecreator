import { renderMediaOnLambda, getRenderProgress } from "@remotion/lambda/client";
import { prisma } from "@/lib/prisma";
import { generateSpeech } from "./tts";
import { uploadObject, downloadObject } from "./storage";
import { requiredEnv, optionalEnv } from "@/lib/config";
import type { VideoProps, SceneInput } from "@/remotion/types";

const FUNCTION_NAME = "remotion-render-4-0-460-mem3008mb-disk10240mb-900sec";
const SERVE_URL = "https://remotionlambda-useast1-tlov7ow10m.s3.us-east-1.amazonaws.com/sites/youtubecreator/index.html";
const REGION = "us-east-1" as const;

function remotionAwsConfig() {
  return {
    region: REGION,
    accessKeyId: requiredEnv("REMOTION_AWS_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("REMOTION_AWS_SECRET_ACCESS_KEY"),
  };
}

export async function startRender(projectId: string, userId: string): Promise<string> {
  const project = await prisma.project.findFirstOrThrow({
    where: { id: projectId, userId },
    include: {
      scenes: { orderBy: { orderIndex: "asc" }, where: { status: "approved" } },
      assets: true,
    },
  });

  // Generate TTS for scenes that don't have audio yet
  const sceneInputs: SceneInput[] = [];
  for (const scene of project.scenes) {
    let audioUrl: string | null = null;

    if (!scene.ttsAudioR2Key) {
      const voice = project.ttsVoice ?? "nova";
      const audioBuffer = await generateSpeech({ text: scene.narrationText, voice });
      const audioKey = `${userId}/${projectId}/audio/scene-${scene.id}.mp3`;
      await uploadObject({ key: audioKey, body: audioBuffer, contentType: "audio/mpeg" });

      const durationSec = audioBuffer.length / (128 * 1024 / 8); // rough estimate at 128kbps
      await prisma.scene.update({
        where: { id: scene.id },
        data: { ttsAudioR2Key: audioKey, ttsAudioDurationSec: durationSec },
      });

      audioUrl = `${requiredEnv("R2_PUBLIC_BASE_URL").replace(/\/$/, "")}/${audioKey}`;
    } else {
      audioUrl = `${requiredEnv("R2_PUBLIC_BASE_URL").replace(/\/$/, "")}/${scene.ttsAudioR2Key}`;
    }

    // Find the asset linked to this scene
    const assetForScene = scene.assetId
      ? project.assets.find((a) => a.id === scene.assetId)
      : null;
    const imageUrl = assetForScene
      ? `${requiredEnv("R2_PUBLIC_BASE_URL").replace(/\/$/, "")}/${assetForScene.r2Key}`
      : null;

    sceneInputs.push({
      sceneTitle: scene.sceneTitle,
      captionText: scene.captionText,
      imageUrl,
      audioUrl,
      durationSec: scene.ttsAudioDurationSec ?? 8,
    });
  }

  const introAsset = project.introAssetId
    ? project.assets.find((a) => a.id === project.introAssetId)
    : null;
  const outroAsset = project.outroAssetId
    ? project.assets.find((a) => a.id === project.outroAssetId)
    : null;
  const baseUrl = requiredEnv("R2_PUBLIC_BASE_URL").replace(/\/$/, "");

  const videoProps: VideoProps = {
    scenes: sceneInputs,
    introImageUrl: introAsset ? `${baseUrl}/${introAsset.r2Key}` : null,
    outroImageUrl: outroAsset ? `${baseUrl}/${outroAsset.r2Key}` : null,
    projectTitle: project.title,
    fps: 30,
  };

  const cfg = remotionAwsConfig();
  const { renderId, bucketName } = await renderMediaOnLambda({
    region: cfg.region,
    functionName: FUNCTION_NAME,
    serveUrl: SERVE_URL,
    composition: "YoutubeVideo",
    inputProps: videoProps as unknown as Record<string, unknown>,
    codec: "h264",
    imageFormat: "jpeg",
    maxRetries: 1,
    privacy: "private",
    downloadBehavior: { type: "download", fileName: "video.mp4" },
    outName: `${projectId}-output.mp4`,
    timeoutInMilliseconds: 300000,
  });

  // Create render job record
  const renderJob = await prisma.renderJob.create({
    data: {
      projectId,
      status: "running",
      remotionRenderId: renderId,
      remotionBucketName: bucketName,
    },
  });

  return renderJob.id;
}

export async function pollRender(renderJobId: string): Promise<{
  done: boolean;
  progress: number;
  outputUrl?: string;
  error?: string;
}> {
  const renderJob = await prisma.renderJob.findFirstOrThrow({ where: { id: renderJobId } });

  if (renderJob.status === "complete") {
    return { done: true, progress: 100, outputUrl: renderJob.outputR2Key ?? undefined };
  }
  if (renderJob.status === "failed") {
    return { done: true, progress: 0, error: renderJob.errorMessage ?? "Render failed" };
  }

  const cfg = remotionAwsConfig();
  const progress = await getRenderProgress({
    renderId: renderJob.remotionRenderId!,
    bucketName: renderJob.remotionBucketName!,
    functionName: FUNCTION_NAME,
    region: cfg.region,
  });

  if (progress.fatalErrorEncountered) {
    await prisma.renderJob.update({
      where: { id: renderJobId },
      data: { status: "failed", errorMessage: progress.errors?.[0]?.message ?? "Render failed" },
    });
    return { done: true, progress: 0, error: progress.errors?.[0]?.message ?? "Render failed" };
  }

  if (progress.done && progress.outputFile) {
    await prisma.renderJob.update({
      where: { id: renderJobId },
      data: {
        status: "complete",
        outputR2Key: progress.outputFile, // raw S3 URL from Lambda
        completedAt: new Date(),
        progressPct: 100,
      },
    });
    await prisma.project.update({
      where: { id: renderJob.projectId },
      data: { status: "approved" },
    });
    // Return our own download endpoint — the raw S3 URL is private
    return { done: true, progress: 100, outputUrl: `/api/render-jobs/${renderJobId}/download` };
  }

  const pct = Math.round((progress.overallProgress ?? 0) * 100);
  await prisma.renderJob.update({
    where: { id: renderJobId },
    data: { progressPct: pct },
  });
  return { done: false, progress: pct };
}
