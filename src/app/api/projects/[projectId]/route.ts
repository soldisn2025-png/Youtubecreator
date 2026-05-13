import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server/auth";

export async function GET(
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
        assets: true,
        jobs: { orderBy: { createdAt: "desc" }, take: 1 },
        scripts: { orderBy: { version: "desc" }, take: 1 },
        exports: { orderBy: { createdAt: "desc" }, take: 1 },
        renderJobs: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Unable to load project." }, { status: 500 });
  }
}
