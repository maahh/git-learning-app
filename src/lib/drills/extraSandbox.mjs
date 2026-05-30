import fs from "node:fs/promises";
import path from "node:path";

async function writeFiles(dir, files) {
  await Promise.all(
    Object.entries(files).map(async ([fileName, content]) => {
      const filePath = path.join(dir, fileName);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, "utf8");
    }),
  );
}

async function commitAll(runGit, message) {
  await runGit(["add", "."]);
  await runGit(["commit", "-m", message]);
}

async function initFiles(dir, runGit, files = { "README.md": "# My Project\n" }, message = "initial commit") {
  await runGit(["init", "-b", "main"]);
  await writeFiles(dir, files);
  await commitAll(runGit, message);
}

async function addCommit(dir, runGit, files, message) {
  await writeFiles(dir, files);
  await commitAll(runGit, message);
}

async function featureAhead(dir, runGit, name = "feature", file = "feature.txt") {
  await initFiles(dir, runGit);
  await runGit(["switch", "-c", name]);
  await addCommit(dir, runGit, { [file]: `${name}\n` }, `add ${file}`);
  await runGit(["switch", "main"]);
}

async function twoFeatureBranches(dir, runGit) {
  await initFiles(dir, runGit);
  await runGit(["switch", "-c", "feature/a"]);
  await addCommit(dir, runGit, { "a.txt": "a\n" }, "add a");
  await runGit(["switch", "main"]);
  await runGit(["switch", "-c", "feature/b"]);
  await addCommit(dir, runGit, { "b.txt": "b\n" }, "add b");
  await runGit(["switch", "main"]);
}

async function conflictReadme(dir, runGit) {
  await initFiles(dir, runGit);
  await addCommit(dir, runGit, { "README.md": "# My Project\nshared line\n" }, "add shared line");
  await runGit(["switch", "-c", "feature"]);
  await addCommit(dir, runGit, { "README.md": "# My Project\nfeature line\n" }, "feature edit");
  await runGit(["switch", "main"]);
  await addCommit(dir, runGit, { "README.md": "# My Project\nmain line\n" }, "main edit");
}

async function conflictFile(dir, runGit) {
  await initFiles(dir, runGit, { "config.txt": "mode=base\n" }, "initial config");
  await runGit(["switch", "-c", "feature"]);
  await addCommit(dir, runGit, { "config.txt": "mode=feature\n" }, "feature config");
  await runGit(["switch", "main"]);
  await addCommit(dir, runGit, { "config.txt": "mode=main\n" }, "main config");
}

async function stashWithChange(dir, runGit, text = "stashed\n") {
  await initFiles(dir, runGit);
  await fs.appendFile(path.join(dir, "README.md"), text, "utf8");
  await runGit(["stash"]);
}

