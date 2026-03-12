import { describe, it, expect } from "vitest";
import {
  createScore,
  addNote,
  addRest,
  removeElement,
  addStaff,
  removeStaff,
  addMeasure,
  removeMeasure,
  setTimeSignature,
  setKeySignature,
  setTempo,
  setStaffMute,
  setStaffSolo,
  setStaffVolume,
  updateMetadata,
  duplicateMeasure,
} from "../src/core";

describe("Score Mutations", () => {
  it("adds a note to a measure", () => {
    const score = createScore("Test");
    const updated = addNote(score, 0, 0, "C", 4, "quarter");
    expect(updated.staves[0].measures[0].elements).toHaveLength(1);
    const el = updated.staves[0].measures[0].elements[0];
    expect(el.type).toBe("note");
    if (el.type === "note") {
      expect(el.pitch).toBe("C");
      expect(el.octave).toBe(4);
    }
  });

  it("preserves immutability on addNote", () => {
    const score = createScore("Test");
    const updated = addNote(score, 0, 0, "D", 4, "half");
    expect(score.staves[0].measures[0].elements).toHaveLength(0);
    expect(updated.staves[0].measures[0].elements).toHaveLength(1);
  });

  it("adds a rest to a measure", () => {
    const score = createScore("Test");
    const updated = addRest(score, 0, 0, "quarter");
    expect(updated.staves[0].measures[0].elements).toHaveLength(1);
    expect(updated.staves[0].measures[0].elements[0].type).toBe("rest");
  });

  it("removes an element by id", () => {
    let score = createScore("Test");
    score = addNote(score, 0, 0, "C", 4);
    score = addNote(score, 0, 0, "D", 4);
    const id = score.staves[0].measures[0].elements[0].id;
    const updated = removeElement(score, 0, 0, id);
    expect(updated.staves[0].measures[0].elements).toHaveLength(1);
  });

  it("adds a staff", () => {
    const score = createScore("Test");
    const updated = addStaff(score, "Bass", "bass");
    expect(updated.staves).toHaveLength(2);
    expect(updated.staves[1].name).toBe("Bass");
    expect(updated.staves[1].clef).toBe("bass");
  });

  it("removes a staff (keeps at least one)", () => {
    let score = createScore("Test");
    score = addStaff(score, "Bass", "bass");
    const updated = removeStaff(score, 1);
    expect(updated.staves).toHaveLength(1);
    const noChange = removeStaff(updated, 0);
    expect(noChange.staves).toHaveLength(1);
  });

  it("adds a measure to all staves", () => {
    let score = createScore("Test");
    score = addStaff(score, "Bass", "bass");
    const updated = addMeasure(score);
    expect(updated.staves[0].measures.length).toBe(
      score.staves[0].measures.length + 1
    );
    expect(updated.staves[1].measures.length).toBe(
      score.staves[1].measures.length + 1
    );
  });

  it("removes a measure from all staves", () => {
    const score = createScore("Test");
    const measureCount = score.staves[0].measures.length;
    const updated = removeMeasure(score, measureCount - 1);
    expect(updated.staves[0].measures.length).toBe(measureCount - 1);
  });

  it("sets time signature", () => {
    const score = createScore("Test");
    const updated = setTimeSignature(score, 0, { beats: 3, beatType: 4 });
    expect(updated.defaultTimeSignature).toEqual({ beats: 3, beatType: 4 });
    expect(updated.staves[0].measures[0].timeSignature).toEqual({
      beats: 3,
      beatType: 4,
    });
  });

  it("sets key signature", () => {
    const score = createScore("Test");
    const updated = setKeySignature(score, 0, { fifths: 2, mode: "major" });
    expect(updated.defaultKeySignature).toEqual({ fifths: 2, mode: "major" });
  });

  it("sets tempo", () => {
    const score = createScore("Test");
    const updated = setTempo(score, 0, 140);
    expect(updated.defaultTempo).toBe(140);
  });

  it("toggles staff mute", () => {
    const score = createScore("Test");
    const muted = setStaffMute(score, 0, true);
    expect(muted.staves[0].muted).toBe(true);
    const unmuted = setStaffMute(muted, 0, false);
    expect(unmuted.staves[0].muted).toBe(false);
  });

  it("toggles staff solo", () => {
    const score = createScore("Test");
    const soloed = setStaffSolo(score, 0, true);
    expect(soloed.staves[0].solo).toBe(true);
  });

  it("sets staff volume within bounds", () => {
    const score = createScore("Test");
    const updated = setStaffVolume(score, 0, 80);
    expect(updated.staves[0].volume).toBe(80);
    const clamped = setStaffVolume(score, 0, 200);
    expect(clamped.staves[0].volume).toBe(127);
  });

  it("updates metadata", () => {
    const score = createScore("Test");
    const updated = updateMetadata(score, {
      composer: "Bach",
      title: "New Title",
    });
    expect(updated.metadata.composer).toBe("Bach");
    expect(updated.metadata.title).toBe("New Title");
  });

  it("duplicates a measure", () => {
    let score = createScore("Test");
    score = addNote(score, 0, 0, "C", 4);
    const updated = duplicateMeasure(score, 0);
    expect(updated.staves[0].measures.length).toBe(
      score.staves[0].measures.length + 1
    );
    expect(updated.staves[0].measures[1].elements).toHaveLength(1);
    expect(updated.staves[0].measures[1].elements[0].id).not.toBe(
      updated.staves[0].measures[0].elements[0].id
    );
  });
});
