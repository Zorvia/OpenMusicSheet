import React from "react";

interface StatusBarProps {
  measure: number;
  beat: number;
  selectedElement: string | null;
  playbackState: string;
  tempo: number;
  timeSignature: string;
  keySignature: string;
  modified: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  measure,
  beat,
  selectedElement,
  playbackState,
  tempo,
  timeSignature,
  keySignature,
  modified,
}) => {
  return (
    <div className="status-bar" role="status" aria-live="polite">
      <span className="status-item" aria-label="Current position">
        Measure {measure + 1} | Beat {Math.floor(beat) + 1}
      </span>
      <span className="status-separator">|</span>
      <span className="status-item" aria-label="Time signature">
        {timeSignature}
      </span>
      <span className="status-separator">|</span>
      <span className="status-item" aria-label="Key signature">
        {keySignature}
      </span>
      <span className="status-separator">|</span>
      <span className="status-item" aria-label="Tempo">
        \u2669 = {tempo}
      </span>
      <span className="status-separator">|</span>
      <span className="status-item" aria-label="Playback state">
        {playbackState === "playing"
          ? "\u25B6 Playing"
          : playbackState === "paused"
          ? "\u23F8 Paused"
          : "\u23F9 Stopped"}
      </span>
      {selectedElement && (
        <>
          <span className="status-separator">|</span>
          <span className="status-item" aria-label="Selected element">
            Selected: {selectedElement}
          </span>
        </>
      )}
      {modified && (
        <>
          <span className="status-separator">|</span>
          <span className="status-item modified" aria-label="Document modified">
            Modified
          </span>
        </>
      )}
    </div>
  );
};
