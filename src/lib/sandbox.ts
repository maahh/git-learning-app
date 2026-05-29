import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { TOTAL_CHAPTERS } from "./conditions/definitions.mjs";
import { evaluateChapterChecks } from "./conditions/evaluate.mjs";

const execFileAsync = promisify(execFile);

export type ChapterState = {
  chapter: number;
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

export async function ensureChapterSandbox(chapterInput: string | number): Promise<string> {
  const chapter = parseChapter(chapterInput);
  const dir = chapterSandboxPath(chapter);
  await fs.mkdir(dir, { recursive: true });
  await initializeChapterSandbox(chapter, dir);
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

  await initializeCommittedReadme(dir);
}

async function initializeCommittedReadme(dir: string): Promise<void> {
  await runGit(["init", "-b", "main"], dir);
  await fs.writeFile(path.join(dir, "README.md"), "# My Project\n", "utf8");
  await runGit(["add", "README.md"], dir);
  await runGit(["commit", "-m", "initial commit"], dir);
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
