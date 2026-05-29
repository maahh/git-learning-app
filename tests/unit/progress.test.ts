import { describe, expect, it } from "vitest";
import {
  isValidProgress,
  loadProgress,
  markChapterCompleted,
  markDrillCompleted,
  progressKey,
  saveProgress,
  setLastChapter,
  setLastDrill,
} from "../../src/lib/progress";

function memoryStorage(initial?: string) {
  const store = new Map<string, string>();
  if (initial) store.set(progressKey, initial);
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  } satisfies Storage;
}

describe("progress", () => {
  it("accepts valid progress", () => {
    expect(isValidProgress({ version: 1, completed: [1], lastChapter: 2 })).toBe(true);
    expect(
      isValidProgress({
        version: 1,
        completed: [1],
        lastChapter: 2,
        drillCompleted: [3],
        lastDrill: 3,
      }),
    ).toBe(true);
  });

  it("rejects invalid progress", () => {
    expect(isValidProgress({ version: 1, completed: ["1"], lastChapter: 2 })).toBe(false);
  });

  it("loads default progress for missing or broken storage value", () => {
    expect(loadProgress(memoryStorage()).completed).toEqual([]);
    expect(loadProgress(memoryStorage("{broken")).lastChapter).toBe(1);
  });

  it("saves and loads progress", () => {
    const storage = memoryStorage();
    saveProgress(
      { version: 1, completed: [2], lastChapter: 2, drillCompleted: [4], lastDrill: 4 },
      storage,
    );

    expect(loadProgress(storage)).toEqual({
      version: 1,
      completed: [2],
      lastChapter: 2,
      drillCompleted: [4],
      lastDrill: 4,
    });
  });

  it("marks completion once and keeps chapters sorted", () => {
    const storage = memoryStorage();
    markChapterCompleted(2, storage);
    markChapterCompleted(1, storage);
    markChapterCompleted(2, storage);

    expect(loadProgress(storage).completed).toEqual([1, 2]);
  });

  it("stores last chapter", () => {
    const storage = memoryStorage();
    setLastChapter(2, storage);

    expect(loadProgress(storage).lastChapter).toBe(2);
  });

  it("marks drill completion and stores last drill", () => {
    const storage = memoryStorage();
    markDrillCompleted(2, storage);
    markDrillCompleted(1, storage);
    markDrillCompleted(2, storage);

    expect(loadProgress(storage).drillCompleted).toEqual([1, 2]);
    expect(loadProgress(storage).lastDrill).toBe(2);
  });

  it("stores last drill", () => {
    const storage = memoryStorage();
    setLastDrill(3, storage);

    expect(loadProgress(storage).lastDrill).toBe(3);
  });
});
