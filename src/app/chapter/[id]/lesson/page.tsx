import Link from "next/link";
import { notFound } from "next/navigation";
import LessonView from "@/components/LessonView";
import { getLesson } from "@/content/lessons";
import { TOTAL_CHAPTERS } from "@/lib/conditions/definitions.mjs";

type PageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return Array.from({ length: TOTAL_CHAPTERS }, (_, index) => ({ id: String(index + 1) }));
}

export default async function LessonPage({ params }: PageProps) {
  const { id } = await params;
  const chapter = Number(id);
  const lesson = Number.isInteger(chapter) ? getLesson(chapter) : undefined;

  if (!lesson) {
    notFound();
  }

  const prevLesson = getLesson(chapter - 1);
  const nextLesson = getLesson(chapter + 1);

  return (
    <main className="min-h-screen bg-bg px-5 py-6 text-text">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <Link className="text-sm text-textMuted transition hover:text-text" href="/">
            ← 章一覧
          </Link>
          {/* 演習ページは pty/WebSocket を張るため、ソフトナビではなく
              フルロードでマウントさせる（接続が安定する）。素の <a> を使う。 */}
          <a
            className="rounded-md border border-accent/50 bg-accent px-4 py-2 text-sm font-semibold text-bg transition hover:bg-success"
            href={`/chapter/${chapter}`}
          >
            解説 → 練習問題
          </a>
        </header>

        <LessonView lesson={lesson} />

        <footer className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3 text-sm text-textMuted">
            {prevLesson ? (
              <Link className="transition hover:text-text" href={`/chapter/${prevLesson.id}/lesson`}>
                ← 章{prevLesson.id}の解説
              </Link>
            ) : null}
            {nextLesson ? (
              <Link className="transition hover:text-text" href={`/chapter/${nextLesson.id}/lesson`}>
                章{nextLesson.id}の解説 →
              </Link>
            ) : null}
          </div>
          {/* 演習ページは pty/WebSocket を張るため、フルロードでマウントさせる。 */}
          <a
            className="inline-flex items-center justify-center rounded-md border border-accent/50 bg-accent px-4 py-2 text-sm font-semibold text-bg transition hover:bg-success"
            href={`/chapter/${chapter}`}
          >
            練習問題に進む →
          </a>
        </footer>
      </div>
    </main>
  );
}
