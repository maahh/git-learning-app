import { createServer } from "node:http";
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import { existsSync, chmodSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import next from "next";
import { WebSocketServer } from "ws";
import { TOTAL_CHAPTERS } from "./src/lib/conditions/definitions.mjs";
import { evaluateChapterChecks } from "./src/lib/conditions/evaluate.mjs";

const require = createRequire(import.meta.url);

// node-pty の spawn-helper は npm install 時に実行ビットが落ちることがあり、
// その状態で pty.spawn すると「posix_spawnp failed」で接続が即死する。
// require する前に実行権限を確実に付与しておく。
function ensurePtyHelperExecutable() {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const platformDir = `${process.platform}-${process.arch}`;
    const helper = path.join(
      here,
      "node_modules",
      "node-pty",
      "prebuilds",
      platformDir,
      "spawn-helper",
    );
    if (existsSync(helper)) {
      chmodSync(helper, 0o755);
    }
  } catch {
    // 解決できない場合でも致命的ではないので握り潰す（spawn 時に検知される）。
  }
}

ensurePtyHelperExecutable();

const pty = require("node-pty");
const execFileAsync = promisify(execFile);

const dev = process.env.NODE_ENV !== "production";
const hostname = "127.0.0.1";
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

function parseChapter(value) {
  const chapter = Number(value ?? "1");
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > 99) {
    throw new Error("chapter must be an integer between 1 and 99");
  }
  return chapter;
}

function sandboxRoot() {
  return path.join(os.homedir(), ".claude-git-app-v5", "sandbox");
}

function chapterSandboxPath(chapter) {
  return path.join(sandboxRoot(), `ch${chapter}`);
}

// 章ごとの初期化を直列化するためのロック。
// 演習ページを開くと /api/state（loadState）と /pty（WebSocket）が同時に
// ensureChapterSandbox を呼ぶため、章3以降の複数ステップ初期化
// （git init + add + commit）が並行実行されて git の index.lock が競合し、
// 片方が失敗して WebSocket 接続が確立できない（「接続中」のまま）。
// 同じ章の初期化・リセットは必ず順番に実行する。
const chapterLocks = new Map();

function withChapterLock(chapter, task) {
  const prev = chapterLocks.get(chapter) ?? Promise.resolve();
  const next = prev.then(task, task);
  // 失敗が後続を巻き込まないよう、チェーンには握り潰したものを保持する。
  chapterLocks.set(
    chapter,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

async function ensureChapterSandbox(chapter) {
  const dir = chapterSandboxPath(chapter);
  return withChapterLock(chapter, async () => {
    await fs.mkdir(dir, { recursive: true });
    await initializeChapterSandbox(chapter, dir);
    return dir;
  });
}

async function resetChapterSandbox(chapter) {
  const dir = chapterSandboxPath(chapter);
  return withChapterLock(chapter, async () => {
    await fs.rm(dir, { recursive: true, force: true });
    await fs.mkdir(dir, { recursive: true });
    await initializeChapterSandbox(chapter, dir);
    return dir;
  });
}

async function initializeChapterSandbox(chapter, dir) {
  if (chapter < 2 || chapter > TOTAL_CHAPTERS) {
    return;
  }

  const hasGitHead = await exists(path.join(dir, ".git", "HEAD"));

  if (hasGitHead) {
    return;
  }

  if (chapter === 2) {
    await runGitStrict(dir, ["init", "-b", "main"]);
    await fs.writeFile(path.join(dir, "README.md"), "# title\n", "utf8");
    return;
  }

  if (chapter === 5) {
    await initializeCommittedReadme(dir);
    await runGitStrict(dir, ["switch", "-c", "feature"]);
    await fs.appendFile(path.join(dir, "README.md"), "feature line\n", "utf8");
    await runGitStrict(dir, ["add", "README.md"]);
    await runGitStrict(dir, ["commit", "-m", "add feature"]);
    await runGitStrict(dir, ["switch", "main"]);
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
    await runGitStrict(dir, ["add", "README.md"]);
    await runGitStrict(dir, ["commit", "-m", "add description"]);
    await runGitStrict(dir, ["switch", "-c", "feature"]);
    await fs.writeFile(path.join(dir, "README.md"), "# My Project\n## 説明\nfeature 側の変更\n", "utf8");
    await runGitStrict(dir, ["add", "README.md"]);
    await runGitStrict(dir, ["commit", "-m", "feature changes description"]);
    await runGitStrict(dir, ["switch", "main"]);
    await fs.writeFile(path.join(dir, "README.md"), "# My Project\n## 説明\nmain 側の変更\n", "utf8");
    await runGitStrict(dir, ["add", "README.md"]);
    await runGitStrict(dir, ["commit", "-m", "main changes description"]);
    return;
  }

  if (chapter === 9) {
    await runGitStrict(dir, ["init", "-b", "main"]);
    await fs.writeFile(path.join(dir, "README.md"), "# My Web Site\n", "utf8");
    await fs.writeFile(path.join(dir, "index.html"), "<!doctype html>\n<title>My Site</title>\n", "utf8");
    await runGitStrict(dir, ["add", "README.md", "index.html"]);
    await runGitStrict(dir, ["commit", "-m", "initial site"]);
    return;
  }

  await initializeCommittedReadme(dir);
}

async function initializeCommittedReadme(dir) {
  await runGitStrict(dir, ["init", "-b", "main"]);
  await fs.writeFile(path.join(dir, "README.md"), "# My Project\n", "utf8");
  await runGitStrict(dir, ["add", "README.md"]);
  await runGitStrict(dir, ["commit", "-m", "initial commit"]);
}

async function listFiles(dir) {
  const files = [];

  async function walk(current, relativePrefix = "") {
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

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readHead(dir) {
  const headPath = path.join(dir, ".git", "HEAD");
  try {
    return (await fs.readFile(headPath, "utf8")).trim();
  } catch {
    return null;
  }
}

async function gitStatus(dir) {
  try {
    const { stdout } = await execFileAsync("git", ["status", "--porcelain"], {
      cwd: dir,
      timeout: 5000,
      env: gitEnv(),
    });
    return stdout;
  } catch {
    return "";
  }
}

async function gitOutput(dir, args) {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd: dir,
      timeout: 5000,
      env: gitEnv(),
    });
    return stdout;
  } catch {
    return "";
  }
}

async function runGitStrict(dir, args) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: dir,
    timeout: 5000,
    env: gitEnv(),
  });
  return stdout;
}

