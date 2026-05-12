import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server/auth";

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string; sceneId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { projectId, sceneId } = await context.params;
    const scene = await prisma.scene.findFirst({
      where: { id: sceneId, projectId, project: { userId } },
    });
    if (!scene) return NextResponse.json({ error: "Scene not found." }, { status: 404 });
    if (scene.status !== "ready" && scene.status !== "approved") {
      return NextResponse.json({ error: "Only ready scenes can be approved." }, { status: 409 });
    }
    const approved = await prisma.scene.update({
      where: { id: sceneId },
      data: { status: "approved", approvedAt: new Date() },
    });
    return NextResponse.json({ scene: approved });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Scene could not be approved." }, { status: 500 });
  }
}
