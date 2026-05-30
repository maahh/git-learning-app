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
    return parts.every((part, index) => tokens[index] === part);
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

function hasCommitted(text, file) {
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
    committed: (...files) => git(["ls-tree", "-r", "HEAD", "--name-only", "--", ...files]),
    staged: () => git(["diff", "--cached", "--name-only"]).then(lines),
    working: () => git(["diff", "--name-only"]).then(lines),
    headDiff: () => git(["diff", "HEAD", "--name-only"]).then(lines),
    branch: (name) => git(["branch", "--list", name]).then((text) => text.trim().length > 0),
    tag: (name) => git(["tag", "--list", name]).then((text) => lines(text).includes(name)),
    tagType: (name) => git(["cat-file", "-t", name]).then((text) => text.trim()),
    ref: (name) => git(["rev-parse", "--verify", name]).then((text) => text.trim()),
    ahead: (base, branch) => git(["rev-list", "--count", `${base}..${branch}`]).then(parseCount),
    stashCount: () => git(["stash", "list"]).then((text) => lines(text).length),
    // 注意: ここで使う runGit は失敗時に reject せず空文字を返す（exit code を握り潰す）。
    // そのため `merge-base --is-ancestor` の終了コードでは判定できない。
    // 「A の oid が rev-list(B) に含まれるか」という出力ベースで祖先関係を判定する。
    ancestor: (ancestorRef, descendantRef) => isAncestor(ancestorRef, descendantRef),
    // branch が target に統合された（target の履歴に branch の先端が含まれる）か。
    merged: (branch, target = "main") => isAncestor(branch, target),
    upstream: () => git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]).then((text) => text.trim()),
  };

  // 出力ベースの祖先判定。runGit が exit code を握り潰すため、
  // 「A の oid が rev-list(B) に含まれるか」で A が B の祖先かを判定する。
  async function isAncestor(ancestorRef, descendantRef) {
    const [ancestorOid, descendantList] = await Promise.all([
      git(["rev-parse", ancestorRef]).then((t) => t.trim()).catch(() => ""),
      git(["rev-list", descendantRef]).then(lines).catch(() => []),
    ]);
    return ancestorOid.length > 0 && descendantList.includes(ancestorOid);
  }
}

/**
 * Extra drill checks are intentionally data-light: drills 1-20 keep their
 * original exact branches, while 21-100 use shared predicates keyed by the
 * condition suffix in content/drillExtras.mjs.
 */
