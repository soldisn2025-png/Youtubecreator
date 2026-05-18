export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export function optionalNumberEnv(name: string, fallback: number, bounds?: { min?: number; max?: number }): number {
  const raw = process.env[name];
  const parsed = raw == null || raw.trim() === "" ? fallback : Number(raw);
  const value = Number.isFinite(parsed) ? parsed : fallback;
  const min = bounds?.min ?? Number.NEGATIVE_INFINITY;
  const max = bounds?.max ?? Number.POSITIVE_INFINITY;
  return Math.min(max, Math.max(min, value));
}

export const appConfig = {
  anthropicModel: optionalEnv("ANTHROPIC_MODEL", "claude-sonnet-4-6"),
  openAiTtsModel: optionalEnv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts"),
  youtubeResearchTtlDays: 7,
  maxRenderConcurrency: Number(optionalEnv("MAX_RENDER_CONCURRENCY", "1")),
  remotionFunctionName: optionalEnv(
    "REMOTION_FUNCTION_NAME",
    "remotion-render-4-0-460-mem3008mb-disk10240mb-900sec",
  ),
  remotionServeUrl: optionalEnv(
    "REMOTION_SERVE_URL",
    "https://remotionlambda-useast1-tlov7ow10m.s3.us-east-1.amazonaws.com/sites/youtubecreator/index.html",
  ),
  remotionAwsRegion: optionalEnv("REMOTION_AWS_REGION", "us-east-1"),
  remotionFramesPerLambda: optionalNumberEnv("REMOTION_FRAMES_PER_LAMBDA", 1200, { min: 120, max: 3000 }),
  remotionConcurrencyPerLambda: optionalNumberEnv("REMOTION_CONCURRENCY_PER_LAMBDA", 1, { min: 1, max: 8 }),
  remotionTimeoutMs: optionalNumberEnv("REMOTION_TIMEOUT_MS", 840000, { min: 30000, max: 900000 }),
};
