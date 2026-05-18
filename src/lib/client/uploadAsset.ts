type AssetType = "photo" | "clip" | "intro_image" | "outro_image";

const DIRECT_UPLOAD_THRESHOLD_BYTES = 3.5 * 1024 * 1024;

export async function uploadProjectAsset(input: {
  projectId: string;
  file: File;
  type: AssetType;
}): Promise<{ asset: { id: string; type: AssetType } }> {
  if (input.file.size > DIRECT_UPLOAD_THRESHOLD_BYTES) {
    return uploadDirect(input);
  }

  const fd = new FormData();
  fd.append("file", input.file);
  fd.append("type", input.type);
  const res = await fetch(`/api/projects/${input.projectId}/assets`, {
    method: "POST",
    body: fd,
  });
  return parseJsonResponse(res, "Upload failed.");
}

async function uploadDirect(input: {
  projectId: string;
  file: File;
  type: AssetType;
}): Promise<{ asset: { id: string; type: AssetType } }> {
  const presignRes = await fetch(`/api/projects/${input.projectId}/assets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "presign",
      type: input.type,
      filename: input.file.name,
      contentType: input.file.type,
      fileSizeBytes: input.file.size,
    }),
  });
  const presign = await parseJsonResponse(presignRes, "Could not prepare upload.");

  let uploadRes: Response;
  try {
    uploadRes = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": input.file.type },
      body: input.file,
    });
  } catch {
    throw new Error("Upload failed: could not reach storage. Ensure the R2 bucket CORS policy allows PUT from this origin.");
  }
  if (!uploadRes.ok) {
    throw new Error("Upload failed: storage rejected the file. Check R2 bucket CORS settings and try again.");
  }

  const completeRes = await fetch(`/api/projects/${input.projectId}/assets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "complete",
      type: input.type,
      filename: input.file.name,
      contentType: input.file.type,
      fileSizeBytes: input.file.size,
      key: presign.key,
    }),
  });
  return parseJsonResponse(completeRes, "Could not finish upload.");
}

async function parseJsonResponse(res: Response, fallback: string) {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? fallback);
    return data;
  }

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    if (res.status === 413 || text.toLowerCase().includes("request entity too large")) {
      throw new Error("This file is too large for the server upload path. Try a shorter clip or use direct upload.");
    }
    throw new Error(text.trim() || fallback);
  }
  throw new Error(fallback);
}
