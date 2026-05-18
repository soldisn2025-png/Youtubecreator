"use client";

import { useState, useRef } from "react";
import { uploadProjectAsset } from "@/lib/client/uploadAsset";

interface Scene {
  id: string;
  sceneTitle: string;
  narrationText: string;
  captionText: string;
  ttsAudioDurationSec: number | null;
  status: string;
  assetId: string | null;
}

interface Props {
  scene: Scene;
  index: number;
  projectId: string;
  assignedAssetType: string | null;
  hasUploadedClips: boolean;
  onUpdated: (scene: Scene) => void;
  onAssetUploaded: (type: string, assetId: string) => void;
}

const STATUS_PILL: Record<string, string> = {
  idle: "pill-warn",
  tts_pending: "pill-warn",
  rendering: "pill-warn",
  ready: "pill-good",
  locked: "pill-good",
  error: "pill-warn",
  approved: "pill-good",
};

const STATUS_LABEL: Record<string, string> = {
  idle: "Idle",
  tts_pending: "Processing audio",
  rendering: "Rendering",
  ready: "Ready",
  locked: "Locked",
  error: "Error",
  approved: "Approved",
};

function fmtDuration(sec: number | null) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function SceneCard({
  scene: initial,
  index,
  projectId,
  assignedAssetType,
  hasUploadedClips,
  onUpdated,
  onAssetUploaded,
}: Props) {
  const [scene, setScene] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [narration, setNarration] = useState(initial.narrationText);
  const [caption, setCaption] = useState(initial.captionText);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [swapping, setSwapping] = useState(false);

  async function saveEdit() {
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/scenes/${scene.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ narrationText: narration, captionText: caption }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed.");
      const updated = { ...scene, ...data.scene };
      setScene(updated);
      onUpdated(updated);
      setEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function approve() {
    setError("");
    setApproving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/scenes/${scene.id}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Approval failed.");
      const updated = { ...scene, ...data.scene };
      setScene(updated);
      onUpdated(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setApproving(false);
    }
  }

  async function swapMedia(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSwapping(true);
    setError("");
    try {
      const uploadData = await uploadProjectAsset({
        projectId,
        file,
        type: file.type.startsWith("video/") ? "clip" : "photo",
      });
      onAssetUploaded(uploadData.asset.type, uploadData.asset.id);

      const patchRes = await fetch(`/api/projects/${projectId}/scenes/${scene.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: uploadData.asset.id }),
      });
      const patchData = await patchRes.json();
      if (!patchRes.ok) throw new Error(patchData.error ?? "Swap failed.");
      const updated = { ...scene, ...patchData.scene, assetId: uploadData.asset.id };
      setScene(updated);
      onUpdated(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Swap failed.");
    } finally {
      setSwapping(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const isPending = ["tts_pending", "rendering"].includes(scene.status);

  return (
    <div className={`scene-card${isPending ? " scene-card--pending" : ""}`}>
      <div className="scene-thumb">
        {scene.assetId && assignedAssetType === "clip" ? (
          <video
            src={`/api/assets/${scene.assetId}`}
            className="h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        ) : scene.assetId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/assets/${scene.assetId}`}
            alt={scene.sceneTitle}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs text-white/70">No media</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="scene-heading">
          <h3>{index + 1}. {scene.sceneTitle}</h3>
          <span className={STATUS_PILL[scene.status] ?? "pill-warn"}>
            {STATUS_LABEL[scene.status] ?? scene.status}
          </span>
        </div>

        {editing ? (
          <div className="mt-3 space-y-2">
            <label className="field-label">Narration</label>
            <textarea
              className="field min-h-[80px]"
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
            />
            <label className="field-label">Caption</label>
            <textarea
              className="field min-h-[48px]"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
            <div className="flex gap-2 mt-2">
              <button className="button-primary text-sm" onClick={saveEdit} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
              <button className="button-secondary text-sm" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="caption-line">{scene.captionText}</p>
        )}

        {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}

        {!editing && (
          <div className="scene-actions">
            {scene.ttsAudioDurationSec && <span>{fmtDuration(scene.ttsAudioDurationSec)}</span>}
            {scene.assetId && (
              <span>{assignedAssetType === "clip" ? "Assigned clip" : "Assigned photo"}</span>
            )}
            {assignedAssetType !== "clip" && hasUploadedClips && (
              <span>Render includes uploaded clips</span>
            )}
            <button onClick={() => setEditing(true)}>Edit words</button>
            <button onClick={() => fileRef.current?.click()} disabled={swapping}>
              {swapping ? "Swapping…" : "Swap media"}
            </button>
            <button
              onClick={approve}
              disabled={approving || scene.status === "approved" || !["ready", "idle", "rendering", "error"].includes(scene.status)}
            >
              {approving ? "Approving…" : scene.status === "approved" ? "Approved ✓" : "Approve"}
            </button>
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/jpeg,image/png,video/mp4,video/quicktime" className="hidden" onChange={swapMedia} />
      </div>
    </div>
  );
}
