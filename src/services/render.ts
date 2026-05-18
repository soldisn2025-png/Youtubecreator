import { renderMediaOnLambda, getRenderProgress } from "@remotion/lambda/client";
import { prisma } from "@/lib/prisma";
import { generateSpeech } from "./tts";
import { uploadObject } from "./storage";
import { findPexelsVideo } from "./pexels";
import { appConfig, requiredEnv } from "@/lib/config";
import { buildRenderScenes, getRemotionLambdaOptions, type RenderSceneSource } from "./renderPlan";
import type { AspectRatio, MediaInput, VideoProps, SceneInput } from "@/remotion/types";
import type { AwsRegion } from "@remotion/lambda";

function remotionAwsConfig() {
  return {
    region: appConfig.remotionAwsRegion as AwsRegion,
    accessKeyId: requiredEnv("REMOTION_AWS_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("REMOTION_AWS_SECRET_ACCESS_KEY"),
  };
}

async function preflightRenderMediaUrls(scenes: SceneInput[]) {
  const urls = new Set<string>();
  for (const scene of scenes) {
    if (scene.audioUrl) urls.add(scene.audioUrl);
    for (const media of scene.mediaItems) urls.add(media.url);
  }

  await Promise.all(
    Array.from(urls).map(async (url) => {
      try {
        const response = await fetch(url, { method: "HEAD" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`Render media is not reachable: ${url} (${msg})`);
      }
    }),
  );
}

export async function startRender(
  projectId: string,
  userId: string,
  aspectRatio: AspectRatio = "horizontal_16_9",
): Promise<string> {
  const project = await prisma.project.findFirstOrThrow({
    where: { id: projectId, userId },
    include: {
      scenes: { orderBy: { orderIndex: "asc" }, where: { status: "approved" } },
      assets: true,
    },
  });

  const baseUrl = requiredEnv("R2_PUBLIC_BASE_URL").replace(/\/$/, "");

  // Generate TTS for scenes that don't have audio yet
  const scenesForRender: RenderSceneSource[] = [];
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

    scenesForRender.push({
      sceneTitle: scene.sceneTitle,
      captionText: scene.captionText,
      assetId: scene.assetId,
      ttsAudioDurationSec: scene.ttsAudioDurationSec ?? 8,
      audioUrl,
    });
  }

  const sceneInputs = buildRenderScenes({
    scenes: scenesForRender,
    assets: project.assets,
    baseUrl,
  });

  for (let index = 0; index < sceneInputs.length; index += 1) {
    const sceneInput = sceneInputs[index];
    if (sceneInput.mediaItems.length === 0) {
      // No uploaded media: fetch Pexels stock footage and cache in R2
      // (Lambda can't reliably reach Pexels CDN directly, so we proxy through R2).
      const projectScene = project.scenes[index];
      const stockKey = `${userId}/${projectId}/stock/${projectScene.id}.mp4`;
      const pexelsUrl = await findPexelsVideo(sceneInput.sceneTitle);
      if (pexelsUrl) {
        try {
          const resp = await fetch(pexelsUrl);
          if (resp.ok) {
            const buf = Buffer.from(await resp.arrayBuffer());
            await uploadObject({ key: stockKey, body: buf, contentType: "video/mp4" });
            const media: MediaInput = { url: `${baseUrl}/${stockKey}`, type: "video" };
            sceneInput.videoUrl = media.url;
            sceneInput.mediaItems.push(media);
          }
        } catch {
          // Pexels download failed: scene will use gradient background.
        }
      }
    }
  }

  await preflightRenderMediaUrls(sceneInputs);

  const introAsset = project.introAssetId
    ? project.assets.find((a) => a.id === project.introAssetId)
    : null;
  const outroAsset = project.outroAssetId
    ? project.assets.find((a) => a.id === project.outroAssetId)
    : null;

  const videoProps: VideoProps = {
    scenes: sceneInputs,
    introImageUrl: introAsset ? `${baseUrl}/${introAsset.r2Key}` : null,
    outroImageUrl: outroAsset ? `${baseUrl}/${outroAsset.r2Key}` : null,
    projectTitle: project.title,
    fps: 30,
    aspectRatio,
  };

  const cfg = remotionAwsConfig();
  const lambdaOptions = getRemotionLambdaOptions();
  const { renderId, bucketName } = await renderMediaOnLambda({
    region: cfg.region,
    functionName: lambdaOptions.functionName,
    serveUrl: lambdaOptions.serveUrl,
    composition: "YoutubeVideo",
    inputProps: videoProps as unknown as Record<string, unknown>,
    codec: "h264",
    imageFormat: "jpeg",
    framesPerLambda: lambdaOptions.framesPerLambda,
    concurrencyPerLambda: lambdaOptions.concurrencyPerLambda,
    maxRetries: 2,
    privacy: "private",
    downloadBehavior: { type: "download", fileName: "video.mp4" },
    outName: `${projectId}-output.mp4`,
    timeoutInMilliseconds: lambdaOptions.timeoutInMilliseconds,
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
  await prisma.project.update({
    where: { id: projectId },
    data: { status: "rendering" },
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
    functionName: appConfig.remotionFunctionName,
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