export async function initializeExtraDrillSandbox(drill, dir, runGit) {
  if (drill < 21 || drill > 100) return false;

  if ([25].includes(drill)) {
    await initFiles(dir, runGit);
    await writeFiles(dir, { "one.txt": "one\n", "two.txt": "two\n", "three.txt": "three\n" });
    return true;
  }
  if ([34, 37, 51].includes(drill)) {
    await initFiles(dir, runGit);
    await addCommit(dir, runGit, { "history.txt": "history\n" }, "add history");
    return true;
  }
  if ([44, 45, 50, 54, 55].includes(drill)) {
    await initFiles(dir, runGit);
    await runGit(["branch", "feature"]);
    if ([45, 55].includes(drill)) await runGit(["switch", "feature"]);
    return true;
  }
  if (drill === 46) {
    await featureAhead(dir, runGit);
    await runGit(["merge", "--ff-only", "feature"]);
    return true;
  }
  if (drill === 47) {
    await featureAhead(dir, runGit, "wip", "wip.txt");
    return true;
  }
  if (drill === 48) {
    await initFiles(dir, runGit);
    await runGit(["branch", "feature/old"]);
    return true;
  }
  if ([56, 57, 62].includes(drill)) {
    await featureAhead(dir, runGit);
    return true;
  }
  if ([58, 60].includes(drill)) {
    await conflictReadme(dir, runGit);
    return true;
  }
  if (drill === 59) {
    await conflictFile(dir, runGit);
    return true;
  }
  if (drill === 61) {
    await featureAhead(dir, runGit, "feature/c", "c.txt");
    return true;
  }
  if (drill === 63) {
    await featureAhead(dir, runGit);
    await runGit(["merge", "--ff-only", "feature"]);
    return true;
  }
  if ([64, 98].includes(drill)) {
    await twoFeatureBranches(dir, runGit);
    return true;
  }
  if (drill === 65) {
    await featureAhead(dir, runGit);
    await addCommit(dir, runGit, { "main.txt": "main\n" }, "main work");
    return true;
  }
  if ([66, 76].includes(drill)) {
    await initFiles(dir, runGit);
    await fs.appendFile(path.join(dir, "README.md"), "edit\n", "utf8");
    return true;
  }
  if ([67, 77].includes(drill)) {
    await initFiles(dir, runGit);
    await fs.appendFile(path.join(dir, "README.md"), "staged\n", "utf8");
    await runGit(["add", "README.md"]);
    return true;
  }
  if ([68, 69, 70].includes(drill)) {
    await initFiles(dir, runGit);
    await addCommit(dir, runGit, { "reset.txt": "reset\n" }, "reset target");
    return true;
  }
  if (drill === 71) {
    await initFiles(dir, runGit);
    await addCommit(dir, runGit, { "bad.txt": "bad\n" }, "bad change");
    return true;
  }
  if (drill === 72) {
    await initFiles(dir, runGit);
    await addCommit(dir, runGit, { "old-bug.txt": "old\n" }, "old bug");
    await addCommit(dir, runGit, { "later.txt": "later\n" }, "later work");
    return true;
  }
  if ([74, 99].includes(drill)) {
    await initFiles(dir, runGit);
    await addCommit(dir, runGit, { [drill === 74 ? "lost.txt" : "recover.txt"]: "recover\n" }, "recover target");
    return true;
  }
  if (drill === 75) {
    await initFiles(dir, runGit);
    await fs.rm(path.join(dir, "README.md"), { force: true });
    return true;
  }
  if (drill === 78) {
    await initFiles(dir, runGit);
    await writeFiles(dir, { "scratch.txt": "scratch\n" });
    return true;
  }
  if (drill === 79) {
    await initFiles(dir, runGit);
    await fs.appendFile(path.join(dir, "README.md"), "stash me\n", "utf8");
    return true;
  }
  if ([80, 81, 82, 83, 87, 88].includes(drill)) {
    await stashWithChange(dir, runGit);
    return true;
  }
  if (drill === 84) {
    await initFiles(dir, runGit);
    await writeFiles(dir, { "draft.txt": "draft\n" });
    return true;
  }
  if (drill === 85) {
    await initFiles(dir, runGit);
    await runGit(["branch", "feature"]);
    await fs.appendFile(path.join(dir, "README.md"), "stash before switch\n", "utf8");
    return true;
  }
  if (drill === 86) {
    await initFiles(dir, runGit);
    return true;
  }
  if ([91, 92].includes(drill)) {
    await initFiles(dir, runGit);
    await runGit(["tag", "v1.0.0"]);
    return true;
  }
  if (drill === 93) {
    await initFiles(dir, runGit);
    await writeFiles(dir, { "debug.log": "debug\n" });
    return true;
  }
  if (drill === 94) {
    await initFiles(dir, runGit);
    await writeFiles(dir, { "dist/app.js": "console.log('built');\n" });
    return true;
  }
  if (drill === 95) {
    await initFiles(dir, runGit, { "secret.txt": "secret\n" }, "add secret");
    return true;
  }

  await initFiles(dir, runGit);
  return true;
}
