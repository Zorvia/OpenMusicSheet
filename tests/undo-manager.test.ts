import { describe, it, expect } from "vitest";
import { UndoManager } from "../src/core/undo-manager";
import { createScore, addNote } from "../src/core";

describe("UndoManager", () => {
  it("supports undo", () => {
    const manager = new UndoManager();
    const score1 = createScore("V1");
    const score2 = addNote(score1, 0, 0, "C", 4);
    manager.pushState(score1, "initial");
    const restored = manager.undo(score2);
    expect(restored).not.toBeNull();
    expect(restored!.staves[0].measures[0].elements).toHaveLength(0);
  });

  it("supports redo", () => {
    const manager = new UndoManager();
    const score1 = createScore("V1");
    const score2 = addNote(score1, 0, 0, "C", 4);
    manager.pushState(score1, "initial");
    manager.undo(score2);
    const redone = manager.redo(score1);
    expect(redone).not.toBeNull();
  });

  it("tracks canUndo and canRedo", () => {
    const manager = new UndoManager();
    expect(manager.canUndo()).toBe(false);
    expect(manager.canRedo()).toBe(false);

    const score = createScore("Test");
    manager.pushState(score, "test");
    expect(manager.canUndo()).toBe(true);
    expect(manager.canRedo()).toBe(false);
  });

  it("clears history", () => {
    const manager = new UndoManager();
    const score = createScore("Test");
    manager.pushState(score, "test");
    manager.clear();
    expect(manager.canUndo()).toBe(false);
  });

  it("respects max history", () => {
    const manager = new UndoManager(3);
    const score = createScore("Test");
    for (let i = 0; i < 5; i++) {
      manager.pushState(score, `step ${i}`);
    }
    let count = 0;
    while (manager.canUndo()) {
      manager.undo(score);
      count++;
    }
    expect(count).toBe(3);
  });
});
