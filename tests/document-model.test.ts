import { describe, it, expect } from "vitest";
import {
  createScore,
  createNote,
  createRest,
  createMeasure,
  createStaff,
  cloneScore,
  durationToTicks,
  pitchToMidi,
  midiToPitch,
  durationToBeats,
} from "../src/core/document-model";

describe("Document Model", () => {
  it("creates a score with defaults", () => {
    const score = createScore("Test Score");
    expect(score.metadata.title).toBe("Test Score");
    expect(score.staves).toHaveLength(1);
    expect(score.defaultTempo).toBe(120);
    expect(score.defaultTimeSignature).toEqual({ beats: 4, beatType: 4 });
    expect(score.defaultKeySignature).toEqual({ fifths: 0, mode: "major" });
  });

  it("creates a note with correct properties", () => {
    const note = createNote("C", 4, "quarter", 80);
    expect(note.type).toBe("note");
    expect(note.pitch).toBe("C");
    expect(note.octave).toBe(4);
    expect(note.duration).toBe("quarter");
    expect(note.velocity).toBe(80);
    expect(note.dotted).toBe(false);
  });

  it("creates a rest", () => {
    const rest = createRest("half");
    expect(rest.type).toBe("rest");
    expect(rest.duration).toBe("half");
  });

  it("creates a staff with initial measures", () => {
    const staff = createStaff("Piano", "treble");
    expect(staff.name).toBe("Piano");
    expect(staff.clef).toBe("treble");
    expect(staff.measures).toHaveLength(4);
    expect(staff.muted).toBe(false);
  });

  it("calculates duration to ticks correctly", () => {
    expect(durationToTicks("whole", false)).toBe(1920);
    expect(durationToTicks("half", false)).toBe(960);
    expect(durationToTicks("quarter", false)).toBe(480);
    expect(durationToTicks("eighth", false)).toBe(240);
    expect(durationToTicks("quarter", true)).toBe(720);
  });

  it("converts pitch to MIDI number", () => {
    expect(pitchToMidi("C", 4)).toBe(60);
    expect(pitchToMidi("A", 4)).toBe(69);
    expect(pitchToMidi("C", 5)).toBe(72);
  });

  it("converts MIDI number to pitch", () => {
    const result = midiToPitch(60);
    expect(result.pitch).toBe("C");
    expect(result.octave).toBe(4);
  });

  it("clones a score deeply", () => {
    const original = createScore("Clone Test");
    const clone = cloneScore(original);
    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
    clone.metadata.title = "Modified";
    expect(original.metadata.title).toBe("Clone Test");
  });

  it("calculates duration to beats", () => {
    expect(durationToBeats("quarter", false)).toBe(1);
    expect(durationToBeats("half", false)).toBe(2);
    expect(durationToBeats("whole", false)).toBe(4);
  });
});
