import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import ProjectEditor from "@/components/ProjectEditor";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/api/auth/signin");

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id! },
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
