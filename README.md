# Git Learning App v5

ローカル単一ユーザー向けの Git 学習アプリです。Next.js の画面、xterm.js のターミナル、node-pty 経由の本物の bash、ホスト OS の本物の git を使って、章ごとのサンドボックスで練習します。

## 起動方法

```bash
npm install
npm run dev
```

ブラウザで `http://127.0.0.1:3000` を開きます。

## セキュリティ警告

このアプリはローカル単一ユーザー前提です。WebSocket 経由で bash を操作するため、公開デプロイや共有サーバでの起動は禁止です。
ターミナルは学習用 sandbox で起動し、プロンプト表示時に sandbox 外へ出ていれば自動で戻す best-effort のガードを入れています。ただし完全な隔離ではありません。実験は sandbox 内で行ってください。

## 対応環境

macOS / Linux を想定しています。Windows は node-pty と shell 前提が異なるため非対応です。

## v4 との違い

- v4 の疑似 Git 実装ではなく、実際の `git` コマンドを実行します。
- 章ごとに `~/.claude-git-app-v5/sandbox/ch{N}/` の実ディレクトリを使います。
- xterm.js と WebSocket で bash pty に接続します。
- 達成条件は実ファイル、実 git 状態、ターミナル入力履歴から判定します。
