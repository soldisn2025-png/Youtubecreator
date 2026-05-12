import OpenAI from "openai";
import { appConfig, requiredEnv } from "@/lib/config";

export async function generateSpeech(input: {
  text: string;
  voice: string;
}): Promise<Buffer> {
  const client = new OpenAI({ apiKey: requiredEnv("OPENAI_API_KEY") });
  const response = await client.audio.speech.create({
    model: appConfig.openAiTtsModel,
    voice: input.voice,
    input: input.text,
    response_format: "mp3",
  });
  return Buffer.from(await response.arrayBuffer());
}
