import { notFound } from "next/navigation";
import DrillClient from "./DrillClient";
import { TOTAL_DRILLS } from "@/content/drills.mjs";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DrillDetailPage({ params }: PageProps) {
  const { id } = await params;
  const drill = Number(id);

  if (!Number.isInteger(drill) || drill < 1 || drill > TOTAL_DRILLS) {
    notFound();
  }

  return <DrillClient drill={drill} />;
}

export function generateStaticParams() {
  return Array.from({ length: TOTAL_DRILLS }, (_, index) => ({ id: String(index + 1) }));
}
