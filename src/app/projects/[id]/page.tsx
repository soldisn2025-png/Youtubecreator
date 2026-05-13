import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server/auth";
import ProjectEditor from "@/components/ProjectEditor";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await requireUserId();
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, userId },
    include: {
      scenes: { orderBy: { orderIndex: "asc" } },
      assets: true,
      jobs: { orderBy: { createdAt: "desc" }, take: 1 },
      scripts: { orderBy: { version: "desc" }, take: 1 },
      exports: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!project) notFound();

  return <ProjectEditor initialProject={project} />;
}
