"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import UploadTile from "./UploadTile";
import SceneCard from "./SceneCard";
import GenerationPoller from "./GenerationPoller";

interface Asset { id: string; type: string; }
interface Scene {
  id: string;
  sceneTitle: string;
  narrationText: string;
  captionText: string;
  ttsAudioDurationSec: number | null;
  status: string;
  assetId: string | null;
}
interface Job { id: string; status: string; currentStep: string | null; progressPct: number; }
interface ExportPkg { id: string; zipR2Key: string | null; }
interface Project {
  id: string;
  title: string;
  topic: string;
  audience: string;
  tone: string;
  ttsVoice: string;
  targetLengthMin: number;
  callToAction: string;
  outline: string;
  status: string;
  introAssetId: string | null;
  outroAssetId: string | null;
  scenes: Scene[];
  assets: Asset[];
  jobs: Job[];
  exports: ExportPkg[];
}

const STEPS = ["Upload notes", "Add media", "Create draft", "Review scenes", "Export"];

const STEP_FOR_STATUS: Record<string, number> = {
  draft: 2,
  generating: 2,
  ready_for_review: 3,
  rendering: 3,
  approved: 3,
  exported: 4,
  uploaded_private: 4,
  failed: 2,
};

const VOICE_LABELS: Record<string, string> = {
  nova: "Warm female", onyx: "Clear male", shimmer: "Calm narrator",
  alloy: "Alloy", echo: "Echo", fable: "Fable",
};