async function runGit(args, cwd) {
  return gitOutput(cwd, args);
}

async function stateForChapter(chapter, history = []) {
  const dir = await ensureChapterSandbox(chapter);
  const [files, head, status, checks] = await Promise.all([
    listFiles(dir),
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

function gitEnv() {
  return {
    ...process.env,
    GIT_AUTHOR_NAME: "Git Learning App",
    GIT_AUTHOR_EMAIL: "git-learning@example.local",
    GIT_COMMITTER_NAME: "Git Learning App",
    GIT_COMMITTER_EMAIL: "git-learning@example.local",
  };
}

function isAllowedUpgradeHost(req) {
  const remote = req.socket.remoteAddress;
  return remote === "127.0.0.1" || remote === "::ffff:127.0.0.1" || remote === "::1";
}

const sandboxPromptCommand =
  'case "$PWD/" in "$GIT_APP_SANDBOX"/*) :;; *) cd "$GIT_APP_SANDBOX"; echo "[sandbox] 練習用フォルダの外には移動できません";; esac';

function spawnShell(chapter, cols = 80, rows = 24) {
  const cwd = chapterSandboxPath(chapter);
  return pty.spawn("bash", ["--noprofile", "--norc", "-i"], {
    name: "xterm-256color",
    cols,
    rows,
    cwd,
    env: {
      ...gitEnv(),
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
      PS1: "\\[\\033[32m\\]git-app ch" + chapter + "\\[\\033[0m\\]:\\w$ ",
      GIT_APP_SANDBOX: cwd,
      // 学習用のうっかり防止ガード。完全な隔離ではなく best-effort。
      PROMPT_COMMAND: sandboxPromptCommand,
    },
  });
}

await app.prepare();

const server = createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? `${hostname}:${port}`}`);

    if (requestUrl.pathname === "/api/state") {
      const chapter = parseChapter(requestUrl.searchParams.get("chapter"));
      const state = await stateForChapter(chapter);
      res.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      });
      res.end(JSON.stringify(state));
      return;
    }

    await handle(req, res);
  } catch (error) {
    const message = error instanceof Error ? error.message : "internal server error";
    res.writeHead(message.startsWith("chapter ") ? 400 : 500, {
      "content-type": "application/json; charset=utf-8",
    });
    res.end(JSON.stringify({ error: message }));
  }
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", async (req, socket, head) => {
  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? `${hostname}:${port}`}`);

  if (requestUrl.pathname !== "/pty") {
    socket.destroy();
    return;
  }

  if (!isAllowedUpgradeHost(req)) {
    socket.destroy();
    return;
  }

  try {
    const chapter = parseChapter(requestUrl.searchParams.get("chapter"));
    await ensureChapterSandbox(chapter);
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, chapter);
    });
  } catch {
    socket.destroy();
  }
});

