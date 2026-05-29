export const FILE_STATE_LABELS = {
  untracked: "未追跡",
  modified: "変更",
  staged: "ステージ済",
  committed: "コミット済",
  ignored: "無視",
};

function normalizeGitPath(filePath) {
  return filePath.replace(/^"|"$/g, "");
}

function pathFromPorcelainLine(line) {
  const rawPath = line.slice(3);
  const renameSeparator = " -> ";
  if (rawPath.includes(renameSeparator)) {
    return normalizeGitPath(rawPath.slice(rawPath.lastIndexOf(renameSeparator) + renameSeparator.length));
  }
  return normalizeGitPath(rawPath);
}

export function parsePorcelainFileStates(porcelain) {
  return porcelain
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const indexState = line[0] ?? " ";
      const workingState = line[1] ?? " ";
      const path = pathFromPorcelainLine(line);

      if (indexState === "?" && workingState === "?") {
        return { path, state: "untracked" };
      }
      if (indexState === "!" && workingState === "!") {
        return { path, state: "ignored" };
      }
      if (indexState !== " ") {
        return { path, state: "staged" };
      }
      return { path, state: "modified" };
    });
}

export function buildFileStates(porcelain, trackedFiles) {
  const states = parsePorcelainFileStates(porcelain);
  const seen = new Set(states.map((fileState) => fileState.path));

  for (const path of trackedFiles) {
    if (path && !seen.has(path)) {
      states.push({ path, state: "committed" });
    }
  }

  return states.sort((a, b) => a.path.localeCompare(b.path));
}
