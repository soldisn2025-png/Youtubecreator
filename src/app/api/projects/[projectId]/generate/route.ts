import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server/auth";
import { runFullGeneration } from "@/services/generation";

export const maxDuration = 300;

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { projectId } = await context.params;
    const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const job = await prisma.generationJob.create({
      data: {
        projectId,
        type: "full_generation",
        status: "queued",
        currentStep: "Getting ready to write your script...",
      },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "generating" },
    });

    after(async () => {
      await runFullGeneration(job.id, projectId, userId);
    });

    return NextResponse.json({ job });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Generate route error:", error);
    return NextResponse.json({ error: "Generation could not be started." }, { status: 500 });
  }
}
