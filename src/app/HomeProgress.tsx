"use client";

import { useEffect, useState } from "react";
import { TOTAL_CHAPTERS } from "@/lib/conditions/definitions.mjs";
import { loadProgress } from "@/lib/progress";

type HomeProgressProps = {
  chapter: number;
};

export default function HomeProgress({ chapter }: HomeProgressProps) {
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    setCompleted(chapter >= 1 && chapter <= TOTAL_CHAPTERS && loadProgress().completed.includes(chapter));
  }, [chapter]);

  return (
    <span
      className={`shrink-0 rounded-md border px-2 py-1 text-xs font-semibold ${
        completed
          ? "border-success/50 bg-success/10 text-success"
          : "border-border bg-bg text-textMuted"
      }`}
    >
      {completed ? "完了" : "未完了"}
    </span>
  );
}
