import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parseMusicXML, scoreToMusicXML } from "../src/core";

describe("MusicXML Sample File", () => {
  it("parses the sample MusicXML file correctly", () => {
    const xml = readFileSync(
      resolve(__dirname, "assets/sample-score.musicxml"),
      "utf-8"
    );
    const score = parseMusicXML(xml);

    expect(score.metadata.title).toBe("Sample Score");
    expect(score.metadata.composer).toBe("Test Composer");
    expect(score.staves).toHaveLength(1);
    expect(score.staves[0].measures).toHaveLength(2);
    expect(score.staves[0].measures[0].elements).toHaveLength(4);
    expect(score.staves[0].measures[1].elements).toHaveLength(4);
  });

  it("round-trips the sample MusicXML file", () => {
    const xml = readFileSync(
      resolve(__dirname, "assets/sample-score.musicxml"),
      "utf-8"
    );
    const score = parseMusicXML(xml);
    const exported = scoreToMusicXML(score);
    const reimported = parseMusicXML(exported);

    expect(reimported.metadata.title).toBe("Sample Score");
    expect(reimported.staves).toHaveLength(1);
    expect(reimported.staves[0].measures).toHaveLength(2);

    for (let mi = 0; mi < 2; mi++) {
      const origElements = score.staves[0].measures[mi].elements;
      const reimElements = reimported.staves[0].measures[mi].elements;
      expect(reimElements).toHaveLength(origElements.length);

      for (let ei = 0; ei < origElements.length; ei++) {
        const orig = origElements[ei];
        const reim = reimElements[ei];
        expect(reim.type).toBe(orig.type);
        if (orig.type === "note" && reim.type === "note") {
          expect(reim.pitch).toBe(orig.pitch);
          expect(reim.octave).toBe(orig.octave);
          expect(reim.duration).toBe(orig.duration);
        }
      }
    }
  });
});
