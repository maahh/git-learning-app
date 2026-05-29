export const TOTAL_DRILLS = 20;

export const drills = [
  {
    id: 1,
    title: "最初のコミット",
    prompt: "README.md を作り、最初のコミットをしてください。必要なら `git init` から始めます。",
    conditions: [
      { id: "drill1.commit", label: "1つ以上のコミットがある", kind: "state" },
      { id: "drill1.readmeTracked", label: "README.md が Git で追跡されている", kind: "state" },
    ],
  },
  {
    id: 2,
    title: "まとめてステージ",
    prompt: "a.txt / b.txt / c.txt をすべてステージし、まとめて1つのコミットにしてください。",
    conditions: [
      { id: "drill2.filesTracked", label: "a.txt / b.txt / c.txt がすべて追跡されている", kind: "state" },
      { id: "drill2.commit", label: "1つ以上のコミットがある", kind: "state" },
    ],
  },
  {
    id: 3,
    title: "コミットメッセージ修正",
    prompt: "直前のコミットメッセージを `add feature` に直してください。ヒント: `git commit --amend`。",
    conditions: [
      { id: "drill3.message", label: "HEAD のメッセージが add feature になっている", kind: "state" },
      { id: "drill3.singleCommit", label: "コミット数が1つのまま", kind: "state" },
    ],
  },
  {
    id: 4,
    title: "一部だけコミット",
    prompt: "keep.txt だけをコミットし、later.txt は未追跡のまま残してください。",
    conditions: [
      { id: "drill4.keepTracked", label: "keep.txt が Git で追跡されている", kind: "state" },
      { id: "drill4.laterUntracked", label: "later.txt が未追跡のまま残っている", kind: "state" },
    ],
  },
  {
    id: 5,
    title: "生成物を除外",
    prompt: ".gitignore で `*.log` と `*.tmp` を除外し、その .gitignore をコミットしてください。",
    conditions: [
      { id: "drill5.gitignore", label: ".gitignore に *.log と *.tmp がある", kind: "state" },
      { id: "drill5.ignored", label: "build.log と cache.tmp が status に出ない", kind: "state" },
    ],
  },
  {
    id: 6,
    title: "ファイル名変更",
    prompt: "`git mv` を使って old.txt を new.txt にリネームしてください。ステージ済みの状態で構いません。",
    conditions: [
      { id: "drill6.newTracked", label: "new.txt が Git で追跡されている", kind: "state" },
      { id: "drill6.oldGone", label: "old.txt が追跡対象から消えている", kind: "state" },
    ],
  },
  {
    id: 7,
    title: "ファイル削除",
    prompt: "`git rm` を使って temp.txt を削除し、Git に削除を記録してください。",
    conditions: [{ id: "drill7.tempGone", label: "temp.txt が追跡対象から消えている", kind: "state" }],
  },
  {
    id: 8,
    title: "作業ブランチ",
    prompt: "feature/api ブランチを作って切り替え、そのブランチで1つコミットしてください。",
    conditions: [
      { id: "drill8.branch", label: "feature/api ブランチがある", kind: "state" },
      { id: "drill8.ahead", label: "feature/api が main より1つ以上進んでいる", kind: "state" },
    ],
  },
  {
    id: 9,
    title: "ブランチ改名",
    prompt: "今いる wip ブランチの名前を develop に変えてください。ヒント: `git branch -m`。",
    conditions: [
      { id: "drill9.develop", label: "develop ブランチがある", kind: "state" },
      { id: "drill9.noWip", label: "wip ブランチが残っていない", kind: "state" },
    ],
  },
  {
    id: 10,
    title: "FFマージ",
    prompt: "main にいる状態から feature を fast-forward でマージしてください。",
    conditions: [
      { id: "drill10.onMain", label: "main ブランチにいる", kind: "state" },
      { id: "drill10.fastForwarded", label: "feature の変更が main に fast-forward で入っている", kind: "state" },
    ],
  },
  {
    id: 11,
    title: "マージコミット強制",
    prompt: "`--no-ff` を使い、必ずマージコミットを作って feature を main にマージしてください。",
    conditions: [
      { id: "drill11.onMain", label: "main ブランチにいる", kind: "state" },
      { id: "drill11.mergeCommit", label: "マージコミットが作られている", kind: "state" },
    ],
  },
  {
    id: 12,
    title: "衝突解決",
    prompt: "`git merge feature` で衝突を起こし、README.md を解決してコミットしてください。",
    conditions: [
      { id: "drill12.noMarkers", label: "README.md にコンフリクトマーカーが残っていない", kind: "state" },
      { id: "drill12.mergeCommit", label: "マージコミットが作られている", kind: "state" },
    ],
  },
  {
    id: 13,
    title: "ブランチ削除",
    prompt: "main にマージ済みの feature ブランチを削除してください。ヒント: `git branch -d feature`。",
    conditions: [
      { id: "drill13.noFeature", label: "feature ブランチが残っていない", kind: "state" },
      { id: "drill13.main", label: "main ブランチがある", kind: "state" },
    ],
  },
  {
    id: 14,
    title: "変更を破棄",
    prompt: "README.md の編集を破棄し、HEAD の状態に戻してください。ヒント: `git restore`。",
    conditions: [
      { id: "drill14.clean", label: "作業ツリーが clean", kind: "state" },
      { id: "drill14.commit", label: "1つ以上のコミットがある", kind: "state" },
    ],
  },
  {
    id: 15,
    title: "ステージ取り消し",
    prompt: "README.md の中身は残したまま、ステージだけ取り消してください。ヒント: `git restore --staged`。",
    conditions: [
      { id: "drill15.noCachedDiff", label: "ステージされた変更がない", kind: "state" },
      { id: "drill15.workingDiff", label: "作業ツリーには README.md の変更が残っている", kind: "state" },
    ],
  },
  {
    id: 16,
    title: "コミットを打ち消す",
    prompt: "`bad change` コミットを `git revert` で打ち消すコミットを作ってください。",
    conditions: [
      { id: "drill16.badGone", label: "bad.txt が作業ツリーから消えている", kind: "state" },
      { id: "drill16.revertCommit", label: "コミット数が3つ以上ある", kind: "state" },
    ],
  },
  {
    id: 17,
    title: "HEADを戻す(soft)",
    prompt: "`git reset --soft HEAD~1` で1つ前に戻し、変更はステージに残してください。",
    conditions: [
      { id: "drill17.oneCommit", label: "コミット数が1つに戻っている", kind: "state" },
      { id: "drill17.staged", label: "ステージに変更が残っている", kind: "state" },
    ],
  },
  {
    id: 18,
    title: "作業を退避",
    prompt: "`git stash` で退避し、`git stash pop` で作業ツリーに戻してください。",
    conditions: [
      { id: "drill18.workingDiff", label: "作業ツリーに編集が戻っている", kind: "state" },
      { id: "drill18.stashUsed", label: "git stash を実行した", kind: "action" },
    ],
  },
  {
    id: 19,
    title: "リリースタグ",
    prompt: "`v1.0.0` タグを打ってください。ヒント: `git tag v1.0.0`。",
    conditions: [{ id: "drill19.tag", label: "v1.0.0 タグが存在する", kind: "state" }],
  },
  {
    id: 20,
    title: "総合フロー",
    prompt: "feature/login を切り、src/login.js を追加してコミットし、.gitignore で `*.log` を除外してから main にマージし、v0.1.0 タグを打ってください。",
    conditions: [
      { id: "drill20.loginTracked", label: "src/login.js が Git で追跡されている", kind: "state" },
      { id: "drill20.gitignore", label: ".gitignore に *.log がある", kind: "state" },
      { id: "drill20.merged", label: "main に src/login.js が統合されている", kind: "state" },
      { id: "drill20.tag", label: "v0.1.0 タグが存在する", kind: "state" },
    ],
  },
];

export function getDrill(id) {
  return drills.find((drill) => drill.id === id) ?? null;
}
