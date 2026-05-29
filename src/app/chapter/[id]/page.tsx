import { notFound } from "next/navigation";
import ChapterClient from "./ChapterClient";
import { TOTAL_CHAPTERS } from "@/lib/conditions/definitions.mjs";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChapterPage({ params }: PageProps) {
  const { id } = await params;
  const chapter = Number(id);

  if (!Number.isInteger(chapter) || chapter < 1 || chapter > TOTAL_CHAPTERS) {
    notFound();
  }

  return <ChapterClient chapter={chapter} />;
}

export function generateStaticParams() {
  return Array.from({ length: TOTAL_CHAPTERS }, (_, index) => ({ id: String(index + 1) }));
}
