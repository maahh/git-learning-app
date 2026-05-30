import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { TOTAL_CHAPTERS } from "./conditions/definitions.mjs";
import { TOTAL_DRILLS } from "../content/drills.mjs";
import { evaluateChapterChecks, evaluateDrillChecks } from "./conditions/evaluate.mjs";
import { initializeExtraDrillSandbox } from "./drills/extraSandbox.mjs";

const execFileAsync = promisify(execFile);

export type ChapterState = {
  chapter: number;
  sandboxPath: string;
  files: string[];
  head: string | null;
  status: string;
  checks: Array<{ id: string; label: string; ok: boolean }>;
};

export type Track = "chapter" | "drill";

export type TrackTarget = {
  track: Track;
  id: number;
};

export type TrackState = {
  track: Track;
  id: number;
  chapter?: number;
  drill?: number;
  sandboxPath: string;
  files: string[];
  head: string | null;
  status: string;
  checks: Array<{ id: string; label: string; ok: boolean }>;
};

export function parseChapter(value: string | number | null | undefined): number {
  const chapter = Number(value ?? 1);
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > 99) {
    throw new Error("chapter must be an integer between 1 and 99");
  }
  return chapter;
}

export function parseDrill(value: string | number | null | undefined): number {
  const drill = Number(value ?? 1);
  if (!Number.isInteger(drill) || drill < 1 || drill > TOTAL_DRILLS) {
    throw new Error(`drill must be an integer between 1 and ${TOTAL_DRILLS}`);
  }
  return drill;
}

export function sandboxRoot(): string {
  if (process.env.CLAUDE_GIT_APP_SANDBOX_ROOT) {
    return process.env.CLAUDE_GIT_APP_SANDBOX_ROOT;
  }

  return path.join(os.homedir(), ".claude-git-app-v5", "sandbox");
}

export function chapterSandboxPath(chapterInput: string | number): string {
  const chapter = parseChapter(chapterInput);
  return path.join(sandboxRoot(), `ch${chapter}`);
}

export function trackSandboxPath(target: TrackTarget): string {
  return target.track === "chapter"
    ? chapterSandboxPath(target.id)
    : path.join(sandboxRoot(), `drill${target.id}`);
}

export async function ensureChapterSandbox(chapterInput: string | number): Promise<string> {
  const chapter = parseChapter(chapterInput);
  const dir = chapterSandboxPath(chapter);
  await fs.mkdir(dir, { recursive: true });
  await initializeChapterSandbox(chapter, dir);
  return dir;
}

export async function ensureTrackSandbox(target: TrackTarget): Promise<string> {
  const dir = trackSandboxPath(target);
  await fs.mkdir(dir, { recursive: true });
  if (target.track === "chapter") {
    await initializeChapterSandbox(target.id, dir);
  } else {
    await initializeDrillSandbox(target.id, dir);
  }
  return dir;
}

export async function resetChapterSandbox(chapterInput: string | number): Promise<string> {
  const chapter = parseChapter(chapterInput);
  const dir = chapterSandboxPath(chapter);
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  await initializeChapterSandbox(chapter, dir);
  return dir;
}

export async function resetTrackSandbox(target: TrackTarget): Promise<string> {
  const dir = trackSandboxPath(target);
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
  if (target.track === "chapter") {
    await initializeChapterSandbox(target.id, dir);
  } else {
    await initializeDrillSandbox(target.id, dir);
  }
  return dir;
}

