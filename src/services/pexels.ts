export async function findPexelsVideo(query: string): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
      { headers: { Authorization: apiKey } },
    );
    if (!res.ok) return null;

    const data = await res.json() as {
      videos?: Array<{
        video_files: Array<{ width: number; height: number; link: string; file_type: string; quality: string }>;
      }>;
    };

    const video = data.videos?.[0];
    if (!video) return null;

    // Prefer medium quality (854–1280px wide) to keep file size manageable for download
    const mp4Files = video.video_files.filter(
      (f) => f.file_type === "video/mp4" && f.width >= f.height, // landscape only
    );
    const medium = mp4Files
      .filter((f) => f.width >= 854 && f.width <= 1280)
      .sort((a, b) => a.width - b.width)[0]; // smallest that meets minimum

    return medium?.link ?? mp4Files.sort((a, b) => a.width - b.width)[0]?.link ?? null;
  } catch {
    return null;
  }
}
