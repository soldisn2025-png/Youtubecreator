import { prisma } from "@/lib/prisma";
import { getYoutubeResearch } from "./youtubeResearch";
import { generateVideoPlan } from "./claude";

export async function runFullGeneration(jobId: string, projectId: string, userId: string) {
  try {
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "running", progressPct: 10, currentStep: "Researching similar videos..." },
    });

    const project = await prisma.project.findFirstOrThrow({
      where: { id: projectId, userId },
      include: { assets: true },
    });

    const research = await getYoutubeResearch(project.topic);

    await prisma.generationJob.update({
      where: { id: jobId },
      data: { progressPct: 35, currentStep: "Writing your script with Claude AI..." },
    });

    const plan = await generateVideoPlan({
      topic: project.topic,
      audience: project.audience,
      tone: project.tone,
      targetLengthMin: project.targetLengthMin,
      callToAction: project.callToAction,
      outline: project.outline,
      youtubeReferences: research.results,
    });

    await prisma.generationJob.update({
      where: { id: jobId },
      data: { progressPct: 75, currentStep: "Saving scenes..." },
    });

    const generatedScript = await prisma.generatedScript.create({
      data: {
        projectId: project.id,
        generationJobId: jobId,
        hookOptions: plan.hookOptions,
        fullNarrationText: plan.scenes.map((s) => s.narrationText).join("\n\n"),
        missingAssetsAdvice: plan.missingAssetsAdvice,
        sensitivityWarnings: plan.sensitivityWarnings,
        titleOptions: plan.titleOptions,
        descriptionDraft: plan.descriptionDraft,
        hashtags: plan.hashtags,
      },
    });

    await prisma.scene.createMany({
      data: plan.scenes.map((scene, index) => ({
        projectId: project.id,
        scriptId: generatedScript.id,
        orderIndex: index,
        sceneTitle: scene.sceneTitle,
        narrationText: scene.narrationText,
        captionText: scene.captionText,
        status: "ready",
        generationId: crypto.randomUUID(),
      })),
    });

    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "complete", progressPct: 100, currentStep: "Done — ready to review!", completedAt: new Date() },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "ready_for_review" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "failed", errorMessage: msg },
    }).catch(() => {});
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "failed" },
    }).catch(() => {});
  }
}
