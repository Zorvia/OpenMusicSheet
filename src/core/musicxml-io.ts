import {
  Score,
  Staff,
  Measure,
  MeasureElement,
  NoteElement,
  RestElement,
  ChordElement,
  NoteDuration,
  Clef,
  KeySignature,
  TimeSignature,
  Accidental,
  createId,
} from "./document-model";

const DURATION_TYPE_MAP: Record<string, NoteDuration> = {
  whole: "whole",
  half: "half",
  quarter: "quarter",
  eighth: "eighth",
  "16th": "16th",
  "32nd": "32nd",
};

const DURATION_TO_XML: Record<NoteDuration, string> = {
  whole: "whole",
  half: "half",
  quarter: "quarter",
  eighth: "eighth",
  "16th": "16th",
  "32nd": "32nd",
};

const CLEF_MAP: Record<string, Clef> = {
  G: "treble",
  F: "bass",
  C: "alto",
};

function getElementText(parent: Element, tag: string): string | null {
  const el = parent.getElementsByTagName(tag)[0];
  return el ? el.textContent : null;
}

function getElementInt(parent: Element, tag: string): number | null {
  const text = getElementText(parent, tag);
  return text !== null ? parseInt(text, 10) : null;
}

function parseAccidental(text: string): Accidental | undefined {
  const map: Record<string, Accidental> = {
    sharp: "sharp",
    flat: "flat",
    natural: "natural",
    "double-sharp": "double-sharp",
    "flat-flat": "double-flat",
  };
  return map[text];
}

