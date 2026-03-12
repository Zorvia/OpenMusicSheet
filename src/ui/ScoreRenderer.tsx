import React, { useRef, useEffect, useCallback } from "react";
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental, Dot, GhostNote, StaveConnector } from "vexflow";
import { Score, Clef, NoteDuration, MeasureElement } from "../core/document-model";

interface ScoreRendererProps {
  score: Score;
  selectedStaff: number;
  selectedMeasure: number;
  selectedElement: number | null;
  currentPlaybackMeasure: number | null;
  onElementClick: (staffIndex: number, measureIndex: number, elementIndex: number) => void;
  onMeasureClick: (staffIndex: number, measureIndex: number) => void;
}

const STAFF_HEIGHT = 120;
const MEASURE_MIN_WIDTH = 180;
const STAFF_Y_OFFSET = 40;
const LEFT_MARGIN = 60;
const TOP_MARGIN = 60;

const DURATION_MAP: Record<NoteDuration, string> = {
  whole: "w",
  half: "h",
  quarter: "q",
  eighth: "8",
  "16th": "16",
  "32nd": "32",
};

function clefToVexflow(clef: Clef): string {
  switch (clef) {
    case "treble": return "treble";
    case "bass": return "bass";
    case "alto": return "alto";
    case "tenor": return "tenor";
    default: return "treble";
  }
}

function pitchToVexKey(pitch: string, octave: number, accidental?: string): string {
  let key = pitch.toLowerCase();
  if (accidental === "sharp") key += "#";
  else if (accidental === "flat") key += "b";
  else if (accidental === "double-sharp") key += "##";
  else if (accidental === "double-flat") key += "bb";
  return `${key}/${octave}`;
}

function createVexNote(element: MeasureElement, clef: string): StaveNote | GhostNote {
  const vexDuration = DURATION_MAP[element.duration];

  if (element.type === "rest") {
    return new StaveNote({
      keys: [clef === "bass" ? "d/3" : "b/4"],
      duration: `${vexDuration}r`,
      clef,
    });
  }

  if (element.type === "note") {
    const key = pitchToVexKey(element.pitch, element.octave, element.accidental);
    const note = new StaveNote({
      keys: [key],
      duration: vexDuration,
      clef,
    });

    if (element.accidental) {
      const accMap: Record<string, string> = {
        sharp: "#",
        flat: "b",
        natural: "n",
        "double-sharp": "##",
        "double-flat": "bb",
      };
      if (accMap[element.accidental]) {
        note.addModifier(new Accidental(accMap[element.accidental]));
      }
    }

    if (element.dotted) {
      Dot.buildAndAttach([note]);
    }

    return note;
  }

  if (element.type === "chord") {
    const keys = element.notes.map((n) =>
      pitchToVexKey(n.pitch, n.octave, n.accidental)
    );
    const note = new StaveNote({
      keys,
      duration: vexDuration,
      clef,
    });

    element.notes.forEach((n, i) => {
      if (n.accidental) {
        const accMap: Record<string, string> = {
          sharp: "#",
          flat: "b",
          natural: "n",
          "double-sharp": "##",
          "double-flat": "bb",
        };
        if (accMap[n.accidental]) {
          note.addModifier(new Accidental(accMap[n.accidental]), i);
        }
      }
    });

    if (element.dotted) {
      Dot.buildAndAttach([note]);
    }

    return note;
  }

  return new GhostNote({ duration: vexDuration });
}