wss.on("connection", (ws, _req, initialChapter) => {
  let chapter = initialChapter;
  let shell = null;
  let commandBuffer = "";
  let commandHistory = [];
  let shellDisposables = [];
  let stateTimer = null;
  let stateDebounce = null;
  // state 評価の世代番号。git コマンドの出力は複数回に分かれて届くため、
  // 出力途中（例: merge 実行中で merged=false）の評価が、完了後（merged=true）の
  // 評価より遅れて届いて UI を上書きすることがある。最新世代以外の結果は破棄する。
  let stateGen = 0;

  const write = (payload) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  };

  const closeForSpawnFailure = () => {
    write({ type: "error", message: "ターミナルの起動に失敗しました（node-pty）。" });
    ws.close(1011, "pty spawn failed");
  };

  const sendState = async () => {
    const gen = ++stateGen;
    try {
      const state = await stateForChapter(chapter, commandHistory);
      // 評価中に新しい評価が始まっていたら、この古い結果は捨てる。
      if (gen !== stateGen) return;
      write({ type: "state", checks: state.checks });
    } catch {
      if (gen !== stateGen) return;
      write({ type: "error", message: "failed to evaluate state" });
    }
  };

  // pty 出力が連続する間はまとめ、落ち着いてから1回だけ評価する。
  // git コマンドが完了した後の最終状態だけを反映でき、途中状態での誤判定を防ぐ。
  const scheduleState = () => {
    if (stateDebounce) {
      clearTimeout(stateDebounce);
    }
    stateDebounce = setTimeout(() => {
      stateDebounce = null;
      void sendState();
    }, 180);
  };

  const attachShell = () => {
    if (!shell) {
      return;
    }
    shellDisposables.forEach((disposable) => disposable.dispose?.());
    shellDisposables = [
      shell.onData((data) => {
        write({ type: "data", data });
        scheduleState();
      }),
      shell.onExit(({ exitCode }) => write({ type: "exit", exitCode })),
    ];
  };

  const respawnShell = () => {
    try {
      shell = spawnShell(chapter);
      attachShell();
      return true;
    } catch {
      shell = null;
      closeForSpawnFailure();
      return false;
    }
  };

  const pushRawInput = (data) => {
    for (const char of data) {
      if (char === "\r" || char === "\n") {
        const command = commandBuffer.trim();
        if (command) {
          commandHistory.push(command);
          commandHistory = commandHistory.slice(-200);
        }
        commandBuffer = "";
      } else if (char === "\u007f" || char === "\b") {
        commandBuffer = commandBuffer.slice(0, -1);
      } else if (char >= " ") {
        commandBuffer += char;
      }
    }
  };

  if (!respawnShell()) {
    return;
  }

  stateTimer = setInterval(() => {
    void sendState();
  }, 1000);

  ws.on("message", async (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (message.type === "data" && typeof message.data === "string") {
      if (!shell) {
        return;
      }
      pushRawInput(message.data);
      shell.write(message.data);
      scheduleState();
      return;
    }

    if (message.type === "resize") {
      if (!shell) {
        return;
      }
      const cols = Number(message.cols);
      const rows = Number(message.rows);
      if (Number.isInteger(cols) && Number.isInteger(rows) && cols > 0 && rows > 0) {
        shell.resize(cols, rows);
      }
      return;
    }

    if (message.type === "switch_chapter") {
      try {
        const nextChapter = parseChapter(message.chapter);
        await ensureChapterSandbox(nextChapter);
        shell?.kill();
        chapter = nextChapter;
        commandBuffer = "";
        commandHistory = [];
        if (!respawnShell()) {
          return;
        }
        void sendState();
      } catch {
        write({ type: "error", message: "invalid chapter" });
      }
      return;
    }

    if (message.type === "reset") {
      try {
        shell?.kill();
        commandBuffer = "";
        commandHistory = [];
        await resetChapterSandbox(chapter);
        if (!respawnShell()) {
          return;
        }
        write({ type: "reset_done" });
        void sendState();
      } catch {
        write({ type: "error", message: "reset failed" });
      }
    }
  });

  ws.on("close", () => {
    if (stateTimer) {
      clearInterval(stateTimer);
    }
    if (stateDebounce) {
      clearTimeout(stateDebounce);
    }
    shell?.kill();
  });

  ws.on("error", () => {
    if (stateTimer) {
      clearInterval(stateTimer);
    }
    if (stateDebounce) {
      clearTimeout(stateDebounce);
    }
    shell?.kill();
  });
});

server.listen(port, hostname, () => {
  console.log(`Git Learning App v5 listening on http://${hostname}:${port}`);
});
