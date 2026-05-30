import fs from "node:fs/promises";
import path from "node:path";

function parseCount(text) {
  const count = Number.parseInt(text.trim(), 10);
  return Number.isFinite(count) ? count : 0;
}

function lines(text) {
  return text.split(/\r?\n/).filter(Boolean);
}

function hasCommand(history, parts) {
  return history.some((entry) => {
    const tokens = entry.trim().split(/\s+/);
    return parts.every((part, index) => tokens[index] === part || tokens.includes(part));
  });
}

async function readText(dir, file) {
  try {
    return await fs.readFile(path.join(dir, file), "utf8");
  } catch {
    return "";
  }
}

async function exists(dir, file) {
  try {
    await fs.access(path.join(dir, file));
    return true;
  } catch {
    return false;
  }
}

function hasTracked(text, file) {
  return lines(text).includes(file);
}

async function gitignoreIncludes(dir, pattern) {
  const text = await readText(dir, ".gitignore");
  return text.split(/\r?\n/).some((line) => line.trim() === pattern);
}

async function noConflictMarkers(dir, file) {
  const text = await readText(dir, file);
  return !text.includes("<<<<<<<") && !text.includes("=======") && !text.includes(">>>>>>>");
}

function checkResult(conditions, key, ok) {
  const condition = conditions.find((item) => item.id.endsWith(`.${key}`));
  return condition ? { ...condition, ok } : null;
}

function compact(items) {
  return items.filter(Boolean);
}

async function common(dir, runGit) {
  const git = (args) => runGit(args, dir).catch(() => "");
  return {
    git,
    count: () => git(["rev-list", "--count", "HEAD"]).then(parseCount),
    merges: () => git(["rev-list", "--merges", "--count", "HEAD"]).then(parseCount),
    head: () => git(["rev-parse", "--abbrev-ref", "HEAD"]).then((text) => text.trim()),
    message: () => git(["log", "-1", "--format=%s"]).then((text) => text.trim()),
    status: () => git(["status", "--porcelain"]),
    tracked: (...files) => git(["ls-files", ...files]),
    staged: () => git(["diff", "--cached", "--name-only"]).then(lines),
    working: () => git(["diff", "--name-only"]).then(lines),
    headDiff: () => git(["diff", "HEAD", "--name-only"]).then(lines),
    branch: (name) => git(["branch", "--list", name]).then((text) => text.trim().length > 0),
    tag: (name) => git(["tag", "--list", name]).then((text) => lines(text).includes(name)),
    ahead: (base, branch) => git(["rev-list", "--count", `${base}..${branch}`]).then(parseCount),
    stashCount: () => git(["stash", "list"]).then((text) => lines(text).length),
    merged: (branch, target = "main") =>
      runGit(["merge-base", "--is-ancestor", branch, target], dir)
        .then(() => true)
        .catch(() => false),
  };
}

/**
 * Extra drill checks are intentionally data-light: drills 1-20 keep their
 * original exact branches, while 21-100 use shared predicates keyed by the
 * condition suffix in content/drillExtras.mjs.
 */
