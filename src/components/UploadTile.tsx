"use client";

import { useRef, useState } from "react";

interface Props {
  label: string;
  type: "photo" | "clip" | "intro_image" | "outro_image";
  projectId: string;
  count?: number;
  onUploaded: (assetId: string) => void;
}

export default function UploadTile({ label, type, projectId, count = 0, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      const res = await fetch(`/api/projects/${projectId}/assets`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      onUploaded(data.asset.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const accept = type === "clip" ? "video/mp4,video/quicktime" : "image/jpeg,image/png";

  return (
    <div>
      <button
        type="button"
        className="upload-tile w-full relative"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {count > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center bg-[#3f6f65] text-white text-xs font-bold">
            {count}
          </span>
        )}
        <span className="upload-icon">{uploading ? "…" : "+"}</span>
        {uploading ? "Uploading…" : label}
      </button>
      {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
