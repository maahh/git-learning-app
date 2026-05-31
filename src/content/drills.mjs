import { extraDrills } from "./drillExtras.mjs";

export const TOTAL_DRILLS = 100;

export const drills = [
  {
    id: 1,
    title: "最初のコミット",
    prompt: "README.md を作り、最初のコミットをしてください。必要なら `git init` から始めます。",
    hint: "`git init -b main` でリポジトリを作り、`git add` してから `git commit` します。",
    answer: [
      "git init -b main",
      "printf \"# My Project\\n\" > README.md",
      "git add README.md",
      "git commit -m \"first commit\"",
    ],
    explanation:
      "git init はこのフォルダを Git の管理下に置き、`-b main` で最初のブランチ名を main にします。Git はファイルをいきなり記録せず、`git add` で『次のコミットに含める一時置き場（ステージ）』に載せ、`git commit` で確定する2段階です。この『作る → add → commit』があらゆる作業の出発点になります。",
    conditions: [
      { id: "drill1.commit", label: "1つ以上のコミットがある", kind: "state" },
      { id: "drill1.readmeTracked", label: "README.md が HEAD にコミット済み", kind: "state" },
    ],
  },
  {
    id: 2,
    title: "まとめてステージ",
    prompt: "a.txt / b.txt / c.txt をすべてステージし、まとめて1つのコミットにしてください。",
    hint: "`git add` には複数ファイルをまとめて指定できます。",
    answer: ["git add a.txt b.txt c.txt", "git commit -m \"add files\""],
    explanation:
      "`git add` はスペース区切りで複数ファイルを一度にステージできます。関連する変更は1つのコミットにまとめると、後から履歴を追ったり一気に元へ戻したりしやすくなります。逆に無関係な変更まで混ぜると、レビューや巻き戻しがやりにくくなる点に注意します。",
    conditions: [
      { id: "drill2.filesTracked", label: "a.txt / b.txt / c.txt がすべて HEAD にコミット済み", kind: "state" },
      { id: "drill2.commit", label: "1つ以上のコミットがある", kind: "state" },
    ],
  },
  {
    id: 3,
    title: "コミットメッセージ修正",
    prompt: "直前のコミットメッセージを `add feature` に直してください。ヒント: `git commit --amend`。",
    hint: "`git commit --amend` は新しいコミットを作らず、直前のコミットを上書きします（メッセージや内容を直せます）。",
    answer: ["git commit --amend -m \"add feature\""],
    explanation:
      "`git commit --amend` は新しいコミットを増やさず、直前のコミットを作り直します。`-m` を付ければメッセージだけを差し替えられます。コミット直後のタイプミス修正の定番ですが、すでに push 済みのコミットを amend すると履歴がズレるため、共有前のローカルコミットに使うのが安全です。",
    conditions: [
      { id: "drill3.message", label: "HEAD のメッセージが add feature になっている", kind: "state" },
      { id: "drill3.singleCommit", label: "コミット数が1つのまま", kind: "state" },
    ],
  },
  {
    id: 4,
    title: "一部だけコミット",
    prompt: "keep.txt だけをコミットし、later.txt は未追跡のまま残してください。",
    hint: "コミットしたいファイルだけを `git add` すれば、他の未追跡ファイルは残せます。",
    answer: ["git add keep.txt", "git commit -m \"add keep\""],
    explanation:
      "`git add keep.txt` は keep.txt だけをステージに載せ、later.txt は Git にまだ管理させない状態のままにします。ステージに載ったものだけが `git commit` に入るため、関係する変更だけを小さく記録できます。実務では作業途中のメモや別件のファイルを混ぜないために重要です。",
    conditions: [
      { id: "drill4.keepTracked", label: "keep.txt が HEAD にコミット済み", kind: "state" },
      { id: "drill4.laterUntracked", label: "later.txt が未追跡のまま残っている", kind: "state" },
    ],
  },
  {
    id: 5,
    title: "生成物を除外",
    prompt: ".gitignore で `*.log` と `*.tmp` を除外し、その .gitignore をコミットしてください。",
    hint: "無視したいパターンを `.gitignore` に書き、`.gitignore` 自体はコミット対象にします。",
    answer: [
      "printf \"*.log\\n*.tmp\\n\" > .gitignore",
      "git add .gitignore",
      "git commit -m \"ignore generated files\"",
    ],
    explanation:
      "`.gitignore` に `*.log` と `*.tmp` を書くと、該当する未追跡ファイルが `git status` に出にくくなります。無視ルール自体はチームで共有したい設定なので、`.gitignore` をコミットするのが正解です。すでに追跡済みのファイルは ignore だけでは外れない点に注意します。",
    conditions: [
      { id: "drill5.gitignore", label: ".gitignore に *.log と *.tmp がある", kind: "state" },
      { id: "drill5.ignored", label: "build.log と cache.tmp が status に出ない", kind: "state" },
    ],
  },
  {
    id: 6,
    title: "ファイル名変更",
    prompt: "`git mv` を使って old.txt を new.txt にリネームしてください。ステージ済みの状態で構いません。",
    hint: "`git mv 旧名 新名` はファイル名変更を Git のステージに記録します。",
    answer: ["git mv old.txt new.txt"],
    explanation:
      "`git mv old.txt new.txt` は作業ツリーのファイル名を変え、その変更をステージにも載せます。手で名前を変えてから `git add` と削除登録をするより、意図が明確で手順も少なくなります。履歴上は内容の近さからリネームとして見えるため、後から追跡しやすくなります。",
    conditions: [
      { id: "drill6.newTracked", label: "new.txt が Git で追跡されている", kind: "state" },
      { id: "drill6.oldGone", label: "old.txt が追跡対象から消えている", kind: "state" },
    ],
  },
  {
    id: 7,
    title: "ファイル削除",
    prompt: "`git rm` を使って temp.txt を削除し、Git に削除を記録してください。",
    hint: "`git rm` は作業ツリーから削除し、その削除をステージします。",
    answer: ["git rm temp.txt"],
    explanation:
      "`git rm temp.txt` は temp.txt を実際に削除し、その削除を次のコミット候補としてステージします。単にファイルを消しただけでは、削除を記録するために追加の `git add` が必要になることがあります。不要ファイルを履歴から正しく消したい時に使います。",
    conditions: [{ id: "drill7.tempGone", label: "temp.txt が追跡対象から消えている", kind: "state" }],
  },
  {
    id: 8,
    title: "作業ブランチ",
    prompt: "feature/api ブランチを作って切り替え、そのブランチで1つコミットしてください。",
    hint: "`git switch -c` でブランチ作成と切り替えを同時にできます。",
    answer: [
      "git switch -c feature/api",
      "printf \"api\\n\" > api.txt",
      "git add api.txt",
      "git commit -m \"add api\"",
    ],
    explanation:
      "`git switch -c feature/api` は現在の地点から新しい作業ブランチを作り、同時にそこへ移動します。その後にファイルを作って add/commit することで、main ではなく feature/api 側だけに変更が積まれます。機能ごとにブランチを分けると、未完成の作業を main から切り離せます。",
    conditions: [
      { id: "drill8.branch", label: "feature/api ブランチがある", kind: "state" },
      { id: "drill8.ahead", label: "feature/api が main より1つ以上進んでいる", kind: "state" },
    ],
  },
  {
    id: 9,
    title: "ブランチ改名",
    prompt: "今いる wip ブランチの名前を develop に変えてください。ヒント: `git branch -m`。",
    hint: "今いるブランチの名前は `git branch -m 新しい名前` で変更できます。",
    answer: ["git branch -m develop"],
    explanation:
      "`git branch -m develop` は今いるブランチの名前を develop に変更します。コミット内容は動かさず、ブランチというラベルだけを付け替えるため、作業履歴を保ったまま名前を整えられます。共有済みブランチの改名はリモート側との対応も必要になるので注意します。",
    conditions: [
      { id: "drill9.develop", label: "develop ブランチがある", kind: "state" },
      { id: "drill9.noWip", label: "wip ブランチが残っていない", kind: "state" },
    ],
  },
  {
    id: 10,
    title: "FFマージ",
    prompt: "main にいる状態から feature を fast-forward でマージしてください。",
    hint: "main が feature の祖先なら、`git merge --ff-only feature` で履歴を直線のまま進められます。",
    answer: ["git merge --ff-only feature"],
    explanation:
      "`git merge --ff-only feature` は main を feature の先端へそのまま進められる場合だけマージします。マージコミットを作らず履歴が直線になるため、単純な取り込みでは見通しがよくなります。main 側にも別の変更があると失敗するので、その時は通常マージや rebase を選びます。",
    conditions: [
      { id: "drill10.onMain", label: "main ブランチにいる", kind: "state" },
      { id: "drill10.fastForwarded", label: "feature の変更が main に fast-forward で入っている", kind: "state" },
    ],
  },
  {
    id: 11,
    title: "マージコミット強制",
    prompt: "`--no-ff` を使い、必ずマージコミットを作って feature を main にマージしてください。",
    hint: "`--no-ff` を付けると fast-forward 可能でもマージコミットを作ります。",
    answer: ["git merge --no-ff feature -m \"merge feature\""],
    explanation:
      "`git merge --no-ff feature` は fast-forward できる場合でも、feature を取り込んだ事実をマージコミットとして残します。`-m` でそのマージコミットのメッセージを指定しているため、エディタを開かずに完了できます。機能単位のまとまりを履歴に残したいチーム運用で使われます。",
    conditions: [
      { id: "drill11.onMain", label: "main ブランチにいる", kind: "state" },
      { id: "drill11.mergeCommit", label: "マージコミットが作られている", kind: "state" },
    ],
  },
  {
    id: 12,
    title: "衝突解決",
    prompt: "`git merge feature` で衝突を起こし、README.md を解決してコミットしてください。",
    hint: "衝突後はファイルから `<<<<<<<` などのマーカーを消し、`git add` してコミットします。",
    answer: [
      "git merge feature",
      "git status",
      "cat README.md",
      "printf \"# My Project\\nmain line\\nfeature line\\n\" > README.md",
      "git add README.md",
      "git commit -m \"merge feature\"",
    ],
    explanation:
      "`git merge feature` で同じ箇所の変更がぶつかると、Git は自動判断を止めてファイルに衝突マーカーを入れます。いきなり直さず、まず `git status` でどのファイルが未解決か、`cat README.md` でマーカー（`<<<<<<<`〜`>>>>>>>`）と両側の主張を確認するのが原因追及です。状況を把握したうえで内容を選び直してマーカーを消し、`git add` で解決済みと伝えてから `git commit` します。",
    conditions: [
      { id: "drill12.noMarkers", label: "README.md にコンフリクトマーカーが残っていない", kind: "state" },
      { id: "drill12.mergeCommit", label: "マージコミットが作られている", kind: "state" },
    ],
  },
  {
    id: 13,
    title: "ブランチ削除",
    prompt: "main にマージ済みの feature ブランチを削除してください。ヒント: `git branch -d feature`。",
    hint: "マージ済みブランチは `git branch -d ブランチ名` で安全に削除できます。",
    answer: ["git branch -d feature"],
    explanation:
      "`git branch -d feature` はローカルの feature ブランチ名を削除します。`-d` はマージ済みでない変更が残っている場合に止めてくれるため、誤って作業を失いにくい指定です。マージ後の作業ブランチを片付ける時の基本操作です。",
    conditions: [
      { id: "drill13.noFeature", label: "feature ブランチが残っていない", kind: "state" },
      { id: "drill13.main", label: "main ブランチがある", kind: "state" },
    ],
  },
  {
    id: 14,
    title: "変更を破棄",
    prompt: "README.md の編集を破棄し、HEAD の状態に戻してください。ヒント: `git restore`。",
    hint: "`git restore ファイル名` はステージしていない作業ツリーの変更を破棄します。",
    answer: ["git status", "git restore README.md"],
    explanation:
      "まず `git status` で README.md に未ステージ変更があることを確認します。`git restore README.md` は README.md の未ステージ変更を HEAD の内容に戻します。消した変更は基本的に戻しにくいため、状態を確認してから不要な試行錯誤だけを捨てます。",
    conditions: [
      { id: "drill14.clean", label: "作業ツリーが clean", kind: "state" },
      { id: "drill14.commit", label: "1つ以上のコミットがある", kind: "state" },
    ],
  },
  {
    id: 15,
    title: "ステージ取り消し",
    prompt: "README.md の中身は残したまま、ステージだけ取り消してください。ヒント: `git restore --staged`。",
    hint: "`git restore --staged` はファイル内容を残したままインデックスから外します。",
    answer: ["git status", "git restore --staged README.md"],
    explanation:
      "まず `git status` で README.md がステージされていることを確認します。`git restore --staged README.md` は README.md をステージから外しますが、作業ツリーの編集内容はそのまま残します。ステージと作業ツリーは別物なので、確認してからコミット対象だけを外すと安全です。",
    conditions: [
      { id: "drill15.noCachedDiff", label: "ステージされた変更がない", kind: "state" },
      { id: "drill15.workingDiff", label: "作業ツリーには README.md の変更が残っている", kind: "state" },
    ],
  },
  {
    id: 16,
    title: "コミットを打ち消す",
    prompt: "`bad change` コミットを `git revert` で打ち消すコミットを作ってください。",
    hint: "`git revert` は既存コミットを消さず、逆向きの変更を新しいコミットとして追加します。",
    answer: ["git log --oneline", "git revert HEAD --no-edit"],
    explanation:
      "まず `git log --oneline` で、打ち消したい `bad change` がどのコミットか（今回は直前なので HEAD）を確認するのが原因追及です。`git revert HEAD --no-edit` は対象コミットの変更を打ち消す新しいコミットを作ります。履歴を消さないため共有済みの main でも安全で、`--no-edit` は自動生成メッセージをそのまま使う指定です。対象を取り違えると別の変更を消してしまうので、必ず確認してから revert します。",
    conditions: [
      { id: "drill16.badGone", label: "bad.txt が作業ツリーから消えている", kind: "state" },
      { id: "drill16.revertCommit", label: "コミット数が3つ以上ある", kind: "state" },
    ],
  },
  {
    id: 17,
    title: "HEADを戻す(soft)",
    prompt: "`git reset --soft HEAD~1` で1つ前に戻し、変更はステージに残してください。",
    hint: "`--soft` は HEAD だけを戻し、取り消したコミットの内容をステージに残します。",
    answer: ["git status", "git reset --soft HEAD~1"],
    explanation:
      "まず `git status` で作業ツリーとステージの状態を確認します。`git reset --soft HEAD~1` は HEAD だけを1つ前のコミットへ戻し、直前コミットの変更はステージに残します。reset は履歴の先端を動かすため、現在の状態を見てから共有前のローカル履歴を整えます。",
    conditions: [
      { id: "drill17.oneCommit", label: "コミット数が1つに戻っている", kind: "state" },
      { id: "drill17.staged", label: "ステージに変更が残っている", kind: "state" },
    ],
  },
  {
    id: 18,
    title: "作業を退避",
    prompt: "`git stash` で退避し、`git stash pop` で作業ツリーに戻してください。",
    hint: "`git stash` で一時退避し、`git stash pop` で退避した変更を作業ツリーへ戻します。",
    answer: ["git stash", "git stash pop"],
    explanation:
      "`git stash` は未コミットの変更を一時保存し、作業ツリーを clean に近い状態へ戻します。`git stash pop` はその保存内容を戻し、戻せた stash を一覧から取り除きます。急なブランチ切り替え前の退避に便利ですが、戻す時に衝突することがあります。",
    conditions: [
      { id: "drill18.workingDiff", label: "作業ツリーに編集が戻っている", kind: "state" },
      { id: "drill18.stashUsed", label: "git stash を実行した", kind: "action" },
    ],
  },
  {
    id: 19,
    title: "リリースタグ",
    prompt: "`v1.0.0` タグを打ってください。ヒント: `git tag v1.0.0`。",
    hint: "現在のコミットに軽量タグを付けるには `git tag タグ名` を使います。",
    answer: ["git tag v1.0.0"],
    explanation:
      "`git tag v1.0.0` は現在のコミットに v1.0.0 という名前の印を付けます。ブランチと違ってタグは通常動かさないため、リリース地点を固定して後から参照しやすくなります。軽量タグは簡単ですが、説明や署名を残したいリリースでは注釈タグも検討します。",
    conditions: [{ id: "drill19.tag", label: "v1.0.0 タグが存在する", kind: "state" }],
  },
  {
    id: 20,
    title: "総合フロー",
    prompt: "feature/login を切り、src/login.js を追加してコミットし、.gitignore で `*.log` を除外してから main にマージし、v0.1.0 タグを打ってください。",
    hint: "ブランチ作成、ファイル追加、ignore 設定、main へのマージ、タグ付けを順番に進めます。",
    answer: [
      "git switch -c feature/login",
      "printf \"export function login() { return true; }\\n\" > src/login.js",
      "git add src/login.js",
      "git commit -m \"add login\"",
      "printf \"*.log\\n\" > .gitignore",
      "git add .gitignore",
      "git commit -m \"ignore logs\"",
      "git switch main",
      "git merge --no-ff feature/login -m \"merge login\"",
      "git tag v0.1.0",
    ],
    explanation:
      "この手順は feature/login で機能追加と ignore 設定を別々にコミットし、main に戻ってからマージします。`--no-ff` を使うことで、ログイン機能を取り込んだまとまりがマージコミットとして残ります。最後にタグを付けると、その時点をリリース候補として後から正確に参照できます。",
    conditions: [
      { id: "drill20.loginTracked", label: "src/login.js が HEAD にコミット済み", kind: "state" },
      { id: "drill20.gitignore", label: ".gitignore に *.log がある", kind: "state" },
      { id: "drill20.merged", label: "main に src/login.js が統合されている", kind: "state" },
      { id: "drill20.tag", label: "v0.1.0 タグが存在する", kind: "state" },
    ],
  },
  ...extraDrills,
];

export function getDrill(id) {
  return drills.find((drill) => drill.id === id) ?? null;
}
