import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  chapterSandboxPath,
  ensureChapterSandbox,
  ensureTrackSandbox,
  getChapterState,
  getTrackState,
  listSandboxFiles,
  parseChapter,
  parseDrill,
  resetChapterSandbox,
  resetTrackSandbox,
  trackSandboxPath,
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

  it("creates deterministic drill sandbox directories", async () => {
    const target = { track: "drill" as const, id: 1 };
    const dir = await resetTrackSandbox(target);

    expect(parseDrill("1")).toBe(1);
    expect(dir).toBe(trackSandboxPath(target));
    await expect(fs.access(dir)).resolves.toBeUndefined();
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

  it("seeds chapter 9 as a committed web site on main", async () => {
    const dir = await resetChapterSandbox(9);
    const state = await getChapterState(9);

    await expect(fs.readFile(path.join(dir, "README.md"), "utf8")).resolves.toBe("# My Web Site\n");
    await expect(fs.readFile(path.join(dir, "index.html"), "utf8")).resolves.toBe(
      "<!doctype html>\n<title>My Site</title>\n",
    );
    expect(state.head).toBe("ref: refs/heads/main");
    expect(state.files).toEqual(expect.arrayContaining(["README.md", "index.html"]));
    expect(state.status).toBe("");
  });

  it("seeds drill 2 with three untracked files in a real repository", async () => {
    const target = { track: "drill" as const, id: 2 };
    const dir = await resetTrackSandbox(target);
    const state = await getTrackState(target);

    await ensureTrackSandbox(target);
    await expect(fs.access(path.join(dir, ".git", "HEAD"))).resolves.toBeUndefined();
    expect(state.files).toEqual(["a.txt", "b.txt", "c.txt"]);
    expect(state.status).toContain("?? a.txt");
  });

  it("seeds drill 12 on main with a feature branch ready to conflict", async () => {
    const target = { track: "drill" as const, id: 12 };
    await resetTrackSandbox(target);
    const state = await getTrackState(target);

    expect(state.head).toBe("ref: refs/heads/main");
    expect(state.files).toContain("README.md");
    expect(state.status).toBe("");
  });

  it("seeds drill 20 as a committed app on main", async () => {
    const target = { track: "drill" as const, id: 20 };
    await resetTrackSandbox(target);
    const dir = await ensureTrackSandbox(target);
    const state = await getTrackState(target);

    await expect(fs.readFile(path.join(dir, "src", "app.js"), "utf8")).resolves.toContain("app");
    expect(state.head).toBe("ref: refs/heads/main");
    expect(state.files).toEqual(expect.arrayContaining(["README.md", "src/app.js"]));
    expect(state.status).toBe("");
  });
});
