"use client";

import { useEffect, useState } from "react";
import { drills } from "@/content/drills.mjs";
import { loadProgress } from "@/lib/progress";

export default function DrillPage() {
  const [completed, setCompleted] = useState<number[]>([]);

  useEffect(() => {
    setCompleted(loadProgress().drillCompleted);
  }, []);

  return (
    <main className="min-h-screen bg-bg px-6 py-10 text-text">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="border-b border-border pb-6">
          <a className="text-sm text-textMuted transition hover:text-text" href="/">
            ← 章一覧
          </a>
          <p className="mt-6 font-mono text-sm text-accent">Practice Drill</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">実践ドリル（20問）</h1>
          <p className="mt-3 text-sm leading-6 text-textMuted">
            解説なしで、Git の操作だけを反復する実務寄りの練習セットです。
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="実践ドリル一覧">
          {drills.map((drill) => {
            const done = completed.includes(drill.id);
            return (
              <article
                key={drill.id}
                className="rounded-lg border border-border bg-panel p-5 transition hover:border-accent hover:bg-panel2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm text-accent">Drill {drill.id}</p>
                    <h2 className="mt-2 text-lg font-semibold">{drill.title}</h2>
                  </div>
                  <span
                    className={`shrink-0 rounded-md border px-2 py-1 text-xs font-semibold ${
                      done
                        ? "border-success/50 bg-success/10 text-success"
                        : "border-border bg-bg text-textMuted"
                    }`}
                  >
                    {done ? "完了" : "未完了"}
                  </span>
                </div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-textMuted">{drill.prompt}</p>
                <a
                  href={`/drill/${drill.id}`}
                  className="mt-5 inline-flex rounded-md border border-accent/50 bg-accent px-3 py-2 text-sm font-semibold text-bg transition hover:bg-success"
                >
                  ドリルを開く
                </a>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