export async function evaluateExtraDrillChecks(id, dir, history, runGit, conditions) {
  if (id < 21 || id > 100) return null;
  const g = await common(dir, runGit);
  const allTracked = async (...files) => {
    const tracked = await g.tracked(...files);
    return files.every((file) => hasTracked(tracked, file));
  };
  const notTracked = async (file) => !hasTracked(await g.tracked(file), file);
  const clean = async () => (await g.status()).trim() === "";
  const stagedHas = async (file) => (await g.staged()).includes(file);
  const headDiffHas = async (file) => (await g.headDiff()).includes(file);

  const checks = {
    twoNewCommits: async () => (await g.count()) >= 3,
    filesTracked: async () => (id === 21 ? allTracked("work1.txt", "work2.txt") : allTracked("alpha.txt", "beta.txt")),
    message: async () => {
      const expected = {
        22: "empty checkpoint",
        24: "update readme",
        28: "説明を更新",
      }[id];
      return (await g.message()) === expected;
    },
    allowEmptyUsed: () => hasCommand(history, ["git", "commit", "--allow-empty"]),
    addAUsed: () => hasCommand(history, ["git", "add", "-A"]),
    commitAmUsed: () => history.some((entry) => /^git\s+commit\s+-am\b/.test(entry.trim())),
    selectedTracked: async () => allTracked("one.txt", "two.txt"),
    threeUntracked: async () => (await g.status()).split(/\r?\n/).includes("?? three.txt"),
    singleCommit: async () => (await g.count()) === 1,
    amendUsed: () => hasCommand(history, ["git", "commit", "--amend", "--no-edit"]),
    noteTracked: async () => allTracked("note.txt"),
    fileTracked: async () => allTracked("japanese.txt"),
    hasCommit: async () => (await g.count()) >= 1,
    showHeadUsed: () => history.some((entry) => /^git\s+show\s+HEAD\b/.test(entry.trim())),
    logOneUsed: () => history.some((entry) => /^git\s+log\s+-1\b/.test(entry.trim())),
    workingDiff: async () => (id === 69 ? (await g.status()).trim().length > 0 : (await g.working()).length > 0),
    diffUsed: () => history.some((entry) => entry.trim() === "git diff"),
    stagedDiff: async () => stagedHas("README.md"),
    diffStagedUsed: () => history.some((entry) => /^git\s+diff\s+(--staged|--cached)\b/.test(entry.trim())),
    headDiff: async () => headDiffHas("README.md"),
    diffHeadUsed: () => history.some((entry) => /^git\s+diff\s+HEAD\b/.test(entry.trim())),
    twoCommits: async () => (await g.count()) >= 2,
    diffRangeUsed: () => history.some((entry) => /^git\s+diff\s+HEAD~1\s+HEAD\b/.test(entry.trim())),
    logOnelineUsed: () => history.some((entry) => /^git\s+log\b/.test(entry.trim()) && entry.includes("--oneline")),
    logStatUsed: () => history.some((entry) => /^git\s+log\b/.test(entry.trim()) && entry.includes("--stat")),
    logN2Used: () => history.some((entry) => /^git\s+log\b/.test(entry.trim()) && entry.includes("-n") && entry.includes("2")),
    showUsed: () => hasCommand(history, ["git", "show"]),
    logGraphUsed: () => history.some((entry) => /^git\s+log\b/.test(entry.trim()) && entry.includes("--graph")),
    readmeTracked: async () => allTracked("README.md"),
    logFileUsed: () => history.some((entry) => /^git\s+log\b/.test(entry.trim()) && entry.includes("README.md")),
    branchExists: async () => g.branch({ 41: "experiment", 42: "feature/a", 43: "feature/b", 51: "rescue" }[id]),
    onMain: async () => (await g.head()) === "main",
    onBranch: async () => (await g.head()) === { 42: "feature/a", 43: "feature/b", 51: "rescue" }[id],
    hasBranches: async () => (await g.branch("main")) && (await g.branch("feature")),
    branchUsed: () => history.some((entry) => entry.trim() === "git branch"),
    featureExists: async () => g.branch("feature"),
    featureGone: async () => !(await g.branch("feature")),
    branchDeleteUsed: () => history.some((entry) => /^git\s+branch\s+-d\s+feature\b/.test(entry.trim())),
    wipGone: async () => !(await g.branch("wip")),
    branchForceDeleteUsed: () => history.some((entry) => /^git\s+branch\s+-D\s+wip\b/.test(entry.trim())),
    newExists: async () => g.branch("feature/new"),
    oldGone: async () => id === 48 ? !(await g.branch("feature/old")) : !(await exists(dir, "old-bug.txt")),
    aExists: async () => g.branch("feature/a"),
    bExists: async () => g.branch("feature/b"),
    onFeature: async () => (await g.head()) === "feature",
    aheadTwo: async () => (await g.ahead("main", "feature")) >= 2,
    showCurrentUsed: () => history.some((entry) => /^git\s+branch\s+--show-current\b/.test(entry.trim())),
    hotfixExists: async () => g.branch("hotfix"),
    onHotfix: async () => (await g.head()) === "hotfix",
    featureFileTracked: async () => allTracked("feature.txt"),
    switchDashUsed: () => history.some((entry) => /^git\s+switch\s+-\s*$/.test(entry.trim())),
    featureMerged: async () => (await g.merged("feature")) && (await allTracked("feature.txt")),
    mergeCommit: async () => (await g.merges()) >= 1,
    noMarkers: async () => noConflictMarkers(dir, id === 59 ? "config.txt" : "README.md"),
    mergeAbortUsed: () => history.some((entry) => /^git\s+merge\s+--abort\b/.test(entry.trim())),
    cMerged: async () => (await g.merged("feature/c")) && (await allTracked("c.txt")),
    mergeUsed: () => hasCommand(history, ["git", "merge"]),
    aMerged: async () => (await g.merged("feature/a")) && (await allTracked("a.txt")),
    bMerged: async () => (await g.merged("feature/b")) && (await allTracked("b.txt")),
    clean,
    restoreUsed: () => hasCommand(history, ["git", "restore"]),
    noStaged: async () => (await g.staged()).length === 0,
    oneCommit: async () => (await g.count()) === 1,
    staged: async () => (await g.staged()).length > 0,
    badGone: async () => !(await exists(dir, "bad.txt")),
    revertCommit: async () => (await g.count()) >= 3,
    reflogUsed: () => hasCommand(history, ["git", "reflog"]),
    lostTracked: async () => allTracked("lost.txt"),
    hardResetUsed: () => history.some((entry) => /^git\s+reset\s+--hard\b/.test(entry.trim())),
    readmeExists: async () => exists(dir, "README.md"),
    checkoutFileUsed: () => history.some((entry) => /^git\s+checkout\s+--\s+README\.md\b/.test(entry.trim())),
    scratchGone: async () => !(await exists(dir, "scratch.txt")),
    cleanUsed: () => history.some((entry) => /^git\s+clean\s+-f\b/.test(entry.trim())),
    stashUsed: () => hasCommand(history, ["git", "stash"]),
    stashPopUsed: () => history.some((entry) => /^git\s+stash\s+pop\b/.test(entry.trim())),
    stashExists: async () => (await g.stashCount()) >= 1,
    stashEmpty: async () => (await g.stashCount()) === 0,
    stashListUsed: () => history.some((entry) => /^git\s+stash\s+list\b/.test(entry.trim())),
    stashDropUsed: () => history.some((entry) => /^git\s+stash\s+drop\b/.test(entry.trim())),
    draftGone: async () => !(await exists(dir, "draft.txt")),
    stashUUsed: () => history.some((entry) => /^git\s+stash\s+(-u|--include-untracked)\b/.test(entry.trim())),
    stashTwo: async () => (await g.stashCount()) >= 2,
    stashShowUsed: () => history.some((entry) => /^git\s+stash\s+show\b/.test(entry.trim())),
    stashClearUsed: () => history.some((entry) => /^git\s+stash\s+clear\b/.test(entry.trim())),
    tagExists: async () => g.tag({ 89: "v1.0.0", 90: "v1.1.0", 91: "v1.0.0", 97: "v2.0.0", 100: "v1.0.0" }[id]),
    tagUsed: () => history.some((entry) => /^git\s+tag\s+v1\.0\.0\b/.test(entry.trim())),
    annotatedTagUsed: () => history.some((entry) => /^git\s+tag\s+-a\b/.test(entry.trim())),
    tagListUsed: () => history.some((entry) => entry.trim() === "git tag"),
    tagGone: async () => !(await g.tag("v1.0.0")),
    tagDeleteUsed: () => history.some((entry) => /^git\s+tag\s+-d\b/.test(entry.trim())),
    gitignore: async () => gitignoreIncludes(dir, id === 94 ? "dist/" : "*.log"),
    debugIgnored: async () => !(await g.status()).includes("debug.log"),
    distIgnored: async () => !(await g.status()).includes("dist/app.js"),
    secretUntracked: async () => notTracked("secret.txt"),
    secretExists: async () => exists(dir, "secret.txt"),
    bugfixTracked: async () => allTracked("bugfix.txt"),
    releaseTracked: async () => allTracked("release.txt"),
    recoverTracked: async () => allTracked("recover.txt"),
    loginTracked: async () => allTracked(id === 100 ? "login.js" : "src/login.js"),
  };

  return compact(
    await Promise.all(
      conditions.map(async (condition) => {
        const key = condition.id.split(".").at(-1);
        const check = checks[key];
        return checkResult(conditions, key, check ? await check() : false);
      }),
    ),
  );
}
