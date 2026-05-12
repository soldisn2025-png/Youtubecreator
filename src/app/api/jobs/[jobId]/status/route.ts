import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server/auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { jobId } = await context.params;
    const job = await prisma.generationJob.findFirst({
      where: { id: jobId, project: { userId } },
    });
    if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
    return NextResponse.json({
      status: job.status,
      progressPct: job.progressPct,
      currentStep: job.currentStep,
      error: job.errorMessage,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Job status unavailable." }, { status: 500 });
  }
}
