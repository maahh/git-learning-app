"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ConditionChecklist from "@/components/ConditionChecklist";
import FileStatePanel from "@/components/FileStatePanel";
import Terminal, { type TerminalHandle } from "@/components/Terminal";
import { getDrill, TOTAL_DRILLS } from "@/content/drills.mjs";
import { getDrillConditions } from "@/lib/conditions";
import type { ConditionCheck } from "@/lib/conditions/types";
import type { FileState } from "@/lib/fileStates.mjs";
import { markDrillCompleted, setLastDrill } from "@/lib/progress";

type DrillState = {
  track: "drill";
  id: number;
  drill: number;
  files: string[];
  fileStates: FileState[];
  head: string | null;
  status: string;
  checks: ConditionCheck[];
};

type DrillClientProps = {
  drill: number;
};

function mergeChecks(current: ConditionCheck[], incoming: ConditionCheck[]): ConditionCheck[] {
  if (incoming.length === 0) return current;
  const byId = new Map(current.map((check) => [check.id, check]));
  for (const check of incoming) {
    const previous = byId.get(check.id);
    byId.set(check.id, {
      ...check,
      ok: check.kind === "action" ? Boolean(previous?.ok || check.ok) : check.ok,
    });
  }
  return Array.from(byId.values());
}

function statusText(status: string): string {
  return status.trim() || "(clean or not a git repository)";
}

