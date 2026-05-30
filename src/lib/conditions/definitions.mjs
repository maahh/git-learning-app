export const TOTAL_CHAPTERS = 9;

export const ch1Conditions = [
  {
    id: "ch1.gitDir",
    label: ".git/HEAD が作成されている",
    kind: "state",
  },
  {
    id: "ch1.readme",
    label: "README.md が存在する",
    kind: "state",
  },
  {
    id: "ch1.statusUsed",
    label: "git status を実行した",
    kind: "action",
  },
];

export const ch2Conditions = [
  {
    id: "ch2.staged",
    label: "README.md をステージに追加した",
    kind: "state",
  },
  {
    id: "ch2.firstCommit",
    label: "1つ以上のコミットがある",
    kind: "state",
  },
  {
    id: "ch2.logUsed",
    label: "git log を実行した",
    kind: "action",
  },
];

export const ch3Conditions = [
  {
    id: "ch3.modified",
    label: "README.md に変更がある",
    kind: "state",
  },
  {
    id: "ch3.diffUsed",
    label: "git diff を実行した",
    kind: "action",
  },
  {
    id: "ch3.diffStagedUsed",
    label: "git diff --staged を実行した",
    kind: "action",
  },
];

export const ch4Conditions = [
  {
    id: "ch4.branchCreated",
    label: "feature ブランチがある",
    kind: "state",
  },
  {
    id: "ch4.onFeature",
    label: "feature ブランチにいる",
    kind: "state",
  },
  {
    id: "ch4.featureCommit",
    label: "feature が main より1つ以上進んでいる",
    kind: "state",
  },
];

export const ch5Conditions = [
  {
    id: "ch5.onMain",
    label: "main ブランチにいる",
    kind: "state",
  },
  {
    id: "ch5.merged",
    label: "feature の変更が main に入っている",
    kind: "state",
  },
  {
    id: "ch5.logUsed",
    label: "git log を実行した",
    kind: "action",
  },
];

export const ch6Conditions = [
  {
    id: "ch6.statusUsed",
    label: "git status を実行した",
    kind: "action",
  },
  {
    id: "ch6.restoreUsed",
    label: "git restore を実行した",
    kind: "action",
  },
  {
    id: "ch6.clean",
    label: "作業ツリーが clean に戻っている",
    kind: "state",
  },
];

export const ch7Conditions = [
  {
    id: "ch7.gitignoreCreated",
    label: ".gitignore が存在する",
    kind: "state",
  },
  {
    id: "ch7.ignored",
    label: "secret.txt と debug.log が status に出ない",
    kind: "state",
  },
  {
    id: "ch7.committed",
    label: "git commit を実行した",
    kind: "action",
  },
];

export const ch8Conditions = [
  {
    id: "ch8.conflictRaised",
    label: "git merge を実行した",
    kind: "action",
  },
  {
    id: "ch8.markersResolved",
    label: "README.md のコンフリクトマーカーを消した",
    kind: "state",
  },
  {
    id: "ch8.mergeCommit",
    label: "マージコミットが作成されている",
    kind: "state",
  },
];

export const ch9Conditions = [
  {
    id: "ch9.featureBranch",
    label: "feature/login ブランチがある",
    kind: "state",
  },
  {
    id: "ch9.loginCommitted",
    label: "login.html が HEAD にコミット済み",
    kind: "state",
  },
  {
    id: "ch9.gitignoreAdded",
    label: ".gitignore に *.log が書かれている",
    kind: "state",
  },
  {
    id: "ch9.mergedToMain",
    label: "main に login.html が統合されている",
    kind: "state",
  },
];
