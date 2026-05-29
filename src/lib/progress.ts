export const progressKey = "claude-git-app-v5:progress";

export type Progress = {
  version: 1;
  completed: number[];
  lastChapter: number;
};

export const defaultProgress: Progress = {
  version: 1,
  completed: [],
  lastChapter: 1,
};

export function isValidProgress(value: unknown): value is Progress {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const progress = value as Partial<Progress>;
  return (
    progress.version === 1 &&
    Array.isArray(progress.completed) &&
    progress.completed.every((chapter) => Number.isInteger(chapter)) &&
    typeof progress.lastChapter === "number" &&
    Number.isInteger(progress.lastChapter)
  );
}

export function loadProgress(storage = globalThis.localStorage): Progress {
  try {
    const raw = storage.getItem(progressKey);
    if (!raw) return cloneDefaultProgress();
    const parsed: unknown = JSON.parse(raw);
    return isValidProgress(parsed) ? parsed : cloneDefaultProgress();
  } catch {
    return cloneDefaultProgress();
  }
}

export function saveProgress(progress: Progress, storage = globalThis.localStorage): void {
  storage.setItem(progressKey, JSON.stringify(progress));
}

export function setLastChapter(chapter: number, storage = globalThis.localStorage): Progress {
  const progress = loadProgress(storage);
  progress.lastChapter = chapter;
  saveProgress(progress, storage);
  return progress;
}

export function markChapterCompleted(
  chapter: number,
  storage = globalThis.localStorage,
): Progress {
  const progress = loadProgress(storage);
  if (!progress.completed.includes(chapter)) {
    progress.completed.push(chapter);
    progress.completed.sort((a, b) => a - b);
  }
  progress.lastChapter = chapter;
  saveProgress(progress, storage);
  return progress;
}

function cloneDefaultProgress(): Progress {
  return {
    version: 1,
    completed: [],
    lastChapter: 1,
  };
}
