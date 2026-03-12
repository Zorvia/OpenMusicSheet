import { describe, it, expect } from "vitest";
import {
  createScore,
  addNote,
  scoreToMidi,
} from "../src/core";

describe("MIDI Converter", () => {
  it("converts a score to MIDI events", () => {
    let score = createScore("MIDI Test");
    score = addNote(score, 0, 0, "C", 4, "quarter", 80);
    score = addNote(score, 0, 0, "E", 4, "quarter", 80);
    score = addNote(score, 0, 0, "G", 4, "quarter", 80);

    const midi = scoreToMidi(score);

    expect(midi.ticksPerBeat).toBe(480);
    expect(midi.tracks.length).toBeGreaterThan(0);

    const noteTrack = midi.tracks.find((t) => t.name !== "Tempo");
    expect(noteTrack).toBeDefined();

    const noteOns = noteTrack!.events.filter((e) => e.type === "noteOn");
    const noteOffs = noteTrack!.events.filter((e) => e.type === "noteOff");

    expect(noteOns).toHaveLength(3);
    expect(noteOffs).toHaveLength(3);
  });

  it("includes tempo track", () => {
    const score = createScore("Tempo MIDI Test");
    score.defaultTempo = 140;

    const midi = scoreToMidi(score);

    const tempoTrack = midi.tracks.find((t) => t.name === "Tempo");
    expect(tempoTrack).toBeDefined();

    const tempoEvent = tempoTrack!.events.find((e) => e.type === "tempo");
    expect(tempoEvent).toBeDefined();
    expect(tempoEvent!.tempo).toBe(140);
  });

  it("calculates correct MIDI pitches", () => {
    let score = createScore("Pitch Test");
    score = addNote(score, 0, 0, "C", 4, "quarter", 80);
    score = addNote(score, 0, 0, "A", 4, "quarter", 80);

    const midi = scoreToMidi(score);
    const noteTrack = midi.tracks.find((t) => t.name !== "Tempo")!;
    const noteOns = noteTrack.events.filter((e) => e.type === "noteOn");

    expect(noteOns[0].pitch).toBe(60);
    expect(noteOns[1].pitch).toBe(69);
  });

  it("schedules events at correct tick positions", () => {
    let score = createScore("Timing Test");
    score = addNote(score, 0, 0, "C", 4, "quarter", 80);
    score = addNote(score, 0, 0, "D", 4, "quarter", 80);

    const midi = scoreToMidi(score);
    const noteTrack = midi.tracks.find((t) => t.name !== "Tempo")!;
    const noteOns = noteTrack.events.filter((e) => e.type === "noteOn");

    expect(noteOns[0].tick).toBe(0);
    expect(noteOns[1].tick).toBe(480);
  });

  it("skips muted staves", () => {
    let score = createScore("Mute Test");
    score = addNote(score, 0, 0, "C", 4);
    score.staves[0].muted = true;

    const midi = scoreToMidi(score);
    const noteTrack = midi.tracks.find((t) => t.name !== "Tempo");
    expect(noteTrack).toBeUndefined();
  });

  it("includes program change events", () => {
    let score = createScore("Program Test");
    score.staves[0].midiProgram = 40;
    score = addNote(score, 0, 0, "C", 4);

    const midi = scoreToMidi(score);
    const noteTrack = midi.tracks.find((t) => t.name !== "Tempo")!;
    const programChange = noteTrack.events.find(
      (e) => e.type === "programChange"
    );
    expect(programChange).toBeDefined();
    expect(programChange!.program).toBe(40);
  });
});