export const ScoreRenderer: React.FC<ScoreRendererProps> = ({
  score,
  selectedStaff,
  selectedMeasure,
  selectedElement,
  currentPlaybackMeasure,
  onElementClick,
  onMeasureClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);

  const render = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = "";

    const measuresPerLine = Math.max(
      1,
      Math.floor((container.clientWidth - LEFT_MARGIN - 20) / MEASURE_MIN_WIDTH)
    );
    const measureWidth = (container.clientWidth - LEFT_MARGIN - 20) / measuresPerLine;

    const totalMeasures = score.staves[0]?.measures.length || 0;
    const numLines = Math.ceil(totalMeasures / measuresPerLine);

    const totalHeight =
      TOP_MARGIN +
      numLines * (score.staves.length * STAFF_HEIGHT + STAFF_Y_OFFSET) +
      50;

    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(container.clientWidth, Math.max(totalHeight, 400));
    rendererRef.current = renderer;
    const context = renderer.getContext();

    const titleFontSize = 20;
    context.setFont("serif", titleFontSize);
    context.fillText(
      score.metadata.title,
      container.clientWidth / 2 - score.metadata.title.length * 4,
      30
    );

    if (score.metadata.composer) {
      context.setFont("serif", 12);
      context.fillText(
        score.metadata.composer,
        container.clientWidth - 150,
        45
      );
    }

    for (let line = 0; line < numLines; line++) {
      const startMeasure = line * measuresPerLine;
      const endMeasure = Math.min(startMeasure + measuresPerLine, totalMeasures);
      const lineY =
        TOP_MARGIN + line * (score.staves.length * STAFF_HEIGHT + STAFF_Y_OFFSET);

      for (let si = 0; si < score.staves.length; si++) {
        const staff = score.staves[si];
        const staffY = lineY + si * STAFF_HEIGHT;

        for (let mi = startMeasure; mi < endMeasure; mi++) {
          const measure = staff.measures[mi];
          if (!measure) continue;

          const measureX = LEFT_MARGIN + (mi - startMeasure) * measureWidth;
          const isSelected = si === selectedStaff && mi === selectedMeasure;
          const isPlayback = mi === currentPlaybackMeasure;

          const stave = new Stave(measureX, staffY, measureWidth);

          if (mi === startMeasure) {
            const clefStr = clefToVexflow(measure.clef || staff.clef);
            stave.addClef(clefStr);

            const ts = measure.timeSignature || (mi === 0 ? score.defaultTimeSignature : undefined);
            if (ts) {
              stave.addTimeSignature(`${ts.beats}/${ts.beatType}`);
            }

            const ks = measure.keySignature || (mi === 0 ? score.defaultKeySignature : undefined);
            if (ks && ks.fifths !== 0) {
              const keyMap: Record<number, string> = {
                "-7": "Cb", "-6": "Gb", "-5": "Db", "-4": "Ab", "-3": "Eb",
                "-2": "Bb", "-1": "F", 0: "C", 1: "G", 2: "D",
                3: "A", 4: "E", 5: "B", 6: "F#", 7: "C#",
              };
              const keyStr = keyMap[ks.fifths] || "C";
              stave.addKeySignature(keyStr);
            }
          }

          stave.setContext(context);
          stave.draw();

          if (isSelected) {
            context.save();
            context.setFillStyle("rgba(66, 133, 244, 0.08)");
            context.fillRect(measureX, staffY, measureWidth, STAFF_HEIGHT - 20);
            context.restore();
          }

          if (isPlayback) {
            context.save();
            context.setFillStyle("rgba(76, 175, 80, 0.1)");
            context.fillRect(measureX, staffY, measureWidth, STAFF_HEIGHT - 20);
            context.restore();
          }

          if (measure.elements.length > 0) {
            try {
              const clefStr = clefToVexflow(measure.clef || staff.clef);
              const vexNotes = measure.elements.map((el) =>
                createVexNote(el, clefStr)
              );

              const voice = new Voice({ num_beats: 4, beat_value: 4 }).setMode(
                Voice.Mode.SOFT
              );
              voice.addTickables(vexNotes);

              new Formatter()
                .joinVoices([voice])
                .format([voice], measureWidth - 40);

              voice.draw(context, stave);

              measure.elements.forEach((el, ei) => {
                if (
                  si === selectedStaff &&
                  mi === selectedMeasure &&
                  ei === selectedElement
                ) {
                  const noteGlyph = vexNotes[ei];
                  if (noteGlyph && "getBoundingBox" in noteGlyph) {
                    const box = (noteGlyph as StaveNote).getBoundingBox();
                    if (box) {
                      context.save();
                      context.setStrokeStyle("rgba(66, 133, 244, 0.6)");
                      context.setLineWidth(2);
                      context.beginPath();
                      context.rect(box.getX() - 2, box.getY() - 2, box.getW() + 4, box.getH() + 4);
                      context.stroke();
                      context.restore();
                    }
                  }
                }
              });
            } catch (_) {
            }
          }
        }
      }
    }
  }, [score, selectedStaff, selectedMeasure, selectedElement, currentPlaybackMeasure, onElementClick, onMeasureClick]);

  useEffect(() => {
    render();
    const handleResize = () => render();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [render]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const measuresPerLine = Math.max(
        1,
        Math.floor((containerRef.current.clientWidth - LEFT_MARGIN - 20) / MEASURE_MIN_WIDTH)
      );
      const measureWidth =
        (containerRef.current.clientWidth - LEFT_MARGIN - 20) / measuresPerLine;

      const totalMeasures = score.staves[0]?.measures.length || 0;
      const numLines = Math.ceil(totalMeasures / measuresPerLine);

      for (let line = 0; line < numLines; line++) {
        const lineY =
          TOP_MARGIN +
          line * (score.staves.length * STAFF_HEIGHT + STAFF_Y_OFFSET);

        for (let si = 0; si < score.staves.length; si++) {
          const staffY = lineY + si * STAFF_HEIGHT;

          if (y >= staffY && y < staffY + STAFF_HEIGHT) {
            const startMeasure = line * measuresPerLine;
            const relX = x - LEFT_MARGIN;
            if (relX >= 0) {
              const mi = startMeasure + Math.floor(relX / measureWidth);
              if (mi < totalMeasures) {
                onMeasureClick(si, mi);

                const measure = score.staves[si]?.measures[mi];
                if (measure && measure.elements.length > 0) {
                  const measureLocalX = relX - (mi - startMeasure) * measureWidth;
                  const elementWidth = measureWidth / measure.elements.length;
                  const ei = Math.floor(measureLocalX / elementWidth);
                  if (ei >= 0 && ei < measure.elements.length) {
                    onElementClick(si, mi, ei);
                  }
                }
                return;
              }
            }
          }
        }
      }
    },
    [score, onElementClick, onMeasureClick]
  );

  return (
    <div
      ref={containerRef}
      className="score-renderer"
      onClick={handleClick}
      role="img"
      aria-label={`Musical score: ${score.metadata.title}`}
      tabIndex={0}
      style={{
        width: "100%",
        minHeight: "400px",
        overflow: "auto",
        backgroundColor: "#fff",
        cursor: "pointer",
      }}
    />
  );
};
