import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { appConfig, requiredEnv } from "@/lib/config";

const scenePlanSchema = z.object({
  sceneTitle: z.string(),
  narrationText: z.string(),
  captionText: z.string(),
  missingAssetAdvice: z.string().optional(),
});

export const generatedPlanSchema = z.object({
  hookOptions: z.array(z.string()).min(1),
  scenes: z.array(scenePlanSchema).min(3),
  missingAssetsAdvice: z.array(z.string()),
  sensitivityWarnings: z.array(z.string()),
  titleOptions: z.array(z.string()).min(1),
  descriptionDraft: z.string(),
  hashtags: z.array(z.string()),
});

export type GeneratedVideoPlan = z.infer<typeof generatedPlanSchema>;

export async function generateVideoPlan(input: {
  topic: string;
  audience: string;
  tone: string;
  targetLengthMin: number;
  callToAction: string;
  outline: string;
  youtubeReferences: unknown;
}): Promise<GeneratedVideoPlan> {
  const client = new Anthropic({ apiKey: requiredEnv("ANTHROPIC_API_KEY") });
  const message = await client.messages.create({
    model: appConfig.anthropicModel,
    max_tokens: 3000,
    system:
      "You are a careful educational video producer for autism and ABA content. Write parent-friendly, non-diagnostic, non-medical content. Return strict JSON only.",
    messages: [
      {
        role: "user",
        content: `Create a ${input.targetLengthMin}-minute 16:9 YouTube video plan.

Topic: ${input.topic}
Audience: ${input.audience}
Tone: ${input.tone}
Call to action: ${input.callToAction}
Outline:
${input.outline}

Similar video references:
${JSON.stringify(input.youtubeReferences).slice(0, 12000)}

Return JSON matching this shape:
{
  "hookOptions": ["..."],
  "scenes": [
    {
      "sceneTitle": "...",
      "narrationText": "...",
      "captionText": "...",
      "missingAssetAdvice": "..."
    }
  ],
  "missingAssetsAdvice": ["..."],
  "sensitivityWarnings": ["..."],
  "titleOptions": ["..."],
  "descriptionDraft": "...",
  "hashtags": ["#ABA", "#Autism"]
}`,
      },
    ],
  });

  const raw = message.content
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
  const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  const parsed = JSON.parse(text);
  return generatedPlanSchema.parse(parsed);
}
