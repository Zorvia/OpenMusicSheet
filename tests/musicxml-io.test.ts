import { describe, it, expect } from "vitest";
import {
  createScore,
  addNote,
  scoreToMusicXML,
  parseMusicXML,
} from "../src/core";

describe("MusicXML I/O", () => {
  it("exports a score to valid MusicXML", () => {
    let score = createScore("Round Trip Test");
    score = addNote(score, 0, 0, "C", 4, "quarter");
    score = addNote(score, 0, 0, "E", 4, "quarter");
    score = addNote(score, 0, 0, "G", 4, "quarter");

    const xml = scoreToMusicXML(score);
    expect(xml).toContain("<?xml");
    expect(xml).toContain("score-partwise");
    expect(xml).toContain("Round Trip Test");
    expect(xml).toContain("<step>C</step>");
    expect(xml).toContain("<step>E</step>");
    expect(xml).toContain("<step>G</step>");
  });

  it("parses MusicXML back to a score", () => {
    let score = createScore("Parse Test");
    score = addNote(score, 0, 0, "D", 5, "half");
    score.metadata.composer = "Test Composer";

    const xml = scoreToMusicXML(score);
    const parsed = parseMusicXML(xml);

    expect(parsed.metadata.title).toBe("Parse Test");
    expect(parsed.metadata.composer).toBe("Test Composer");
    expect(parsed.staves).toHaveLength(1);
    expect(parsed.staves[0].measures[0].elements.length).toBeGreaterThan(0);
  });

  it("round-trips notes preserving pitch and duration", () => {
    let score = createScore("Fidelity Test");
    score = addNote(score, 0, 0, "A", 4, "quarter");
    score = addNote(score, 0, 0, "B", 3, "half");

    const xml = scoreToMusicXML(score);
    const parsed = parseMusicXML(xml);

    const elements = parsed.staves[0].measures[0].elements;
    expect(elements).toHaveLength(2);

    const first = elements[0];
    expect(first.type).toBe("note");
    if (first.type === "note") {
      expect(first.pitch).toBe("A");
      expect(first.octave).toBe(4);
      expect(first.duration).toBe("quarter");
    }

    const second = elements[1];
    expect(second.type).toBe("note");
    if (second.type === "note") {
      expect(second.pitch).toBe("B");
      expect(second.octave).toBe(3);
      expect(second.duration).toBe("half");
    }
  });

  it("preserves time signature in round-trip", () => {
    let score = createScore("TS Test");
    score.defaultTimeSignature = { beats: 3, beatType: 4 };

    const xml = scoreToMusicXML(score);
    const parsed = parseMusicXML(xml);

    expect(parsed.defaultTimeSignature.beats).toBe(3);
    expect(parsed.defaultTimeSignature.beatType).toBe(4);
  });

  it("preserves key signature in round-trip", () => {
    let score = createScore("KS Test");
    score.defaultKeySignature = { fifths: 2, mode: "major" };

    const xml = scoreToMusicXML(score);
    const parsed = parseMusicXML(xml);

    expect(parsed.defaultKeySignature.fifths).toBe(2);
    expect(parsed.defaultKeySignature.mode).toBe("major");
  });

  it("preserves tempo in round-trip", () => {
    let score = createScore("Tempo Test");
    score.defaultTempo = 144;

    const xml = scoreToMusicXML(score);
    const parsed = parseMusicXML(xml);

    expect(parsed.defaultTempo).toBe(144);
  });

  it("handles multiple staves", () => {
    let score = createScore("Multi Staff");
    score.staves.push({
      id: "test-bass",
      name: "Bass",
      shortName: "Bas",
      clef: "bass",
      measures: score.staves[0].measures.map((m) => ({
        ...m,
        id: m.id + "_bass",
        elements: [],
      })),
      muted: false,
      solo: false,
      volume: 100,
      instrument: "Bass",
      midiChannel: 1,
      midiProgram: 0,
    });

    const xml = scoreToMusicXML(score);
    const parsed = parseMusicXML(xml);

    expect(parsed.staves).toHaveLength(2);
    expect(parsed.staves[1].name).toBe("Bass");
  });
});
