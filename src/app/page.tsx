import Link from "next/link";
import HomeProgress from "./HomeProgress";
import { getLesson } from "@/content/lessons";
import { TOTAL_CHAPTERS } from "@/lib/conditions/definitions.mjs";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-bg px-6 py-10 text-text">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="border-b border-border pb-6">
          <p className="font-mono text-sm text-accent">Git Learning App v5</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal">
            本物の bash と git で学ぶ Git 入門
          </h1>
        </header>

        <section className="grid gap-4 sm:grid-cols-2" aria-label="章一覧">
          {Array.from({ length: TOTAL_CHAPTERS }, (_, index) => getLesson(index + 1)).map((lesson) =>
            lesson ? (
              <article
                key={lesson.id}
                className="rounded-lg border border-border bg-panel p-5 transition hover:border-accent hover:bg-panel2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm text-accent">Chapter {lesson.id}</p>
                    <h2 className="mt-2 text-xl font-semibold">{lesson.title}</h2>
                  </div>
                  <HomeProgress chapter={lesson.id} />
                </div>
                <p className="mt-3 text-sm leading-6 text-textMuted">{lesson.oneLiner}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/chapter/${lesson.id}/lesson`}
                    className="rounded-md border border-border px-3 py-2 text-sm font-semibold transition hover:border-accent"
                  >
                    解説を読む
                  </Link>
                  {/* 演習ページは pty/WebSocket を張るためフルロードでマウントさせる。 */}
                  <a
                    href={`/chapter/${lesson.id}`}
                    className="rounded-md border border-accent/50 bg-accent px-3 py-2 text-sm font-semibold text-bg transition hover:bg-success"
                  >
                    練習問題へ
                  </a>
                </div>
              </article>
            ) : null,
          )}
        </section>

        <section className="border-t border-border pt-6" aria-label="実践ドリル">
          <div className="rounded-lg border border-border bg-panel p-5">
            <p className="font-mono text-sm text-accent">Practice Drill</p>
            <h2 className="mt-2 text-xl font-semibold">実践ドリル（20問）</h2>
            <p className="mt-3 text-sm leading-6 text-textMuted">
              Chapter とは別枠の、解説なしで手を動かす Git 操作ノックです。
            </p>
            <a
              href="/drill"
              className="mt-5 inline-flex rounded-md border border-accent/50 bg-accent px-3 py-2 text-sm font-semibold text-bg transition hover:bg-success"
            >
              実践ドリルへ
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
