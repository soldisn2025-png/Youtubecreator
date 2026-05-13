import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server/auth";
import { downloadObject } from "@/services/storage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { assetId } = await context.params;
    const asset = await prisma.asset.findFirst({ where: { id: assetId, userId } });
    if (!asset) return new Response("Not found", { status: 404 });
    const buffer = await downloadObject(asset.r2Key);
    return new Response(buffer, {
      headers: {
        "Content-Type": asset.mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Error", { status: 500 });
  }
}