async function initializeChapterSandbox(chapter: number, dir: string): Promise<void> {
  if (chapter < 2 || chapter > TOTAL_CHAPTERS) {
    return;
  }

  const hasGitHead = await exists(path.join(dir, ".git", "HEAD"));

  if (hasGitHead) {
    return;
  }

  if (chapter === 2) {
    await runGit(["init", "-b", "main"], dir);
    await fs.writeFile(path.join(dir, "README.md"), "# title\n", "utf8");
    return;
  }

  if (chapter === 5) {
    await initializeCommittedReadme(dir);
    await runGit(["switch", "-c", "feature"], dir);
    await fs.appendFile(path.join(dir, "README.md"), "feature line\n", "utf8");
    await runGit(["add", "README.md"], dir);
    await runGit(["commit", "-m", "add feature"], dir);
    await runGit(["switch", "main"], dir);
    return;
  }

  if (chapter === 7) {
    await initializeCommittedReadme(dir);
    await fs.writeFile(path.join(dir, "secret.txt"), "APIキー: xxxx\n", "utf8");
    await fs.writeFile(path.join(dir, "debug.log"), "ログ出力\n", "utf8");
    return;
  }

  if (chapter === 8) {
    await initializeCommittedReadme(dir);
    await fs.writeFile(path.join(dir, "README.md"), "# My Project\n## 説明\n初期行\n", "utf8");
    await runGit(["add", "README.md"], dir);
    await runGit(["commit", "-m", "add description"], dir);
    await runGit(["switch", "-c", "feature"], dir);
    await fs.writeFile(path.join(dir, "README.md"), "# My Project\n## 説明\nfeature 側の変更\n", "utf8");
    await runGit(["add", "README.md"], dir);
    await runGit(["commit", "-m", "feature changes description"], dir);
    await runGit(["switch", "main"], dir);
    await fs.writeFile(path.join(dir, "README.md"), "# My Project\n## 説明\nmain 側の変更\n", "utf8");
    await runGit(["add", "README.md"], dir);
    await runGit(["commit", "-m", "main changes description"], dir);
    return;
  }

  if (chapter === 9) {
    await runGit(["init", "-b", "main"], dir);
    await fs.writeFile(path.join(dir, "README.md"), "# My Web Site\n", "utf8");
    await fs.writeFile(path.join(dir, "index.html"), "<!doctype html>\n<title>My Site</title>\n", "utf8");
    await runGit(["add", "README.md", "index.html"], dir);
    await runGit(["commit", "-m", "initial site"], dir);
    return;
  }

  await initializeCommittedReadme(dir);
}

async function initializeDrillSandbox(drill: number, dir: string): Promise<void> {
  const hasGitHead = await exists(path.join(dir, ".git", "HEAD"));
  if (hasGitHead || drill < 1 || drill > TOTAL_DRILLS) return;

  if (drill === 1) return;
  if (drill === 2) {
    await runGit(["init", "-b", "main"], dir);
    await writeFiles(dir, { "a.txt": "a\n", "b.txt": "b\n", "c.txt": "c\n" });
    return;
  }
  if (drill === 3) {
    await initializeCommittedReadme(dir, "wip");
    return;
  }
  if (drill === 4) {
    await initializeCommittedReadme(dir);
    await writeFiles(dir, { "keep.txt": "keep\n", "later.txt": "later\n" });
    return;
  }
  if (drill === 5) {
    await initializeCommittedReadme(dir);
    await writeFiles(dir, { "build.log": "build output\n", "cache.tmp": "cache\n" });
    return;
  }
  if (drill === 6) {
    await initializeCommittedFiles(dir, { "old.txt": "old\n" }, "add old");
    return;
  }
  if (drill === 7) {
    await initializeCommittedFiles(dir, { "temp.txt": "temp\n" }, "add temp");
    return;
  }
  if (drill === 8) {
    await initializeCommittedReadme(dir);
    return;
  }
  if (drill === 9) {
    await initializeCommittedReadme(dir);
    await runGit(["switch", "-c", "wip"], dir);
    return;
  }
  if (drill === 10 || drill === 11 || drill === 13) {
    await initializeFeatureAhead(dir);
    if (drill === 13) await runGit(["merge", "--ff-only", "feature"], dir);
    return;
  }
  if (drill === 12) {
    await initializeConflict(dir);
    return;
  }
  if (drill === 14) {
    await initializeCommittedReadme(dir);
    await fs.appendFile(path.join(dir, "README.md"), "edited\n", "utf8");
    return;
  }
  if (drill === 15) {
    await initializeCommittedReadme(dir);
    await fs.appendFile(path.join(dir, "README.md"), "staged edit\n", "utf8");
    await runGit(["add", "README.md"], dir);
    return;
  }
  if (drill === 16) {
    await initializeCommittedReadme(dir);
    await fs.writeFile(path.join(dir, "bad.txt"), "bad\n", "utf8");
    await runGit(["add", "bad.txt"], dir);
    await runGit(["commit", "-m", "bad change"], dir);
    return;
  }
  if (drill === 17) {
    await initializeCommittedReadme(dir);
    await fs.writeFile(path.join(dir, "feature.txt"), "feature\n", "utf8");
    await runGit(["add", "feature.txt"], dir);
    await runGit(["commit", "-m", "add feature"], dir);
    return;
  }
  if (drill === 18) {
    await initializeCommittedReadme(dir);
    await fs.appendFile(path.join(dir, "README.md"), "stash me\n", "utf8");
    return;
  }
  if (drill === 19) {
    await initializeCommittedReadme(dir);
    await fs.writeFile(path.join(dir, "CHANGELOG.md"), "changes\n", "utf8");
    await runGit(["add", "CHANGELOG.md"], dir);
    await runGit(["commit", "-m", "add changelog"], dir);
    return;
  }
  if (drill === 20) {
    await initializeCommittedFiles(
      dir,
      {
        "README.md": "# App\n",
        "src/app.js": "export function app() { return 'app'; }\n",
      },
      "initial app",
    );
    return;
  }

  await initializeExtraDrillSandbox(drill, dir, (args) => runGit(args, dir));
}

