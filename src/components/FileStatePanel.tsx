import type { FileState, FileStateName } from "@/lib/fileStates.mjs";

type FileStatePanelProps = {
  fileStates: FileState[];
};

const stateMeta: Record<FileStateName, { label: string; className: string; dotClassName: string; legend: string }> = {
  untracked: {
    label: "未追跡",
    className: "border-border bg-panel2 text-textMuted",
    dotClassName: "bg-textMuted",
    legend: "Git 未登録",
  },
  modified: {
    label: "変更",
    className: "border-warn/50 bg-warn/10 text-warn",
    dotClassName: "bg-warn",
    legend: "作業ツリー変更",
  },
  staged: {
    label: "ステージ済",
    className: "border-accent/50 bg-accent/10 text-accent",
    dotClassName: "bg-accent",
    legend: "次のコミット対象",
  },
  committed: {
    label: "コミット済",
    className: "border-success/50 bg-success/10 text-success",
    dotClassName: "bg-success",
    legend: "変更なし",
  },
  ignored: {
    label: "無視",
    className: "border-border bg-bg text-textMuted line-through opacity-70",
    dotClassName: "bg-border",
    legend: ".gitignore 対象",
  },
};

export default function FileStatePanel({ fileStates }: FileStatePanelProps) {
  return (
    <div className="mt-2 rounded-md border border-border bg-bg p-3">
      {fileStates.length ? (
        <ul className="space-y-2">
          {fileStates.map((fileState) => {
            const meta = stateMeta[fileState.state];
            return (
              <li
                key={`${fileState.state}:${fileState.path}`}
                className="flex min-w-0 items-center justify-between gap-3 rounded border border-border/70 bg-panel/60 px-2 py-2"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dotClassName}`} aria-hidden="true" />
                  <span className="truncate font-mono text-xs text-text">{fileState.path}</span>
                </span>
                <span
                  className={`shrink-0 rounded border px-2 py-0.5 text-[11px] font-semibold leading-4 ${meta.className}`}
                >
                  {meta.label}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="min-h-16 font-mono text-xs leading-5 text-textMuted">(empty)</p>
      )}

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-border pt-3 text-[11px] leading-4 text-textMuted">
        {Object.entries(stateMeta).map(([state, meta]) => (
          <div key={state} className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClassName}`} aria-hidden="true" />
            <dt className="font-semibold text-text">{meta.label}</dt>
            <dd>{meta.legend}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
