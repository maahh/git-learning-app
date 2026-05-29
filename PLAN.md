# Git Learning App v5 — 開発プラン

## なぜ v5 を作るか

v4 は isomorphic-git + LightningFS でブラウザだけで完結させたが、ブラウザ実機で「null is not an object (evaluating 'headContent.startsWith')」のような環境依存バグが解決できなかった。学習アプリとして致命的なので、根本転換する。

**v5 の方針: 疑似 git をやめて、ホスト OS の本物の git をそのまま動かす。**

- ターミナル: 本物の bash の pty を起動し、xterm.js で表示。WebSocket で双方向ブリッジ
- Git: child_process 経由でホスト OS の git バイナリを実行
- 学習者の入力 = ホストの実 git に直接届く。学習体験は本物
- ブラウザは GUI 役（解説 / 状態ビュー / xterm 表示）

## スコープ（プロトタイプ）

- **章は 1 と 2 のみ**で完成度を上げる
- 章1: `git init` → `README.md` 作成 → `git status`
- 章2: `git add README.md` → `git commit -m "first"` → `git log --oneline`

## アーキテクチャ

```
[ ブラウザ ]                        [ Node サーバー (localhost:3000) ]
┌──────────────┐                   ┌─────────────────────────────┐
│ Next.js + UI │                   │ Express + http + ws         │
│ + xterm.js   │  WebSocket /pty   │  ├ Next.js handler          │
│ + 解説ペイン  │ ←───────────────→ │  ├ /api/ws (pty bridge)    │
│ + 状態ペイン  │  WebSocket /state │  └ /api/state (poll)        │
└──────────────┘ ←───────────────→ │                             │
                                    │  node-pty: bash の pty      │
                                    │  cwd = sandbox/ch{N}/       │
                                    │                             │
                                    │  fs.watch + git status      │
                                    │  → 達成条件判定 → push       │
                                    └─────────────────────────────┘
                                              │
                                              ▼
                                    [ ホスト OS の git ]
```

### 主要モジュール

| パス | 役割 |
|------|------|
| `server.js` | カスタム Node サーバー。Next.js handler + ws (`/pty`, `/state`) を同居 |
| `lib/pty.ts` | bash の pty を起動・破棄、入力転送、リサイズ |
| `lib/sandbox.ts` | `~/.claude-git-app-v5/sandbox/ch{N}/` を作成・クリーンアップ |
| `lib/conditions/ch1.ts` / `ch2.ts` | 達成条件（実 git 出力に対する判定） |
| `lib/conditions/runner.ts` | サーバー側で定期的に判定し、変化があれば WebSocket push |
| `app/page.tsx` | 章一覧 |
| `app/chapter/[id]/page.tsx` | 章ページ (server) |
| `app/chapter/[id]/ChapterClient.tsx` | 3ペイン、xterm 接続、解説、状態表示 |
| `components/Terminal.tsx` | xterm.js + addons (fit / web-links) のラッパ |
| `components/StatePanel.tsx` | 右ペイン: ファイル一覧 + HEAD + 達成条件 |
| `components/LessonPanel.tsx` | 左ペイン: 解説 + walkthrough |
| `content/lessons.ts` | 章1/2 の解説 + walkthrough（v4 から流用） |

### 達成条件（章1・章2）

章1:
- `ch1.gitDir`: サンドボックスに `.git/HEAD` が存在（`fs.exists`）
- `ch1.readme`: `README.md` が存在
- `ch1.statusUsed`: pty に流れた入力履歴に `git status` が1回以上

章2:
- `ch2.staged`: `git diff --cached --name-only` に `README.md` が含まれる
- `ch2.firstCommit`: `git rev-list HEAD --count` が 1 以上
- `ch2.logUsed`: pty 入力履歴に `git log`

## 技術スタック

| レイヤ | 採用 |
|--------|------|
| フロント | Next.js 15 + React 19 + TypeScript strict + Tailwind 3 |
| ターミナル UI | `xterm` + `@xterm/addon-fit` + `@xterm/addon-web-links` |
| 通信 | WebSocket (`ws` ライブラリ) |
| pty | `node-pty`（macOS で動作確認）|
| サーバー | カスタム `server.js` (Node) で Express + Next.js handler + ws |
| 言語 | サーバー側も TypeScript（`tsx` で開発、`ts-node` でも可） |
| テスト | vitest + happy-dom (UI) + サーバー側はユニットテスト中心 |

## セキュリティ前提

- **ローカル単一ユーザー前提**。ホストの実 git を pty 経由で叩くため、不特定多数に公開してはいけない
- WebSocket は `127.0.0.1` のみ bind
- pty の cwd は必ず sandbox 配下に固定
- `package.json` の説明にも「ローカル学習用、公開デプロイ禁止」を明記

## 開発フェーズ（プロトタイプ）

### Phase 1: サーバー骨格と pty 接続（Day 1）
- プロジェクト初期化（Next.js + TS + Tailwind）
- `server.js`: Express + Next.js handler + ws
- node-pty で bash を起動、ws `/pty` でブラウザの xterm.js と双方向接続
- 章1 のサンドボックス自動作成
- ブラウザで開いて、xterm にターミナルが映り、`git --version` が打てる

### Phase 2: 章1 完成（Day 2）
- 解説 + walkthrough（v4 のコンテンツを流用）
- 状態ペイン (ファイル一覧 + ConditionChecklist) を ws `/state` で更新
- 章1 の3条件が満たされたら緑✓
- リセットボタンで pty kill + sandbox 再作成

### Phase 3: 章2 完成（Day 3）
- 章2 への遷移、解説、walkthrough、達成条件
- 達成条件は実 git の出力で判定（`git diff --cached --name-only` 等）

### Phase 4: 仕上げ（Day 4）
- 視認性向上（カラースキーム、xterm のテーマ）
- A11y（role/label）
- README、ライセンス、起動スクリプト

## 起動方法（完成時）

```
cd claude-git-app-v5
npm install
npm run dev
# http://localhost:3000 を開く
```

`npm run dev` は `server.js` を起動し、Next.js dev と ws を同時に立ち上げる。

## 検証

1. **章1**: ブラウザで `/chapter/1` を開く → xterm が映る → `git init` → `echo "# Hello" > README.md` → `git status` で全 ConditionId が緑 → 章完了通知
2. **章2**: `/chapter/2` → 章1 の最終状態が引き継がれる（同じ sandbox 共有 or 章2 専用 sandbox を pre-populate）→ `git add` → `git commit -m "first"` → `git log` → 章完了
3. **リセット**: 章1 のリセットで sandbox が空に戻り、ConditionChecklist もグレー
4. **接続切断**: タブを閉じると pty が kill される
5. **品質ゲート**: `npm run lint` / `typecheck` / `test` / `build` 緑

## 範囲外

- 章3-8: 後続フェーズ
- マルチユーザー / 公開デプロイ
- Windows サポート（macOS / Linux 前提）
- pty のリサイズ高度対応（最低限のみ）

## v4 から引き継ぐもの

- 解説テキスト・walkthrough（`v4/src/content/lessons.ts`）
- LessonView コンポーネントの設計思想
- progress.ts の localStorage パターン（必要なら）

## v4 から捨てるもの

- isomorphic-git / LightningFS / memfs
- 疑似コマンドパーサ (`parser.ts` / `runner.ts`)
- 疑似 3-way merge / reset / revert ラッパ
