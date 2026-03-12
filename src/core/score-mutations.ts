import {
  Score,
  Staff,
  Measure,
  MeasureElement,
  NoteElement,
  NoteDuration,
  Clef,
  KeySignature,
  TimeSignature,
  cloneScore,
  createId,
  createNote,
  createRest,
  createMeasure,
  createStaff,
} from "./document-model";

export function addNote(
  score: Score,
  staffIndex: number,
  measureIndex: number,
  pitch: string,
  octave: number,
  duration: NoteDuration = "quarter",
  velocity: number = 80
): Score {
  const result = cloneScore(score);
  const staff = result.staves[staffIndex];
  if (!staff) return result;
  const measure = staff.measures[measureIndex];
  if (!measure) return result;
  measure.elements.push(createNote(pitch, octave, duration, velocity));
  result.metadata.modifiedAt = new Date().toISOString();
  return result;
}

export function addRest(
  score: Score,
  staffIndex: number,
  measureIndex: number,
  duration: NoteDuration = "quarter"
): Score {
  const result = cloneScore(score);
  const staff = result.staves[staffIndex];
  if (!staff) return result;
  const measure = staff.measures[measureIndex];
  if (!measure) return result;
  measure.elements.push(createRest(duration));
  result.metadata.modifiedAt = new Date().toISOString();
  return result;
}

export function removeElement(
  score: Score,
  staffIndex: number,
  measureIndex: number,
  elementId: string
): Score {
  const result = cloneScore(score);
  const staff = result.staves[staffIndex];
  if (!staff) return result;
  const measure = staff.measures[measureIndex];
  if (!measure) return result;
  measure.elements = measure.elements.filter((e) => e.id !== elementId);
  result.metadata.modifiedAt = new Date().toISOString();
  return result;
}

export function insertElement(
  score: Score,
  staffIndex: number,
  measureIndex: number,
  position: number,
  element: MeasureElement
): Score {
  const result = cloneScore(score);
  const staff = result.staves[staffIndex];
  if (!staff) return result;
  const measure = staff.measures[measureIndex];
  if (!measure) return result;
  measure.elements.splice(position, 0, { ...element, id: createId() });
  result.metadata.modifiedAt = new Date().toISOString();
  return result;
}

export function moveElement(
  score: Score,
  staffIndex: number,
  measureIndex: number,
  fromPosition: number,
  toPosition: number
): Score {
  const result = cloneScore(score);
  const staff = result.staves[staffIndex];
  if (!staff) return result;
  const measure = staff.measures[measureIndex];
  if (!measure) return result;
  if (fromPosition < 0 || fromPosition >= measure.elements.length) return result;
  if (toPosition < 0 || toPosition >= measure.elements.length) return result;
  const [moved] = measure.elements.splice(fromPosition, 1);
  measure.elements.splice(toPosition, 0, moved);
  result.metadata.modifiedAt = new Date().toISOString();
  return result;
}

export function updateElement(
  score: Score,
  staffIndex: number,
  measureIndex: number,
  elementId: string,
  updates: Partial<MeasureElement>
): Score {
  const result = cloneScore(score);
  const staff = result.staves[staffIndex];
  if (!staff) return result;
  const measure = staff.measures[measureIndex];
  if (!measure) return result;
  const idx = measure.elements.findIndex((e) => e.id === elementId);
  if (idx === -1) return result;
  measure.elements[idx] = { ...measure.elements[idx], ...updates } as MeasureElement;
  result.metadata.modifiedAt = new Date().toISOString();
  return result;
}

export function addStaff(
  score: Score,
  name: string,
  clef: Clef = "treble",
  instrument: string = "Piano"
): Score {
  const result = cloneScore(score);
  const measureCount = result.staves.length > 0 ? result.staves[0].measures.length : 4;
  const staff = createStaff(name, clef, instrument, result.staves.length, 0);
  staff.measures = [];
  for (let i = 0; i < measureCount; i++) {
    staff.measures.push(createMeasure());
  }
  result.staves.push(staff);
  result.metadata.modifiedAt = new Date().toISOString();
  return result;
}

