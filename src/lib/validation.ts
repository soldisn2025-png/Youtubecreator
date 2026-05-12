import { z } from "zod";

export const createProjectSchema = z.object({
  title: z.string().min(2).max(120),
  topic: z.string().min(3).max(200),
  audience: z.string().min(2).max(120),
  tone: z.string().min(2).max(80),
  targetLengthMin: z.coerce.number().int().refine((value) => value === 3 || value === 5),
  callToAction: z.string().min(2).max(200),
  ttsVoice: z.enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]).default("nova"),
  outline: z.string().min(10).max(12000),
});

export const sceneUpdateSchema = z.object({
  narrationText: z.string().min(1).max(5000).optional(),
  captionText: z.string().min(1).max(1000).optional(),
  sceneTitle: z.string().min(1).max(120).optional(),
  assetId: z.string().nullable().optional(),
});
