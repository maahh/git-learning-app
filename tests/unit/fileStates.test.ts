import { describe, expect, it } from "vitest";
import { buildFileStates, parsePorcelainFileStates } from "../../src/lib/fileStates.mjs";

describe("file state parsing", () => {
  it("maps porcelain XY codes to display states", () => {
    expect(
      parsePorcelainFileStates(
        [
          "?? new.txt",
          " M edited.txt",
          "M  staged.txt",
          "MM staged-and-modified.txt",
          "R  old.txt -> renamed.txt",
          "!! ignored.log",
        ].join("\n"),
      ),
    ).toEqual([
      { path: "new.txt", state: "untracked" },
      { path: "edited.txt", state: "modified" },
      { path: "staged.txt", state: "staged" },
      { path: "staged-and-modified.txt", state: "staged" },
      { path: "renamed.txt", state: "staged" },
      { path: "ignored.log", state: "ignored" },
    ]);
  });

  it("adds clean tracked files as committed", () => {
    expect(buildFileStates(" M edited.txt\n?? new.txt\n!! ignored.log\n", ["README.md", "edited.txt"])).toEqual([
      { path: "edited.txt", state: "modified" },
      { path: "ignored.log", state: "ignored" },
      { path: "new.txt", state: "untracked" },
      { path: "README.md", state: "committed" },
    ]);
  });
});