export default function DrillClient({ drill }: DrillClientProps) {
  const drillContent = getDrill(drill);
  const terminalRef = useRef<TerminalHandle | null>(null);
  const wasCompleteRef = useRef(false);
  const [state, setState] = useState<DrillState | null>(null);
  const [terminalMountKey, setTerminalMountKey] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  const fallbackChecks = useMemo<ConditionCheck[]>(
    () => getDrillConditions(drill).map((condition) => ({ ...condition, ok: false })),
    [drill],
  );
  const checks = state?.checks ?? fallbackChecks;
  const isComplete = checks.length > 0 && checks.every((check) => check.ok);
  const prevDrill = drill > 1 ? drill - 1 : null;
  const nextDrill = drill < TOTAL_DRILLS ? drill + 1 : null;

  const loadState = useCallback(async () => {
    const response = await fetch(`/api/state?track=drill&id=${drill}`, { cache: "no-store" });
    if (!response.ok) return;
    const nextState = (await response.json()) as DrillState;
    setState((current) =>
      current?.id === nextState.id
        ? { ...nextState, checks: mergeChecks(current.checks, nextState.checks) }
        : nextState,
    );
  }, [drill]);

  useEffect(() => {
    setState(null);
    wasCompleteRef.current = false;
    setLastDrill(drill);
    void loadState();
    const id = window.setInterval(() => {
      void loadState();
    }, 1500);

    return () => window.clearInterval(id);
  }, [drill, loadState]);

  useEffect(() => {
    if (isComplete && !wasCompleteRef.current) {
      wasCompleteRef.current = true;
      markDrillCompleted(drill);
      setShowToast(true);
      const id = window.setTimeout(() => setShowToast(false), 2000);
      return () => window.clearTimeout(id);
    }

    if (!isComplete) {
      wasCompleteRef.current = false;
    }

    return undefined;
  }, [drill, isComplete]);

  const handleChecks = useCallback((incoming: ConditionCheck[]) => {
    setState((current) => {
      if (!current) return current;
      return { ...current, checks: mergeChecks(current.checks, incoming) };
    });
  }, []);

  const handleReset = useCallback(() => {
    if (!window.confirm("本当にドリルのサンドボックスを初期化しますか？")) {
      return;
    }
    setState((current) =>
      current ? { ...current, checks: current.checks.map((check) => ({ ...check, ok: false })) } : current,
    );
    terminalRef.current?.reset();
  }, []);

  const handleResetDone = useCallback(() => {
    setTerminalMountKey((value) => value + 1);
    void loadState();
  }, [loadState]);

  const handleAnswerToggle = useCallback(() => {
    if (showAnswer) {
      setShowAnswer(false);
      return;
    }
    if (window.confirm("解答を表示しますか？")) {
      setShowAnswer(true);
    }
  }, [showAnswer]);

  const handleCopyCommand = useCallback(async (command: string) => {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      // Clipboard availability depends on browser permissions.
    }
  }, []);

  return (
    <main className="grid min-h-screen grid-cols-1 bg-bg text-text lg:grid-cols-[320px_minmax(0,1fr)_340px]">
      <aside className="border-b border-border bg-panel px-5 py-5 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3">
          <a className="text-sm text-textMuted transition hover:text-text" href="/drill">
            ← ドリル一覧
          </a>
          <a className="text-sm text-textMuted transition hover:text-text" href="/">
            章一覧
          </a>
        </div>
        <p className="mt-6 font-mono text-sm text-accent">Drill {drill}</p>
        <h1 className="mt-2 text-2xl font-semibold">{drillContent?.title ?? `ドリル${drill}`}</h1>
        <p className="mt-3 text-sm leading-6 text-textMuted">{drillContent?.prompt}</p>

        <div className="mt-5 space-y-3">
          <section className="rounded-md border border-border bg-bg p-3" aria-label="ヒント">
            <button
              className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-accent transition hover:text-success"
              type="button"
              onClick={() => setShowHint((value) => !value)}
              aria-expanded={showHint}
            >
              <span>ヒント</span>
              <span className="font-mono text-xs text-textMuted">{showHint ? "close" : "open"}</span>
            </button>
            {showHint ? <p className="mt-3 text-sm leading-6 text-textMuted">{drillContent?.hint}</p> : null}
          </section>

          <section className="rounded-md border border-border bg-bg p-3" aria-label="回答">
            <button
              className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-accent transition hover:text-success"
              type="button"
              onClick={handleAnswerToggle}
              aria-expanded={showAnswer}
            >
              <span>答えを見る</span>
              <span className="font-mono text-xs text-textMuted">{showAnswer ? "close" : "open"}</span>
            </button>
            {showAnswer ? (
              <ol className="mt-3 space-y-2">
                {(drillContent?.answer ?? []).map((command, index) => (
                  <li key={`${index}:${command}`} className="flex min-w-0 items-center gap-2">
                    <code className="min-w-0 flex-1 overflow-auto rounded border border-border bg-panel px-2 py-1.5 font-mono text-xs leading-5 text-text">
                      {command}
                    </code>
                    <button
                      className="shrink-0 rounded-md border border-accent/50 px-2 py-1 text-xs font-semibold text-accent transition hover:bg-accent/10"
                      type="button"
                      onClick={() => void handleCopyCommand(command)}
                    >
                      コピー
                    </button>
                  </li>
                ))}
              </ol>
            ) : null}
          </section>
        </div>

        <section className="mt-6" aria-label="達成条件">
          <h2 className="text-sm font-semibold text-text">達成条件</h2>
          <div className="mt-3">
            <ConditionChecklist checks={checks} />
          </div>
        </section>

        <button
          className="mt-6 w-full rounded-md border border-danger/50 px-3 py-2 text-sm font-semibold text-danger transition hover:bg-danger/10"
          type="button"
          onClick={handleReset}
        >
          サンドボックスをリセット
        </button>

        <nav className="mt-5 flex justify-between gap-3 text-sm text-textMuted" aria-label="ドリル移動">
          {prevDrill ? (
            <a className="transition hover:text-text" href={`/drill/${prevDrill}`}>
              ← Drill {prevDrill}
            </a>
          ) : (
            <span />
          )}
          {nextDrill ? (
            <a className="transition hover:text-text" href={`/drill/${nextDrill}`}>
              Drill {nextDrill} →
            </a>
          ) : null}
        </nav>
      </aside>

      <section className="relative flex min-h-[60vh] flex-col bg-black p-3 lg:min-h-screen">
        {showToast ? (
          <div className="pointer-events-none absolute left-1/2 top-5 z-10 -translate-x-1/2 animate-[completeToast_2s_ease-in-out_forwards] rounded-md border border-success/60 bg-panel px-5 py-3 text-sm font-semibold text-success shadow-xl">
            Drill {drill} 完了!
          </div>
        ) : null}
        <div className="mb-3 flex items-center justify-between gap-3 px-1 font-mono text-xs text-textMuted">
          <span>bash / git / xterm.js</span>
          <span className="truncate">ws://127.0.0.1:3000/pty?track=drill&amp;id={drill}</span>
        </div>
        <Terminal
          key={terminalMountKey}
          ref={terminalRef}
          track="drill"
          id={drill}
          mountKey={terminalMountKey}
          onChecks={handleChecks}
          onResetDone={handleResetDone}
        />
      </section>

      <aside
        className="border-t border-border bg-panel px-5 py-5 lg:border-l lg:border-t-0"
        aria-label="サンドボックスの状態"
      >
        <h2 className="text-lg font-semibold">状態</h2>
        <div className="mt-5 space-y-5">
          <section aria-label="ファイル一覧">
            <h3 className="font-mono text-xs uppercase text-textMuted">Files</h3>
            <FileStatePanel fileStates={state?.fileStates ?? []} />
          </section>

          <section aria-label="Git HEAD">
            <h3 className="font-mono text-xs uppercase text-textMuted">HEAD</h3>
            <pre className="mt-2 overflow-auto rounded-md border border-border bg-bg p-3 font-mono text-xs leading-5 text-text">
              {state?.head ?? "(no .git/HEAD)"}
            </pre>
          </section>

          <section aria-label="git status の状態">
            <h3 className="font-mono text-xs uppercase text-textMuted">git status --porcelain</h3>
            <pre className="mt-2 min-h-24 overflow-auto rounded-md border border-border bg-bg p-3 font-mono text-xs leading-5 text-text">
              {statusText(state?.status ?? "")}
            </pre>
          </section>
        </div>
      </aside>
    </main>
  );
}
