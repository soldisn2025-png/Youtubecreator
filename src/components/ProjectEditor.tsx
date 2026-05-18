"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import UploadTile from "./UploadTile";
import SceneCard from "./SceneCard";
import GenerationPoller from "./GenerationPoller";
import RenderPoller from "./RenderPoller";

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
interface RenderJob { id: string; status: string; progressPct: number; outputR2Key: string | null; }
type AspectRatio = "vertical_9_16" | "horizontal_16_9";
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
  renderJobs: RenderJob[];
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
    project.status === "generating" && ["queued", "running"].includes(project.jobs[0]?.status)
      ? project.jobs[0].id
      : null
  );
  const [genError, setGenError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const latestRender = project.renderJobs?.[0] ?? null;
  const [renderJobId, setRenderJobId] = useState<string | null>(
    latestRender && ["queued", "running"].includes(latestRender.status) ? latestRender.id : null
  );
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(
    latestRender?.status === "complete" ? `/api/render-jobs/${latestRender.id}/download` : null
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("vertical_9_16");
  const [ytConfirm, setYtConfirm] = useState(false);

  const assetCountByType = (type: string) =>
    project.assets.filter((a) => a.type === type).length;

  const reloadProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${project.id}`);
    if (res.ok) {
      const data = await res.json();
      setProject(data.project);
    }
  }, [project.id]);

  async function startGeneration() {
    setGenError("");
    setGenerating(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/generate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setGenError(data.error ?? "Failed to start generation."); return; }
      setGeneratingJobId(data.job.id);
      setProject((p) => ({ ...p, status: "generating" }));
    } finally {
      setGenerating(false);
    }
  }

  const onGenerationComplete = useCallback(async () => {
    setGeneratingJobId(null);
    await reloadProject();
  }, [reloadProject]);

  const onGenerationFailed = useCallback((msg: string) => {
    setGeneratingJobId(null);
    setGenError(msg);
    setProject((p) => ({ ...p, status: "failed" }));
  }, []);

  function handleAssetUploaded(type: string, assetId: string) {
    setProject((p) => ({
      ...p,
      assets: p.assets.some((asset) => asset.id === assetId)
        ? p.assets
        : [...p.assets, { id: assetId, type }],
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
  const hasUploadedClips = project.assets.some((asset) => asset.type === "clip");

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

  async function startRender() {
    setRenderError("");
    setRendering(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aspectRatio }),
      });
      const data = await res.json();
      if (!res.ok) { setRenderError(data.error ?? "Render failed to start."); return; }
      setRenderJobId(data.renderJobId);
    } finally {
      setRendering(false);
    }
  }

  const onRenderComplete = useCallback((url: string) => {
    setRenderJobId(null);
    setVideoUrl(url);
  }, []);

  const onRenderFailed = useCallback((msg: string) => {
    setRenderJobId(null);
    setRenderError(msg);
  }, []);

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
            {!isLocked && (
              <button className="button-primary" onClick={startGeneration} disabled={generating || !!generatingJobId}>
                {generating ? "Writing script… (20–40s)" : generatingJobId ? "Generating…" : "Create draft"}
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
              <div className="mt-4">
                <label className="field-label">Render format</label>
                <div className="segmented mt-2">
                  <button
                    type="button"
                    className={aspectRatio === "vertical_9_16" ? "segment-active" : ""}
                    onClick={() => setAspectRatio("vertical_9_16")}
                  >
                    Shorts 9:16
                  </button>
                  <button
                    type="button"
                    className={aspectRatio === "horizontal_16_9" ? "segment-active" : ""}
                    onClick={() => setAspectRatio("horizontal_16_9")}
                  >
                    YouTube 16:9
                  </button>
                </div>
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

            {/* Synchronous generation loading state */}
            {generating && (
              <div className="panel space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-[#17201b]">Claude is writing your script…</p>
                  <p className="text-xs text-[#8a9690]">20–40 seconds</p>
                </div>
                <div className="h-2 w-full overflow-hidden bg-[#d9ddd1]">
                  <div className="h-2 w-1/2 animate-[slide_1.4s_ease-in-out_infinite] bg-[#3f6f65]" />
                </div>
                <p className="text-sm text-[#59645d]">Researching your topic and generating scenes…</p>
              </div>
            )}

            {/* Generation poller (polls after sync response returns) */}
            {generatingJobId && !generating && (
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
                      assignedAssetType={
                        project.assets.find((asset) => asset.id === scene.assetId)?.type ?? null
                      }
                      hasUploadedClips={hasUploadedClips}
                      onUpdated={handleSceneUpdated}
                      onAssetUploaded={handleAssetUploaded}
                    />
                  ))}
                </div>
              </div>
            )}

            {project.scenes.length === 0 && !generatingJobId && (
              <div className="panel text-center py-12">
                <p className="font-bold text-[#17201b]">No scenes yet</p>
                <p className="muted mt-1">Click &quot;Create draft&quot; to generate your script and scenes.</p>
              </div>
            )}

            {/* Render panel */}
            {renderJobId && !rendering && (
              <RenderPoller
                renderJobId={renderJobId}
                onComplete={onRenderComplete}
                onFailed={onRenderFailed}
              />
            )}

            {renderError && (
              <div className="panel border-red-300 bg-red-50">
                <p className="text-sm font-semibold text-red-700">{renderError}</p>
                <button className="button-primary mt-3 text-sm" onClick={startRender}>Try again</button>
              </div>
            )}

            {videoUrl && (
              <div className="panel">
                <h2 className="panel-title">Video ready</h2>
                <p className="muted mt-1">Your video has been rendered. Download it below.</p>
                <a href={videoUrl} download className="button-primary mt-4 text-sm inline-flex">
                  Download MP4
                </a>
              </div>
            )}

            {/* Render + Export + Upload — grouped at bottom */}
            <div className="panel space-y-5">
              <div>
                <h2 className="panel-title">Render &amp; export</h2>
                <p className="muted mt-1">Approve all scenes above, then render the video and export the full package.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {allScenesApproved && !renderJobId && (
                  <button className="button-primary" onClick={startRender} disabled={rendering}>
                    {rendering ? "Starting render…" : "Render video"}
                  </button>
                )}
                {!allScenesApproved && (
                  <p className="text-sm text-[#59645d]">Approve all scenes to unlock render and export.</p>
                )}
                {exportError && <p className="text-sm font-semibold text-red-600">{exportError}</p>}
                {project.exports.length > 0 ? (
                  <a
                    href={`/api/projects/${project.id}/exports/${project.exports[0].id}/download`}
                    className="button-secondary text-sm inline-flex"
                    download
                  >
                    Download export ZIP ✓
                  </a>
                ) : (
                  <button
                    className="button-secondary"
                    disabled={!allScenesApproved || exporting}
                    onClick={doExport}
                    title={!allScenesApproved ? "Approve all scenes first" : ""}
                  >
                    {exporting ? "Exporting…" : "Export package"}
                  </button>
                )}
              </div>

              <div className="border-t border-[#d9ddd1] pt-4">
                <h2 className="panel-title">Upload to YouTube</h2>
                <p className="muted mt-1">
                  Download the ZIP, open YouTube Studio, create a new video, and paste in the script, description, and hashtags from the ZIP files.
                </p>
                {!ytConfirm ? (
                  <button
                    className="button-secondary mt-4 text-sm"
                    onClick={() => setYtConfirm(true)}
                  >
                    Open YouTube Studio ↗
                  </button>
                ) : (
                  <div className="mt-4 rounded border border-amber-300 bg-amber-50 p-3 space-y-3">
                    <p className="text-sm font-semibold text-amber-800">
                      You are uploading this draft as-is with no additional edits. Are you sure?
                    </p>
                    <div className="flex gap-2">
                      <a
                        href="https://studio.youtube.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button-primary text-sm inline-flex"
                        onClick={() => setYtConfirm(false)}
                      >
                        Yes, open YouTube Studio
                      </a>
                      <button className="button-secondary text-sm" onClick={() => setYtConfirm(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </section>
        </section>
      </div>
    </main>
  );
}
