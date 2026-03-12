import { Score, durationToTicks, pitchToMidi } from "./document-model";

export interface WavExportOptions {
  sampleRate: number;
  channels: number;
}

export async function exportWav(
  score: Score,
  options: WavExportOptions = { sampleRate: 44100, channels: 2 }
): Promise<ArrayBuffer> {
  const ticksPerBeat = 480;
  const tempo = score.defaultTempo || 120;
  const sampleRate = options.sampleRate;

  let totalTicks = 0;
  for (const staff of score.staves) {
    let staffTicks = 0;
    for (const measure of staff.measures) {
      for (const element of measure.elements) {
        staffTicks += durationToTicks(element.duration, element.dotted);
      }
    }
    totalTicks = Math.max(totalTicks, staffTicks);
  }

  const totalSeconds = (totalTicks / ticksPerBeat) * (60 / tempo) + 1;
  const numSamples = Math.ceil(totalSeconds * sampleRate);
  const buffer = new Float32Array(numSamples);

  for (const staff of score.staves) {
    if (staff.muted) continue;

    let currentTick = 0;
    for (const measure of staff.measures) {
      for (const element of measure.elements) {
        const ticks = durationToTicks(element.duration, element.dotted);
        const startSec = (currentTick / ticksPerBeat) * (60 / tempo);
        const durationSec = (ticks / ticksPerBeat) * (60 / tempo) * 0.9;

        if (element.type === "note") {
          const freq = midiToFreq(pitchToMidi(element.pitch, element.octave));
          const velocity = element.velocity / 127;
          synthesizeNote(buffer, sampleRate, startSec, durationSec, freq, velocity * 0.2);
        } else if (element.type === "chord") {
          for (const n of element.notes) {
            const freq = midiToFreq(pitchToMidi(n.pitch, n.octave));
            const velocity = n.velocity / 127;
            synthesizeNote(buffer, sampleRate, startSec, durationSec, freq, velocity * 0.15);
          }
        }

        currentTick += ticks;
      }
    }
  }

  return encodeWav(buffer, sampleRate, options.channels);
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function synthesizeNote(
  buffer: Float32Array,
  sampleRate: number,
  startSec: number,
  durationSec: number,
  freq: number,
  amplitude: number
): void {
  const startSample = Math.floor(startSec * sampleRate);
  const endSample = Math.min(
    Math.floor((startSec + durationSec) * sampleRate),
    buffer.length
  );
  const attackSamples = Math.min(Math.floor(0.01 * sampleRate), endSample - startSample);
  const releaseSamples = Math.min(Math.floor(0.02 * sampleRate), endSample - startSample);

  for (let i = startSample; i < endSample; i++) {
    const t = (i - startSample) / sampleRate;
    let env = 1.0;
    if (i - startSample < attackSamples) {
      env = (i - startSample) / attackSamples;
    } else if (endSample - i < releaseSamples) {
      env = (endSample - i) / releaseSamples;
    }
    const sample = Math.sin(2 * Math.PI * freq * t) * amplitude * env;
    buffer[i] += sample;
  }
}

function encodeWav(
  samples: Float32Array,
  sampleRate: number,
  channels: number
): ArrayBuffer {
  const numSamples = samples.length;
  const bitsPerSample = 16;
  const blockAlign = channels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * channels * (bitsPerSample / 8);
  const headerSize = 44;
  const buffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, headerSize + dataSize - 8, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const intVal = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
    for (let c = 0; c < channels; c++) {
      view.setInt16(offset, intVal, true);
      offset += 2;
    }
  }

  return buffer;
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
