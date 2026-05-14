import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server/auth";
import { createUploadUrl, uploadObject } from "@/services/storage";

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

    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = await request.json();
      if (body.mode === "presign") {
        const type = String(body.type ?? "photo");
        const filename = String(body.filename ?? "upload");
        const contentType = String(body.contentType ?? "");
        const fileSizeBytes = Number(body.fileSizeBytes ?? 0);
        const validationError = validateUploadMeta({ contentType, fileSizeBytes }, type);
        if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

        const key = `${userId}/${projectId}/assets/${crypto.randomUUID()}-${safeFilename(filename)}`;
        const uploadUrl = await createUploadUrl({ key, contentType });
        return NextResponse.json({ uploadUrl, key });
      }

      if (body.mode === "complete") {
        const type = String(body.type ?? "photo");
        const filename = String(body.filename ?? "upload");
        const contentType = String(body.contentType ?? "");
        const fileSizeBytes = Number(body.fileSizeBytes ?? 0);
        const key = String(body.key ?? "");
        const validationError = validateUploadMeta({ contentType, fileSizeBytes }, type);
        if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
        if (!key.startsWith(`${userId}/${projectId}/assets/`)) {
          return NextResponse.json({ error: "Upload key is invalid." }, { status: 400 });
        }

        const asset = await createAssetRecord({
          projectId,
          userId,
          type,
          filename,
          key,
          fileSizeBytes,
          contentType,
        });
        return NextResponse.json({ asset }, { status: 201 });
      }

      return NextResponse.json({ error: "Unsupported upload request." }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const type = String(formData.get("type") ?? "photo");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
    }

    const validationError = validateUploadMeta({ contentType: file.type, fileSizeBytes: file.size }, type);
    const key = `${userId}/${projectId}/assets/${crypto.randomUUID()}-${safeFilename(file.name)}`;
    if (!validationError) {
      await uploadObject({
        key,
        body: Buffer.from(await file.arrayBuffer()),
        contentType: file.type,
      });
    }

    const asset = await createAssetRecord({
      projectId,
      userId,
      type,
      filename: file.name,
      key,
      fileSizeBytes: file.size,
      contentType: file.type,
      validationError,
    });

    return NextResponse.json({ asset }, { status: validationError ? 400 : 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}

function validateUploadMeta(file: { contentType: string; fileSizeBytes: number }, type: string) {
  if (type === "clip") {
    if (!clipTypes.has(file.contentType)) return "Clips must be MP4 or MOV files.";
    if (file.fileSizeBytes > 200 * 1024 * 1024) return "Clips must be 200MB or smaller.";
    return null;
  }
  if (!imageTypes.has(file.contentType)) return "Images must be JPG or PNG files.";
  if (file.fileSizeBytes > 20 * 1024 * 1024) return "Images must be 20MB or smaller.";
  return null;
}

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120) || "upload";
}

async function createAssetRecord(input: {
  projectId: string;
  userId: string;
  type: string;
  filename: string;
  key: string;
  fileSizeBytes: number;
  contentType: string;
  validationError?: string | null;
}) {
  const asset = await prisma.asset.create({
    data: {
      projectId: input.projectId,
      userId: input.userId,
      type: input.type as "photo" | "clip" | "intro_image" | "outro_image",
      originalFilename: input.filename,
      r2Key: input.key,
      fileSizeBytes: input.fileSizeBytes,
      mimeType: input.contentType,
      validationStatus: input.validationError ? "rejected" : "valid",
      validationError: input.validationError ?? null,
    },
  });

  if (input.type === "intro_image") {
    await prisma.project.update({ where: { id: input.projectId }, data: { introAssetId: asset.id } });
  }
  if (input.type === "outro_image") {
    await prisma.project.update({ where: { id: input.projectId }, data: { outroAssetId: asset.id } });
  }

  return asset;
}
