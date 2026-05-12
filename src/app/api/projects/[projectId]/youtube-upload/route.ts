import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requiredEnv } from "@/lib/config";
import { requireUserId } from "@/lib/server/auth";
import { downloadObject } from "@/services/storage";
import { uploadPrivateYoutubeVideo } from "@/services/youtubeUpload";

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { projectId } = await context.params;
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId, finalApprovedAt: { not: null } },
      include: {
        exports: { orderBy: { createdAt: "desc" }, take: 1 },
        renderJobs: { where: { status: "complete" }, orderBy: { completedAt: "desc" }, take: 1 },
      },
    });
    if (!project) {
      return NextResponse.json({ error: "Approve and export this project before upload." }, { status: 409 });
    }
    const connection = await prisma.youtubeConnection.findUnique({ where: { userId } });
    if (!connection || connection.revokedAt) {
      return NextResponse.json({ error: "Connect a YouTube channel before upload." }, { status: 409 });
    }
    const render = project.renderJobs[0];
    const exportPackage = project.exports[0];
    if (!render?.outputR2Key || !exportPackage) {
      return NextResponse.json({ error: "Final video or export package is missing." }, { status: 409 });
    }

    const upload = await prisma.youtubeUpload.create({
      data: { projectId, exportId: exportPackage.id, uploadStatus: "uploading" },
    });
    const video = await downloadObject(render.outputR2Key);
    const videoId = await uploadPrivateYoutubeVideo({
      encryptedRefreshToken: connection.encryptedRefreshToken,
      clientId: requiredEnv("GOOGLE_CLIENT_ID"),
      clientSecret: requiredEnv("GOOGLE_CLIENT_SECRET"),
      redirectUri: `${requiredEnv("NEXTAUTH_URL")}/api/auth/callback/google`,
      video,
      title: String((exportPackage.titleOptions as string[])[0] ?? project.title),
      description: exportPackage.descriptionText,
      tags: exportPackage.hashtags as string[],
    });
    const completed = await prisma.youtubeUpload.update({
      where: { id: upload.id },
      data: { uploadStatus: "uploaded", youtubeVideoId: videoId, uploadedAt: new Date() },
    });
    await prisma.project.update({ where: { id: projectId }, data: { status: "uploaded_private" } });
    return NextResponse.json({ upload: completed });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Private YouTube upload failed." }, { status: 500 });
  }
}