export function parseMusicXML(xmlString: string): Score {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");

  const scorePartwise = doc.getElementsByTagName("score-partwise")[0];
  if (!scorePartwise) {
    throw new Error("Invalid MusicXML: missing score-partwise element");
  }

  const title = getElementText(doc.documentElement, "work-title")
    || getElementText(doc.documentElement, "movement-title")
    || "Imported Score";

  const composer = (() => {
    const identElements = doc.getElementsByTagName("identification");
    if (identElements.length > 0) {
      const creators = identElements[0].getElementsByTagName("creator");
      for (let i = 0; i < creators.length; i++) {
        if (creators[i].getAttribute("type") === "composer") {
          return creators[i].textContent || "";
        }
      }
    }
    return "";
  })();

  const now = new Date().toISOString();
  const score: Score = {
    id: createId(),
    version: "0.1.0",
    metadata: {
      title,
      composer,
      arranger: "",
      copyright: "",
      createdAt: now,
      modifiedAt: now,
    },
    staves: [],
    defaultTempo: 120,
    defaultTimeSignature: { beats: 4, beatType: 4 },
    defaultKeySignature: { fifths: 0, mode: "major" },
  };

  const partList = doc.getElementsByTagName("part-list")[0];
  const scoreParts = partList ? partList.getElementsByTagName("score-part") : [];
  const partNames: Record<string, string> = {};
  for (let i = 0; i < scoreParts.length; i++) {
    const pid = scoreParts[i].getAttribute("id") || `P${i + 1}`;
    const nameEl = scoreParts[i].getElementsByTagName("part-name")[0];
    partNames[pid] = nameEl ? nameEl.textContent || `Part ${i + 1}` : `Part ${i + 1}`;
  }

  const parts = scorePartwise.getElementsByTagName("part");
  for (let pi = 0; pi < parts.length; pi++) {
    const part = parts[pi];
    const partId = part.getAttribute("id") || `P${pi + 1}`;
    const staffName = partNames[partId] || `Part ${pi + 1}`;

    let currentClef: Clef = "treble";
    const staff: Staff = {
      id: createId(),
      name: staffName,
      shortName: staffName.substring(0, 3),
      clef: currentClef,
      measures: [],
      muted: false,
      solo: false,
      volume: 100,
      instrument: staffName,
      midiChannel: pi,
      midiProgram: 0,
    };

    const xmlMeasures = part.getElementsByTagName("measure");
    for (let mi = 0; mi < xmlMeasures.length; mi++) {
      const xmlMeasure = xmlMeasures[mi];
      const measure: Measure = {
        id: createId(),
        elements: [],
      };

      const attributes = xmlMeasure.getElementsByTagName("attributes")[0];
      if (attributes) {
        const keyEl = attributes.getElementsByTagName("key")[0];
        if (keyEl) {
          const fifths = getElementInt(keyEl, "fifths") || 0;
          const modeText = getElementText(keyEl, "mode") || "major";
          measure.keySignature = {
            fifths,
            mode: modeText === "minor" ? "minor" : "major",
          };
          if (mi === 0 && pi === 0) {
            score.defaultKeySignature = measure.keySignature;
          }
        }

        const timeEl = attributes.getElementsByTagName("time")[0];
        if (timeEl) {
          const beats = getElementInt(timeEl, "beats") || 4;
          const beatType = getElementInt(timeEl, "beat-type") || 4;
          measure.timeSignature = { beats, beatType };
          if (mi === 0 && pi === 0) {
            score.defaultTimeSignature = measure.timeSignature;
          }
        }

        const clefEl = attributes.getElementsByTagName("clef")[0];
        if (clefEl) {
          const sign = getElementText(clefEl, "sign") || "G";
          currentClef = CLEF_MAP[sign] || "treble";
          measure.clef = currentClef;
          if (mi === 0) {
            staff.clef = currentClef;
          }
        }
      }

      const directionEls = xmlMeasure.getElementsByTagName("direction");
      for (let di = 0; di < directionEls.length; di++) {
        const soundEl = directionEls[di].getElementsByTagName("sound")[0];
        if (soundEl) {
          const tempoAttr = soundEl.getAttribute("tempo");
          if (tempoAttr) {
            measure.tempo = parseFloat(tempoAttr);
            if (mi === 0 && pi === 0) {
              score.defaultTempo = measure.tempo;
            }
          }
        }
      }

      const children = xmlMeasure.children;
      let pendingChordNotes: NoteElement[] = [];
      let lastDuration: NoteDuration = "quarter";
      let lastDotted = false;

      for (let ci = 0; ci < children.length; ci++) {
        const child = children[ci];
        if (child.tagName !== "note") continue;

        const isChord = child.getElementsByTagName("chord").length > 0;
        const isRest = child.getElementsByTagName("rest").length > 0;
        const typeEl = getElementText(child, "type");
        const duration = typeEl ? DURATION_TYPE_MAP[typeEl] || "quarter" : "quarter";
        const dotted = child.getElementsByTagName("dot").length > 0;

        if (isRest) {
          if (pendingChordNotes.length > 0) {
            flushChord(pendingChordNotes, lastDuration, lastDotted, measure);
            pendingChordNotes = [];
          }
          const rest: RestElement = {
            id: createId(),
            type: "rest",
            duration,
            dotted,
          };
          measure.elements.push(rest);
          continue;
        }

        const pitchEl = child.getElementsByTagName("pitch")[0];
        if (!pitchEl) continue;

        const step = getElementText(pitchEl, "step") || "C";
        const octave = getElementInt(pitchEl, "octave") || 4;
        const alter = getElementInt(pitchEl, "alter");

        let accidental: Accidental | undefined;
        const accidentalEl = child.getElementsByTagName("accidental")[0];
        if (accidentalEl && accidentalEl.textContent) {
          accidental = parseAccidental(accidentalEl.textContent);
        } else if (alter === 1) {
          accidental = "sharp";
        } else if (alter === -1) {
          accidental = "flat";
        }

        const tieEls = child.getElementsByTagName("tie");
        let tied = false;
        for (let ti = 0; ti < tieEls.length; ti++) {
          if (tieEls[ti].getAttribute("type") === "start") {
            tied = true;
          }
        }

        const noteEl: NoteElement = {
          id: createId(),
          type: "note",
          pitch: step,
          octave,
          duration,
          dotted,
          accidental,
          tied,
          articulations: [],
          velocity: 80,
        };

        const lyricEl = child.getElementsByTagName("lyric")[0];
        if (lyricEl) {
          noteEl.lyrics = getElementText(lyricEl, "text") || undefined;
        }

        if (isChord) {
          pendingChordNotes.push(noteEl);
        } else {
          if (pendingChordNotes.length > 0) {
            flushChord(pendingChordNotes, lastDuration, lastDotted, measure);
            pendingChordNotes = [];
          }
          pendingChordNotes.push(noteEl);
          lastDuration = duration;
          lastDotted = dotted;
        }
      }

      if (pendingChordNotes.length > 0) {
        flushChord(pendingChordNotes, lastDuration, lastDotted, measure);
      }

      staff.measures.push(measure);
    }

    score.staves.push(staff);
  }

  return score;
}

