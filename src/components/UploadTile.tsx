"use client";

import { useRef, useState } from "react";
import { uploadProjectAsset } from "@/lib/client/uploadAsset";

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
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const allowMultiple = type === "photo" || type === "clip";

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setError("");
    setUploading(true);
    setUploadProgress({ current: 0, total: files.length });
    let uploadedCount = 0;

    try {
      for (const [index, file] of files.entries()) {
        setUploadProgress({ current: index + 1, total: files.length });
        const data = await uploadProjectAsset({ projectId, file, type });
        uploadedCount += 1;
        onUploaded(data.asset.id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      setError(uploadedCount > 0 ? `${uploadedCount} uploaded. ${message}` : message);
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const accept = type === "clip" ? "video/mp4,video/quicktime" : "image/jpeg,image/png";
  const uploadingLabel = uploadProgress
    ? `Uploading ${uploadProgress.current}/${uploadProgress.total}...`
    : "Uploading...";

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
        <span className="upload-icon">{uploading ? "..." : "+"}</span>
        {uploading ? uploadingLabel : label}
      </button>
      {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={allowMultiple}
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
