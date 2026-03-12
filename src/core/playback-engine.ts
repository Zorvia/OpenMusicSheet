import {
  Score,
  NoteElement,
  ChordElement,
  durationToTicks,
  pitchToMidi,
} from "./document-model";

export type PlaybackState = "stopped" | "playing" | "paused";

export interface PlaybackOptions {
  metronomeEnabled: boolean;
  metronomeVolume: number;
  loop: boolean;
  startMeasure: number;
  endMeasure: number | null;
}

interface ScheduledNote {
  time: number;
  pitch: number;
  duration: number;
  velocity: number;
  channel: number;
}

const NOTE_FREQUENCIES: Record<number, number> = {};
for (let i = 0; i < 128; i++) {
  NOTE_FREQUENCIES[i] = 440 * Math.pow(2, (i - 69) / 12);
}

export class PlaybackEngine {
  private audioContext: AudioContext | null = null;
  private state: PlaybackState = "stopped";
  private scheduledNodes: OscillatorNode[] = [];
  private gainNodes: GainNode[] = [];
  private startTime: number = 0;
  private pauseTime: number = 0;
  private onStateChange: ((state: PlaybackState) => void) | null = null;
  private onPositionChange: ((measure: number, beat: number) => void) | null = null;
  private positionInterval: number | null = null;
  private options: PlaybackOptions = {
    metronomeEnabled: false,
    metronomeVolume: 0.3,
    loop: false,
    startMeasure: 0,
    endMeasure: null,
  };

  setOnStateChange(callback: (state: PlaybackState) => void): void {
    this.onStateChange = callback;
  }

  setOnPositionChange(callback: (measure: number, beat: number) => void): void {
    this.onPositionChange = callback;
  }

  setOptions(options: Partial<PlaybackOptions>): void {
    this.options = { ...this.options, ...options };
  }

  getState(): PlaybackState {
    return this.state;
  }

  play(score: Score): void {
    if (this.state === "playing") return;

    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }

    this.stopAllNotes();

    const notes = this.buildNoteSchedule(score);
    const now = this.audioContext.currentTime;
    this.startTime = now;

    for (const note of notes) {
      this.scheduleNote(note, now);
    }

    if (this.options.metronomeEnabled) {
      this.scheduleMetronome(score, now);
    }

    this.state = "playing";
    this.onStateChange?.("playing");

