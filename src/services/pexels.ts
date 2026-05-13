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

    // Prefer HD landscape MP4, fall back to any MP4
    const mp4Files = video.video_files.filter((f) => f.file_type === "video/mp4");
    const hd = mp4Files
      .filter((f) => f.width >= 1280 && f.height <= f.width)
      .sort((a, b) => b.width - a.width)[0];

    return hd?.link ?? mp4Files[0]?.link ?? null;
  } catch {
    return null;
  }
}