export default function ProjectEditor({ initialProject }: { initialProject: Project }) {
  const [project, setProject] = useState(initialProject);
  const [generatingJobId, setGeneratingJobId] = useState<string | null>(
    project.status === "generating" && project.jobs[0]?.status === "running"
      ? project.jobs[0].id
      : null
  );
  const [genError, setGenError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const assetCountByType = (type: string) =>
    project.assets.filter((a) => a.type === type).length;

  async function reloadProject() {
    const res = await fetch(`/api/projects/${project.id}`);
    if (res.ok) {
      const data = await res.json();
      setProject(data.project);
    }
  }

  async function startGeneration() {
    setGenError("");
    const res = await fetch(`/api/projects/${project.id}/generate`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) { setGenError(data.error ?? "Failed to start generation."); return; }
    setGeneratingJobId(data.job.id);
    setProject((p) => ({ ...p, status: "generating" }));
  }

  const onGenerationComplete = useCallback(async () => {
    setGeneratingJobId(null);
    await reloadProject();
  }, [project.id]);

  const onGenerationFailed = useCallback((msg: string) => {
    setGeneratingJobId(null);
    setGenError(msg);
    setProject((p) => ({ ...p, status: "failed" }));
  }, []);

  function handleAssetUploaded(type: string, assetId: string) {
    setProject((p) => ({
      ...p,
      assets: [...p.assets, { id: assetId, type }],
      introAssetId: type === "intro_image" ? assetId : p.introAssetId,
      outroAssetId: type === "outro_image" ? assetId : p.outroAssetId,
    }));
  }

  function handleSceneUpdated(updated: Scene) {
    setProject((p) => ({
      ...p,
      scenes: p.scenes.map((s) => (s.id === updated.id ? updated : s)),
    }));
  }

  const allScenesApproved =
    project.scenes.length > 0 && project.scenes.every((s) => s.status === "approved");

  async function doExport() {
    setExportError("");
    setExporting(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/export`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Export failed.");
      setProject((p) => ({ ...p, status: "exported", exports: [data.exportPackage, ...p.exports] }));
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  const activeStep = STEP_FOR_STATUS[project.status] ?? 2;
  const isLocked = !["draft", "failed"].includes(project.status);

  return (
    <main className="min-h-screen bg-[#f6f7f2] text-[#17201b]">
      <div className="mx-auto w-full max-w-7xl px-4 py-5 md:px-6 lg:px-8">

        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-[#d9ddd1] pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#3f6f65]">
              <Link href="/" className="hover:underline">← Projects</Link>
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#17201b] md:text-4xl">
              {project.title}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/api/auth/signout" className="button-secondary text-sm">Sign out</Link>
            {!isLocked && (
              <button className="button-primary" onClick={startGeneration} disabled={!!generatingJobId}>
                {generatingJobId ? "Generating…" : "Create draft"}
              </button>
            )}
          </div>
        </header>

        <section className="mt-6 grid gap-5 lg:grid-cols-[360px_1fr]">

          {/* Left panel */}
          <aside className="space-y-4">
            <div className="panel space-y-1">
              <div className="flex items-center justify-between">
                <h2 className="panel-title">1. Start here</h2>
              </div>

              <label className="field-label">Topic</label>
              <p className="text-sm text-[#17201b] font-medium">{project.topic}</p>

              <label className="field-label">Audience</label>
              <p className="text-sm text-[#17201b]">{project.audience}</p>

              <label className="field-label">Outline</label>
              <p className="text-sm text-[#17201b] whitespace-pre-line">{project.outline}</p>

              <label className="field-label">Call to action</label>
              <p className="text-sm text-[#17201b]">{project.callToAction}</p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <UploadTile
                  label="Photos"
                  type="photo"
                  projectId={project.id}
                  count={assetCountByType("photo")}
                  onUploaded={(id) => handleAssetUploaded("photo", id)}
                />
                <UploadTile
                  label="Clips"
                  type="clip"
                  projectId={project.id}
                  count={assetCountByType("clip")}
                  onUploaded={(id) => handleAssetUploaded("clip", id)}
                />
                <UploadTile
                  label="Intro image"
                  type="intro_image"
                  projectId={project.id}
                  count={project.introAssetId ? 1 : 0}
                  onUploaded={(id) => handleAssetUploaded("intro_image", id)}
                />
                <UploadTile
                  label="Outro image"
                  type="outro_image"
                  projectId={project.id}
                  count={project.outroAssetId ? 1 : 0}
                  onUploaded={(id) => handleAssetUploaded("outro_image", id)}
                />
              </div>
            </div>

            <div className="panel">
              <h2 className="panel-title">2. Video settings</h2>
              <div className="mt-3 space-y-1 text-sm">
                <p><span className="font-bold">Duration:</span> {project.targetLengthMin} min</p>
                <p><span className="font-bold">Voice:</span> {VOICE_LABELS[project.ttsVoice] ?? project.ttsVoice}</p>
                <p><span className="font-bold">Tone:</span> {project.tone}</p>
              </div>
            </div>
          </aside>

          {/* Right panel */}
          <section className="space-y-5">

            {/* Draft progress */}
            <div className="panel">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="panel-title">Draft progress</h2>
                  <p className="muted">The app writes the script, creates voiceover, renders scenes, and waits for your approval.</p>
                </div>
                <span className="pill-warn">Human review required</span>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-5">
                {STEPS.map((step, i) => (
                  <div
                    key={step}
                    className="step"
                    style={i <= activeStep ? { background: "#e7f5ec", borderColor: "#a7c9b8" } : {}}
                  >
                    <span style={i <= activeStep ? { background: "#1f5a3c" } : {}}>{i + 1}</span>
                    {step}
                  </div>
                ))}
              </div>
            </div>

            {/* Generation poller */}
            {generatingJobId && (
              <GenerationPoller
                jobId={generatingJobId}
                onComplete={onGenerationComplete}
                onFailed={onGenerationFailed}
              />
            )}

            {genError && (
              <div className="panel border-red-300 bg-red-50">
                <p className="text-sm font-semibold text-red-700">{genError}</p>
                <button className="button-primary mt-3 text-sm" onClick={startGeneration}>
                  Try again
                </button>
              </div>
            )}

            {/* Scene editor */}
            {project.scenes.length > 0 && (
              <div className="panel">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="panel-title">Scene editor</h2>
                    <p className="muted">Edit one scene at a time. Approve all scenes to unlock export.</p>
                  </div>
                </div>
                <div className="mt-5 space-y-3">
                  {project.scenes.map((scene, i) => (
                    <SceneCard
                      key={scene.id}
                      scene={scene}
                      index={i}
                      projectId={project.id}
                      onUpdated={handleSceneUpdated}
                    />
                  ))}
                </div>
              </div>
            )}

            {project.scenes.length === 0 && !generatingJobId && (
              <div className="panel text-center py-12">
                <p className="font-bold text-[#17201b]">No scenes yet</p>
                <p className="muted mt-1">Click "Create draft" to generate your script and scenes.</p>
              </div>
            )}

            {/* Export & upload */}
            <div className="grid gap-5 md:grid-cols-2">
              <div className="panel">
                <h2 className="panel-title">Export package</h2>
                <p className="muted mt-1">
                  Includes final video, title ideas, description with chapters, hashtags, script, and missing media notes.
                </p>
                {exportError && <p className="mt-2 text-sm font-semibold text-red-600">{exportError}</p>}
                {project.exports.length > 0 ? (
                  <p className="mt-3 text-sm font-bold text-[#1f5a3c]">Export complete ✓</p>
                ) : (
                  <button
                    className="button-primary mt-4"
                    disabled={!allScenesApproved || exporting}
                    onClick={doExport}
                    title={!allScenesApproved ? "Approve all scenes first" : ""}
                  >
                    {exporting ? "Exporting…" : "Export after approval"}
                  </button>
                )}
              </div>
              <div className="panel">
                <h2 className="panel-title">Private YouTube upload</h2>
                <p className="muted mt-1">
                  Optional. Uploads as private only after final approval so you can publish manually in YouTube Studio.
                </p>
                <button
                  className="button-secondary mt-4"
                  disabled={project.exports.length === 0}
                  title={project.exports.length === 0 ? "Export first" : ""}
                >
                  {project.exports.length === 0 ? "Locked until approved" : "Upload to YouTube"}
                </button>
              </div>
            </div>

          </section>
        </section>
      </div>
    </main>
  );
}
