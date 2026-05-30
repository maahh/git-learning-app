import { execFile, execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { drills, TOTAL_DRILLS } from "../../src/content/drills.mjs";
import { evaluateDrillChecks } from "../../src/lib/conditions/evaluate.mjs";
import { initializeExtraDrillSandbox } from "../../src/lib/drills/extraSandbox.mjs";

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

async function runShell(command: string, cwd: string): Promise<void> {
  await execFileAsync("bash", ["-lc", command], {
    cwd,
    timeout: 5000,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Git Learning App",
      GIT_AUTHOR_EMAIL: "git-learning@example.local",
      GIT_COMMITTER_NAME: "Git Learning App",
      GIT_COMMITTER_EMAIL: "git-learning@example.local",
      GIT_PAGER: "cat",
    },
  });
}

async function init(dir: string): Promise<void> {
  await runGit(["init", "-b", "main"], dir);
}

async function commitAll(dir: string, message: string): Promise<void> {
  await runGit(["add", "."], dir);
  await runGit(["commit", "-m", message], dir);
}

async function initReadme(dir: string, message = "initial commit"): Promise<void> {
  await init(dir);
  await fs.writeFile(path.join(dir, "README.md"), "# Project\n", "utf8");
  await commitAll(dir, message);
}

function okMap(checks: Awaited<ReturnType<typeof evaluateDrillChecks>>): Record<string, boolean> {
  return Object.fromEntries(checks.map((check) => [check.id, check.ok]));
}

async function drillOk(id: number, dir: string, history: string[] = []): Promise<Record<string, boolean>> {
  return okMap(await evaluateDrillChecks(id, dir, history, runGit));
}

async function initializeExtra(id: number, dir: string): Promise<void> {
  const initialized = await initializeExtraDrillSandbox(id, dir, (args) => runGit(args, dir));
  expect(initialized).toBe(true);
}

async function runDrillAnswer(id: number, dir: string): Promise<string[]> {
  const drill = drills.find((item) => item.id === id);
  expect(drill).toBeDefined();
  for (const command of drill!.answer) {
    await runShell(command, dir);
  }
  return drill!.answer;
}

