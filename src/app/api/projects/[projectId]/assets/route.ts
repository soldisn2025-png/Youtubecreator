import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server/auth";
import { uploadObject } from "@/services/storage";

const imageTypes = new Set(["image/jpeg", "image/png"]);
const clipTypes = new Set(["video/mp4", "video/quicktime"]);

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { projectId } = await context.params;
    const project = await prisma.project.findFirst({ where: { id: projectId, userId } });
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const type = String(formData.get("type") ?? "photo");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
    }

    const validationError = validateUpload(file, type);
    const key = `${userId}/${projectId}/assets/${crypto.randomUUID()}-${file.name}`;
    if (!validationError) {
      await uploadObject({
        key,
        body: Buffer.from(await file.arrayBuffer()),
        contentType: file.type,
      });
    }

    const asset = await prisma.asset.create({
      data: {
        projectId,
        userId,
        type: type as "photo" | "clip" | "intro_image" | "outro_image",
        originalFilename: file.name,
        r2Key: key,
        fileSizeBytes: file.size,
        mimeType: file.type,
        validationStatus: validationError ? "rejected" : "valid",
        validationError,
      },
    });

    if (type === "intro_image") {
      await prisma.project.update({ where: { id: projectId }, data: { introAssetId: asset.id } });
    }
    if (type === "outro_image") {
      await prisma.project.update({ where: { id: projectId }, data: { outroAssetId: asset.id } });
    }

    return NextResponse.json({ asset }, { status: validationError ? 400 : 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}

function validateUpload(file: File, type: string) {
  if (type === "clip") {
    if (!clipTypes.has(file.type)) return "Clips must be MP4 or MOV files.";
    if (file.size > 200 * 1024 * 1024) return "Clips must be 200MB or smaller.";
    return null;
  }
  if (!imageTypes.has(file.type)) return "Images must be JPG or PNG files.";
  if (file.size > 20 * 1024 * 1024) return "Images must be 20MB or smaller.";
  return null;
}
