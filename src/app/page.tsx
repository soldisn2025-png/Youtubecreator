import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import NewProjectForm from "@/components/NewProjectForm";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  generating: "Generating",
  ready_for_review: "Ready for review",
  rendering: "Rendering",
  approved: "Approved",
  exported: "Exported",
  uploaded_private: "Uploaded",
  failed: "Failed",
};

const STATUS_PILL: Record<string, string> = {
  draft: "pill-good",
  generating: "pill-warn",
  ready_for_review: "pill-good",
  rendering: "pill-warn",
  approved: "pill-good",
  exported: "pill-good",
  uploaded_private: "pill-good",
  failed: "pill-warn",
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id! },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-[#f6f7f2] text-[#17201b]">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 lg:px-8">
        <header className="flex items-center justify-between border-b border-[#d9ddd1] pb-5 mb-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#3f6f65]">
              YouTube Creator
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-[#17201b]">Your projects</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#59645d]">{session.user.email}</span>
            <Link href="/api/auth/signout" className="button-secondary text-sm">
              Sign out
            </Link>
          </div>
        </header>

        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-[#59645d]">
            {projects.length === 0
              ? "No projects yet"
              : `${projects.length} project${projects.length === 1 ? "" : "s"}`}
          </p>
          <NewProjectForm />
        </div>

        {projects.length === 0 ? (
          <div className="panel flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-bold text-[#17201b]">No projects yet</p>
            <p className="mt-2 text-sm text-[#59645d]">
              Create your first project to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div key={project.id} className="panel flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold text-[#17201b] leading-snug">{project.title}</h2>
                  <span className={STATUS_PILL[project.status] ?? "pill-good"}>
                    {STATUS_LABELS[project.status] ?? project.status}
                  </span>
                </div>
                <p className="text-sm text-[#59645d] line-clamp-2">{project.topic}</p>
                <p className="text-xs text-[#8a9690]">
                  {new Date(project.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <Link href={`/projects/${project.id}`} className="button-primary mt-auto text-center text-sm">
                  Open
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
