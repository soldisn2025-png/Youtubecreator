import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server/auth";
import { startRender } from "@/services/render";

export const maxDuration = 300;

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { projectId } = await context.params;

    const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });

    const approvedCount = await prisma.scene.count({
      where: { projectId, status: "approved" },
    });
    if (approvedCount === 0) {
      return NextResponse.json({ error: "Approve at least one scene before rendering." }, { status: 409 });
    }

    // Cancel any in-progress renders
    await prisma.renderJob.updateMany({
      where: { projectId, status: { in: ["queued", "running"] } },
      data: { status: "failed", errorMessage: "Superseded by new render." },
    });

    const renderJobId = await startRender(projectId, userId);
    return NextResponse.json({ renderJobId });
  } catch (error) {
    if (error instanceof Response) return error;
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Render route error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
