import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server/auth";
import { createProjectSchema } from "@/lib/validation";

export async function GET() {
  try {
    const userId = await requireUserId();
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: { scenes: true, renderJobs: true, exports: true },
    });
    return NextResponse.json({ projects });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Unable to load projects." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const input = createProjectSchema.parse(await request.json());
    const project = await prisma.project.create({
      data: {
        userId,
        title: input.title,
        topic: input.topic,
        audience: input.audience,
        tone: input.tone,
        targetLengthMin: input.targetLengthMin,
        callToAction: input.callToAction,
        ttsVoice: input.ttsVoice,
        outline: input.outline,
      },
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Project could not be created." }, { status: 400 });
  }
}
