import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server/auth";
import { sceneUpdateSchema } from "@/lib/validation";

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
    if (scene.status === "locked") {
      return NextResponse.json({ error: "This scene is locked." }, { status: 409 });
    }

    await prisma.sceneRevision.create({
      data: {
        sceneId,
        narrationText: scene.narrationText,
        captionText: scene.captionText,
      },
    });

    const updated = await prisma.scene.update({
      where: { id: sceneId },
      data: {
        ...input,
        status: "ready",
        approvedAt: null,
        generationId: crypto.randomUUID(),
      },
    });

    return NextResponse.json({ scene: updated });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Scene could not be updated." }, { status: 400 });
  }
}