export function removeStaff(score: Score, staffIndex: number): Score {
  const result = cloneScore(score);
  if (result.staves.length <= 1) return result;
  result.staves.splice(staffIndex, 1);
  result.metadata.modifiedAt = new Date().toISOString();
  return result;
}

export function addMeasure(score: Score, position?: number): Score {
  const result = cloneScore(score);
  for (const staff of result.staves) {
    const measure = createMeasure();
    if (position !== undefined && position >= 0 && position <= staff.measures.length) {
      staff.measures.splice(position, 0, measure);
    } else {
      staff.measures.push(measure);
    }
  }
  result.metadata.modifiedAt = new Date().toISOString();
  return result;
}

export function removeMeasure(score: Score, measureIndex: number): Score {
  const result = cloneScore(score);
  for (const staff of result.staves) {
    if (staff.measures.length <= 1) continue;
    if (measureIndex >= 0 && measureIndex < staff.measures.length) {
      staff.measures.splice(measureIndex, 1);
    }
  }
  result.metadata.modifiedAt = new Date().toISOString();
  return result;
}

export function setTimeSignature(
  score: Score,
  measureIndex: number,
  timeSignature: TimeSignature
): Score {
  const result = cloneScore(score);
  for (const staff of result.staves) {
    if (measureIndex >= 0 && measureIndex < staff.measures.length) {
      staff.measures[measureIndex].timeSignature = timeSignature;
    }
  }
  if (measureIndex === 0) {
    result.defaultTimeSignature = timeSignature;
  }
  result.metadata.modifiedAt = new Date().toISOString();
  return result;
}

export function setKeySignature(
  score: Score,
  measureIndex: number,
  keySignature: KeySignature
): Score {
  const result = cloneScore(score);
  for (const staff of result.staves) {
    if (measureIndex >= 0 && measureIndex < staff.measures.length) {
      staff.measures[measureIndex].keySignature = keySignature;
    }
  }
  if (measureIndex === 0) {
    result.defaultKeySignature = keySignature;
  }
  result.metadata.modifiedAt = new Date().toISOString();
  return result;
}

export function setTempo(score: Score, measureIndex: number, tempo: number): Score {
  const result = cloneScore(score);
  for (const staff of result.staves) {
    if (measureIndex >= 0 && measureIndex < staff.measures.length) {
      staff.measures[measureIndex].tempo = tempo;
    }
  }
  if (measureIndex === 0) {
    result.defaultTempo = tempo;
  }
  result.metadata.modifiedAt = new Date().toISOString();
  return result;
}

export function setStaffMute(score: Score, staffIndex: number, muted: boolean): Score {
  const result = cloneScore(score);
  if (result.staves[staffIndex]) {
    result.staves[staffIndex].muted = muted;
  }
  return result;
}

export function setStaffSolo(score: Score, staffIndex: number, solo: boolean): Score {
  const result = cloneScore(score);
  if (result.staves[staffIndex]) {
    result.staves[staffIndex].solo = solo;
  }
  return result;
}

export function setStaffVolume(score: Score, staffIndex: number, volume: number): Score {
  const result = cloneScore(score);
  if (result.staves[staffIndex]) {
    result.staves[staffIndex].volume = Math.max(0, Math.min(127, volume));
  }
  return result;
}

export function updateMetadata(
  score: Score,
  updates: Partial<Score["metadata"]>
): Score {
  const result = cloneScore(score);
  result.metadata = { ...result.metadata, ...updates, modifiedAt: new Date().toISOString() };
  return result;
}

export function duplicateMeasure(score: Score, measureIndex: number): Score {
  const result = cloneScore(score);
  for (const staff of result.staves) {
    if (measureIndex >= 0 && measureIndex < staff.measures.length) {
      const original = staff.measures[measureIndex];
      const copy: Measure = {
        ...JSON.parse(JSON.stringify(original)),
        id: createId(),
      };
      copy.elements = copy.elements.map((e: MeasureElement) => ({ ...e, id: createId() }));
      staff.measures.splice(measureIndex + 1, 0, copy);
    }
  }
  result.metadata.modifiedAt = new Date().toISOString();
  return result;
}
