import { Score, cloneScore } from "./document-model";

export interface HistoryEntry {
  snapshot: Score;
  description: string;
  timestamp: number;
}

export class UndoManager {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private maxHistory: number;

  constructor(maxHistory: number = 100) {
    this.maxHistory = maxHistory;
  }

  pushState(score: Score, description: string): void {
    this.undoStack.push({
      snapshot: cloneScore(score),
      description,
      timestamp: Date.now(),
    });
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(currentScore: Score): Score | null {
    if (this.undoStack.length === 0) return null;
    const entry = this.undoStack.pop()!;
    this.redoStack.push({
      snapshot: cloneScore(currentScore),
      description: entry.description,
      timestamp: Date.now(),
    });
    return cloneScore(entry.snapshot);
  }

  redo(currentScore: Score): Score | null {
    if (this.redoStack.length === 0) return null;
    const entry = this.redoStack.pop()!;
    this.undoStack.push({
      snapshot: cloneScore(currentScore),
      description: entry.description,
      timestamp: Date.now(),
    });
    return cloneScore(entry.snapshot);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  getUndoDescription(): string | null {
    if (this.undoStack.length === 0) return null;
    return this.undoStack[this.undoStack.length - 1].description;
  }

  getRedoDescription(): string | null {
    if (this.redoStack.length === 0) return null;
    return this.redoStack[this.redoStack.length - 1].description;
  }
}
