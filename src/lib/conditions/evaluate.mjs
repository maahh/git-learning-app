import fs from "node:fs/promises";
import path from "node:path";
import { getDrill } from "../../content/drills.mjs";
import { evaluateExtraDrillChecks } from "./extraDrillChecks.mjs";
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

function conditionWithOk(conditions, id, ok) {
  const condition = conditions.find((item) => item.id === id);
  return condition ? { ...condition, ok } : null;
}

function compactChecks(checks) {
  return checks.filter(Boolean);
}

function trackedFilesFrom(text) {
  return text.split(/\r?\n/).filter(Boolean);
}

function hasTracked(trackedText, file) {
  return trackedFilesFrom(trackedText).includes(file);
}

async function gitignoreIncludesPatterns(dir, patterns) {
  const gitignore = await readText(path.join(dir, ".gitignore"));
  const lines = gitignore.split(/\r?\n/).map((line) => line.trim());
  return patterns.every((pattern) => lines.includes(pattern));
}

async function fileHasConflictMarkers(dir, fileName) {
  const text = await readText(path.join(dir, fileName));
  return text.includes("<<<<<<<") || text.includes("=======") || text.includes(">>>>>>>");
}

async function pathExists(dir, fileName) {
  return exists(path.join(dir, fileName));
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

/**
 * 実践ドリルごとの達成条件を評価する。定義は content/drills.mjs に置き、
 * ここでは実 git とファイルシステムから到達状態だけを見る。
 *
 * @param {number} id
 * @param {string} dir
 * @param {string[]} history
 * @param {(args: string[], cwd: string) => Promise<string>} runGit
 * @returns {Promise<Array<{ id: string; label: string; kind: "state" | "action"; ok: boolean }>>}
 */
export async function evaluateDrillChecks(id, dir, history = [], runGit) {
  const drill = getDrill(id);
  if (!drill) return [];
  const c = drill.conditions;

  if (id === 1) {
    const [countText, tracked] = await Promise.all([
      runGit(["rev-list", "--count", "HEAD"], dir).catch(() => "0"),
      runGit(["ls-files", "README.md"], dir).catch(() => ""),
    ]);
    return compactChecks([
      conditionWithOk(c, "drill1.commit", parseCount(countText) >= 1),
      conditionWithOk(c, "drill1.readmeTracked", hasTracked(tracked, "README.md")),
    ]);
  }

  if (id === 2) {
    const [tracked, countText] = await Promise.all([
      runGit(["ls-files", "a.txt", "b.txt", "c.txt"], dir).catch(() => ""),
      runGit(["rev-list", "--count", "HEAD"], dir).catch(() => "0"),
    ]);
    const files = trackedFilesFrom(tracked);
    return compactChecks([
      conditionWithOk(c, "drill2.filesTracked", ["a.txt", "b.txt", "c.txt"].every((file) => files.includes(file))),
      conditionWithOk(c, "drill2.commit", parseCount(countText) >= 1),
    ]);
  }

  if (id === 3) {
    const [message, countText] = await Promise.all([
      runGit(["log", "-1", "--format=%s"], dir).catch(() => ""),
      runGit(["rev-list", "--count", "HEAD"], dir).catch(() => "0"),
    ]);
    return compactChecks([
      conditionWithOk(c, "drill3.message", message.trim() === "add feature"),
      conditionWithOk(c, "drill3.singleCommit", parseCount(countText) === 1),
    ]);
  }

  if (id === 4) {
    const [keepTracked, status] = await Promise.all([
      runGit(["ls-files", "keep.txt"], dir).catch(() => ""),
      runGit(["status", "--porcelain"], dir).catch(() => ""),
    ]);
    return compactChecks([
      conditionWithOk(c, "drill4.keepTracked", hasTracked(keepTracked, "keep.txt")),
      conditionWithOk(c, "drill4.laterUntracked", status.split(/\r?\n/).includes("?? later.txt")),
    ]);
  }

  if (id === 5) {
    const [hasPatterns, status] = await Promise.all([
      gitignoreIncludesPatterns(dir, ["*.log", "*.tmp"]),
      runGit(["status", "--porcelain"], dir).catch(() => ""),
    ]);
    return compactChecks([
      conditionWithOk(c, "drill5.gitignore", hasPatterns),
      conditionWithOk(c, "drill5.ignored", !status.includes("build.log") && !status.includes("cache.tmp")),
    ]);
  }

  if (id === 6) {
    const tracked = await runGit(["ls-files", "old.txt", "new.txt"], dir).catch(() => "");
    return compactChecks([
      conditionWithOk(c, "drill6.newTracked", hasTracked(tracked, "new.txt")),
      conditionWithOk(c, "drill6.oldGone", !hasTracked(tracked, "old.txt")),
    ]);
  }

  if (id === 7) {
    const tracked = await runGit(["ls-files", "temp.txt"], dir).catch(() => "");
    return compactChecks([conditionWithOk(c, "drill7.tempGone", !hasTracked(tracked, "temp.txt"))]);
  }

  if (id === 8) {
    const [branch, aheadText] = await Promise.all([
      runGit(["branch", "--list", "feature/api"], dir).catch(() => ""),
      runGit(["rev-list", "--count", "main..feature/api"], dir).catch(() => "0"),
    ]);
    return compactChecks([
      conditionWithOk(c, "drill8.branch", branch.trim().length > 0),
      conditionWithOk(c, "drill8.ahead", parseCount(aheadText) >= 1),
    ]);
  }

  if (id === 9) {
    const [develop, wip] = await Promise.all([
      runGit(["branch", "--list", "develop"], dir).catch(() => ""),
      runGit(["branch", "--list", "wip"], dir).catch(() => ""),
    ]);
    return compactChecks([
      conditionWithOk(c, "drill9.develop", develop.trim().length > 0),
      conditionWithOk(c, "drill9.noWip", wip.trim().length === 0),
    ]);
  }

  if (id === 10) {
    const [head, featureAhead, mainCount] = await Promise.all([
      runGit(["rev-parse", "--abbrev-ref", "HEAD"], dir).catch(() => ""),
      runGit(["rev-list", "--count", "feature..main"], dir).catch(() => "1"),
      runGit(["rev-list", "--count", "main"], dir).catch(() => "0"),
    ]);
    return compactChecks([
      conditionWithOk(c, "drill10.onMain", head.trim() === "main"),
      conditionWithOk(c, "drill10.fastForwarded", parseCount(featureAhead) === 0 && parseCount(mainCount) >= 2),
    ]);
  }

  if (id === 11) {
    const [head, merges] = await Promise.all([
      runGit(["rev-parse", "--abbrev-ref", "HEAD"], dir).catch(() => ""),
      runGit(["rev-list", "--merges", "--count", "HEAD"], dir).catch(() => "0"),
    ]);
    return compactChecks([
      conditionWithOk(c, "drill11.onMain", head.trim() === "main"),
      conditionWithOk(c, "drill11.mergeCommit", parseCount(merges) >= 1),
    ]);
  }

  if (id === 12) {
    const [hasMarkers, merges] = await Promise.all([
      fileHasConflictMarkers(dir, "README.md"),
      runGit(["rev-list", "--merges", "--count", "HEAD"], dir).catch(() => "0"),
    ]);
    return compactChecks([
      conditionWithOk(c, "drill12.noMarkers", !hasMarkers),
      conditionWithOk(c, "drill12.mergeCommit", parseCount(merges) >= 1),
    ]);
  }

  if (id === 13) {
    const [feature, main] = await Promise.all([
      runGit(["branch", "--list", "feature"], dir).catch(() => ""),
      runGit(["branch", "--list", "main"], dir).catch(() => ""),
    ]);
    return compactChecks([
      conditionWithOk(c, "drill13.noFeature", feature.trim().length === 0),
      conditionWithOk(c, "drill13.main", main.trim().length > 0),
    ]);
  }

  if (id === 14) {
    const [status, countText] = await Promise.all([
      runGit(["status", "--porcelain"], dir).catch(() => ""),
      runGit(["rev-list", "--count", "HEAD"], dir).catch(() => "0"),
    ]);
    return compactChecks([
      conditionWithOk(c, "drill14.clean", status.trim() === ""),
      conditionWithOk(c, "drill14.commit", parseCount(countText) >= 1),
    ]);
  }

  if (id === 15) {
    const [cached, working] = await Promise.all([
      runGit(["diff", "--cached", "--name-only"], dir).catch(() => ""),
      runGit(["diff", "--name-only"], dir).catch(() => ""),
    ]);
    return compactChecks([
      conditionWithOk(c, "drill15.noCachedDiff", cached.trim() === ""),
      conditionWithOk(c, "drill15.workingDiff", working.split(/\r?\n/).includes("README.md")),
    ]);
  }

  if (id === 16) {
    const [badExists, countText] = await Promise.all([
      pathExists(dir, "bad.txt"),
      runGit(["rev-list", "--count", "HEAD"], dir).catch(() => "0"),
    ]);
    return compactChecks([
      conditionWithOk(c, "drill16.badGone", !badExists),
      conditionWithOk(c, "drill16.revertCommit", parseCount(countText) >= 3),
    ]);
  }

  if (id === 17) {
    const [countText, cached] = await Promise.all([
      runGit(["rev-list", "--count", "HEAD"], dir).catch(() => "0"),
      runGit(["diff", "--cached", "--name-only"], dir).catch(() => ""),
    ]);
    return compactChecks([
      conditionWithOk(c, "drill17.oneCommit", parseCount(countText) === 1),
      conditionWithOk(c, "drill17.staged", cached.trim().length > 0),
    ]);
  }

  if (id === 18) {
    const working = await runGit(["diff", "--name-only"], dir).catch(() => "");
    return compactChecks([
      conditionWithOk(c, "drill18.workingDiff", working.trim().length > 0),
      conditionWithOk(c, "drill18.stashUsed", commandMatched(history, "git", "stash")),
    ]);
  }

  if (id === 19) {
    const tag = await runGit(["tag", "--list", "v1.0.0"], dir).catch(() => "");
    return compactChecks([conditionWithOk(c, "drill19.tag", tag.trim() === "v1.0.0")]);
  }

  if (id === 20) {
    const [tracked, hasLogPattern, head, tag] = await Promise.all([
      runGit(["ls-files", "src/login.js"], dir).catch(() => ""),
      gitignoreIncludesPatterns(dir, ["*.log"]),
      runGit(["rev-parse", "--abbrev-ref", "HEAD"], dir).catch(() => ""),
      runGit(["tag", "--list", "v0.1.0"], dir).catch(() => ""),
    ]);
    const loginTracked = hasTracked(tracked, "src/login.js");
    return compactChecks([
      conditionWithOk(c, "drill20.loginTracked", loginTracked),
      conditionWithOk(c, "drill20.gitignore", hasLogPattern),
      conditionWithOk(c, "drill20.merged", head.trim() === "main" && loginTracked),
      conditionWithOk(c, "drill20.tag", tag.trim() === "v0.1.0"),
    ]);
  }

  const extraChecks = await evaluateExtraDrillChecks(id, dir, history, runGit, c);
  if (extraChecks) return extraChecks;

  return c.map((condition) => ({ ...condition, ok: false }));
}
