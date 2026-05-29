import fs from "node:fs/promises";
import path from "node:path";
import {
  ch1Conditions,
  ch2Conditions,
  ch3Conditions,
  ch4Conditions,
  ch5Conditions,
  ch6Conditions,
  ch7Conditions,
  ch8Conditions,
  ch9Conditions,
} from "./definitions.mjs";

export {
  ch1Conditions,
  ch2Conditions,
  ch3Conditions,
  ch4Conditions,
  ch5Conditions,
  ch6Conditions,
  ch7Conditions,
  ch8Conditions,
  ch9Conditions,
};

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function commandMatched(history, command, subcommand) {
  return history.some((entry) => {
    const [entryCommand, entrySubcommand] = entry.trim().split(/\s+/);
    return entryCommand === command && entrySubcommand === subcommand;
  });
}

export function gitDiffStagedUsed(history) {
  return history.some((entry) => {
    const parts = entry.trim().split(/\s+/);
    return (
      parts[0] === "git" &&
      parts[1] === "diff" &&
      (parts.includes("--staged") || parts.includes("--cached"))
    );
  });
}

function hasReadmeStatusLine(statusText) {
  return statusText
    .split(/\r?\n/)
    .some((line) => line.includes("README.md"));
}

function parseCount(countText) {
  const count = Number.parseInt(countText.trim(), 10);
  return Number.isFinite(count) ? count : 0;
}

