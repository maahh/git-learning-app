import type { Lesson, LessonSection } from "@/content/lessons";

type LessonViewProps = {
  lesson: Lesson;
};

function SectionRenderer({ section }: { section: LessonSection }) {
  switch (section.kind) {
    case "heading":
      return <h2 className="mt-2 text-xl font-semibold text-text">{section.text}</h2>;
    case "paragraph":
      return <p className="text-sm leading-7 text-text">{section.text}</p>;
    case "list":
      return (
        <ul className="list-disc space-y-1 pl-5 text-sm leading-7 text-text" role="list">
          {section.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "code":
      return (
        <figure className="flex flex-col gap-1">
          {section.caption ? (
            <figcaption className="text-xs text-textMuted">{section.caption}</figcaption>
          ) : null}
          <pre className="overflow-x-auto rounded-md border border-border bg-bg p-3 font-mono text-xs leading-6 text-text">
            <code>{section.lines.join("\n")}</code>
          </pre>
        </figure>
      );
    case "diagram":
      return (
        <figure className="flex flex-col gap-1">
          {section.caption ? (
            <figcaption className="text-xs text-textMuted">{section.caption}</figcaption>
          ) : null}
          <pre
            className="overflow-x-auto rounded-md border border-dashed border-border bg-panel p-3 font-mono text-xs leading-6 text-text"
            aria-label={section.caption ?? "図解"}
          >
            <code>{section.ascii}</code>
          </pre>
        </figure>
      );
    case "callout": {
      const toneClass =
        section.tone === "warn"
          ? "border-warn/50 bg-warn/10"
          : "border-accent/50 bg-accent/10";
      const labelClass = section.tone === "warn" ? "text-warn" : "text-accent";
      return (
        <aside
          className={`rounded-md border-l-4 p-3 text-sm ${toneClass}`}
          aria-label={section.title}
          role="note"
        >
          <p className={`text-xs font-semibold ${labelClass}`}>{section.title}</p>
          <p className="mt-1 leading-7 text-text">{section.body}</p>
        </aside>
      );
    }
    case "walkthrough":
      return (
        <section
          aria-label={section.heading ?? "練習問題でやること"}
          className="flex flex-col gap-3 rounded-md border border-accent/30 bg-accent/5 p-4"
        >
          <h2 className="text-sm font-semibold text-accent">
            {section.heading ?? "練習問題でやること"}
          </h2>
          <ol className="flex flex-col gap-3">
            {section.steps.map((step) => (
              <li key={step.label} className="rounded-md border border-border bg-panel p-3">
                <p className="text-sm font-medium text-text">{step.label}</p>
                <p className="mt-1 text-xs leading-6 text-textMuted">
                  <span className="font-semibold text-accent">なぜ: </span>
                  {step.why}
                </p>
              </li>
            ))}
          </ol>
        </section>
      );
  }
}

export default function LessonView({ lesson }: LessonViewProps) {
  return (
    <article className="flex flex-col gap-5" aria-labelledby="lesson-title">
      <header className="flex flex-col gap-2 border-b border-border pb-4">
        <p className="font-mono text-xs text-accent">Chapter {lesson.id}</p>
        <h1 id="lesson-title" className="text-3xl font-semibold text-text">
          {lesson.title}
        </h1>
        <p className="text-sm leading-6 text-textMuted">{lesson.oneLiner}</p>
        <p className="text-xs text-textMuted">目安: 約 {lesson.estimatedMinutes} 分</p>
      </header>
      <div className="flex flex-col gap-4">
        {lesson.sections.map((section, index) => (
          <SectionRenderer key={`${section.kind}-${index}`} section={section} />
        ))}
      </div>
    </article>
  );
}
