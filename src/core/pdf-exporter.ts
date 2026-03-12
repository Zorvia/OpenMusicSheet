import { Score, durationToTicks, pitchToMidi } from "./document-model";
import { jsPDF } from "jspdf";

export interface PdfExportOptions {
  pageWidth: number;
  pageHeight: number;
  marginTop: number;
  marginLeft: number;
  marginRight: number;
  marginBottom: number;
  staffSpacing: number;
  measureWidth: number;
  staffLineSpacing: number;
  fontSize: number;
}

const DEFAULT_OPTIONS: PdfExportOptions = {
  pageWidth: 210,
  pageHeight: 297,
  marginTop: 25,
  marginLeft: 15,
  marginRight: 15,
  marginBottom: 20,
  staffSpacing: 30,
  measureWidth: 40,
  staffLineSpacing: 2,
  fontSize: 10,
};

export function exportPdf(score: Score, opts?: Partial<PdfExportOptions>): jsPDF {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [options.pageWidth, options.pageHeight],
  });

  const contentWidth = options.pageWidth - options.marginLeft - options.marginRight;
  const measuresPerLine = Math.max(1, Math.floor(contentWidth / options.measureWidth));

  doc.setFontSize(18);
  doc.text(score.metadata.title, options.pageWidth / 2, options.marginTop - 10, {
    align: "center",
  });

  if (score.metadata.composer) {
    doc.setFontSize(12);
    doc.text(
      score.metadata.composer,
      options.pageWidth - options.marginRight,
      options.marginTop - 3,
      { align: "right" }
    );
  }

  let currentY = options.marginTop;

  const totalMeasures = score.staves[0]?.measures.length || 0;
  const numLines = Math.ceil(totalMeasures / measuresPerLine);

  for (let line = 0; line < numLines; line++) {
    const startMeasure = line * measuresPerLine;
    const endMeasure = Math.min(startMeasure + measuresPerLine, totalMeasures);
    const numMeasuresInLine = endMeasure - startMeasure;
    const actualMeasureWidth = contentWidth / numMeasuresInLine;

    for (let si = 0; si < score.staves.length; si++) {
      const staff = score.staves[si];

      if (currentY + 20 > options.pageHeight - options.marginBottom) {
        doc.addPage();
        currentY = options.marginTop;
      }

      if (line === 0) {
        doc.setFontSize(8);
        doc.text(staff.shortName, options.marginLeft - 2, currentY + 4, {
          align: "right",
        });
      }

      drawStaffLines(doc, options.marginLeft, currentY, contentWidth, options.staffLineSpacing);

      for (let mi = startMeasure; mi < endMeasure; mi++) {
        const measure = staff.measures[mi];
        const measureX = options.marginLeft + (mi - startMeasure) * actualMeasureWidth;

        doc.setDrawColor(0);
        doc.setLineWidth(0.3);
        doc.line(
          measureX + actualMeasureWidth,
          currentY,
          measureX + actualMeasureWidth,
          currentY + 4 * options.staffLineSpacing
        );

        if (measure.elements.length > 0) {
          const elementWidth = actualMeasureWidth / measure.elements.length;
          for (let ei = 0; ei < measure.elements.length; ei++) {
            const element = measure.elements[ei];
            const ex = measureX + ei * elementWidth + elementWidth / 2;

            if (element.type === "note") {
              const noteY = getNoteY(
                element.pitch,
                element.octave,
                staff.clef,
                currentY,
                options.staffLineSpacing
              );
              drawNoteHead(doc, ex, noteY, element.duration);
              if (element.duration !== "whole" && element.duration !== "half") {
                doc.line(ex + 1.2, noteY, ex + 1.2, noteY - 7);
              }
            } else if (element.type === "rest") {
              const restY = currentY + 2 * options.staffLineSpacing;
              doc.setFontSize(8);
              doc.text(getRestSymbol(element.duration), ex - 1, restY + 1);
            } else if (element.type === "chord") {
              for (const n of element.notes) {
                const noteY = getNoteY(
                  n.pitch,
                  n.octave,
                  staff.clef,
                  currentY,
                  options.staffLineSpacing
                );
                drawNoteHead(doc, ex, noteY, element.duration);
              }
              if (element.duration !== "whole" && element.duration !== "half") {
                const topY = Math.min(
                  ...element.notes.map((n) =>
                    getNoteY(n.pitch, n.octave, staff.clef, currentY, options.staffLineSpacing)
                  )
                );
                doc.line(ex + 1.2, topY, ex + 1.2, topY - 7);
              }
            }
          }
        }
      }

      currentY += options.staffSpacing;
    }

    currentY += 5;
  }

  return doc;
}

function drawStaffLines(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  spacing: number
): void {
  doc.setDrawColor(0);
  doc.setLineWidth(0.15);
  for (let i = 0; i < 5; i++) {
    doc.line(x, y + i * spacing, x + width, y + i * spacing);
  }
}

function drawNoteHead(
  doc: jsPDF,
  x: number,
  y: number,
  duration: string
): void {
  if (duration === "whole" || duration === "half") {
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.ellipse(x, y, 1.5, 1, "S");
  } else {
    doc.setFillColor(0, 0, 0);
    doc.ellipse(x, y, 1.5, 1, "F");
  }
}

function getNoteY(
  pitch: string,
  octave: number,
  clef: string,
  staffTop: number,
  lineSpacing: number
): number {
  const treblePositions: Record<string, number> = {
    F5: 0, E5: 0.5, D5: 1, C5: 1.5, B4: 2, A4: 2.5,
    G4: 3, F4: 3.5, E4: 4, D4: 4.5, C4: 5,
    B3: 5.5, A3: 6, G3: 6.5, F3: 7,
  };

  const bassPositions: Record<string, number> = {
    A3: 0, G3: 0.5, F3: 1, E3: 1.5, D3: 2, C3: 2.5,
    B2: 3, A2: 3.5, G2: 4, F2: 4.5, E2: 5,
  };

  const key = `${pitch}${octave}`;
  const positions = clef === "bass" ? bassPositions : treblePositions;
  const pos = positions[key] ?? 3;
  return staffTop + pos * lineSpacing;
}

function getRestSymbol(duration: string): string {
  switch (duration) {
    case "whole": return "\u2014";
    case "half": return "\u2013";
    case "quarter": return "\u2669";
    case "eighth": return "\u266A";
    default: return "\u2669";
  }
}
