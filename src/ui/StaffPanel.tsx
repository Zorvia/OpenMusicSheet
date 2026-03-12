import React from "react";
import { Staff } from "../core/document-model";

interface StaffPanelProps {
  staves: Staff[];
  selectedStaff: number;
  onSelectStaff: (index: number) => void;
  onMuteToggle: (index: number) => void;
  onSoloToggle: (index: number) => void;
  onVolumeChange: (index: number, volume: number) => void;
}

export const StaffPanel: React.FC<StaffPanelProps> = ({
  staves,
  selectedStaff,
  onSelectStaff,
  onMuteToggle,
  onSoloToggle,
  onVolumeChange,
}) => {
  return (
    <div className="staff-panel" role="region" aria-label="Staff mixer panel">
      <h3 className="panel-title">Staves</h3>
      <div className="staff-list">
        {staves.map((staff, index) => (
          <div
            key={staff.id}
            className={`staff-item ${index === selectedStaff ? "selected" : ""}`}
            onClick={() => onSelectStaff(index)}
            role="button"
            tabIndex={0}
            aria-label={`Staff: ${staff.name}`}
            aria-selected={index === selectedStaff}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectStaff(index);
              }
            }}
          >
            <div className="staff-name">{staff.name}</div>
            <div className="staff-controls">
              <button
                className={`mute-btn ${staff.muted ? "active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onMuteToggle(index);
                }}
                aria-label={`${staff.muted ? "Unmute" : "Mute"} ${staff.name}`}
                aria-pressed={staff.muted}
                title={staff.muted ? "Unmute" : "Mute"}
              >
                M
              </button>
              <button
                className={`solo-btn ${staff.solo ? "active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSoloToggle(index);
                }}
                aria-label={`${staff.solo ? "Unsolo" : "Solo"} ${staff.name}`}
                aria-pressed={staff.solo}
                title={staff.solo ? "Unsolo" : "Solo"}
              >
                S
              </button>
              <input
                type="range"
                min={0}
                max={127}
                value={staff.volume}
                onChange={(e) =>
                  onVolumeChange(index, parseInt(e.target.value, 10))
                }
                onClick={(e) => e.stopPropagation()}
                aria-label={`Volume for ${staff.name}`}
                title={`Volume: ${staff.volume}`}
                className="volume-slider"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
