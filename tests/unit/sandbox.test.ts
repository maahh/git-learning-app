import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  chapterSandboxPath,
  ensureChapterSandbox,
  getChapterState,
  listSandboxFiles,
  parseChapter,
  resetChapterSandbox,
} from "../../src/lib/sandbox";

describe("sandbox", () => {
  it("creates a deterministic chapter sandbox directory", async () => {
    const dir = await resetChapterSandbox(91);

    expect(dir).toBe(chapterSandboxPath(91));
    await expect(fs.access(dir)).resolves.toBeUndefined();
  });

  it("lists user files and omits .git internals", async () => {
    const dir = await resetChapterSandbox(1);
    await fs.mkdir(path.join(dir, ".git"), { recursive: true });
    await fs.writeFile(path.join(dir, ".git", "HEAD"), "ref: refs/heads/main\n");
    await fs.mkdir(path.join(dir, "docs"), { recursive: true });
    await fs.writeFile(path.join(dir, "README.md"), "# Hello\n");
    await fs.writeFile(path.join(dir, "docs", "guide.md"), "Guide\n");

    await ensureChapterSandbox(1);

    await expect(listSandboxFiles(dir)).resolves.toEqual(["docs/guide.md", "README.md"]);
    await expect(getChapterState(1)).resolves.toMatchObject({
      chapter: 1,
      head: "ref: refs/heads/main",
      checks: [
        { id: "ch1.gitDir", ok: true },
        { id: "ch1.readme", ok: true },
        { id: "ch1.statusUsed", ok: false },
      ],
    });
  });

  it("rejects invalid chapter values", () => {
    expect(() => parseChapter("0")).toThrow("chapter must be an integer");
    expect(() => parseChapter("abc")).toThrow("chapter must be an integer");
  });

  it("seeds chapter 2 with a real git repository and README", async () => {
    const dir = await resetChapterSandbox(2);
    const state = await getChapterState(2);

    await expect(fs.access(path.join(dir, ".git", "HEAD"))).resolves.toBeUndefined();
    await expect(fs.access(path.join(dir, "README.md"))).resolves.toBeUndefined();
    expect(state.files).toContain("README.md");
    expect(state.head).toContain("refs/heads/");
  });

  it("seeds chapter 7 with ignored practice files still untracked", async () => {
    const dir = await resetChapterSandbox(7);
    const state = await getChapterState(7);

    await expect(fs.readFile(path.join(dir, "secret.txt"), "utf8")).resolves.toBe("APIキー: xxxx\n");
    await expect(fs.readFile(path.join(dir, "debug.log"), "utf8")).resolves.toBe("ログ出力\n");
    expect(state.files).toEqual(expect.arrayContaining(["README.md", "debug.log", "secret.txt"]));
    expect(state.status).toContain("secret.txt");
    expect(state.status).toContain("debug.log");
  });

  it("seeds chapter 8 on main with branches ready to conflict", async () => {
    await resetChapterSandbox(8);
    const state = await getChapterState(8);

    expect(state.head).toBe("ref: refs/heads/main");
    expect(state.files).toContain("README.md");
    expect(state.status).toBe("");
  });
});
