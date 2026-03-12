import { describe, it, expect } from "vitest";
import {
  createScore,
  addNote,
  serializeProject,
  deserializeProject,
} from "../src/core";

describe("Project File", () => {
  it("serializes and deserializes a score", () => {
    let score = createScore("Project Test");
    score = addNote(score, 0, 0, "C", 4, "quarter");
    score.metadata.composer = "Test Composer";

    const json = serializeProject(score);
    const parsed = JSON.parse(json);

    expect(parsed.format).toBe("OpenSheetMusic");
    expect(parsed.version).toBe("1.0");

    const restored = deserializeProject(json);
    expect(restored.metadata.title).toBe("Project Test");
    expect(restored.metadata.composer).toBe("Test Composer");
    expect(restored.staves[0].measures[0].elements).toHaveLength(1);
  });

  it("rejects invalid project files", () => {
    expect(() => deserializeProject("{}")).toThrow("Invalid project file format");
    expect(() => deserializeProject('{"format":"other"}')).toThrow(
      "Invalid project file format"
    );
  });

  it("preserves full score structure through serialization", () => {
    let score = createScore("Full Test");
    score = addNote(score, 0, 0, "E", 5, "half");
    score = addNote(score, 0, 1, "G", 3, "eighth");
    score.defaultTempo = 160;
    score.defaultTimeSignature = { beats: 6, beatType: 8 };

    const json = serializeProject(score);
    const restored = deserializeProject(json);

    expect(restored.defaultTempo).toBe(160);
    expect(restored.defaultTimeSignature).toEqual({ beats: 6, beatType: 8 });
    expect(restored.staves[0].measures[0].elements).toHaveLength(1);
    expect(restored.staves[0].measures[1].elements).toHaveLength(1);
  });
});
