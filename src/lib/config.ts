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

export const appConfig = {
  anthropicModel: optionalEnv("ANTHROPIC_MODEL", "claude-sonnet-4-6"),
  openAiTtsModel: optionalEnv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts"),
  youtubeResearchTtlDays: 7,
  maxRenderConcurrency: Number(optionalEnv("MAX_RENDER_CONCURRENCY", "1")),
};
