import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server/auth";
import { downloadObject } from "@/services/storage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string; exportId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { projectId, exportId } = await context.params;
    const exportPkg = await prisma.exportPackage.findFirst({
      where: { id: exportId, projectId, project: { userId } },
    });
    if (!exportPkg?.zipR2Key) return new Response("Not found", { status: 404 });
    const buffer = await downloadObject(exportPkg.zipR2Key);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="export-${projectId}.zip"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return new Response("Error", { status: 500 });
  }
}
