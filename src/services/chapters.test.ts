import { describe, expect, it } from "vitest";
import { formatChapters } from "./chapters";

describe("formatChapters", () => {
  it("starts at 00:00 and accumulates scene durations", () => {
    const chapters = formatChapters([
      { sceneTitle: "First skill", durationSec: 42.2 },
      { sceneTitle: "Home example", durationSec: 55.8 },
    ]);

    expect(chapters).toContain("00:00 Introduction");
    expect(chapters).toContain("00:05 First skill");
    expect(chapters).toContain("00:47 Home example");
    expect(chapters).toContain("01:43 Closing");
  });
});
