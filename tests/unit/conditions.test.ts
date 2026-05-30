import { execFile, execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import {
  commandMatched,
  evaluateChapterChecks,
  gitDiffStagedUsed,
} from "../../src/lib/conditions/evaluate.mjs";

const execFileAsync = promisify(execFile);
const gitAvailable = (() => {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();
const gitIt = gitAvailable ? it : it.skip;

async function tempDir(name: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), `${name}-`));
}

async function runGit(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    timeout: 5000,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Git Learning App",
      GIT_AUTHOR_EMAIL: "git-learning@example.local",
      GIT_COMMITTER_NAME: "Git Learning App",
      GIT_COMMITTER_EMAIL: "git-learning@example.local",
    },
  });
  return stdout;
}

async function initCommittedReadme(dir: string): Promise<void> {
  await runGit(["init", "-b", "main"], dir);
  await fs.writeFile(path.join(dir, "README.md"), "# My Project\n");
  await runGit(["add", "README.md"], dir);
  await runGit(["commit", "-m", "initial commit"], dir);
}

async function initCommittedSite(dir: string): Promise<void> {
  await runGit(["init", "-b", "main"], dir);
  await fs.writeFile(path.join(dir, "README.md"), "# My Web Site\n");
  await fs.writeFile(path.join(dir, "index.html"), "<!doctype html>\n<title>My Site</title>\n");
  await runGit(["add", "README.md", "index.html"], dir);
  await runGit(["commit", "-m", "initial site"], dir);
}

async function initConflictingBranches(dir: string): Promise<void> {
  await initCommittedReadme(dir);
  await fs.writeFile(path.join(dir, "README.md"), "# My Project\n## 説明\n初期行\n");
  await runGit(["add", "README.md"], dir);
  await runGit(["commit", "-m", "add description"], dir);
  await runGit(["switch", "-c", "feature"], dir);
  await fs.writeFile(path.join(dir, "README.md"), "# My Project\n## 説明\nfeature 側の変更\n");
  await runGit(["add", "README.md"], dir);
  await runGit(["commit", "-m", "feature changes description"], dir);
  await runGit(["switch", "main"], dir);
  await fs.writeFile(path.join(dir, "README.md"), "# My Project\n## 説明\nmain 側の変更\n");
  await runGit(["add", "README.md"], dir);
  await runGit(["commit", "-m", "main changes description"], dir);
}

function checkOk(checks: Awaited<ReturnType<typeof evaluateChapterChecks>>, id: string): boolean | undefined {
  return checks.find((check) => check.id === id)?.ok;
}