function flushChord(
  notes: NoteElement[],
  duration: NoteDuration,
  dotted: boolean,
  measure: Measure
): void {
  if (notes.length === 1) {
    measure.elements.push(notes[0]);
  } else {
    const chord: ChordElement = {
      id: createId(),
      type: "chord",
      notes: notes.map((n) => ({
        pitch: n.pitch,
        octave: n.octave,
        accidental: n.accidental,
        tied: n.tied,
        articulations: n.articulations,
        dynamics: n.dynamics,
        lyrics: n.lyrics,
        graceNote: n.graceNote,
        tuplet: n.tuplet,
        beamGroup: n.beamGroup,
        slurStart: n.slurStart,
        slurEnd: n.slurEnd,
        chordSymbol: n.chordSymbol,
        velocity: n.velocity,
      })),
      duration,
      dotted,
      articulations: [],
      velocity: 80,
    };
    measure.elements.push(chord);
  }
}

export function scoreToMusicXML(score: Score): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n';
  xml += '<score-partwise version="4.0">\n';

  xml += "  <work>\n";
  xml += `    <work-title>${escapeXml(score.metadata.title)}</work-title>\n`;
  xml += "  </work>\n";

  if (score.metadata.composer) {
    xml += "  <identification>\n";
    xml += `    <creator type="composer">${escapeXml(score.metadata.composer)}</creator>\n`;
    xml += "  </identification>\n";
  }

  xml += "  <part-list>\n";
  score.staves.forEach((staff, idx) => {
    xml += `    <score-part id="P${idx + 1}">\n`;
    xml += `      <part-name>${escapeXml(staff.name)}</part-name>\n`;
    xml += `    </score-part>\n`;
  });
  xml += "  </part-list>\n";

  score.staves.forEach((staff, staffIdx) => {
    xml += `  <part id="P${staffIdx + 1}">\n`;

    staff.measures.forEach((measure, measureIdx) => {
      xml += `    <measure number="${measureIdx + 1}">\n`;

      if (measureIdx === 0 || measure.keySignature || measure.timeSignature || measure.clef) {
        xml += "      <attributes>\n";
        if (measureIdx === 0) {
          xml += "        <divisions>1</divisions>\n";
        }
        const ks = measure.keySignature || (measureIdx === 0 ? score.defaultKeySignature : undefined);
        if (ks) {
          xml += "        <key>\n";
          xml += `          <fifths>${ks.fifths}</fifths>\n`;
          xml += `          <mode>${ks.mode}</mode>\n`;
          xml += "        </key>\n";
        }
        const ts = measure.timeSignature || (measureIdx === 0 ? score.defaultTimeSignature : undefined);
        if (ts) {
          xml += "        <time>\n";
          xml += `          <beats>${ts.beats}</beats>\n`;
          xml += `          <beat-type>${ts.beatType}</beat-type>\n`;
          xml += "        </time>\n";
        }
        const clef = measure.clef || (measureIdx === 0 ? staff.clef : undefined);
        if (clef) {
          xml += "        <clef>\n";
          xml += `          <sign>${clefToSign(clef)}</sign>\n`;
          xml += `          <line>${clefToLine(clef)}</line>\n`;
          xml += "        </clef>\n";
        }
        xml += "      </attributes>\n";
      }

      const tempo = measure.tempo || (measureIdx === 0 ? score.defaultTempo : undefined);
      if (tempo) {
        xml += "      <direction placement=\"above\">\n";
        xml += "        <direction-type>\n";
        xml += `          <metronome><beat-unit>quarter</beat-unit><per-minute>${tempo}</per-minute></metronome>\n`;
        xml += "        </direction-type>\n";
        xml += `        <sound tempo="${tempo}"/>\n`;
        xml += "      </direction>\n";
      }

      for (const element of measure.elements) {
        if (element.type === "rest") {
          xml += "      <note>\n";
          xml += "        <rest/>\n";
          xml += `        <duration>${durationToXmlDuration(element.duration)}</duration>\n`;
          xml += `        <type>${DURATION_TO_XML[element.duration]}</type>\n`;
          if (element.dotted) {
            xml += "        <dot/>\n";
          }
          xml += "      </note>\n";
        } else if (element.type === "note") {
          xml += noteToXml(element, false);
        } else if (element.type === "chord") {
          element.notes.forEach((n, ni) => {
            const noteEl: NoteElement = {
              id: createId(),
              type: "note",
              pitch: n.pitch,
              octave: n.octave,
              duration: element.duration,
              dotted: element.dotted,
              accidental: n.accidental,
              tied: n.tied,
              articulations: n.articulations,
              dynamics: n.dynamics,
              lyrics: n.lyrics,
              velocity: n.velocity,
            };
            xml += noteToXml(noteEl, ni > 0);
          });
        }
      }

      xml += "    </measure>\n";
    });

    xml += "  </part>\n";
  });

  xml += "</score-partwise>\n";
  return xml;
}

