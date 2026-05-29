// 章ごとの解説ページ用コンテンツ。v5 は疑似 Git ではなく、ターミナルから
// ホスト OS の本物の git を実行する前提で説明する。

export type LessonSection =
  | { kind: "paragraph"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "code"; lines: string[]; caption?: string }
  | { kind: "callout"; tone: "tip" | "warn"; title: string; body: string }
  | { kind: "diagram"; ascii: string; caption?: string }
  | {
      kind: "walkthrough";
      heading?: string;
      steps: { label: string; why: string }[];
    };

export type Lesson = {
  id: number;
  title: string;
  oneLiner: string;
  intro: string;
  estimatedMinutes: number;
  sections: LessonSection[];
};

export const lessons: Lesson[] = [
  {
    id: 1,
    title: "リポジトリを作る",
    oneLiner: "Git の世界の入口。フォルダを「歴史つき」にする。",
    intro:
      "この章では、サンドボックスの中で本物の `git init` を実行し、README.md を作って、`git status` で Git から見た状態を確認します。",
    estimatedMinutes: 5,
    sections: [
      { kind: "heading", text: "そもそも Git って何？" },
      {
        kind: "paragraph",
        text: "Git は「ファイルの変更履歴を残しておく仕組み」です。書きかけのノートを毎日コピーして机に積み上げるかわりに、Git が裏で「いつ・何を・どう変えたか」を記録してくれます。",
      },
      {
        kind: "paragraph",
        text: "このアプリでは、画面中央のターミナルに入力したコマンドがそのまま実 git に渡ります。表示される結果も、練習用に作った偽物ではなく、サンドボックス内の実際の状態です。",
      },
      { kind: "heading", text: "リポジトリとは" },
      {
        kind: "paragraph",
        text: "Git に「ここから記録します」と宣言したフォルダのことをリポジトリと呼びます。中には皆さんが作る普通のファイルと、Git の管理用フォルダ `.git/` が同居します。",
      },
      {
        kind: "diagram",
        caption: "リポジトリのイメージ",
        ascii: [
          "my-project/         ← これがリポジトリ",
          "├─ README.md        ← 自分が作るファイル",
          "└─ .git/            ← Git の管理フォルダ（隠しフォルダ）",
          "    ├─ HEAD",
          "    ├─ objects/",
          "    └─ refs/",
        ].join("\n"),
      },
      { kind: "heading", text: "`git init` でやっていること" },
      {
        kind: "paragraph",
        text: "`git init` は「このフォルダを Git の管理下に置きます」という宣言です。実行すると `.git/` フォルダが作られ、変更履歴がたまっていく場所ができます。",
      },
      {
        kind: "code",
        caption: "ターミナルでの様子",
        lines: ["$ git init", "Initialized empty Git repository in .../.git/"],
      },
      { kind: "heading", text: "「いま何が起きてる？」を聞く `git status`" },
      {
        kind: "paragraph",
        text: "`git status` を打つと Git が「いま追跡できていないファイルがある」「ここを変更した」と教えてくれます。困ったらまずこれ、という基本コマンドです。",
      },
      {
        kind: "code",
        lines: ["$ git status", "On branch main", "No commits yet", "Untracked files:", "  README.md"],
      },
      {
        kind: "callout",
        tone: "tip",
        title: "覚えておくコマンド",
        body: "`git init` / `git status` の2つだけ。ファイルを作るには `echo \"# title\" > README.md` のような shell コマンドも使えます。",
      },
      {
        kind: "callout",
        tone: "warn",
        title: "よくあるつまずき",
        body: "`git init` を間違ったフォルダで打つと、そのフォルダがリポジトリになります。このアプリでは章ごとのサンドボックス内で作業します。",
      },
      {
        kind: "walkthrough",
        heading: "練習問題でやること",
        steps: [
          {
            label: "1. `git init` を打つ",
            why: "このフォルダを「Git で管理する場所」にする宣言です。これをやっておかないと、このあとの `git add` も `git commit` も使えません。",
          },
          {
            label: "2. `README.md` を作る",
            why: "リポジトリは作っただけだと中身が空です。`echo \"# title\" > README.md` で練習用のファイルを1つ用意します。",
          },
          {
            label: "3. `git status` で状態を見る",
            why: "新しいファイルを作ったあとに Git が何と言うか観察します。「Untracked files: README.md」と返る体験で、Git はファイルを勝手には追跡しないことが分かります。",
          },
        ],
      },
    ],
  },
  {
    id: 2,
    title: "コミットしてみる",
    oneLiner: "ファイルの「写真」を歴史に残す。",
    intro:
      "章2のサンドボックスには README.md と git リポジトリを用意してあります。`git add` と `git commit` を本物の git で実行し、履歴ができる瞬間を確認します。",
    estimatedMinutes: 6,
    sections: [
      { kind: "heading", text: "コミットは「写真を撮る」こと" },
      {
        kind: "paragraph",
        text: "コミットとは、いまのファイルの状態を1枚の写真として歴史に残す行為です。あとから「あの時はこうだった」と振り返れるし、戻すこともできます。",
      },
      { kind: "heading", text: "3つの場所を知ろう" },
      {
        kind: "paragraph",
        text: "Git ではファイルが「3つの場所」を行き来します。これさえ分かれば add / commit の意味が入りやすくなります。",
      },
      {
        kind: "diagram",
        caption: "3つの場所と移動の流れ",
        ascii: [
          "[ ワーキングツリー ]   ← 自分が編集する場所",
          "        │  git add",
          "        ▼",
          "[ ステージ (index) ]   ← 次のコミットに入れる場所",
          "        │  git commit",
          "        ▼",
          "[ リポジトリ履歴 ]     ← コミットが貯まる場所",
        ].join("\n"),
      },
      { kind: "heading", text: "`git add` でステージに置く" },
      {
        kind: "paragraph",
        text: "コミットしたいファイルを Git に伝える操作です。実行後は `git ls-files README.md` に README.md が出る状態になります。",
      },
      { kind: "code", lines: ["$ git add README.md"] },
      { kind: "heading", text: "`git commit -m` で写真を撮る" },
      {
        kind: "paragraph",
        text: "`-m` のあとに短い説明（コミットメッセージ）を書きます。v5 のターミナルでは git の実行結果がそのまま返ります。",
      },
      {
        kind: "code",
        lines: ["$ git commit -m \"first commit\"", "[main (root-commit) 5a1c0f3] first commit"],
      },
      { kind: "heading", text: "`git log` で歴史を見る" },
      {
        kind: "paragraph",
        text: "撮ってきた写真の一覧を見るコマンドです。`--oneline` をつけるとコンパクトに表示されます。",
      },
      { kind: "code", lines: ["$ git log --oneline", "5a1c0f3 first commit"] },
      {
        kind: "callout",
        tone: "tip",
        title: "コミットメッセージのコツ",
        body: "「何をしたか」を1行で。例: \"add README\" / \"fix typo in README\"。日本語でもOKです。",
      },
      {
        kind: "callout",
        tone: "warn",
        title: "ありがち失敗",
        body: "`git add` を忘れて `git commit` を打つと「コミットするものがない」と言われます。`git status` でステージを確認してから commit しましょう。",
      },
      {
        kind: "walkthrough",
        heading: "練習問題でやること",
        steps: [
          {
            label: "1. `git add README.md` でステージに置く",
            why: "README.md を次のコミット対象にします。Git に「これを写真に含めて」と教える操作です。",
          },
          {
            label: "2. `git commit -m \"first commit\"` で履歴に残す",
            why: "ステージした状態を1つのコミットとして保存します。`-m` のあとに短いメッセージを付けます。",
          },
          {
            label: "3. `git log --oneline` で履歴を見る",
            why: "コミットが本当に残っているか確認します。1行だけ `<oid> first commit` のように出れば、初めてのコミットが入った状態です。",
          },
        ],
      },
    ],
  },
  {
    id: 3,
    title: "変更を確認する（diff）",
    oneLiner: "コミットする前に、何を変えたかを自分の目で確かめる。",
    intro:
      "章3は README.md を1コミット済みの状態から始めます。README を編集し、`git diff` と `git diff --staged` で変更の中身を確認します。",
    estimatedMinutes: 7,
    sections: [
      { kind: "heading", text: "diff は「前と今の見比べ」" },
      {
        kind: "paragraph",
        text: "`git diff` は、ノートの前の版と今の版を横に並べて「ここが増えた」「ここが消えた」と教えてくれる虫眼鏡のようなコマンドです。",
      },
      {
        kind: "paragraph",
        text: "コミットは歴史に残る写真です。写真を撮る前に、机の上に写り込むものを確認するのが diff の役目です。",
      },
      {
        kind: "diagram",
        caption: "diff で見る場所",
        ascii: [
          "[ リポジトリ履歴 ]",
          "        │  前回の README",
          "        ▼",
          "[ ワーキングツリー ]  ← git diff はここまでの差を見る",
          "        │  git add README.md",
          "        ▼",
          "[ ステージ ]          ← git diff --staged はここを見る",
        ].join("\n"),
      },
      { kind: "heading", text: "`git diff` の読み方" },
      {
        kind: "paragraph",
        text: "行の先頭に `+` があると追加された行、`-` があると削除された行です。章3では README に1行追加するので、`+セットアップ手順` のような行を探します。",
      },
      {
        kind: "code",
        caption: "未ステージの変更を見る",
        lines: [
          "$ echo \"セットアップ手順\" >> README.md",
          "$ git diff",
          "+セットアップ手順",
        ],
      },
      { kind: "heading", text: "ステージ後は見る窓が変わる" },
      {
        kind: "paragraph",
        text: "`git add` すると変更はステージへ移ります。そのあと普通の `git diff` は静かになり、代わりに `git diff --staged` で次のコミットに入る差分を見ます。",
      },
      {
        kind: "code",
        caption: "ステージ済みの変更を見る",
        lines: ["$ git add README.md", "$ git diff --staged", "+セットアップ手順"],
      },
      {
        kind: "callout",
        tone: "tip",
        title: "コミット前の習慣",
        body: "`git diff` → `git add` → `git diff --staged` の順に見ると、「編集したもの」と「コミットに入るもの」を分けて確認できます。",
      },
      {
        kind: "callout",
        tone: "warn",
        title: "何も出ないとき",
        body: "`git diff` に何も出ないのは失敗とは限りません。すでに `git add` 済みなら、`git diff --staged` の方に差分が移っています。",
      },
      {
        kind: "walkthrough",
        heading: "練習問題でやること",
        steps: [
          {
            label: "1. README.md に1行追加する",
            why: "diff は変化を見る道具なので、まず比べるための変更を作ります。`echo \"セットアップ手順\" >> README.md` で末尾に1行足せます。",
          },
          {
            label: "2. `git diff` で未ステージ差分を見る",
            why: "まだ `git add` していない変更が、Git からどう見えるか確認します。追加行に `+` が付くことを観察します。",
          },
          {
            label: "3. `git add README.md` でステージする",
            why: "変更を次のコミット候補に移します。ここで diff の見る場所がワーキングツリーからステージへ変わります。",
          },
          {
            label: "4. `git diff --staged` でステージ済み差分を見る",
            why: "次のコミットに入る内容を確認します。コミット前にここを見ると、入れ忘れや余計な変更に気づけます。",
          },
        ],
      },
    ],
  },
  {
    id: 4,
    title: "ブランチを作る",
    oneLiner: "main から作業用の道を分けて、安全に変更を進める。",
    intro:
      "章4は README.md を1コミット済みの main ブランチから始めます。`git switch -c feature` で作業用ブランチを作り、そこにコミットします。",
    estimatedMinutes: 8,
    sections: [
      { kind: "heading", text: "ブランチは「別の作業机」" },
      {
        kind: "paragraph",
        text: "ブランチは、同じプロジェクトの歴史から分かれた作業場所です。main の机を散らかさず、feature という別の机で試せます。",
      },
      {
        kind: "paragraph",
        text: "新しい機能や実験はブランチで進めると、完成するまで main を落ち着いた状態に保てます。",
      },
      {
        kind: "diagram",
        caption: "main から feature が分かれる",
        ascii: [
          "main:    A  ← 最初のコミット",
          "          \\",
          "feature:  B  ← feature で作るコミット",
        ].join("\n"),
      },
      { kind: "heading", text: "`git switch -c` の意味" },
      {
        kind: "paragraph",
        text: "`git switch -c feature` は「feature ブランチを作って、その場で乗り換える」という意味です。新しい道を作り、その道の上で作業を始めます。",
      },
      { kind: "code", lines: ["$ git switch -c feature", "Switched to a new branch 'feature'"] },
      { kind: "heading", text: "feature にコミットする" },
      {
        kind: "paragraph",
        text: "ブランチに乗ったあとでファイルを追加し、`git add` と `git commit` を実行すると、そのコミットは feature 側に積まれます。",
      },
      {
        kind: "code",
        caption: "feature ブランチで作業する",
        lines: [
          "$ echo \"feature work\" > feature.txt",
          "$ git add feature.txt",
          "$ git commit -m \"add feature\"",
        ],
      },
      {
        kind: "callout",
        tone: "tip",
        title: "今いるブランチを見る",
        body: "`git branch` を打つとブランチ一覧が出ます。先頭に `*` が付いている行が、今いるブランチです。",
      },
      {
        kind: "callout",
        tone: "warn",
        title: "main に戻らないで進める",
        body: "章4の達成条件では、最後に feature ブランチにいる必要があります。コミット後に `git switch main` しないでください。",
      },
      {
        kind: "walkthrough",
        heading: "練習問題でやること",
        steps: [
          {
            label: "1. `git switch -c feature` を打つ",
            why: "main から作業用ブランチを作り、そのブランチへ移動します。ここから先の変更は feature 側に積めます。",
          },
          {
            label: "2. `feature.txt` を作る",
            why: "feature ブランチに置く変更を用意します。`echo \"feature work\" > feature.txt` で新しいファイルを作れます。",
          },
          {
            label: "3. `git add feature.txt` でステージする",
            why: "新しいファイルを次のコミット対象にします。Git は作っただけのファイルを自動ではコミットに入れません。",
          },
          {
            label: "4. `git commit -m \"add feature\"` で保存する",
            why: "feature ブランチを main より1歩進めます。この1歩が、あとでマージする作業の単位になります。",
          },
        ],
      },
    ],
  },
  {
    id: 5,
    title: "マージする（Fast-Forward）",
    oneLiner: "先に進んだブランチへ main を追いつかせる。",
    intro:
      "章5は、feature ブランチに1コミットあり、HEAD は main に戻した状態から始めます。競合が起きないように用意済みなので、`git merge feature` で Fast-Forward を体験します。",
    estimatedMinutes: 6,
    sections: [
      { kind: "heading", text: "マージは「道を合流させる」" },
      {
        kind: "paragraph",
        text: "マージは、別ブランチで進めた変更を今いるブランチへ取り込む操作です。章5では main が止まっていて feature だけが1歩先にいるので、main がその場所まで進むだけで合流できます。",
      },
      { kind: "heading", text: "Fast-Forward とは" },
      {
        kind: "paragraph",
        text: "Fast-Forward は、枝分かれしたあと main 側に新しいコミットがないときに起きる、いちばん素直なマージです。しおりを1ページ先へ動かすように、main の位置だけが進みます。",
      },
      {
        kind: "diagram",
        caption: "merge 前",
        ascii: [
          "main:    A",
          "          \\",
          "feature:  B  ← 1歩先",
          "",
          "HEAD は main にいる",
        ].join("\n"),
      },
      {
        kind: "diagram",
        caption: "Fast-Forward merge 後",
        ascii: [
          "main:    A -- B",
          "              ↑",
          "feature もここを指している",
        ].join("\n"),
      },
      {
        kind: "code",
        caption: "feature を main に取り込む",
        lines: ["$ git merge feature", "Fast-forward", "$ git log --oneline", "b2c3d4e add feature"],
      },
      {
        kind: "callout",
        tone: "tip",
        title: "どこに取り込むか",
        body: "`git merge feature` は「今いるブランチに feature を取り込む」です。章5では最初から main にいるので、そのまま実行します。",
      },
      {
        kind: "callout",
        tone: "warn",
        title: "feature 側で merge しない",
        body: "もし feature に移動してから `git merge main` しても、章5の目的とは逆向きです。サイドバーの HEAD が main になっていることを確認してください。",
      },
      {
        kind: "walkthrough",
        heading: "練習問題でやること",
        steps: [
          {
            label: "1. `git merge feature` を打つ",
            why: "main に feature の1コミットを取り込みます。今回は main 側が進んでいないので Fast-Forward になります。",
          },
          {
            label: "2. `git log --oneline` で履歴を見る",
            why: "main の履歴に `add feature` のコミットが入ったか確認します。取り込み後は main のコミット数が2つ以上になります。",
          },
        ],
      },
    ],
  },
  {
    id: 6,
    title: "やり直す（restore）",
    oneLiner: "コミット前の変更を取り消して、きれいな状態へ戻す。",
    intro:
      "章6は README.md を1コミット済みの状態から始めます。README にわざと間違いを追加し、`git restore README.md` でコミット済みの状態へ戻します。",
    estimatedMinutes: 6,
    sections: [
      { kind: "heading", text: "restore は「下書きを消す」" },
      {
        kind: "paragraph",
        text: "`git restore` は、まだコミットしていない変更を取り消すコマンドです。清書済みのノートを見本にして、今の下書きを元に戻すイメージです。",
      },
      {
        kind: "paragraph",
        text: "章6では README に「まちがい」を追加してから戻します。コミット済みの履歴は消さず、作業ツリーだけをきれいにします。",
      },
      {
        kind: "diagram",
        caption: "restore が戻す範囲",
        ascii: [
          "[ リポジトリ履歴 ]  ← 残る",
          "        │",
          "        ▼  git restore README.md",
          "[ ワーキングツリー ]  ← 未コミット変更だけ戻る",
        ].join("\n"),
      },
      { kind: "heading", text: "まず status で確認する" },
      {
        kind: "paragraph",
        text: "取り消し系のコマンドを打つ前には `git status` を見ます。どのファイルが変更されているかを知ってから戻すと、消してよい変更か判断できます。",
      },
      {
        kind: "code",
        caption: "変更してから戻す",
        lines: [
          "$ echo \"まちがい\" >> README.md",
          "$ git status",
          "modified: README.md",
          "$ git restore README.md",
        ],
      },
      {
        kind: "callout",
        tone: "tip",
        title: "戻ったか確認",
        body: "`git status --short` や `git status` で何も変更が出なければ、作業ツリーは clean です。",
      },
      {
        kind: "callout",
        tone: "warn",
        title: "restore は取り消し",
        body: "`git restore README.md` で戻した未コミットの変更は、基本的にその場から消えます。必要な内容なら先に別の場所へ残してください。",
      },
      {
        kind: "walkthrough",
        heading: "練習問題でやること",
        steps: [
          {
            label: "1. README.md に間違いを追加する",
            why: "restore の効果を見るために、戻す対象の変更を作ります。`echo \"まちがい\" >> README.md` で1行足せます。",
          },
          {
            label: "2. `git status` で変更を見る",
            why: "どのファイルが変更されたかを確認します。取り消す前に状態を見る習慣を作ります。",
          },
          {
            label: "3. `git restore README.md` で戻す",
            why: "README.md の未コミット変更を、最後のコミットの状態に戻します。履歴は残したまま作業ツリーだけを整えます。",
          },
          {
            label: "4. もう一度 `git status` で確認する",
            why: "`git status` を打って「nothing to commit, working tree clean」と出れば成功です。右の状態パネルの変更も消え、作業ツリーがきれいに戻ったことを確認して終わります。",
          },
        ],
      },
    ],
  },
  {
    id: 7,
    title: ".gitignore で除外する",
    oneLiner: "秘密情報や自動生成ファイルを、Git の記録から外す。",
    intro:
      "章7は README.md を1コミット済みで、さらに未追跡の secret.txt と debug.log が置かれた状態から始めます。.gitignore を作り、Git に見せないファイルを指定します。",
    estimatedMinutes: 7,
    sections: [
      { kind: "heading", text: ".gitignore は「持ち物検査の除外リスト」" },
      {
        kind: "paragraph",
        text: ".gitignore は、Git に追跡させないファイルの一覧です。学校に提出するノートへ、机の中の私物や下書きメモを混ぜないようにするチェック表だと思ってください。",
      },
      {
        kind: "paragraph",
        text: "秘密情報、ログ、ビルド結果などは、作業フォルダには必要でも履歴には残したくないことがあります。.gitignore は、そういうファイルを誤ってコミットしないための安全装置です。",
      },
      {
        kind: "diagram",
        caption: ".gitignore が見張る範囲",
        ascii: [
          "[ ワーキングツリー ]",
          "  README.md       ← Git が追跡している",
          "  secret.txt      ← .gitignore で隠す",
          "  debug.log       ← .gitignore で隠す",
          "  .gitignore      ← ルールとしてコミットする",
        ].join("\n"),
      },
      { kind: "heading", text: "まず status で余計なファイルを見る" },
      {
        kind: "paragraph",
        text: "最初に `git status` を打つと、secret.txt と debug.log が Untracked files として表示されます。Git は「まだ追跡していないけど、見えているファイルがある」と教えてくれます。",
      },
      {
        kind: "code",
        caption: "初期状態の確認",
        lines: ["$ git status", "Untracked files:", "  debug.log", "  secret.txt"],
      },
      { kind: "heading", text: ".gitignore にパターンを書く" },
      {
        kind: "paragraph",
        text: ".gitignore は普通のテキストファイルです。ファイル名をそのまま書いたり、`*.log` のようにパターンでまとめて指定したりできます。",
      },
      {
        kind: "code",
        caption: "secret.txt とログを除外する",
        lines: ['$ printf "secret.txt\\n*.log\\n" > .gitignore', "$ git status", "Untracked files:", "  .gitignore"],
      },
      {
        kind: "list",
        items: [
          "`secret.txt` は、その名前のファイルだけを除外します。",
          "`*.log` は、debug.log のように `.log` で終わるファイルを除外します。",
          "`node_modules/` は、そのフォルダ全体を除外します。",
          "`.env` は、環境変数や秘密情報を書いたファイルを除外するときによく使います。",
        ],
      },
      {
        kind: "callout",
        tone: "warn",
        title: "Claude Code でも秘密ファイルはコミットしない",
        body: "APIキー、トークン、パスワード入りのファイルは履歴に残さないでください。一度コミットすると、あとから消したつもりでも履歴に残ることがあります。",
      },
      {
        kind: "callout",
        tone: "tip",
        title: ".gitignore はコミットする",
        body: ".gitignore 自体はプロジェクトのルールなので、`git add .gitignore` してコミットします。チーム全員が同じ除外ルールを使えます。",
      },
      {
        kind: "walkthrough",
        heading: "練習問題でやること",
        steps: [
          {
            label: "1. `git status` で未追跡ファイルを見る",
            why: "secret.txt と debug.log が Git から見えていることを確認します。除外する前の状態を知ると、.gitignore の効果が分かります。",
          },
          {
            label: '2. `printf "secret.txt\\n*.log\\n" > .gitignore` を打つ',
            why: "secret.txt は名前で、debug.log は `*.log` のパターンで除外します。.gitignore は「Git に見せないもの」を書くファイルです。",
          },
          {
            label: "3. もう一度 `git status` を見る",
            why: "secret.txt と debug.log が表示から消え、.gitignore だけが Untracked になったことを確認します。Git が除外ルールを読んでいます。",
          },
          {
            label: "4. `git add .gitignore` してコミットする",
            why: ".gitignore はプロジェクトの大事なルールです。`git commit -m \"add gitignore\"` で履歴に残し、次から同じ事故を防げる状態にします。",
          },
        ],
      },
    ],
  },
  {
    id: 8,
    title: "コンフリクトを解決する",
    oneLiner: "Git が決められない衝突を、人間が読んで直す。",
    intro:
      "章8は README.md を main と feature の両方で同じ行だけ別内容に変更し、HEAD は main に戻した状態から始めます。`git merge feature` を実行すると、意図的にコンフリクトが起きます。",
    estimatedMinutes: 9,
    sections: [
      { kind: "heading", text: "コンフリクトは「どっちが正解？」" },
      {
        kind: "paragraph",
        text: "コンフリクトは、同じ場所を別々の内容に変えたため、Git が自動では選べない状態です。友だち2人が同じ作文の同じ一文を書き換えたとき、先生が「どちらを採用する？」と聞く場面に似ています。",
      },
      {
        kind: "paragraph",
        text: "Git は共通の土台、自分の変更、相手の変更の3つを見比べます。それでも判断できない場所だけ、人間が読んで正しい形に直します。",
      },
      {
        kind: "diagram",
        caption: "3-way merge の見方",
        ascii: [
          "共通祖先:  初期行",
          "main:      main 側の変更",
          "feature:   feature 側の変更",
          "",
          "同じ行が別内容なので Git は止まる",
        ].join("\n"),
      },
      { kind: "heading", text: "merge するとマーカーが入る" },
      {
        kind: "paragraph",
        text: "章8で `git merge feature` を打つと CONFLICT と表示され、README.md の中に衝突マーカーが入ります。これは Git が「ここを人間が直して」と印を付けた状態です。",
      },
      {
        kind: "code",
        caption: "衝突した README の形",
        lines: [
          "<<<<<<< HEAD",
          "main 側の変更",
          "=======",
          "feature 側の変更",
          ">>>>>>> feature",
        ],
      },
      {
        kind: "list",
        items: [
          "`<<<<<<< HEAD` から `=======` までが、今いる main 側の内容です。",
          "`=======` から `>>>>>>> feature` までが、取り込もうとしている feature 側の内容です。",
          "最終的に残したい文章だけに編集し、マーカー行はすべて消します。",
        ],
      },
      {
        kind: "callout",
        tone: "warn",
        title: "マーカーを残したままコミットしない",
        body: "`<<<<<<<` `=======` `>>>>>>>` が残っている README は、まだ解決できていません。必ず全部消してから `git add` します。",
      },
      { kind: "heading", text: "解決してマージコミットを作る" },
      {
        kind: "paragraph",
        text: "README を正しい内容に編集したら、`git add README.md` で解決済みとしてステージします。そのあと `git commit` を実行すると、2つの親を持つマージコミットが作られます。",
      },
      {
        kind: "code",
        caption: "解決後の流れ",
        lines: [
          "$ git merge feature",
          "CONFLICT (content): Merge conflict in README.md",
          "$ printf \"# My Project\\n## 説明\\nmain と feature の内容をまとめた説明\\n\" > README.md",
          "$ git add README.md",
          "$ git commit",
        ],
      },
      {
        kind: "callout",
        tone: "tip",
        title: "コミットメッセージ",
        body: "衝突解決後の `git commit` は、Git がマージ用メッセージを用意します。そのまま保存しても、自分で `git commit -m \"merge feature\"` としても構いません。",
      },
      {
        kind: "walkthrough",
        heading: "練習問題でやること",
        steps: [
          {
            label: "1. `git merge feature` を打つ",
            why: "main に feature を取り込もうとします。今回は同じ行が別内容に変わっているので、Git は CONFLICT を出して止まります。",
          },
          {
            label: "2. README.md を開いてマーカーを読む",
            why: "`<<<<<<< HEAD` 側が main、`>>>>>>> feature` 側が相手の変更です。どちらを残すか、または両方をまとめるかを人間が判断します。",
          },
          {
            label: "3. README.md を正しい内容に直す",
            why: "残したい文章だけにして、`<<<<<<<` `=======` `>>>>>>>` の3種類のマーカーを全部消します。これでファイルの中身としては解決済みになります。",
          },
          {
            label: "4. `git add README.md` して `git commit` する",
            why: "`git add` は Git に「この衝突は解決した」と伝える操作です。最後にコミットすると、main と feature の合流点であるマージコミットが完成します。",
          },
        ],
      },
    ],
  },
  {
    id: 9,
    title: "実践演習: 機能開発の一連の流れ",
    oneLiner: "作業ブランチでログイン機能を作り、main に統合する。",
    intro:
      "章9は実プロジェクト風の状態から始めます。README.md と index.html が main にコミット済みです。ログイン機能を作業ブランチで開発し、main に統合する実務の流れを体験します。",
    estimatedMinutes: 12,
    sections: [
      { kind: "heading", text: "これまでの技術をつなげる" },
      {
        kind: "paragraph",
        text: "ここまでは Git の道具を1つずつ練習してきました。章9では、それらを実務の1本の流れとして組み合わせます。料理で包丁、火加減、盛り付けを別々に練習したあと、1皿を最後まで作る練習に近いです。",
      },
      {
        kind: "list",
        items: [
          "ブランチを切る: 章4で練習した、作業場所を分ける操作です。",
          "コミットする: 章2で練習した、変更の写真を履歴に残す操作です。",
          ".gitignore を使う: 章7で練習した、ログや秘密ファイルを履歴から外すルールです。",
          "main にマージする: 章5・章8で練習した、別ブランチの変更を取り込む操作です。",
        ],
      },
      { kind: "heading", text: "機能ブランチとは" },
      {
        kind: "paragraph",
        text: "main は完成品を並べる棚、feature/login は作業机だと考えると分かりやすいです。作業机では途中の部品を広げてもよく、完成したら棚に戻します。main をいつも使える状態に保つために、機能ごとに作業場所を分けます。",
      },
      {
        kind: "diagram",
        caption: "feature/login を作って main に戻す流れ",
        ascii: [
          "main:          initial site",
          "                 │",
          "                 ├─ feature/login: add login page",
          "                 │",
          "                 ▼",
          "main:          initial site ── add login page",
        ].join("\n"),
      },
      {
        kind: "callout",
        tone: "tip",
        title: "なぜ機能ごとにブランチを分けるか",
        body: "複数人で同時に作業しやすくなり、レビューもしやすくなります。途中でログイン機能が壊れていても、main まで壊さずに済みます。",
      },
      {
        kind: "callout",
        tone: "warn",
        title: "ログや秘密ファイルは先に除外する",
        body: "`*.log` や `.env` のようなファイルは、コミット前に .gitignore へ書きます。一度履歴に入れると、あとから消したつもりでも過去のコミットに残ることがあります。",
      },
      { kind: "heading", text: "今回の初期状態" },
      {
        kind: "paragraph",
        text: "サンドボックスには main ブランチがあり、README.md と index.html が `initial site` というコミットで保存されています。作業ツリーは clean なので、すぐに新しい機能ブランチを切れます。",
      },
      {
        kind: "code",
        caption: "初期状態のイメージ",
        lines: [
          "$ git log --oneline",
          "a1b2c3d initial site",
          "$ git status",
          "On branch main",
          "nothing to commit, working tree clean",
        ],
      },
      { kind: "heading", text: "実務の一連のコマンド" },
      {
        kind: "code",
        caption: "ログイン機能を作って main に統合する",
        lines: [
          "$ git switch -c feature/login",
          "$ echo \"<title>Login</title>\" > login.html",
          "$ echo \"*.log\" > .gitignore",
          "$ git add login.html .gitignore",
          "$ git commit -m \"add login page\"",
          "$ git switch main",
          "$ git merge feature/login",
          "$ git log --oneline",
        ],
      },
      {
        kind: "walkthrough",
        heading: "練習問題でやること",
        steps: [
          {
            label: "1. `git switch -c feature/login` を打つ",
            why: "ログイン機能用の作業机を作ります。main から直接作業せず、機能ごとに変更をまとめられるようにします。",
          },
          {
            label: "2. `echo \"<title>Login</title>\" > login.html` でページを作る",
            why: "今回の機能本体です。新しいファイルを作ると、Git からはまだ未追跡のファイルとして見えます。",
          },
          {
            label: "3. `echo \"*.log\" > .gitignore` でログを除外する",
            why: "開発中に debug.log のようなログができても、コミット対象に混ざらないようにします。成果物と作業中のゴミを分けるためです。",
          },
          {
            label: "4. `git add login.html .gitignore` してコミットする",
            why: "ログインページと除外ルールを同じ機能の変更として履歴に残します。`git commit -m \"add login page\"` で写真を1枚撮ります。",
          },
          {
            label: "5. `git switch main` で本道に戻る",
            why: "完成した機能は main に取り込みます。取り込む側のブランチに移動してから merge するのが Git の基本です。",
          },
          {
            label: "6. `git merge feature/login` で統合する",
            why: "feature/login にあるログイン機能のコミットを main に入れます。今回は main 側に別変更がないので、fast-forward で進むことがあります。",
          },
          {
            label: "7. `git log --oneline` で履歴を見る",
            why: "main の履歴に `add login page` が入ったことを確認します。実務では最後に、目的の変更が main に入ったかを必ず目で確認します。",
          },
        ],
      },
    ],
  },
];

export function getLesson(chapter: number): Lesson | undefined {
  return lessons.find((lesson) => lesson.id === chapter);
}