describe("conditions", () => {
  it.each([
    ["git status", true],
    ["  git   status  ", true],
    ["git status -s", true],
    ["gitstatus", false],
    ["git stat", false],
    ["echo git status", false],
  ])("matches git status action history: %s", (historyEntry, expected) => {
    expect(commandMatched([historyEntry], "git", "status")).toBe(expected);
  });

  it.each([
    ["git log", true],
    ["git log --oneline", true],
    ["git lo", false],
  ])("matches git log action history: %s", (historyEntry, expected) => {
    expect(commandMatched([historyEntry], "git", "log")).toBe(expected);
  });

  it.each([
    ["git diff --staged", true],
    ["git diff --cached", true],
    ["  git   diff   --staged  README.md", true],
    ["git diff", false],
    ["git status --staged", false],
    ["echo git diff --staged", false],
  ])("detects staged git diff action history: %s", (historyEntry, expected) => {
    expect(gitDiffStagedUsed([historyEntry])).toBe(expected);
  });

  it.each([
    ["git diff", "diff", true],
    ["git diff --staged", "diff", true],
    ["git restore README.md", "restore", true],
    ["git switch -c feature", "switch", true],
    ["git branch --list", "branch", true],
    ["git add README.md", "commit", false],
  ])("matches generic git subcommands: %s", (historyEntry, subcommand, expected) => {
    expect(commandMatched([historyEntry], "git", subcommand)).toBe(expected);
  });

  it("marks chapter 1 git dir and README state checks", async () => {
    const dir = await tempDir("claude-git-app-v5-condition-ch1");
    await fs.mkdir(path.join(dir, ".git"), { recursive: true });
    await fs.writeFile(path.join(dir, ".git", "HEAD"), "ref: refs/heads/main\n");
    await fs.writeFile(path.join(dir, "README.md"), "# title\n");

    const checks = await evaluateChapterChecks(1, dir, [], async () => "");

    expect(checks.map((check) => [check.id, check.ok])).toEqual([
      ["ch1.gitDir", true],
      ["ch1.readme", true],
      ["ch1.statusUsed", false],
    ]);
  });

  it("marks chapter 1 action check from raw command history", async () => {
    const dir = await tempDir("claude-git-app-v5-condition-ch1-action");

    const checks = await evaluateChapterChecks(1, dir, ["git status"], async () => "");

    expect(checks.find((check) => check.id === "ch1.statusUsed")?.ok).toBe(true);
  });

  it("marks chapter 2 staged README", async () => {
    const checks = await evaluateChapterChecks(2, "/tmp", [], async (args) =>
      args[0] === "ls-files" ? "README.md\n" : "0\n",
    );

    expect(checks.find((check) => check.id === "ch2.staged")?.ok).toBe(true);
  });

  it("marks chapter 2 first commit when rev-list count is at least one", async () => {
    const checks = await evaluateChapterChecks(2, "/tmp", [], async (args) =>
      args[0] === "rev-list" ? "2\n" : "",
    );

    expect(checks.find((check) => check.id === "ch2.firstCommit")?.ok).toBe(true);
  });

  it("marks chapter 2 log action from command history", async () => {
    const checks = await evaluateChapterChecks(2, "/tmp", ["git log --oneline"], async () => "");

    expect(checks.find((check) => check.id === "ch2.logUsed")?.ok).toBe(true);
  });

  it("returns no checks for chapters outside the lesson set", async () => {
    await expect(evaluateChapterChecks(10, "/tmp", [], async () => "")).resolves.toEqual([]);
  });

  it("marks chapter 3 README modification and diff actions", async () => {
    const checks = await evaluateChapterChecks(
      3,
      "/tmp",
      ["git diff", "git diff --staged"],
      async () => " M README.md\n",
    );

    expect(checks.map((check) => [check.id, check.ok])).toEqual([
      ["ch3.modified", true],
      ["ch3.diffUsed", true],
      ["ch3.diffStagedUsed", true],
    ]);
  });

  it("keeps chapter 3 staged diff false for plain git diff", async () => {
    const checks = await evaluateChapterChecks(3, "/tmp", ["git diff"], async () => "M  README.md\n");

    expect(checkOk(checks, "ch3.diffUsed")).toBe(true);
    expect(checkOk(checks, "ch3.diffStagedUsed")).toBe(false);
  });

  it("marks chapter 4 branch state from git output", async () => {
    const checks = await evaluateChapterChecks(4, "/tmp", [], async (args) => {
      if (args[0] === "branch") return "  feature\n";
      if (args[0] === "rev-parse") return "feature\n";
      if (args[0] === "rev-list") return "1\n";
      return "";
    });

    expect(checks.map((check) => [check.id, check.ok])).toEqual([
      ["ch4.branchCreated", true],
      ["ch4.onFeature", true],
      ["ch4.featureCommit", true],
    ]);
  });

  it("keeps chapter 4 feature commit false when feature has not advanced", async () => {
    const checks = await evaluateChapterChecks(4, "/tmp", [], async (args) => {
      if (args[0] === "branch") return "  feature\n";
      if (args[0] === "rev-parse") return "feature\n";
      if (args[0] === "rev-list") return "0\n";
      return "";
    });

    expect(checkOk(checks, "ch4.featureCommit")).toBe(false);
  });

  it("marks chapter 5 merged from rev-list counts and log action", async () => {
    const checks = await evaluateChapterChecks(5, "/tmp", ["git log --oneline"], async (args) => {
      if (args[0] === "rev-parse") return "main\n";
      if (args.join(" ") === "rev-list --count feature..main") return "0\n";
      if (args.join(" ") === "rev-list --count main") return "2\n";
      return "";
    });

    expect(checks.map((check) => [check.id, check.ok])).toEqual([
      ["ch5.onMain", true],
      ["ch5.merged", true],
      ["ch5.logUsed", true],
    ]);
  });

  it("keeps chapter 5 merged false before main has two commits", async () => {
    const checks = await evaluateChapterChecks(5, "/tmp", [], async (args) => {
      if (args[0] === "rev-parse") return "main\n";
      if (args.join(" ") === "rev-list --count feature..main") return "0\n";
      if (args.join(" ") === "rev-list --count main") return "1\n";
      return "";
    });

    expect(checkOk(checks, "ch5.merged")).toBe(false);
  });

  it("marks chapter 6 clean only with a clean tree and commits", async () => {
    const checks = await evaluateChapterChecks(6, "/tmp", ["git status", "git restore README.md"], async (args) => {
      if (args[0] === "status") return "";
      if (args[0] === "rev-list") return "1\n";
      return "";
    });

    expect(checks.map((check) => [check.id, check.ok])).toEqual([
      ["ch6.statusUsed", true],
      ["ch6.restoreUsed", true],
      ["ch6.clean", true],
    ]);
  });

  it("keeps chapter 6 clean false without an initial commit", async () => {
    const checks = await evaluateChapterChecks(6, "/tmp", ["git restore README.md"], async (args) => {
      if (args[0] === "status") return "";
      if (args[0] === "rev-list") return "0\n";
      return "";
    });

    expect(checkOk(checks, "ch6.clean")).toBe(false);
  });

  it("marks chapter 7 ignored state from git status output", async () => {
    const dir = await tempDir("claude-git-app-v5-condition-ch7");
    await fs.writeFile(path.join(dir, ".gitignore"), "secret.txt\n*.log\n");

    const checks = await evaluateChapterChecks(7, dir, ["git commit -m add"], async (args) => {
      if (args[0] === "status") return "?? .gitignore\n";
      return "";
    });

    expect(checks.map((check) => [check.id, check.ok])).toEqual([
      ["ch7.gitignoreCreated", true],
      ["ch7.ignored", true],
      ["ch7.committed", true],
    ]);
  });

  it("marks chapter 8 conflict actions and merge state from git output", async () => {
    const dir = await tempDir("claude-git-app-v5-condition-ch8");
    await fs.writeFile(path.join(dir, "README.md"), "# My Project\n## 説明\n解決済み\n");

    const checks = await evaluateChapterChecks(8, dir, ["git merge feature"], async (args) => {
      if (args.join(" ") === "rev-list --merges HEAD --count") return "1\n";
      return "";
    });

    expect(checks.map((check) => [check.id, check.ok])).toEqual([
      ["ch8.conflictRaised", true],
      ["ch8.markersResolved", true],
      ["ch8.mergeCommit", true],
    ]);
  });

  it("marks chapter 9 final practice state from git output and .gitignore", async () => {
    const dir = await tempDir("claude-git-app-v5-condition-ch9");
    await fs.writeFile(path.join(dir, ".gitignore"), "*.log\n");

    const checks = await evaluateChapterChecks(9, dir, [], async (args) => {
      if (args.join(" ") === "branch --list feature/login") return "  feature/login\n";
      if (args.join(" ") === "ls-tree -r HEAD --name-only -- login.html") return "login.html\n";
      if (args.join(" ") === "rev-parse --abbrev-ref HEAD") return "main\n";
      return "";
    });

    expect(checks.map((check) => [check.id, check.ok])).toEqual([
      ["ch9.featureBranch", true],
      ["ch9.loginCommitted", true],
      ["ch9.gitignoreAdded", true],
      ["ch9.mergedToMain", true],
    ]);
  });

  gitIt("evaluates chapter 1 against a real git repository", async () => {
    const dir = await tempDir("claude-git-app-v5-real-ch1");
    await runGit(["init"], dir);
    await fs.writeFile(path.join(dir, "README.md"), "# title\n");

    const checks = await evaluateChapterChecks(1, dir, ["git status --short"], runGit);

    expect(checks.map((check) => [check.id, check.ok])).toEqual([
      ["ch1.gitDir", true],
      ["ch1.readme", true],
      ["ch1.statusUsed", true],
    ]);
  });

  gitIt("keeps chapter 1 state checks false before init and README creation", async () => {
    const dir = await tempDir("claude-git-app-v5-real-ch1-empty");

    const checks = await evaluateChapterChecks(1, dir, [], runGit);

    expect(checks.map((check) => [check.id, check.ok])).toEqual([
      ["ch1.gitDir", false],
      ["ch1.readme", false],
      ["ch1.statusUsed", false],
    ]);
  });

  gitIt("evaluates chapter 2 staged README after git add with real git", async () => {
    const dir = await tempDir("claude-git-app-v5-real-ch2-add");
    await runGit(["init"], dir);
    await fs.writeFile(path.join(dir, "README.md"), "# title\n");
    await runGit(["add", "README.md"], dir);

    const checks = await evaluateChapterChecks(2, dir, [], runGit);

    expect(checks.find((check) => check.id === "ch2.staged")?.ok).toBe(true);
    expect(checks.find((check) => check.id === "ch2.firstCommit")?.ok).toBe(false);
  });

  gitIt("keeps chapter 2 staged true after commit and marks first commit", async () => {
    const dir = await tempDir("claude-git-app-v5-real-ch2-commit");
    await runGit(["init"], dir);
    await fs.writeFile(path.join(dir, "README.md"), "# title\n");
    await runGit(["add", "README.md"], dir);
    await runGit(["commit", "-m", "Add README"], dir);

    const checks = await evaluateChapterChecks(2, dir, ["git log --oneline"], runGit);

    expect(checks.map((check) => [check.id, check.ok])).toEqual([
      ["ch2.staged", true],
      ["ch2.firstCommit", true],
      ["ch2.logUsed", true],
    ]);
  });

  gitIt("does not mark chapter 2 staged for an untracked README", async () => {
    const dir = await tempDir("claude-git-app-v5-real-ch2-untracked");
    await runGit(["init"], dir);
    await fs.writeFile(path.join(dir, "README.md"), "# title\n");

    const checks = await evaluateChapterChecks(2, dir, ["git log"], runGit);

    expect(checks.find((check) => check.id === "ch2.staged")?.ok).toBe(false);
    expect(checks.find((check) => check.id === "ch2.logUsed")?.ok).toBe(true);
  });

  gitIt("evaluates chapter 3 false before editing and true after diff workflow", async () => {
    const dir = await tempDir("claude-git-app-v5-real-ch3");
    await initCommittedReadme(dir);

    const before = await evaluateChapterChecks(3, dir, [], runGit);
    expect(checkOk(before, "ch3.modified")).toBe(false);

    await fs.appendFile(path.join(dir, "README.md"), "セットアップ手順\n");
    const afterEdit = await evaluateChapterChecks(3, dir, ["git diff"], runGit);
    expect(checkOk(afterEdit, "ch3.modified")).toBe(true);
    expect(checkOk(afterEdit, "ch3.diffUsed")).toBe(true);
    expect(checkOk(afterEdit, "ch3.diffStagedUsed")).toBe(false);

    await runGit(["add", "README.md"], dir);
    const afterStagedDiff = await evaluateChapterChecks(3, dir, ["git diff", "git diff --staged"], runGit);
    expect(checkOk(afterStagedDiff, "ch3.modified")).toBe(true);
    expect(checkOk(afterStagedDiff, "ch3.diffStagedUsed")).toBe(true);
  });

  gitIt("evaluates chapter 4 false before branching and true after feature commit", async () => {
    const dir = await tempDir("claude-git-app-v5-real-ch4");
    await initCommittedReadme(dir);

    const before = await evaluateChapterChecks(4, dir, [], runGit);
    expect(checkOk(before, "ch4.branchCreated")).toBe(false);
    expect(checkOk(before, "ch4.onFeature")).toBe(false);
    expect(checkOk(before, "ch4.featureCommit")).toBe(false);

    await runGit(["switch", "-c", "feature"], dir);
    await fs.writeFile(path.join(dir, "feature.txt"), "feature work\n");
    await runGit(["add", "feature.txt"], dir);
    await runGit(["commit", "-m", "add feature"], dir);
    const after = await evaluateChapterChecks(4, dir, [], runGit);

    expect(checkOk(after, "ch4.branchCreated")).toBe(true);
    expect(checkOk(after, "ch4.onFeature")).toBe(true);
    expect(checkOk(after, "ch4.featureCommit")).toBe(true);
  });

  gitIt("evaluates chapter 5 false before merge and true after fast-forward merge", async () => {
    const dir = await tempDir("claude-git-app-v5-real-ch5");
    await initCommittedReadme(dir);
    await runGit(["switch", "-c", "feature"], dir);
    await fs.appendFile(path.join(dir, "README.md"), "feature line\n");
    await runGit(["add", "README.md"], dir);
    await runGit(["commit", "-m", "add feature"], dir);
    await runGit(["switch", "main"], dir);

    const before = await evaluateChapterChecks(5, dir, [], runGit);
    expect(checkOk(before, "ch5.onMain")).toBe(true);
    expect(checkOk(before, "ch5.merged")).toBe(false);

    await runGit(["merge", "feature"], dir);
    const after = await evaluateChapterChecks(5, dir, ["git log --oneline"], runGit);
    expect(checkOk(after, "ch5.onMain")).toBe(true);
    expect(checkOk(after, "ch5.merged")).toBe(true);
    expect(checkOk(after, "ch5.logUsed")).toBe(true);
  });

  gitIt("evaluates chapter 6 false after editing and true after restore", async () => {
    const dir = await tempDir("claude-git-app-v5-real-ch6");
    await initCommittedReadme(dir);

    await fs.appendFile(path.join(dir, "README.md"), "まちがい\n");
    const dirty = await evaluateChapterChecks(6, dir, ["git status"], runGit);
    expect(checkOk(dirty, "ch6.statusUsed")).toBe(true);
    expect(checkOk(dirty, "ch6.restoreUsed")).toBe(false);
    expect(checkOk(dirty, "ch6.clean")).toBe(false);

    await runGit(["restore", "README.md"], dir);
    const clean = await evaluateChapterChecks(6, dir, ["git status", "git restore README.md"], runGit);
    expect(checkOk(clean, "ch6.statusUsed")).toBe(true);
    expect(checkOk(clean, "ch6.restoreUsed")).toBe(true);
    expect(checkOk(clean, "ch6.clean")).toBe(true);
  });

  gitIt("evaluates chapter 7 false without .gitignore and true after ignore commit", async () => {
    const dir = await tempDir("claude-git-app-v5-real-ch7");
    await initCommittedReadme(dir);
    await fs.writeFile(path.join(dir, "secret.txt"), "APIキー: xxxx\n");
    await fs.writeFile(path.join(dir, "debug.log"), "ログ出力\n");

    const before = await evaluateChapterChecks(7, dir, [], runGit);
    expect(checkOk(before, "ch7.gitignoreCreated")).toBe(false);
    expect(checkOk(before, "ch7.ignored")).toBe(false);
    expect(checkOk(before, "ch7.committed")).toBe(false);

    await fs.writeFile(path.join(dir, ".gitignore"), "secret.txt\n*.log\n");
    const ignored = await evaluateChapterChecks(7, dir, [], runGit);
    expect(checkOk(ignored, "ch7.gitignoreCreated")).toBe(true);
    expect(checkOk(ignored, "ch7.ignored")).toBe(true);
    expect(checkOk(ignored, "ch7.committed")).toBe(false);

    await runGit(["add", ".gitignore"], dir);
    await runGit(["commit", "-m", "add gitignore"], dir);
    const committed = await evaluateChapterChecks(7, dir, ["git commit -m add gitignore"], runGit);
    expect(checkOk(committed, "ch7.gitignoreCreated")).toBe(true);
    expect(checkOk(committed, "ch7.ignored")).toBe(true);
    expect(checkOk(committed, "ch7.committed")).toBe(true);
  });

  gitIt("evaluates chapter 8 conflict resolution and merge commit with real git", async () => {
    const dir = await tempDir("claude-git-app-v5-real-ch8");
    await initConflictingBranches(dir);

    await expect(runGit(["merge", "feature"], dir)).rejects.toThrow();
    const conflicted = await evaluateChapterChecks(8, dir, ["git merge feature"], runGit);
    expect(checkOk(conflicted, "ch8.conflictRaised")).toBe(true);
    expect(checkOk(conflicted, "ch8.markersResolved")).toBe(false);
    expect(checkOk(conflicted, "ch8.mergeCommit")).toBe(false);

    await fs.writeFile(path.join(dir, "README.md"), "# My Project\n## 説明\nmain と feature の内容をまとめた説明\n");
    await runGit(["add", "README.md"], dir);
    await runGit(["commit", "-m", "merge feature"], dir);
    const resolved = await evaluateChapterChecks(8, dir, ["git merge feature"], runGit);
    expect(checkOk(resolved, "ch8.conflictRaised")).toBe(true);
    expect(checkOk(resolved, "ch8.markersResolved")).toBe(true);
    expect(checkOk(resolved, "ch8.mergeCommit")).toBe(true);
  });

  gitIt("evaluates chapter 9 feature branch workflow with real git", async () => {
    const dir = await tempDir("claude-git-app-v5-real-ch9");
    await initCommittedSite(dir);

    const initial = await evaluateChapterChecks(9, dir, [], runGit);
    expect(initial.map((check) => [check.id, check.ok])).toEqual([
      ["ch9.featureBranch", false],
      ["ch9.loginCommitted", false],
      ["ch9.gitignoreAdded", false],
      ["ch9.mergedToMain", false],
    ]);

    await runGit(["switch", "-c", "feature/login"], dir);
    const branched = await evaluateChapterChecks(9, dir, [], runGit);
    expect(checkOk(branched, "ch9.featureBranch")).toBe(true);
    expect(checkOk(branched, "ch9.loginCommitted")).toBe(false);
    expect(checkOk(branched, "ch9.gitignoreAdded")).toBe(false);
    expect(checkOk(branched, "ch9.mergedToMain")).toBe(false);

    await fs.writeFile(path.join(dir, "login.html"), "<title>Login</title>\n");
    await fs.writeFile(path.join(dir, ".gitignore"), "*.log\n");
    const filesCreated = await evaluateChapterChecks(9, dir, [], runGit);
    expect(checkOk(filesCreated, "ch9.featureBranch")).toBe(true);
    expect(checkOk(filesCreated, "ch9.loginCommitted")).toBe(false);
    expect(checkOk(filesCreated, "ch9.gitignoreAdded")).toBe(true);
    expect(checkOk(filesCreated, "ch9.mergedToMain")).toBe(false);

    await runGit(["add", "login.html", ".gitignore"], dir);
    const staged = await evaluateChapterChecks(9, dir, [], runGit);
    expect(checkOk(staged, "ch9.featureBranch")).toBe(true);
    expect(checkOk(staged, "ch9.loginCommitted")).toBe(false);
    expect(checkOk(staged, "ch9.gitignoreAdded")).toBe(true);
    expect(checkOk(staged, "ch9.mergedToMain")).toBe(false);

    await runGit(["commit", "-m", "add login page"], dir);
    const committed = await evaluateChapterChecks(9, dir, [], runGit);
    expect(checkOk(committed, "ch9.featureBranch")).toBe(true);
    expect(checkOk(committed, "ch9.loginCommitted")).toBe(true);
    expect(checkOk(committed, "ch9.gitignoreAdded")).toBe(true);
    expect(checkOk(committed, "ch9.mergedToMain")).toBe(false);

    await runGit(["switch", "main"], dir);
    await runGit(["merge", "feature/login"], dir);
    const merged = await evaluateChapterChecks(9, dir, ["git log --oneline"], runGit);
    expect(merged.map((check) => [check.id, check.ok])).toEqual([
      ["ch9.featureBranch", true],
      ["ch9.loginCommitted", true],
      ["ch9.gitignoreAdded", true],
      ["ch9.mergedToMain", true],
    ]);
  });
});
