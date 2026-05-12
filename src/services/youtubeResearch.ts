import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { appConfig } from "@/lib/config";

export async function getYoutubeResearch(keyword: string) {
  const normalized = keyword.trim().toLowerCase();
  const cached = await prisma.youtubeResearch.findUnique({
    where: { keyword: normalized },
  });

  if (cached && cached.expiresAt > new Date()) {
    return { source: "cache" as const, results: cached.results };
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return {
      source: "fallback" as const,
      results: [],
      notice: "YouTube research is skipped until YOUTUBE_API_KEY is configured.",
    };
  }

  try {
    const youtube = google.youtube({ version: "v3", auth: apiKey });
    const response = await youtube.search.list({
      part: ["snippet"],
      q: normalized,
      type: ["video"],
      maxResults: 8,
      videoDuration: "medium",
      safeSearch: "strict",
    });
    const results = (response.data.items ?? []).map((item) => ({
      videoId: item.id?.videoId,
      title: item.snippet?.title,
      description: item.snippet?.description,
      channelTitle: item.snippet?.channelTitle,
      publishedAt: item.snippet?.publishedAt,
      thumbnailUrl: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.default?.url,
    }));
    const expiresAt = new Date(Date.now() + appConfig.youtubeResearchTtlDays * 24 * 60 * 60 * 1000);

    await prisma.youtubeResearch.upsert({
      where: { keyword: normalized },
      create: { keyword: normalized, expiresAt, results },
      update: { fetchedAt: new Date(), expiresAt, results },
    });

    return { source: "api" as const, results };
  } catch (error) {
    return {
      source: "fallback" as const,
      results: cached?.results ?? [],
      notice: "Using saved references because YouTube research is unavailable.",
      error: error instanceof Error ? error.message : "Unknown YouTube API error",
    };
  }
}
