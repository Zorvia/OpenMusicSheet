import {
  Score,
  Staff,
  MeasureElement,
  NoteElement,
  NoteDuration,
  pitchToMidi,
  durationToTicks,
  createId,
  createStaff,
  createMeasure,
  midiToPitch,
} from "./document-model";

export interface MidiEvent {
  tick: number;
  type: "noteOn" | "noteOff" | "tempo" | "timeSignature" | "programChange";
  channel: number;
  pitch?: number;
  velocity?: number;
  tempo?: number;
  beats?: number;
  beatType?: number;
  program?: number;
}

export interface MidiTrack {
  name: string;
  events: MidiEvent[];
}

export interface MidiFile {
  ticksPerBeat: number;
  tracks: MidiTrack[];
}

export function scoreToMidi(score: Score): MidiFile {
  const ticksPerBeat = 480;
  const tracks: MidiTrack[] = [];

  const tempoTrack: MidiTrack = {
    name: "Tempo",
    events: [
      {
        tick: 0,
        type: "tempo",
        channel: 0,
        tempo: score.defaultTempo,
      },
      {
        tick: 0,
        type: "timeSignature",
        channel: 0,
        beats: score.defaultTimeSignature.beats,
        beatType: score.defaultTimeSignature.beatType,
      },
    ],
  };
  tracks.push(tempoTrack);

  for (const staff of score.staves) {
    if (staff.muted) continue;

    const track: MidiTrack = {
      name: staff.name,
      events: [],
    };

    track.events.push({
      tick: 0,
      type: "programChange",
      channel: staff.midiChannel,
      program: staff.midiProgram,
    });

    let currentTick = 0;

    for (const measure of staff.measures) {
      if (measure.tempo) {
        track.events.push({
          tick: currentTick,
          type: "tempo",
          channel: 0,
          tempo: measure.tempo,
        });
      }

      for (const element of measure.elements) {
        const ticks = durationToTicks(element.duration, element.dotted);

        if (element.type === "note") {
          const midiPitch = getMidiPitch(element);
          track.events.push({
            tick: currentTick,
            type: "noteOn",
            channel: staff.midiChannel,
            pitch: midiPitch,
            velocity: element.velocity,
          });
          track.events.push({
            tick: currentTick + ticks,
            type: "noteOff",
            channel: staff.midiChannel,
            pitch: midiPitch,
            velocity: 0,
          });
        } else if (element.type === "chord") {
          for (const note of element.notes) {
            const midiPitch = pitchToMidi(note.pitch, note.octave) +
              getAccidentalOffset(note.accidental);
            track.events.push({
              tick: currentTick,
              type: "noteOn",
              channel: staff.midiChannel,
              pitch: midiPitch,
              velocity: note.velocity,
            });
            track.events.push({
              tick: currentTick + ticks,
              type: "noteOff",
              channel: staff.midiChannel,
              pitch: midiPitch,
              velocity: 0,
            });
          }
        }

        currentTick += ticks;
      }
    }

    tracks.push(track);
  }

  return { ticksPerBeat, tracks };
}

function getMidiPitch(note: NoteElement): number {
  return pitchToMidi(note.pitch, note.octave) + getAccidentalOffset(note.accidental);
}

function getAccidentalOffset(accidental?: string): number {
  if (!accidental) return 0;
  switch (accidental) {
    case "sharp": return 1;
    case "flat": return -1;
    case "double-sharp": return 2;
    case "double-flat": return -2;
    default: return 0;
  }
}

export function midiToScore(midiFile: MidiFile): Score {
  const now = new Date().toISOString();
  const score: Score = {
    id: createId(),
    version: "0.1.0",
    metadata: {
      title: "Imported MIDI",
      composer: "",
      arranger: "",
      copyright: "",
      createdAt: now,
      modifiedAt: now,
    },
    staves: [],
    defaultTempo: 120,
    defaultTimeSignature: { beats: 4, beatType: 4 },
    defaultKeySignature: { fifths: 0, mode: "major" },
  };

  for (const track of midiFile.tracks) {
    if (track.name === "Tempo") {
      for (const event of track.events) {
        if (event.type === "tempo" && event.tempo) {
          score.defaultTempo = event.tempo;
        }
      }
      continue;
    }

    const staff = createStaff(track.name);
    staff.measures = [];

    const noteOns: Map<number, { tick: number; velocity: number }> = new Map();
    const completedNotes: { tick: number; pitch: number; duration: number; velocity: number }[] = [];

    for (const event of track.events) {
      if (event.type === "noteOn" && event.pitch !== undefined && event.velocity && event.velocity > 0) {
        noteOns.set(event.pitch, { tick: event.tick, velocity: event.velocity });
      } else if (
        (event.type === "noteOff" || (event.type === "noteOn" && event.velocity === 0)) &&
        event.pitch !== undefined
      ) {
        const on = noteOns.get(event.pitch);
        if (on) {
          completedNotes.push({
            tick: on.tick,
            pitch: event.pitch,
            duration: event.tick - on.tick,
            velocity: on.velocity,
          });
          noteOns.delete(event.pitch);
        }
      }
    }

    completedNotes.sort((a, b) => a.tick - b.tick);

    const ticksPerMeasure = midiFile.ticksPerBeat * score.defaultTimeSignature.beats;
    const totalTicks = completedNotes.length > 0
      ? Math.max(...completedNotes.map((n) => n.tick + n.duration))
      : ticksPerMeasure * 4;
    const numMeasures = Math.max(4, Math.ceil(totalTicks / ticksPerMeasure));

    for (let m = 0; m < numMeasures; m++) {
      const measure = createMeasure();
      const measureStart = m * ticksPerMeasure;
      const measureEnd = measureStart + ticksPerMeasure;

      const measureNotes = completedNotes.filter(
        (n) => n.tick >= measureStart && n.tick < measureEnd
      );

      for (const mn of measureNotes) {
        const { pitch, octave } = midiToPitch(mn.pitch);
        const dur = ticksToDuration(mn.duration);
        measure.elements.push({
          id: createId(),
          type: "note",
          pitch,
          octave,
          duration: dur,
          dotted: false,
          articulations: [],
          velocity: mn.velocity,
        });
      }

      staff.measures.push(measure);
    }

    score.staves.push(staff);
  }

  if (score.staves.length === 0) {
    score.staves.push(createStaff("Piano"));
  }

  return score;
}

function ticksToDuration(ticks: number): NoteDuration {
  if (ticks >= 1680) return "whole";
  if (ticks >= 720) return "half";
  if (ticks >= 360) return "quarter";
  if (ticks >= 180) return "eighth";
  if (ticks >= 90) return "16th";
  return "32nd";
}

export function midiFileToJson(midiFile: MidiFile): string {
  return JSON.stringify(midiFile, null, 2);
}