export async function evaluateExtraDrillChecks(id, dir, history, runGit, conditions) {
  if (id < 21 || id > 100) return null;
  const g = await common(dir, runGit);
  const allCommitted = async (...files) => {
    const committed = await g.committed(...files);
    return files.every((file) => hasCommitted(committed, file));
  };
  const notTracked = async (file) => !hasTracked(await g.tracked(file), file);
  const clean = async () => (await g.status()).trim() === "";
  const stagedHas = async (file) => (await g.staged()).includes(file);
  const headDiffHas = async (file) => (await g.headDiff()).includes(file);
  const refEquals = async (left, right) => {
    const [leftRef, rightRef] = await Promise.all([g.ref(left), g.ref(right)]);
    return leftRef !== "" && leftRef === rightRef;
  };
  const annotatedTag = async (name) => (await g.tag(name)) && (await g.tagType(name)) === "tag";
  const mergeIntroducedBranch = async (branch) => {
    if ((await g.head()) !== "main" || !(await g.merged(branch, "main"))) return false;
    const merge = await g.git(["rev-list", "--first-parent", "--merges", "-1", "main"]).then((text) => text.trim());
    if (!merge) return false;
    const firstParent = await g.ref(`${merge}^1`);
    return (await g.ancestor(branch, merge)) && !(await g.ancestor(branch, firstParent));
  };
  const recoverRestored = async () => (await allCommitted("recover.txt")) && (await g.message()) === "recover target";
  const remoteCommitHasFile = async (ref, file) =>
    lines(await g.git(["ls-tree", "-r", "--name-only", ref])).includes(file);

  const checks = {
    twoNewCommits: async () => (await g.count()) >= 3,
    filesTracked: async () =>
      id === 21 ? allCommitted("work1.txt", "work2.txt") : allCommitted("alpha.txt", "beta.txt"),
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
    selectedTracked: async () => allCommitted("one.txt", "two.txt"),
    threeUntracked: async () => (await g.status()).split(/\r?\n/).includes("?? three.txt"),
    singleCommit: async () => (await g.count()) === 1,
    amendUsed: () => hasCommand(history, ["git", "commit", "--amend", "--no-edit"]),
    noteTracked: async () => allCommitted("note.txt"),
    fileTracked: async () => allCommitted("japanese.txt"),
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
    readmeTracked: async () => allCommitted("README.md"),
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
    rebasedOntoMain: async () =>
      (await g.ancestor("main", "feature")) &&
      (await allCommitted("feature.txt")) &&
      (await g.git(["merge-base", "main", "feature"]).then((text) => text.trim())) === (await g.ref("main")),
    showCurrentUsed: () => history.some((entry) => /^git\s+branch\s+--show-current\b/.test(entry.trim())),
    hotfixExists: async () => g.branch("hotfix"),
    onHotfix: async () => (await g.head()) === "hotfix",
    featureFileTracked: async () => allCommitted("feature.txt"),
    switchDashUsed: () => history.some((entry) => /^git\s+switch\s+-\s*$/.test(entry.trim())),
    featureMerged: async () => (await g.merged("feature")) && (await allCommitted("feature.txt")),
    mergeCommit: async () => mergeIntroducedBranch("feature"),
    noMarkers: async () => noConflictMarkers(dir, id === 59 ? "config.txt" : "README.md"),
    mergeAbortUsed: () => history.some((entry) => /^git\s+merge\s+--abort\b/.test(entry.trim())),
    cMerged: async () => (await g.merged("feature/c")) && (await allCommitted("c.txt")),
    mergeUsed: () => hasCommand(history, ["git", "merge"]),
    aMerged: async () => (await g.merged("feature/a")) && (await allCommitted("a.txt")),
    bMerged: async () => (await g.merged("feature/b")) && (await allCommitted("b.txt")),
    clean,
    restoreUsed: () => hasCommand(history, ["git", "restore"]),
    noStaged: async () => (await g.staged()).length === 0,
    oneCommit: async () => (await g.count()) === 1,
    staged: async () => (await g.staged()).length > 0,
    badGone: async () => !(await exists(dir, "bad.txt")),
    revertCommit: async () =>
      (await g.count()) >= 3 &&
      (await g.message()).startsWith("Revert") &&
      (id === 71 ? !(await exists(dir, "bad.txt")) : !(await exists(dir, "old-bug.txt"))),
    reflogUsed: () => hasCommand(history, ["git", "reflog"]),
    lostTracked: async () => allCommitted("lost.txt"),
    recoverHead: recoverRestored,
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
    tagExists: async () => {
      const name = { 89: "v1.0.0", 90: "v1.1.0", 91: "v1.0.0", 97: "v2.0.0", 100: "v1.0.0" }[id];
      return [90, 100].includes(id) ? annotatedTag(name) : g.tag(name);
    },
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
    bugfixTracked: async () => allCommitted("bugfix.txt"),
    releaseTracked: async () => allCommitted("release.txt"),
    recoverTracked: recoverRestored,
    loginTracked: async () => allCommitted(id === 100 ? "login.js" : "src/login.js"),
    originConfigured: async () => (await g.git(["remote", "get-url", "origin"])).trim().length > 0,
    remoteVUsed: () => history.some((entry) => /^git\s+remote\s+-v\s*$/.test(entry.trim())),
    originMainHasHead: async () => refEquals("main", "refs/remotes/origin/main"),
    mainUpstream: async () => (await g.upstream()) === "origin/main",
    pulledTeammate: async () => allCommitted("teammate.txt"),
    mainMatchesOrigin: async () => refEquals("main", "refs/remotes/origin/main"),
    originFetched: async () => remoteCommitHasFile("refs/remotes/origin/main", "remote-only.txt"),
    logOriginUsed: () => history.some((entry) => /^git\s+log\b/.test(entry.trim()) && entry.includes("origin/main")),
    reportPicked: async () =>
      (await allCommitted("report.txt")) &&
      (await g.ancestor("feature", "main")) === false &&
      lines(await g.git(["log", "--format=%s", "--", "report.txt"])).includes("add report"),
    configPicked: async () =>
      (await allCommitted("config.txt")) &&
      (await g.ancestor("hotfix", "main")) === false &&
      lines(await g.git(["log", "--format=%s", "--", "config.txt"])).includes("fix config"),
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
