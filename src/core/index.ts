export { type Score, type Staff, type Measure, type MeasureElement, type NoteElement, type RestElement, type ChordElement, type NoteDuration, type Clef, type Accidental, type Articulation, type Dynamic, type TimeSignature, type KeySignature, type ScoreMetadata, createScore, createStaff, createMeasure, createNote, createRest, createChord, createId, cloneScore, durationToTicks, durationToBeats, pitchToMidi, midiToPitch } from "./document-model";
export { UndoManager } from "./undo-manager";
export { parseMusicXML, scoreToMusicXML } from "./musicxml-io";
export { scoreToMidi, midiToScore, type MidiEvent, type MidiTrack, type MidiFile } from "./midi-converter";
export { serializeProject, deserializeProject } from "./project-file";
export { addNote, addRest, removeElement, insertElement, moveElement, updateElement, addStaff, removeStaff, addMeasure, removeMeasure, setTimeSignature, setKeySignature, setTempo, setStaffMute, setStaffSolo, setStaffVolume, updateMetadata, duplicateMeasure } from "./score-mutations";
export { PlaybackEngine, type PlaybackState, type PlaybackOptions } from "./playback-engine";
export { exportPdf } from "./pdf-exporter";
export { exportWav } from "./wav-exporter";
