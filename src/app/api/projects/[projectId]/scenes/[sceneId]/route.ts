import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server/auth";
import { sceneUpdateSchema } from "@/lib/validation";
import { ensureBossStarted } from "@/services/jobs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string; sceneId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { projectId, sceneId } = await context.params;
    const input = sceneUpdateSchema.parse(await request.json());
    const scene = await prisma.scene.findFirst({
      where: { id: sceneId, projectId, project: { userId } },
    });
    if (!scene) return NextResponse.json({ error: "Scene not found." }, { status: 404 });
    if (["tts_pending", "rendering", "locked"].includes(scene.status)) {
      return NextResponse.json({ error: "This scene is still processing." }, { status: 409 });
    }

    await prisma.sceneRevision.create({
      data: {
        sceneId,
        narrationText: scene.narrationText,
        captionText: scene.captionText,
      },
    });

    const narrationChanged =
      input.narrationText !== undefined && input.narrationText !== scene.narrationText;

    const updated = await prisma.scene.update({
      where: { id: sceneId },
      data: {
        ...input,
        status: narrationChanged ? "tts_pending" : "rendering",
        approvedAt: null,
        generationId: crypto.randomUUID(),
      },
    });

    const job = await prisma.generationJob.create({
      data: {
        projectId,
        sceneId,
        type: "scene_regeneration",
        status: "queued",
        currentStep: narrationChanged
          ? "Updating the voiceover for this scene..."
          : "Updating this scene...",
      },
    });
    const boss = await ensureBossStarted();
    await boss.send("scene-regeneration", { jobId: job.id, projectId, sceneId, userId });

    return NextResponse.json({ scene: updated, job });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Scene could not be updated." }, { status: 400 });
  }
}
