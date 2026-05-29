export type FileStateName = "untracked" | "modified" | "staged" | "committed" | "ignored";

export type FileState = {
  path: string;
  state: FileStateName;
};

export const FILE_STATE_LABELS: Record<FileStateName, string>;
export function parsePorcelainFileStates(porcelain: string): FileState[];
export function buildFileStates(porcelain: string, trackedFiles: string[]): FileState[];