describe("drill conditions", () => {
  it("all drills have on-demand hint and answer content", () => {
    expect(drills).toHaveLength(TOTAL_DRILLS);
    expect(drills).toHaveLength(100);
    expect(drills.map((drill) => drill.id)).toEqual(Array.from({ length: 100 }, (_, index) => index + 1));
    for (const drill of drills) {
      expect(drill.hint.trim().length, `drill ${drill.id} hint`).toBeGreaterThan(0);
      expect(drill.answer.length, `drill ${drill.id} answer`).toBeGreaterThan(0);
      for (const command of drill.answer) {
        expect(command.trim().length, `drill ${drill.id} answer command`).toBeGreaterThan(0);
      }
    }
  });

  gitIt("drill 1 detects first README commit", async () => {
    const dir = await tempDir("claude-git-app-v5-drill1");
    expect(await drillOk(1, dir)).toMatchObject({
      "drill1.commit": false,
      "drill1.readmeTracked": false,
    });

    await init(dir);
    await fs.writeFile(path.join(dir, "README.md"), "# Hello\n", "utf8");
    await commitAll(dir, "first commit");

    expect(await drillOk(1, dir)).toMatchObject({
      "drill1.commit": true,
      "drill1.readmeTracked": true,
    });
  });

  gitIt("drill 3 accepts amend without adding a second commit", async () => {
    const dir = await tempDir("claude-git-app-v5-drill3");
    await initReadme(dir, "wip");
    expect(await drillOk(3, dir)).toMatchObject({
      "drill3.message": false,
      "drill3.singleCommit": true,
    });

    await runGit(["commit", "--amend", "-m", "add feature"], dir);

    expect(await drillOk(3, dir)).toMatchObject({
      "drill3.message": true,
      "drill3.singleCommit": true,
    });
  });

  gitIt("drill 5 detects ignored generated files", async () => {
    const dir = await tempDir("claude-git-app-v5-drill5");
    await initReadme(dir);
    await fs.writeFile(path.join(dir, "build.log"), "build\n", "utf8");
    await fs.writeFile(path.join(dir, "cache.tmp"), "cache\n", "utf8");
    expect(await drillOk(5, dir)).toMatchObject({
      "drill5.gitignore": false,
      "drill5.ignored": false,
    });

    await fs.writeFile(path.join(dir, ".gitignore"), "*.log\n*.tmp\n", "utf8");
    await commitAll(dir, "ignore generated files");

    expect(await drillOk(5, dir)).toMatchObject({
      "drill5.gitignore": true,
      "drill5.ignored": true,
    });
  });

  gitIt("drill 12 requires conflict markers gone and a merge commit", async () => {
    const dir = await tempDir("claude-git-app-v5-drill12");
    await initReadme(dir);
    await fs.writeFile(path.join(dir, "README.md"), "# Project\nshared\n", "utf8");
    await commitAll(dir, "add shared line");
    await runGit(["switch", "-c", "feature"], dir);
    await fs.writeFile(path.join(dir, "README.md"), "# Project\nfeature\n", "utf8");
    await commitAll(dir, "feature edit");
    await runGit(["switch", "main"], dir);
    await fs.writeFile(path.join(dir, "README.md"), "# Project\nmain\n", "utf8");
    await commitAll(dir, "main edit");

    await expect(runGit(["merge", "feature"], dir)).rejects.toThrow();
    expect(await drillOk(12, dir)).toMatchObject({
      "drill12.noMarkers": false,
      "drill12.mergeCommit": false,
    });

    await fs.writeFile(path.join(dir, "README.md"), "# Project\nmain\nfeature\n", "utf8");
    await runGit(["add", "README.md"], dir);
    await runGit(["commit", "-m", "merge feature"], dir);

    expect(await drillOk(12, dir)).toMatchObject({
      "drill12.noMarkers": true,
      "drill12.mergeCommit": true,
    });
  });

  gitIt("drill 15 detects unstaged-but-kept README changes", async () => {
    const dir = await tempDir("claude-git-app-v5-drill15");
    await initReadme(dir);
    await fs.appendFile(path.join(dir, "README.md"), "staged edit\n", "utf8");
    await runGit(["add", "README.md"], dir);
    expect(await drillOk(15, dir)).toMatchObject({
      "drill15.noCachedDiff": false,
      "drill15.workingDiff": false,
    });

    await runGit(["restore", "--staged", "README.md"], dir);

    expect(await drillOk(15, dir)).toMatchObject({
      "drill15.noCachedDiff": true,
      "drill15.workingDiff": true,
    });
  });

  gitIt("drill 17 detects reset soft state", async () => {
    const dir = await tempDir("claude-git-app-v5-drill17");
    await initReadme(dir);
    await fs.writeFile(path.join(dir, "feature.txt"), "feature\n", "utf8");
    await commitAll(dir, "add feature");
    expect(await drillOk(17, dir)).toMatchObject({
      "drill17.oneCommit": false,
      "drill17.staged": false,
    });

    await runGit(["reset", "--soft", "HEAD~1"], dir);

    expect(await drillOk(17, dir)).toMatchObject({
      "drill17.oneCommit": true,
      "drill17.staged": true,
    });
  });

  gitIt("drill 18 combines final diff with stash action history", async () => {
    const dir = await tempDir("claude-git-app-v5-drill18");
    await initReadme(dir);
    await fs.appendFile(path.join(dir, "README.md"), "stash me\n", "utf8");
    expect(await drillOk(18, dir)).toMatchObject({
      "drill18.workingDiff": true,
      "drill18.stashUsed": false,
    });

    await runGit(["stash"], dir);
    await runGit(["stash", "pop"], dir);

    expect(await drillOk(18, dir, ["git stash", "git stash pop"])).toMatchObject({
      "drill18.workingDiff": true,
      "drill18.stashUsed": true,
    });
  });

  gitIt("drill 19 detects release tag", async () => {
    const dir = await tempDir("claude-git-app-v5-drill19");
    await initReadme(dir);
    expect(await drillOk(19, dir)).toMatchObject({ "drill19.tag": false });

    await runGit(["tag", "v1.0.0"], dir);

    expect(await drillOk(19, dir)).toMatchObject({ "drill19.tag": true });
  });

  gitIt("drill 20 detects the integrated login flow", async () => {
    const dir = await tempDir("claude-git-app-v5-drill20");
    await init(dir);
    await fs.mkdir(path.join(dir, "src"), { recursive: true });
    await fs.writeFile(path.join(dir, "README.md"), "# App\n", "utf8");
    await fs.writeFile(path.join(dir, "src", "app.js"), "export function app() { return 'app'; }\n", "utf8");
    await commitAll(dir, "initial app");
    expect(await drillOk(20, dir)).toMatchObject({
      "drill20.loginTracked": false,
      "drill20.gitignore": false,
      "drill20.merged": false,
      "drill20.tag": false,
    });

    await runGit(["switch", "-c", "feature/login"], dir);
    await fs.writeFile(path.join(dir, "src", "login.js"), "export function login() { return true; }\n", "utf8");
    await commitAll(dir, "add login");
    await fs.writeFile(path.join(dir, ".gitignore"), "*.log\n", "utf8");
    await commitAll(dir, "ignore logs");
    await runGit(["switch", "main"], dir);
    await runGit(["merge", "--no-ff", "feature/login", "-m", "merge login"], dir);
    await runGit(["tag", "v0.1.0"], dir);

    expect(await drillOk(20, dir)).toMatchObject({
      "drill20.loginTracked": true,
      "drill20.gitignore": true,
      "drill20.merged": true,
      "drill20.tag": true,
    });
  });

  const representativeExtraDrills = [22, 32, 42, 58, 68, 80, 89, 95, 98, 100];

  for (const id of representativeExtraDrills) {
    gitIt(`drill ${id} answer reaches all checks`, async () => {
      const dir = await tempDir(`claude-git-app-v5-drill${id}`);
      const initialized = await initializeExtraDrillSandbox(id, dir, (args) => runGit(args, dir));
      expect(initialized).toBe(true);

      const before = await drillOk(id, dir);
      expect(Object.values(before).some((ok) => !ok)).toBe(true);

      const drill = drills.find((item) => item.id === id);
      expect(drill).toBeDefined();
      for (const command of drill!.answer) {
        await runShell(command, dir).catch(() => undefined);
      }

      const after = await drillOk(id, dir, drill!.answer);
      expect(after).toEqual(Object.fromEntries(Object.keys(after).map((key) => [key, true])));
    });
  }

  for (const id of [21, 28, 49, 63, 74, 76, 86, 99]) {
    gitIt(`drill ${id} new practical scenario is false before answer and true after`, async () => {
      const dir = await tempDir(`claude-git-app-v5-new-drill${id}`);
      await initializeExtra(id, dir);

      const before = await drillOk(id, dir);
      expect(Object.values(before).some((ok) => !ok)).toBe(true);

      const history = await runDrillAnswer(id, dir);
      const after = await drillOk(id, dir, history);
      expect(after).toEqual(Object.fromEntries(Object.keys(after).map((key) => [key, true])));
    });
  }

  gitIt("extra mergeCommit only accepts a merge commit that introduced feature into main", async () => {
    const dir = await tempDir("claude-git-app-v5-strict-merge");
    await initializeExtra(57, dir);

    await runGit(["switch", "-c", "other"], dir);
    await fs.writeFile(path.join(dir, "other.txt"), "other\n", "utf8");
    await commitAll(dir, "other work");
    await runGit(["switch", "main"], dir);
    await fs.writeFile(path.join(dir, "main.txt"), "main\n", "utf8");
    await commitAll(dir, "main work");
    await runGit(["merge", "--no-ff", "other", "-m", "merge other"], dir);

    expect(await drillOk(57, dir)).toMatchObject({
      "drill57.onMain": true,
      "drill57.mergeCommit": false,
    });

    await runGit(["merge", "--no-ff", "feature", "-m", "merge feature"], dir);

    expect(await drillOk(57, dir)).toMatchObject({
      "drill57.onMain": true,
      "drill57.mergeCommit": true,
    });
  });

  gitIt("annotated tag drills reject lightweight tags", async () => {
    const dir90 = await tempDir("claude-git-app-v5-annotated90");
    await initReadme(dir90);
    await runGit(["tag", "v1.1.0"], dir90);
    expect(await drillOk(90, dir90, ["git tag v1.1.0"])).toMatchObject({
      "drill90.tagExists": false,
      "drill90.annotatedTagUsed": false,
    });
    await runGit(["tag", "-d", "v1.1.0"], dir90);
    await runGit(["tag", "-a", "v1.1.0", "-m", "release v1.1.0"], dir90);
    expect(await drillOk(90, dir90, ["git tag -a v1.1.0 -m \"release v1.1.0\""])).toMatchObject({
      "drill90.tagExists": true,
      "drill90.annotatedTagUsed": true,
    });

    const dir100 = await tempDir("claude-git-app-v5-annotated100");
    await initReadme(dir100);
    await runGit(["tag", "v1.0.0"], dir100);
    expect(await drillOk(100, dir100)).toMatchObject({ "drill100.tagExists": false });
  });

  gitIt("revert drills require a Revert commit and the target change removed", async () => {
    const false71 = await tempDir("claude-git-app-v5-revert71-false");
    await initializeExtra(71, false71);
    await runGit(["rm", "bad.txt"], false71);
    await runGit(["commit", "-m", "remove bad"], false71);
    expect(await drillOk(71, false71)).toMatchObject({
      "drill71.badGone": true,
      "drill71.revertCommit": false,
    });

    const true71 = await tempDir("claude-git-app-v5-revert71-true");
    await initializeExtra(71, true71);
    await runGit(["revert", "HEAD", "--no-edit"], true71);
    expect(await drillOk(71, true71)).toMatchObject({
      "drill71.badGone": true,
      "drill71.revertCommit": true,
    });

    const false72 = await tempDir("claude-git-app-v5-revert72-false");
    await initializeExtra(72, false72);
    await runGit(["rm", "old-bug.txt"], false72);
    await runGit(["commit", "-m", "remove old bug"], false72);
    expect(await drillOk(72, false72)).toMatchObject({
      "drill72.oldGone": true,
      "drill72.revertCommit": false,
    });

    const true72 = await tempDir("claude-git-app-v5-revert72-true");
    await initializeExtra(72, true72);
    await runGit(["revert", "HEAD~1", "--no-edit"], true72);
    expect(await drillOk(72, true72)).toMatchObject({
      "drill72.oldGone": true,
      "drill72.revertCommit": true,
    });
  });
});