async function readText(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

async function readmeHasConflictMarkers(dir) {
  const readme = await readText(path.join(dir, "README.md"));
  return readme.includes("<<<<<<<") || readme.includes("=======") || readme.includes(">>>>>>>");
}

async function gitignoreIncludesLogPattern(dir) {
  const gitignore = await readText(path.join(dir, ".gitignore"));
  return gitignore.split(/\r?\n/).some((line) => line.trim() === "*.log");
}

/**
 * 章ごとの達成条件を評価する。git の実行は呼び出し元から注入し、
 * server とテストで同じ判定を通せるようにしている。
 *
 * @param {number} chapter
 * @param {string} dir
 * @param {string[]} history
 * @param {(args: string[], cwd: string) => Promise<string>} runGit
 * @returns {Promise<Array<{ id: string; label: string; kind: "state" | "action"; ok: boolean }>>}
 */
export async function evaluateChapterChecks(chapter, dir, history = [], runGit) {
  if (chapter === 1) {
    const [hasGitHead, hasReadme] = await Promise.all([
      exists(path.join(dir, ".git", "HEAD")),
      exists(path.join(dir, "README.md")),
    ]);

    return [
      { ...ch1Conditions[0], ok: hasGitHead },
      { ...ch1Conditions[1], ok: hasReadme },
      { ...ch1Conditions[2], ok: commandMatched(history, "git", "status") },
    ];
  }

  if (chapter === 2) {
    const [trackedNames, countText] = await Promise.all([
      runGit(["ls-files", "README.md"], dir).catch(() => ""),
      runGit(["rev-list", "HEAD", "--count"], dir).catch(() => "0"),
    ]);
    const commitCount = Number.parseInt(countText.trim(), 10);

    return [
      { ...ch2Conditions[0], ok: trackedNames.split(/\r?\n/).includes("README.md") },
      { ...ch2Conditions[1], ok: Number.isFinite(commitCount) && commitCount >= 1 },
      { ...ch2Conditions[2], ok: commandMatched(history, "git", "log") },
    ];
  }

  if (chapter === 3) {
    const statusText = await runGit(["status", "--porcelain"], dir).catch(() => "");

    return [
      { ...ch3Conditions[0], ok: hasReadmeStatusLine(statusText) },
      { ...ch3Conditions[1], ok: commandMatched(history, "git", "diff") },
      { ...ch3Conditions[2], ok: gitDiffStagedUsed(history) },
    ];
  }

  if (chapter === 4) {
    const [branchText, headText, aheadText] = await Promise.all([
      runGit(["branch", "--list", "feature"], dir).catch(() => ""),
      runGit(["rev-parse", "--abbrev-ref", "HEAD"], dir).catch(() => ""),
      runGit(["rev-list", "--count", "main..feature"], dir).catch(() => "0"),
    ]);

    return [
      { ...ch4Conditions[0], ok: branchText.trim().length > 0 },
      { ...ch4Conditions[1], ok: headText.trim() === "feature" },
      { ...ch4Conditions[2], ok: parseCount(aheadText) >= 1 },
    ];
  }

  if (chapter === 5) {
    const [headText, featureAheadText, mainCountText] = await Promise.all([
      runGit(["rev-parse", "--abbrev-ref", "HEAD"], dir).catch(() => ""),
      runGit(["rev-list", "--count", "feature..main"], dir).catch(() => "1"),
      runGit(["rev-list", "--count", "main"], dir).catch(() => "0"),
    ]);

    return [
      { ...ch5Conditions[0], ok: headText.trim() === "main" },
      {
        ...ch5Conditions[1],
        ok: parseCount(featureAheadText) === 0 && parseCount(mainCountText) >= 2,
      },
      { ...ch5Conditions[2], ok: commandMatched(history, "git", "log") },
    ];
  }

  if (chapter === 6) {
    const [statusText, countText] = await Promise.all([
      runGit(["status", "--porcelain"], dir).catch(() => ""),
      runGit(["rev-list", "--count", "HEAD"], dir).catch(() => "0"),
    ]);

    return [
      { ...ch6Conditions[0], ok: commandMatched(history, "git", "status") },
      { ...ch6Conditions[1], ok: commandMatched(history, "git", "restore") },
      { ...ch6Conditions[2], ok: statusText.trim() === "" && parseCount(countText) >= 1 },
    ];
  }

  if (chapter === 7) {
    const [hasGitignore, statusText] = await Promise.all([
      exists(path.join(dir, ".gitignore")),
      runGit(["status", "--porcelain"], dir).catch(() => ""),
    ]);
    const ignored =
      hasGitignore && !statusText.includes("secret.txt") && !statusText.includes(".log");

    return [
      { ...ch7Conditions[0], ok: hasGitignore },
      { ...ch7Conditions[1], ok: ignored },
      { ...ch7Conditions[2], ok: commandMatched(history, "git", "commit") },
    ];
  }

  if (chapter === 8) {
    const [hasMarkers, mergeCountText] = await Promise.all([
      readmeHasConflictMarkers(dir),
      runGit(["rev-list", "--merges", "HEAD", "--count"], dir).catch(() => "0"),
    ]);
    const mergeUsed = commandMatched(history, "git", "merge");

    return [
      { ...ch8Conditions[0], ok: mergeUsed },
      { ...ch8Conditions[1], ok: mergeUsed && !hasMarkers },
      { ...ch8Conditions[2], ok: parseCount(mergeCountText) >= 1 },
    ];
  }

  if (chapter === 9) {
    const [branchText, trackedLoginText, gitignoreHasLogPattern, headText] = await Promise.all([
      runGit(["branch", "--list", "feature/login"], dir).catch(() => ""),
      runGit(["ls-files", "login.html"], dir).catch(() => ""),
      gitignoreIncludesLogPattern(dir),
      runGit(["rev-parse", "--abbrev-ref", "HEAD"], dir).catch(() => ""),
    ]);
    const loginTracked = trackedLoginText.split(/\r?\n/).includes("login.html");

    return [
      { ...ch9Conditions[0], ok: branchText.trim().length > 0 },
      { ...ch9Conditions[1], ok: loginTracked },
      { ...ch9Conditions[2], ok: gitignoreHasLogPattern },
      { ...ch9Conditions[3], ok: headText.trim() === "main" && loginTracked },
    ];
  }

  return [];
}
