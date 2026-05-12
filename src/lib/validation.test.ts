import { describe, expect, it } from "vitest";
import { createProjectSchema } from "./validation";

const validProject = {
  title: "ABA parent guide",
  topic: "Helping with transitions",
  audience: "Parents",
  tone: "Warm and practical",
  targetLengthMin: 3,
  callToAction: "Ask your care team about one goal to practice this week.",
  ttsVoice: "nova",
  outline: "Explain transitions. Give a home example. Encourage questions.",
};

describe("createProjectSchema", () => {
  it("accepts the 3 minute video setup", () => {
    expect(createProjectSchema.parse(validProject).targetLengthMin).toBe(3);
  });

  it("rejects unsupported target lengths", () => {
    expect(() =>
      createProjectSchema.parse({ ...validProject, targetLengthMin: 7 }),
    ).toThrow();
  });
});
