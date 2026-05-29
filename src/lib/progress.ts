export const progressKey = "claude-git-app-v5:progress";

export type Progress = {
  version: 1;
  completed: number[];
  lastChapter: number;
  drillCompleted: number[];
  lastDrill: number | null;
};

export const defaultProgress: Progress = {
  version: 1,
  completed: [],
  lastChapter: 1,
  drillCompleted: [],
  lastDrill: null,
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
    Number.isInteger(progress.lastChapter) &&
    (progress.drillCompleted === undefined ||
      (Array.isArray(progress.drillCompleted) &&
        progress.drillCompleted.every((drill) => Number.isInteger(drill)))) &&
    (progress.lastDrill === undefined ||
      progress.lastDrill === null ||
      (typeof progress.lastDrill === "number" && Number.isInteger(progress.lastDrill)))
  );
}

export function loadProgress(storage = globalThis.localStorage): Progress {
  try {
    const raw = storage.getItem(progressKey);
    if (!raw) return cloneDefaultProgress();
    const parsed: unknown = JSON.parse(raw);
    return isValidProgress(parsed) ? normalizeProgress(parsed) : cloneDefaultProgress();
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

export function setLastDrill(drill: number, storage = globalThis.localStorage): Progress {
  const progress = loadProgress(storage);
  progress.lastDrill = drill;
  saveProgress(progress, storage);
  return progress;
}

export function markDrillCompleted(drill: number, storage = globalThis.localStorage): Progress {
  const progress = loadProgress(storage);
  if (!progress.drillCompleted.includes(drill)) {
    progress.drillCompleted.push(drill);
    progress.drillCompleted.sort((a, b) => a - b);
  }
  progress.lastDrill = drill;
  saveProgress(progress, storage);
  return progress;
}

function normalizeProgress(progress: Progress): Progress {
  return {
    version: 1,
    completed: [...progress.completed],
    lastChapter: progress.lastChapter,
    drillCompleted: [...(progress.drillCompleted ?? [])],
    lastDrill: progress.lastDrill ?? null,
  };
}

function cloneDefaultProgress(): Progress {
  return {
    version: 1,
    completed: [],
    lastChapter: 1,
    drillCompleted: [],
    lastDrill: null,
  };
}
