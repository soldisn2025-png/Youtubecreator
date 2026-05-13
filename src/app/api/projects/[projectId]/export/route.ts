import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server/auth";
import { formatChapters } from "@/services/chapters";
import { createExportZip } from "@/services/exportZip";
import { uploadObject } from "@/services/storage";

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { projectId } = await context.params;
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        scenes: { orderBy: { orderIndex: "asc" } },
        scripts: { orderBy: { version: "desc" }, take: 1 },
      },
    });
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    if (project.scenes.some((scene) => scene.status !== "approved")) {
      return NextResponse.json({ error: "Approve all scenes before exporting." }, { status: 409 });
    }
    const script = project.scripts[0];
    const chapters = formatChapters(
      project.scenes.map((scene) => ({
        sceneTitle: scene.sceneTitle,
        durationSec: scene.ttsAudioDurationSec ?? 0,
      })),
    );
    const description = `${chapters}\n\n${script?.descriptionDraft ?? ""}`;
    const scriptText = project.scenes
      .map((scene) => `${scene.orderIndex + 1}. ${scene.sceneTitle}\n${scene.narrationText}`)
      .join("\n\n");
    const zip = await createExportZip([
      { name: "description.txt", content: description },
      { name: "title_options.txt", content: JSON.stringify(script?.titleOptions ?? [], null, 2) },
      { name: "hashtags.txt", content: JSON.stringify(script?.hashtags ?? [], null, 2) },
      { name: "narration_script.txt", content: scriptText },
      {
        name: "missing_assets.txt",
        content: JSON.stringify(script?.missingAssetsAdvice ?? [], null, 2),
      },
    ]);
    const zipKey = `${userId}/${projectId}/exports/${Date.now()}-export.zip`;
    await uploadObject({ key: zipKey, body: zip, contentType: "application/zip" });
    const exportPackage = await prisma.exportPackage.create({
      data: {
        projectId,
        approvedByUserId: userId,
        approvedAt: new Date(),
        titleOptions: script?.titleOptions ?? [],
        descriptionText: description,
        hashtags: script?.hashtags ?? [],
        scriptText,
        missingAssetsChecklist: script?.missingAssetsAdvice ?? [],
        zipR2Key: zipKey,
      },
    });
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "exported", finalApprovedAt: new Date(), finalApprovedByUserId: userId },
    });
    return NextResponse.json({ exportPackage });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Export could not be created." }, { status: 500 });
  }
}
