import React from "react";
import { NoteDuration, Clef } from "../core/document-model";

interface ToolbarProps {
  selectedDuration: NoteDuration;
  onDurationChange: (duration: NoteDuration) => void;
  onAddNote: (pitch: string, octave: number) => void;
  onAddRest: () => void;
  onDeleteSelected: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  playbackState: string;
  onNewScore: () => void;
  onSave: () => void;
  onLoad: () => void;
  onExportMusicXML: () => void;
  onImportMusicXML: () => void;
  onExportMidi: () => void;
  onExportPdf: () => void;
  onExportWav: () => void;
  onAddMeasure: () => void;
  onRemoveMeasure: () => void;
  onAddStaff: () => void;
  onRemoveStaff: () => void;
  metronomeEnabled: boolean;
  onToggleMetronome: () => void;
  tempo: number;
  onTempoChange: (tempo: number) => void;
}

const DURATIONS: { label: string; value: NoteDuration }[] = [
  { label: "\uD834\uDD5D", value: "whole" },
  { label: "\uD834\uDD5E", value: "half" },
  { label: "\u2669", value: "quarter" },
  { label: "\u266A", value: "eighth" },
  { label: "\uD834\uDD61", value: "16th" },
  { label: "\uD834\uDD62", value: "32nd" },
];

const PITCHES = ["C", "D", "E", "F", "G", "A", "B"];

export const Toolbar: React.FC<ToolbarProps> = ({
  selectedDuration,
  onDurationChange,
  onAddNote,
  onAddRest,
  onDeleteSelected,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onPlay,
  onPause,
  onStop,
  playbackState,
  onNewScore,
  onSave,
  onLoad,
  onExportMusicXML,
  onImportMusicXML,
  onExportMidi,
  onExportPdf,
  onExportWav,
  onAddMeasure,
  onRemoveMeasure,
  onAddStaff,
  onRemoveStaff,
  metronomeEnabled,
  onToggleMetronome,
  tempo,
  onTempoChange,
}) => {
  return (
    <div className="toolbar" role="toolbar" aria-label="Score editing toolbar">
      <div className="toolbar-section" role="group" aria-label="File operations">
        <button onClick={onNewScore} aria-label="New score" title="New Score">
          New
        </button>
        <button onClick={onSave} aria-label="Save project" title="Save">
          Save
        </button>
        <button onClick={onLoad} aria-label="Open project" title="Open">
          Open
        </button>
        <div className="toolbar-dropdown">
          <button aria-label="Export options" title="Export">
            Export \u25BE
          </button>
          <div className="toolbar-dropdown-content">
            <button onClick={onExportMusicXML} aria-label="Export as MusicXML">
              MusicXML
            </button>
            <button onClick={onExportMidi} aria-label="Export as MIDI">
              MIDI
            </button>
            <button onClick={onExportPdf} aria-label="Export as PDF">
              PDF
            </button>
            <button onClick={onExportWav} aria-label="Export as WAV">
              WAV
            </button>
          </div>
        </div>
        <button
          onClick={onImportMusicXML}
          aria-label="Import MusicXML"
          title="Import MusicXML"
        >
          Import
        </button>
      </div>

      <div className="toolbar-separator" role="separator" />

      <div className="toolbar-section" role="group" aria-label="Edit operations">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo (Ctrl+Z)"
        >
          \u21A9
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
          title="Redo (Ctrl+Y)"
        >
          \u21AA
        </button>
        <button
          onClick={onDeleteSelected}
          aria-label="Delete selected element"
          title="Delete"
        >
          \uD83D\uDDD1
        </button>
      </div>

      <div className="toolbar-separator" role="separator" />

      <div
        className="toolbar-section"
        role="group"
        aria-label="Note duration selection"
      >
        {DURATIONS.map((d) => (
          <button
            key={d.value}
            className={selectedDuration === d.value ? "active" : ""}
            onClick={() => onDurationChange(d.value)}
            aria-label={`${d.value} note`}
            aria-pressed={selectedDuration === d.value}
            title={d.value}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="toolbar-separator" role="separator" />

      <div className="toolbar-section" role="group" aria-label="Note entry">
        {PITCHES.map((p) => (
          <button
            key={p}
            onClick={() => onAddNote(p, 4)}
            aria-label={`Add note ${p}4`}
            title={`${p}4`}
            className="pitch-btn"
          >
            {p}
          </button>
        ))}
        <button onClick={onAddRest} aria-label="Add rest" title="Add Rest">
          Rest
        </button>
      </div>

      <div className="toolbar-separator" role="separator" />

      <div className="toolbar-section" role="group" aria-label="Measure operations">
        <button
          onClick={onAddMeasure}
          aria-label="Add measure"
          title="Add Measure"
        >
          +Measure
        </button>
        <button
          onClick={onRemoveMeasure}
          aria-label="Remove last measure"
          title="Remove Measure"
        >
          -Measure
        </button>
        <button
          onClick={onAddStaff}
          aria-label="Add staff"
          title="Add Staff"
        >
          +Staff
        </button>
        <button
          onClick={onRemoveStaff}
          aria-label="Remove last staff"
          title="Remove Staff"
        >
          -Staff
        </button>
      </div>

      <div className="toolbar-separator" role="separator" />

      <div className="toolbar-section" role="group" aria-label="Playback controls">
        {playbackState === "playing" ? (
          <button onClick={onPause} aria-label="Pause playback" title="Pause">
            \u23F8
          </button>
        ) : (
          <button onClick={onPlay} aria-label="Play score" title="Play">
            \u25B6
          </button>
        )}
        <button onClick={onStop} aria-label="Stop playback" title="Stop">
          \u23F9
        </button>
        <button
          onClick={onToggleMetronome}
          className={metronomeEnabled ? "active" : ""}
          aria-label="Toggle metronome"
          aria-pressed={metronomeEnabled}
          title="Metronome"
        >
          \uD83E\uDD41
        </button>
        <label className="tempo-control" aria-label="Tempo">
          <span className="tempo-label">BPM</span>
          <input
            type="number"
            value={tempo}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (val > 0 && val <= 300) onTempoChange(val);
            }}
            min={20}
            max={300}
            aria-label="Tempo in BPM"
            className="tempo-input"
          />
        </label>
      </div>
    </div>
  );
};
