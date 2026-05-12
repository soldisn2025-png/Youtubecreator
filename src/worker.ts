import { prisma } from "@/lib/prisma";
import { ensureBossStarted } from "@/services/jobs";
import { getYoutubeResearch } from "@/services/youtubeResearch";
import { generateVideoPlan } from "@/services/claude";

async function main() {
  const boss = await ensureBossStarted();

  await boss.work("full-generation", async ([job]) => {
    const data = job.data as { jobId: string; projectId: string; userId: string };
    await prisma.generationJob.update({
      where: { id: data.jobId },
      data: { status: "running", progressPct: 10, currentStep: "Researching similar videos..." },
    });
    const project = await prisma.project.findFirstOrThrow({
      where: { id: data.projectId, userId: data.userId },
      include: { assets: true },
    });
    const research = await getYoutubeResearch(`${project.topic} autism ABA`);
    await prisma.generationJob.update({
      where: { id: data.jobId },
      data: { progressPct: 35, currentStep: "Writing your script..." },
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
    const generatedScript = await prisma.generatedScript.create({
      data: {
        projectId: project.id,
        generationJobId: data.jobId,
        hookOptions: plan.hookOptions,
        fullNarrationText: plan.scenes.map((scene) => scene.narrationText).join("\n\n"),
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
        status: "idle",
        generationId: crypto.randomUUID(),
      })),
    });
    await prisma.generationJob.update({
      where: { id: data.jobId },
      data: {
        status: "complete",
        progressPct: 100,
        currentStep: "Done - ready to review!",
        completedAt: new Date(),
      },
    });
    await prisma.project.update({
      where: { id: project.id },
      data: { status: "ready_for_review" },
    });
  });

  await boss.work("scene-regeneration", async ([job]) => {
    const data = job.data as { jobId: string; sceneId: string };
    await prisma.generationJob.update({
      where: { id: data.jobId },
      data: { status: "running", progressPct: 40, currentStep: "Updating this scene..." },
    });
    await prisma.scene.update({
      where: { id: data.sceneId },
      data: { status: "ready" },
    });
    await prisma.generationJob.update({
      where: { id: data.jobId },
      data: { status: "complete", progressPct: 100, completedAt: new Date() },
    });
  });

  console.log("YouTube Creator worker is listening for jobs.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