function noteToXml(note: NoteElement, isChord: boolean): string {
  let xml = "      <note>\n";
  if (isChord) {
    xml += "        <chord/>\n";
  }
  xml += "        <pitch>\n";
  xml += `          <step>${note.pitch}</step>\n`;
  if (note.accidental === "sharp") {
    xml += "          <alter>1</alter>\n";
  } else if (note.accidental === "flat") {
    xml += "          <alter>-1</alter>\n";
  }
  xml += `          <octave>${note.octave}</octave>\n`;
  xml += "        </pitch>\n";
  xml += `        <duration>${durationToXmlDuration(note.duration)}</duration>\n`;
  xml += `        <type>${DURATION_TO_XML[note.duration]}</type>\n`;
  if (note.dotted) {
    xml += "        <dot/>\n";
  }
  if (note.accidental) {
    xml += `        <accidental>${note.accidental}</accidental>\n`;
  }
  if (note.tied) {
    xml += '        <tie type="start"/>\n';
  }
  if (note.lyrics) {
    xml += "        <lyric>\n";
    xml += `          <text>${escapeXml(note.lyrics)}</text>\n`;
    xml += "        </lyric>\n";
  }
  xml += "      </note>\n";
  return xml;
}

function durationToXmlDuration(duration: NoteDuration): number {
  const map: Record<NoteDuration, number> = {
    whole: 4,
    half: 2,
    quarter: 1,
    eighth: 1,
    "16th": 1,
    "32nd": 1,
  };
  return map[duration];
}

function clefToSign(clef: Clef): string {
  const map: Record<Clef, string> = {
    treble: "G",
    bass: "F",
    alto: "C",
    tenor: "C",
  };
  return map[clef];
}

function clefToLine(clef: Clef): number {
  const map: Record<Clef, number> = {
    treble: 2,
    bass: 4,
    alto: 3,
    tenor: 4,
  };
  return map[clef];
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
