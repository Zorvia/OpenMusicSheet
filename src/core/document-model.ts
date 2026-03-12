import { v4 as uuidv4 } from "uuid";

export type NoteDuration =
  | "whole"
  | "half"
  | "quarter"
  | "eighth"
  | "16th"
  | "32nd";

export type Clef = "treble" | "bass" | "alto" | "tenor";

export type Accidental = "sharp" | "flat" | "natural" | "double-sharp" | "double-flat";

export type Articulation =
  | "staccato"
  | "accent"
  | "tenuto"
  | "marcato"
  | "fermata";

export type Dynamic =
  | "ppp"
  | "pp"
  | "p"
  | "mp"
  | "mf"
  | "f"
  | "ff"
  | "fff"
  | "sfz";

export interface NoteElement {
  id: string;
  type: "note";
  pitch: string;
  octave: number;
  duration: NoteDuration;
  dotted: boolean;
  accidental?: Accidental;
  tied?: boolean;
  articulations: Articulation[];
  dynamics?: Dynamic;
  lyrics?: string;
  graceNote?: boolean;
  tuplet?: { actual: number; normal: number };
  beamGroup?: string;
  slurStart?: boolean;
  slurEnd?: boolean;
  chordSymbol?: string;
  velocity: number;
}

export interface RestElement {
  id: string;
  type: "rest";
  duration: NoteDuration;
  dotted: boolean;
}

export interface ChordElement {
  id: string;
  type: "chord";
  notes: Omit<NoteElement, "id" | "type" | "duration" | "dotted">[];
  duration: NoteDuration;
  dotted: boolean;
  articulations: Articulation[];
  dynamics?: Dynamic;
  lyrics?: string;
  velocity: number;
}

export type MeasureElement = NoteElement | RestElement | ChordElement;

export interface TimeSignature {
  beats: number;
  beatType: number;
}

export interface KeySignature {
  fifths: number;
  mode: "major" | "minor";
}

export interface Measure {
  id: string;
  elements: MeasureElement[];
  timeSignature?: TimeSignature;
  keySignature?: KeySignature;
  clef?: Clef;
  tempo?: number;
  rehearsalMark?: string;
  repeatStart?: boolean;
  repeatEnd?: boolean;
  repeatCount?: number;
  voltaNumber?: number;
  barlineEnd?: "regular" | "double" | "final";
}

export interface Staff {
  id: string;
  name: string;
  shortName: string;
  clef: Clef;
  measures: Measure[];
  muted: boolean;
  solo: boolean;
  volume: number;
  instrument: string;
  midiChannel: number;
  midiProgram: number;
}

export interface ScoreMetadata {
  title: string;
  composer: string;
  arranger: string;
  copyright: string;
  createdAt: string;
  modifiedAt: string;
}

export interface Score {
  id: string;
  version: string;
  metadata: ScoreMetadata;
  staves: Staff[];
  defaultTempo: number;
  defaultTimeSignature: TimeSignature;
  defaultKeySignature: KeySignature;
}

export function createId(): string {
  return uuidv4();
}

export function createNote(
  pitch: string,
  octave: number,
  duration: NoteDuration = "quarter",
  velocity: number = 80
): NoteElement {
  return {
    id: createId(),
    type: "note",
    pitch,
    octave,
    duration,
    dotted: false,
    articulations: [],
    velocity,
  };
}

export function createRest(duration: NoteDuration = "quarter"): RestElement {
  return {
    id: createId(),
    type: "rest",
    duration,
    dotted: false,
  };
}

export function createChord(
  notes: Omit<NoteElement, "id" | "type" | "duration" | "dotted">[],
  duration: NoteDuration = "quarter",
  velocity: number = 80
): ChordElement {
  return {
    id: createId(),
    type: "chord",
    notes,
    duration,
    dotted: false,
    articulations: [],
    velocity,
  };
}

export function createMeasure(): Measure {
  return {
    id: createId(),
    elements: [],
  };
}

export function createStaff(
  name: string,
  clef: Clef = "treble",
  instrument: string = "Piano",
  midiChannel: number = 0,
  midiProgram: number = 0
): Staff {
  const measures: Measure[] = [];
  for (let i = 0; i < 4; i++) {
    measures.push(createMeasure());
  }
  return {
    id: createId(),
    name,
    shortName: name.substring(0, 3),
    clef,
    measures,
    muted: false,
    solo: false,
    volume: 100,
    instrument,
    midiChannel,
    midiProgram,
  };
}

export function createScore(title: string = "Untitled Score"): Score {
  const now = new Date().toISOString();
  return {
    id: createId(),
    version: "0.1.0",
    metadata: {
      title,
      composer: "",
      arranger: "",
      copyright: "",
      createdAt: now,
      modifiedAt: now,
    },
    staves: [createStaff("Treble", "treble", "Piano", 0, 0)],
    defaultTempo: 120,
    defaultTimeSignature: { beats: 4, beatType: 4 },
    defaultKeySignature: { fifths: 0, mode: "major" },
  };
}

export function durationToTicks(duration: NoteDuration, dotted: boolean): number {
  const base: Record<NoteDuration, number> = {
    whole: 1920,
    half: 960,
    quarter: 480,
    eighth: 240,
    "16th": 120,
    "32nd": 60,
  };
  const ticks = base[duration];
  return dotted ? ticks + ticks / 2 : ticks;
}

export function durationToBeats(
  duration: NoteDuration,
  dotted: boolean,
  beatType: number = 4
): number {
  const ticks = durationToTicks(duration, dotted);
  return ticks / 480 * (beatType / 4);
}

export function pitchToMidi(pitch: string, octave: number): number {
  const noteMap: Record<string, number> = {
    C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
  };
  const base = noteMap[pitch.toUpperCase()];
  if (base === undefined) return 60;
  return (octave + 1) * 12 + base;
}

export function midiToPitch(midi: number): { pitch: string; octave: number } {
  const noteNames = ["C", "C", "D", "D", "E", "F", "F", "G", "G", "A", "A", "B"];
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return { pitch: noteNames[noteIndex], octave };
}

export function cloneScore(score: Score): Score {
  return JSON.parse(JSON.stringify(score));
}