async function initializeCommittedReadme(dir: string, message = "initial commit"): Promise<void> {
  await runGit(["init", "-b", "main"], dir);
  await fs.writeFile(path.join(dir, "README.md"), "# My Project\n", "utf8");
  await runGit(["add", "README.md"], dir);
  await runGit(["commit", "-m", message], dir);
}

async function initializeCommittedFiles(
  dir: string,
  files: Record<string, string>,
  message: string,
): Promise<void> {
  await runGit(["init", "-b", "main"], dir);
  await writeFiles(dir, files);
  await runGit(["add", "."], dir);
  await runGit(["commit", "-m", message], dir);
}

async function initializeFeatureAhead(dir: string): Promise<void> {
  await initializeCommittedReadme(dir);
  await runGit(["switch", "-c", "feature"], dir);
  await fs.writeFile(path.join(dir, "feature.txt"), "feature\n", "utf8");
  await runGit(["add", "feature.txt"], dir);
  await runGit(["commit", "-m", "add feature"], dir);
  await runGit(["switch", "main"], dir);
}

async function initializeConflict(dir: string): Promise<void> {
  await initializeCommittedReadme(dir);
  await fs.writeFile(path.join(dir, "README.md"), "# My Project\nshared line\n", "utf8");
  await runGit(["add", "README.md"], dir);
  await runGit(["commit", "-m", "add shared line"], dir);
  await runGit(["switch", "-c", "feature"], dir);
  await fs.writeFile(path.join(dir, "README.md"), "# My Project\nfeature line\n", "utf8");
  await runGit(["add", "README.md"], dir);
  await runGit(["commit", "-m", "feature edit"], dir);
  await runGit(["switch", "main"], dir);
  await fs.writeFile(path.join(dir, "README.md"), "# My Project\nmain line\n", "utf8");
  await runGit(["add", "README.md"], dir);
  await runGit(["commit", "-m", "main edit"], dir);
}

async function writeFiles(dir: string, files: Record<string, string>): Promise<void> {
  await Promise.all(
    Object.entries(files).map(async ([fileName, content]) => {
      const filePath = path.join(dir, fileName);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, "utf8");
    }),
  );
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function listSandboxFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(current: string, relativePrefix = ""): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (entry.name === ".git") {
        continue;
      }

      const fullPath = path.join(current, entry.name);
      const relativePath = path.join(relativePrefix, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath, relativePath);
      } else if (entry.isFile()) {
        files.push(relativePath.split(path.sep).join("/"));
      }
    }
  }

  await walk(dir);
  return files;
}

async function readHead(dir: string): Promise<string | null> {
  try {
    return (await fs.readFile(path.join(dir, ".git", "HEAD"), "utf8")).trim();
  } catch {
    return null;
  }
}

async function gitStatus(dir: string): Promise<string> {
  return runGit(["status", "--porcelain"], dir).catch(() => "");
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

export async function getChapterState(
  chapterInput: string | number,
  history: string[] = [],
): Promise<ChapterState> {
  const chapter = parseChapter(chapterInput);
  const dir = await ensureChapterSandbox(chapter);
  const [files, head, status, checks] = await Promise.all([
    listSandboxFiles(dir),
    readHead(dir),
    gitStatus(dir),
    evaluateChapterChecks(chapter, dir, history, runGit),
  ]);

  return {
    chapter,
    sandboxPath: dir,
    files,
    head,
    status,
    checks,
  };
}

export async function getTrackState(target: TrackTarget, history: string[] = []): Promise<TrackState> {
  const dir = await ensureTrackSandbox(target);
  const [files, head, status, checks] = await Promise.all([
    listSandboxFiles(dir),
    readHead(dir),
    gitStatus(dir),
    target.track === "chapter"
      ? evaluateChapterChecks(target.id, dir, history, runGit)
      : evaluateDrillChecks(target.id, dir, history, runGit),
  ]);

  return {
    track: target.track,
    id: target.id,
    ...(target.track === "chapter" ? { chapter: target.id } : { drill: target.id }),
    sandboxPath: dir,
    files,
    head,
    status,
    checks,
  };
}