    this.startPositionTracking(score);
  }

  pause(): void {
    if (this.state !== "playing") return;

    this.pauseTime = this.audioContext?.currentTime || 0;
    this.stopAllNotes();
    this.stopPositionTracking();

    this.state = "paused";
    this.onStateChange?.("paused");
  }

  stop(): void {
    this.stopAllNotes();
    this.stopPositionTracking();
    this.pauseTime = 0;

    this.state = "stopped";
    this.onStateChange?.("stopped");
  }

  dispose(): void {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  private buildNoteSchedule(score: Score): ScheduledNote[] {
    const notes: ScheduledNote[] = [];
    const ticksPerBeat = 480;
    const defaultTempo = score.defaultTempo || 120;

    for (const staff of score.staves) {
      if (staff.muted) continue;

      let currentTick = 0;
      let currentTempo = defaultTempo;

      const startMeasure = this.options.startMeasure;
      const endMeasure = this.options.endMeasure ?? staff.measures.length - 1;

      for (let mi = startMeasure; mi <= endMeasure && mi < staff.measures.length; mi++) {
        const measure = staff.measures[mi];

        if (measure.tempo) {
          currentTempo = measure.tempo;
        }

        for (const element of measure.elements) {
          const ticks = durationToTicks(element.duration, element.dotted);
          const durationSec = (ticks / ticksPerBeat) * (60 / currentTempo);
          const timeSec = (currentTick / ticksPerBeat) * (60 / currentTempo);

          if (element.type === "note") {
            const pitch = pitchToMidi(element.pitch, element.octave) +
              getAccidentalSemitones(element.accidental);
            notes.push({
              time: timeSec,
              pitch,
              duration: durationSec * 0.9,
              velocity: element.velocity / 127,
              channel: staff.midiChannel,
            });
          } else if (element.type === "chord") {
            for (const n of element.notes) {
              const pitch = pitchToMidi(n.pitch, n.octave) +
                getAccidentalSemitones(n.accidental);
              notes.push({
                time: timeSec,
                pitch,
                duration: durationSec * 0.9,
                velocity: n.velocity / 127,
                channel: staff.midiChannel,
              });
            }
          }

          currentTick += ticks;
        }
      }
    }

    return notes;
  }

  private scheduleNote(note: ScheduledNote, baseTime: number): void {
    if (!this.audioContext) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    osc.type = "triangle";
    osc.frequency.value = NOTE_FREQUENCIES[note.pitch] || 440;

    const volume = note.velocity * 0.3;
    gain.gain.setValueAtTime(0, baseTime + note.time);
    gain.gain.linearRampToValueAtTime(volume, baseTime + note.time + 0.01);
    gain.gain.setValueAtTime(volume, baseTime + note.time + note.duration - 0.02);
    gain.gain.linearRampToValueAtTime(0, baseTime + note.time + note.duration);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);

    osc.start(baseTime + note.time);
    osc.stop(baseTime + note.time + note.duration + 0.05);

    this.scheduledNodes.push(osc);
    this.gainNodes.push(gain);
  }

  private scheduleMetronome(score: Score, baseTime: number): void {
    if (!this.audioContext) return;

    const ticksPerBeat = 480;
    const ts = score.defaultTimeSignature;
    let currentTick = 0;
    let currentTempo = score.defaultTempo;

    const startMeasure = this.options.startMeasure;
    const endMeasure = this.options.endMeasure ??
      (score.staves[0]?.measures.length || 4) - 1;

    for (let mi = startMeasure; mi <= endMeasure; mi++) {
      const measure = score.staves[0]?.measures[mi];
      if (measure?.tempo) {
        currentTempo = measure.tempo;
      }

      const measureTs = measure?.timeSignature || ts;
      for (let beat = 0; beat < measureTs.beats; beat++) {
        const timeSec = (currentTick / ticksPerBeat) * (60 / currentTempo);

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = "sine";
        osc.frequency.value = beat === 0 ? 1000 : 800;

        const vol = this.options.metronomeVolume;
        gain.gain.setValueAtTime(0, baseTime + timeSec);
        gain.gain.linearRampToValueAtTime(vol, baseTime + timeSec + 0.001);
        gain.gain.linearRampToValueAtTime(0, baseTime + timeSec + 0.05);

        osc.connect(gain);
        gain.connect(this.audioContext.destination);

        osc.start(baseTime + timeSec);
        osc.stop(baseTime + timeSec + 0.06);

        this.scheduledNodes.push(osc);
        this.gainNodes.push(gain);

        currentTick += ticksPerBeat;
      }
    }
  }

  private stopAllNotes(): void {
    const now = this.audioContext?.currentTime || 0;
    for (const node of this.scheduledNodes) {
      try {
        node.stop(now);
      } catch (_) {
      }
    }
    this.scheduledNodes = [];
    this.gainNodes = [];
  }

  private startPositionTracking(score: Score): void {
    this.stopPositionTracking();
    const ticksPerBeat = 480;
    const tempo = score.defaultTempo;

    this.positionInterval = window.setInterval(() => {
      if (!this.audioContext || this.state !== "playing") return;

      const elapsed = this.audioContext.currentTime - this.startTime;
      const elapsedBeats = elapsed * (tempo / 60);
      const ts = score.defaultTimeSignature;
      const beatsPerMeasure = ts.beats;

      const measureIndex = Math.floor(elapsedBeats / beatsPerMeasure);
      const beat = elapsedBeats % beatsPerMeasure;

      this.onPositionChange?.(measureIndex + this.options.startMeasure, beat);

      const totalMeasures = score.staves[0]?.measures.length || 4;
      const endMeasure = this.options.endMeasure ?? totalMeasures - 1;
      if (measureIndex + this.options.startMeasure > endMeasure) {
        if (this.options.loop) {
          this.stop();
          this.play(score);
        } else {
          this.stop();
        }
      }
    }, 50);
  }

  private stopPositionTracking(): void {
    if (this.positionInterval !== null) {
      clearInterval(this.positionInterval);
      this.positionInterval = null;
    }
  }
}

function getAccidentalSemitones(accidental?: string): number {
  if (!accidental) return 0;
  switch (accidental) {
    case "sharp": return 1;
    case "flat": return -1;
    case "double-sharp": return 2;
    case "double-flat": return -2;
    default: return 0;
  }
}
