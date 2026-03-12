import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Score,
  NoteDuration,
  createScore,
  PlaybackEngine,
  PlaybackState,
  UndoManager,
  addNote,
  addRest,
  removeElement,
  addStaff,
  removeStaff,
  addMeasure,
  removeMeasure,
  setTempo,
  setStaffMute,
  setStaffSolo,
  setStaffVolume,
  scoreToMusicXML,
  parseMusicXML,
  scoreToMidi,
  serializeProject,
  deserializeProject,
  exportPdf,
  exportWav,
} from "../core";
import { ScoreRenderer } from "./ScoreRenderer";
import { Toolbar } from "./Toolbar";
import { StaffPanel } from "./StaffPanel";
import { StatusBar } from "./StatusBar";

const KEY_SIGNATURES: Record<number, string> = {
  "-7": "Cb major",
  "-6": "Gb major",
  "-5": "Db major",
  "-4": "Ab major",
  "-3": "Eb major",
  "-2": "Bb major",
  "-1": "F major",
  0: "C major",
  1: "G major",
  2: "D major",
  3: "A major",
  4: "E major",
  5: "B major",
  6: "F# major",
  7: "C# major",
};

export const App: React.FC = () => {
  const [score, setScore] = useState<Score>(() => createScore("Untitled Score"));
  const [selectedStaff, setSelectedStaff] = useState(0);
  const [selectedMeasure, setSelectedMeasure] = useState(0);
  const [selectedElement, setSelectedElement] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<NoteDuration>("quarter");
  const [playbackState, setPlaybackState] = useState<PlaybackState>("stopped");
  const [currentPlaybackMeasure, setCurrentPlaybackMeasure] = useState<number | null>(null);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [modified, setModified] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  const undoManagerRef = useRef(new UndoManager());
  const playbackEngineRef = useRef(new PlaybackEngine());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const musicXmlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const engine = playbackEngineRef.current;
    engine.setOnStateChange((state) => {
      setPlaybackState(state);
      if (state === "stopped") {
        setCurrentPlaybackMeasure(null);
        setCurrentBeat(0);
      }
    });
    engine.setOnPositionChange((measure, beat) => {
      setCurrentPlaybackMeasure(measure);
      setCurrentBeat(beat);
    });
    return () => engine.dispose();
  }, []);

  const pushUndo = useCallback(
    (description: string) => {
      undoManagerRef.current.pushState(score, description);
    },
    [score]
  );

  const updateScore = useCallback(
    (newScore: Score, description: string) => {
      pushUndo(description);
      setScore(newScore);
      setModified(true);
    },
    [pushUndo]
  );

  const handleAddNote = useCallback(
    (pitch: string, octave: number) => {
      const newScore = addNote(
        score,
        selectedStaff,
        selectedMeasure,
        pitch,
        octave,
        selectedDuration
      );
      updateScore(newScore, `Add note ${pitch}${octave}`);
    },
    [score, selectedStaff, selectedMeasure, selectedDuration, updateScore]
  );

  const handleAddRest = useCallback(() => {
    const newScore = addRest(score, selectedStaff, selectedMeasure, selectedDuration);
    updateScore(newScore, "Add rest");
  }, [score, selectedStaff, selectedMeasure, selectedDuration, updateScore]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedElement === null) return;
    const measure = score.staves[selectedStaff]?.measures[selectedMeasure];
    if (!measure) return;
    const element = measure.elements[selectedElement];
    if (!element) return;
    const newScore = removeElement(
      score,
      selectedStaff,
      selectedMeasure,
      element.id
    );
    updateScore(newScore, "Delete element");
    setSelectedElement(null);
  }, [score, selectedStaff, selectedMeasure, selectedElement, updateScore]);

  const handleUndo = useCallback(() => {
    const restored = undoManagerRef.current.undo(score);
    if (restored) {
      setScore(restored);
      setModified(true);
    }
  }, [score]);

  const handleRedo = useCallback(() => {
    const restored = undoManagerRef.current.redo(score);
    if (restored) {
      setScore(restored);
      setModified(true);
    }
  }, [score]);

  const handlePlay = useCallback(() => {
    playbackEngineRef.current.setOptions({ metronomeEnabled });
    playbackEngineRef.current.play(score);
  }, [score, metronomeEnabled]);

  const handlePause = useCallback(() => {
    playbackEngineRef.current.pause();
  }, []);

  const handleStop = useCallback(() => {
    playbackEngineRef.current.stop();
  }, []);

  const handleNewScore = useCallback(() => {
    const newScore = createScore("Untitled Score");
    undoManagerRef.current.clear();
    setScore(newScore);
    setSelectedStaff(0);
    setSelectedMeasure(0);
    setSelectedElement(null);
    setModified(false);
  }, []);

  const handleSave = useCallback(() => {
    const json = serializeProject(score);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${score.metadata.title || "score"}.osmproj`;
    a.click();
    URL.revokeObjectURL(url);
    setModified(false);
  }, [score]);

  const handleLoad = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileLoad = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const loaded = deserializeProject(reader.result as string);
          undoManagerRef.current.clear();
          setScore(loaded);
          setSelectedStaff(0);
          setSelectedMeasure(0);
          setSelectedElement(null);
          setModified(false);
        } catch (_) {
          alert("Failed to load project file.");
        }
      };
      reader.readAsText(file);
      if (e.target) e.target.value = "";
    },
    []
  );

  const handleExportMusicXML = useCallback(() => {
    const xml = scoreToMusicXML(score);
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${score.metadata.title || "score"}.musicxml`;
    a.click();
    URL.revokeObjectURL(url);
  }, [score]);

  const handleImportMusicXML = useCallback(() => {
    musicXmlInputRef.current?.click();
  }, []);

  const handleMusicXMLLoad = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const imported = parseMusicXML(reader.result as string);
          undoManagerRef.current.clear();
          setScore(imported);
          setSelectedStaff(0);
          setSelectedMeasure(0);
          setSelectedElement(null);
          setModified(false);
        } catch (_) {
          alert("Failed to import MusicXML file.");
        }
      };
      reader.readAsText(file);
      if (e.target) e.target.value = "";
    },
    []
  );

  const handleExportMidi = useCallback(() => {
    const midiData = scoreToMidi(score);
    const json = JSON.stringify(midiData);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${score.metadata.title || "score"}.mid.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [score]);

  const handleExportPdf = useCallback(() => {
    const doc = exportPdf(score);
    doc.save(`${score.metadata.title || "score"}.pdf`);
  }, [score]);

  const handleExportWav = useCallback(async () => {
    const buffer = await exportWav(score);
    const blob = new Blob([buffer], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${score.metadata.title || "score"}.wav`;
    a.click();
    URL.revokeObjectURL(url);
  }, [score]);

  const handleAddMeasure = useCallback(() => {
    const newScore = addMeasure(score);
    updateScore(newScore, "Add measure");
  }, [score, updateScore]);

  const handleRemoveMeasure = useCallback(() => {
    const totalMeasures = score.staves[0]?.measures.length || 0;
    if (totalMeasures <= 1) return;
    const newScore = removeMeasure(score, totalMeasures - 1);
    updateScore(newScore, "Remove measure");
    if (selectedMeasure >= totalMeasures - 1) {
      setSelectedMeasure(Math.max(0, totalMeasures - 2));
    }
  }, [score, selectedMeasure, updateScore]);

  const handleAddStaff = useCallback(() => {
    const staffCount = score.staves.length;
    const name = staffCount % 2 === 0 ? "Treble" : "Bass";
    const clef = staffCount % 2 === 0 ? "treble" : "bass";
    const newScore = addStaff(score, `${name} ${staffCount + 1}`, clef as any);
    updateScore(newScore, "Add staff");
  }, [score, updateScore]);

  const handleRemoveStaff = useCallback(() => {
    if (score.staves.length <= 1) return;
    const newScore = removeStaff(score, score.staves.length - 1);
    updateScore(newScore, "Remove staff");
    if (selectedStaff >= score.staves.length - 1) {
      setSelectedStaff(Math.max(0, score.staves.length - 2));
    }
  }, [score, selectedStaff, updateScore]);

  const handleMuteToggle = useCallback(
    (index: number) => {
      const newScore = setStaffMute(score, index, !score.staves[index].muted);
      setScore(newScore);
    },
    [score]
  );

  const handleSoloToggle = useCallback(
    (index: number) => {
      const newScore = setStaffSolo(score, index, !score.staves[index].solo);
      setScore(newScore);
    },
    [score]
  );

  const handleVolumeChange = useCallback(
    (index: number, volume: number) => {
      const newScore = setStaffVolume(score, index, volume);
      setScore(newScore);
    },
    [score]
  );

  const handleTempoChange = useCallback(
    (tempo: number) => {
      const newScore = setTempo(score, 0, tempo);
      updateScore(newScore, `Set tempo to ${tempo}`);
    },
    [score, updateScore]
  );

  const handleElementClick = useCallback(
    (staffIndex: number, measureIndex: number, elementIndex: number) => {
      setSelectedStaff(staffIndex);
      setSelectedMeasure(measureIndex);
      setSelectedElement(elementIndex);
    },
    []
  );

  const handleMeasureClick = useCallback(
    (staffIndex: number, measureIndex: number) => {
      setSelectedStaff(staffIndex);
      setSelectedMeasure(measureIndex);
    },
    []
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "z":
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            break;
          case "y":
            e.preventDefault();
            handleRedo();
            break;
          case "s":
            e.preventDefault();
            handleSave();
            break;
          case "n":
            e.preventDefault();
            handleNewScore();
            break;
        }
        return;
      }

      switch (e.key) {
        case "Delete":
        case "Backspace":
          handleDeleteSelected();
          break;
        case " ":
          e.preventDefault();
          if (playbackState === "playing") {
            handlePause();
          } else {
            handlePlay();
          }
          break;
        case "Escape":
          handleStop();
          break;
        case "ArrowRight":
          setSelectedMeasure((m) =>
            Math.min(m + 1, (score.staves[0]?.measures.length || 1) - 1)
          );
          setSelectedElement(null);
          break;
        case "ArrowLeft":
          setSelectedMeasure((m) => Math.max(m - 1, 0));
          setSelectedElement(null);
          break;
        case "ArrowUp":
          setSelectedStaff((s) => Math.max(s - 1, 0));
          break;
        case "ArrowDown":
          setSelectedStaff((s) =>
            Math.min(s + 1, score.staves.length - 1)
          );
          break;
        case "c":
        case "C":
          handleAddNote("C", 4);
          break;
        case "d":
        case "D":
          handleAddNote("D", 4);
          break;
        case "e":
        case "E":
          handleAddNote("E", 4);
          break;
        case "f":
        case "F":
          handleAddNote("F", 4);
          break;
        case "g":
        case "G":
          handleAddNote("G", 4);
          break;
        case "a":
        case "A":
          handleAddNote("A", 4);
          break;
        case "b":
        case "B":
          handleAddNote("B", 4);
          break;
        case "r":
        case "R":
          handleAddRest();
          break;
        case "1":
          setSelectedDuration("whole");
          break;
        case "2":
          setSelectedDuration("half");
          break;
        case "3":
          setSelectedDuration("quarter");
          break;
        case "4":
          setSelectedDuration("eighth");
          break;
        case "5":
          setSelectedDuration("16th");
          break;
        case "6":
          setSelectedDuration("32nd");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    score,
    playbackState,
    handleAddNote,
    handleAddRest,
    handleDeleteSelected,
    handleUndo,
    handleRedo,
    handlePlay,
    handlePause,
    handleStop,
    handleSave,
    handleNewScore,
  ]);

  const getSelectedElementDescription = (): string | null => {
    if (selectedElement === null) return null;
    const measure = score.staves[selectedStaff]?.measures[selectedMeasure];
    if (!measure) return null;
    const el = measure.elements[selectedElement];
    if (!el) return null;
    if (el.type === "note") return `${el.pitch}${el.octave} ${el.duration}`;
    if (el.type === "rest") return `Rest ${el.duration}`;
    if (el.type === "chord") return `Chord ${el.duration}`;
    return null;
  };

  const ts = score.defaultTimeSignature;
  const ks = score.defaultKeySignature;

  return (
    <div className={`app ${highContrast ? "high-contrast" : ""}`} role="application" aria-label="OpenSheetMusic Editor">
      <input
        ref={fileInputRef}
        type="file"
        accept=".osmproj"
        onChange={handleFileLoad}
        style={{ display: "none" }}
        aria-hidden="true"
      />
      <input
        ref={musicXmlInputRef}
        type="file"
        accept=".musicxml,.xml,.mxl"
        onChange={handleMusicXMLLoad}
        style={{ display: "none" }}
        aria-hidden="true"
      />

      <Toolbar
        selectedDuration={selectedDuration}
        onDurationChange={setSelectedDuration}
        onAddNote={handleAddNote}
        onAddRest={handleAddRest}
        onDeleteSelected={handleDeleteSelected}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoManagerRef.current.canUndo()}
        canRedo={undoManagerRef.current.canRedo()}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        playbackState={playbackState}
        onNewScore={handleNewScore}
        onSave={handleSave}
        onLoad={handleLoad}
        onExportMusicXML={handleExportMusicXML}
        onImportMusicXML={handleImportMusicXML}
        onExportMidi={handleExportMidi}
        onExportPdf={handleExportPdf}
        onExportWav={handleExportWav}
        onAddMeasure={handleAddMeasure}
        onRemoveMeasure={handleRemoveMeasure}
        onAddStaff={handleAddStaff}
        onRemoveStaff={handleRemoveStaff}
        metronomeEnabled={metronomeEnabled}
        onToggleMetronome={() => setMetronomeEnabled(!metronomeEnabled)}
        tempo={score.defaultTempo}
        onTempoChange={handleTempoChange}
      />

      <div className="main-content">
        <StaffPanel
          staves={score.staves}
          selectedStaff={selectedStaff}
          onSelectStaff={setSelectedStaff}
          onMuteToggle={handleMuteToggle}
          onSoloToggle={handleSoloToggle}
          onVolumeChange={handleVolumeChange}
        />

        <div className="score-area">
          <ScoreRenderer
            score={score}
            selectedStaff={selectedStaff}
            selectedMeasure={selectedMeasure}
            selectedElement={selectedElement}
            currentPlaybackMeasure={currentPlaybackMeasure}
            onElementClick={handleElementClick}
            onMeasureClick={handleMeasureClick}
          />
        </div>
      </div>

      <StatusBar
        measure={selectedMeasure}
        beat={currentBeat}
        selectedElement={getSelectedElementDescription()}
        playbackState={playbackState}
        tempo={score.defaultTempo}
        timeSignature={`${ts.beats}/${ts.beatType}`}
        keySignature={KEY_SIGNATURES[ks.fifths] || "C major"}
        modified={modified}
      />

      <button
        className="high-contrast-toggle"
        onClick={() => setHighContrast(!highContrast)}
        aria-label="Toggle high contrast mode"
        title="Toggle high contrast"
      >
        HC
      </button>
    </div>
  );
};
