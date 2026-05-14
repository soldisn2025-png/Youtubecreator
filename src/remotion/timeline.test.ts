import { describe, expect, it } from "vitest";
import { getBeatCount, getCanvasSize, parseAspectRatio, splitCaptionIntoBeats } from "./timeline";

describe("render timeline helpers", () => {
  it("selects vertical and horizontal canvas sizes", () => {
    expect(getCanvasSize("vertical_9_16")).toEqual({ width: 1080, height: 1920 });
    expect(getCanvasSize("horizontal_16_9")).toEqual({ width: 1920, height: 1080 });
  });

  it("defaults unknown aspect ratio input to horizontal", () => {
    expect(parseAspectRatio("vertical_9_16")).toBe("vertical_9_16");
    expect(parseAspectRatio("nonsense")).toBe("horizontal_16_9");
    expect(parseAspectRatio(undefined)).toBe("horizontal_16_9");
  });

  it("keeps visual beats in a short-draft range", () => {
    expect(getBeatCount(4)).toBe(1);
    expect(getBeatCount(14)).toBe(3);
    expect(getBeatCount(60)).toBe(6);
  });

  it("splits captions into readable beat chunks", () => {
    expect(splitCaptionIntoBeats("First tip. Second tip. Third tip.", 2)).toEqual([
      "First tip.",
      "Second tip. Third tip.",
    ]);
  });
});
