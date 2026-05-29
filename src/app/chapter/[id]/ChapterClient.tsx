"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ConditionChecklist from "@/components/ConditionChecklist";
import Terminal, { type TerminalHandle } from "@/components/Terminal";
import { getLesson } from "@/content/lessons";
import { getConditions } from "@/lib/conditions";
import { TOTAL_CHAPTERS } from "@/lib/conditions/definitions.mjs";
import type { ConditionCheck } from "@/lib/conditions/types";
import { markChapterCompleted, setLastChapter } from "@/lib/progress";

type ChapterState = {
  chapter: number;
  files: string[];
  head: string | null;
  status: string;
  checks: ConditionCheck[];
};

type ChapterClientProps = {
  chapter: number;
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

export default function ChapterClient({ chapter }: ChapterClientProps) {
  const lesson = getLesson(chapter);
  const terminalRef = useRef<TerminalHandle | null>(null);
  const wasCompleteRef = useRef(false);
  const [state, setState] = useState<ChapterState | null>(null);
  const [terminalMountKey, setTerminalMountKey] = useState(0);
  const [showToast, setShowToast] = useState(false);

  const fallbackChecks = useMemo<ConditionCheck[]>(
    () => getConditions(chapter).map((condition) => ({ ...condition, ok: false })),
    [chapter],
  );
  const checks = state?.checks ?? fallbackChecks;
  const isComplete = checks.length > 0 && checks.every((check) => check.ok);
  const walkthrough = lesson?.sections.find((section) => section.kind === "walkthrough");
  const prevChapter = chapter > 1 ? chapter - 1 : null;
  const nextChapter = chapter < TOTAL_CHAPTERS ? chapter + 1 : null;

  const loadState = useCallback(async () => {
    const response = await fetch(`/api/state?chapter=${chapter}`, { cache: "no-store" });
    if (!response.ok) return;
    const nextState = (await response.json()) as ChapterState;
    setState((current) =>
      current?.chapter === nextState.chapter
        ? { ...nextState, checks: mergeChecks(current.checks, nextState.checks) }
        : nextState,
    );
  }, [chapter]);

  useEffect(() => {
    setState(null);
    wasCompleteRef.current = false;
    setLastChapter(chapter);
    void loadState();
    const id = window.setInterval(() => {
      void loadState();
    }, 1500);

    return () => {
      window.clearInterval(id);
    };
  }, [chapter, loadState]);

  useEffect(() => {
    if (isComplete && !wasCompleteRef.current) {
      wasCompleteRef.current = true;
      markChapterCompleted(chapter);
      setShowToast(true);
      const id = window.setTimeout(() => setShowToast(false), 2000);
      return () => window.clearTimeout(id);
    }

    if (!isComplete) {
      wasCompleteRef.current = false;
    }

    return undefined;
  }, [chapter, isComplete]);

  const handleChecks = useCallback((incoming: ConditionCheck[]) => {
    setState((current) => {
      if (!current) return current;
      return { ...current, checks: mergeChecks(current.checks, incoming) };
    });
  }, []);

  const handleReset = useCallback(() => {
    if (!window.confirm("本当に章のサンドボックスを初期化しますか？")) {
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

  return (
    <main className="grid min-h-screen grid-cols-1 bg-bg text-text lg:grid-cols-[320px_minmax(0,1fr)_340px]">
      <aside className="border-b border-border bg-panel px-5 py-5 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3">
          <Link className="text-sm text-textMuted transition hover:text-text" href="/">
            ← 章一覧
          </Link>
          <Link className="text-sm text-accent transition hover:text-success" href={`/chapter/${chapter}/lesson`}>
            解説
          </Link>
        </div>
        <p className="mt-6 font-mono text-sm text-accent">Chapter {chapter}</p>
        <h1 className="mt-2 text-2xl font-semibold">{lesson?.title ?? `章${chapter}`}</h1>
        <p className="mt-3 text-sm leading-6 text-textMuted">{lesson?.intro}</p>

        {walkthrough?.kind === "walkthrough" ? (
          <section className="mt-6" aria-label="手順">
            <h2 className="text-sm font-semibold text-text">手順</h2>
            <ol className="mt-3 space-y-2">
              {walkthrough.steps.map((step) => (
                <li key={step.label} className="rounded-md border border-border bg-bg p-3 text-sm">
                  <p className="font-medium text-text">{step.label}</p>
                  <p className="mt-1 text-xs leading-5 text-textMuted">{step.why}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

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

        <nav className="mt-5 flex justify-between gap-3 text-sm text-textMuted" aria-label="章移動">
          {prevChapter ? (
            <Link className="transition hover:text-text" href={`/chapter/${prevChapter}/lesson`}>
              ← 章{prevChapter}の解説
            </Link>
          ) : (
            <span />
          )}
          {nextChapter ? (
            <Link className="transition hover:text-text" href={`/chapter/${nextChapter}/lesson`}>
              章{nextChapter}の解説 →
            </Link>
          ) : null}
        </nav>
      </aside>

      <section className="relative flex min-h-[60vh] flex-col bg-black p-3 lg:min-h-screen">
        {showToast ? (
          <div className="pointer-events-none absolute left-1/2 top-5 z-10 -translate-x-1/2 animate-[completeToast_2s_ease-in-out_forwards] rounded-md border border-success/60 bg-panel px-5 py-3 text-sm font-semibold text-success shadow-xl">
            🎉 章 {chapter} 完了!
          </div>
        ) : null}
        <div className="mb-3 flex items-center justify-between gap-3 px-1 font-mono text-xs text-textMuted">
          <span>bash / git / xterm.js</span>
          <span className="truncate">ws://127.0.0.1:3000/pty?chapter={chapter}</span>
        </div>
        <Terminal
          key={terminalMountKey}
          ref={terminalRef}
          chapter={chapter}
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
            <pre className="mt-2 min-h-24 overflow-auto rounded-md border border-border bg-bg p-3 font-mono text-xs leading-5 text-text">
              {state?.files.length ? state.files.join("\n") : "(empty)"}
            </pre>
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
